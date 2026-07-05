// 밸류에이션 히스토리 공유 헬퍼 (client-safe · 순수) — screener-data 와 gap-history 가 공유한다.
// 실 재무(buildPlanFin 산출 Fin)와 실 연간 종가(fetchAnnualCloses)에서 연도별 EPS·PER 밴드·
// 내재가치를 계산한다. server-only 의존 금지 — screener-data 는 client 경로(useMemo)에서도 쓰인다.
//
// 정의(태스크 사양):
//   EPS_year = fin.is[i].net / (sharesOut × 1e6)   — is[i].net 은 절대 순이익(native 통화)
//   PE_year  = 연말종가 / EPS_year                  — eps>0·종가 존재 연도만
//   fairMultiple(밴드) = √(perLo × perHi)           — 과거 PER 밴드 기하평균
//   intrinsicValue(eps, 밴드) = 최신 EPS × fairMultiple
//
// fin.is 는 오름차순(오래된→최신)이고 마지막이 현행 회계연도(REF_YEAR)에 대응한다
// (fin-history.finPriceHistory 와 동일 연도 매핑): i번째 = REF_YEAR-(n-1-i)년.
import type { Fin } from "@keystone/core/types";
import { REF_YEAR } from "@/lib/clock";

export interface PeBand { perLo: number; perHi: number }
export interface EpsPoint { year: number; eps: number }

/** 연도별 EPS = is[i].net / (sharesOut×1e6). 연도 라벨은 REF_YEAR 기준 위치 매핑. */
export function epsByYear(fin: Fin | null, sharesOut: number): EpsPoint[] {
  const is = fin?.is ?? [];
  const n = is.length;
  const shares = (sharesOut || 0) * 1e6;
  if (!n || !(shares > 0)) return [];
  return is.map((row, i) => ({
    year: REF_YEAR - (n - 1 - i),
    eps: row.net / shares,
  }));
}

/** 최신 연도 EPS (마지막 is 행). 없거나 shares 없으면 null. */
export function latestEps(fin: Fin | null, sharesOut: number): number | null {
  const pts = epsByYear(fin, sharesOut);
  if (!pts.length) return null;
  const v = pts[pts.length - 1].eps;
  return isFinite(v) ? v : null;
}

/**
 * 실측 PER 밴드 = 연도별 (연말종가 / EPS_year) 의 min/max.
 * eps>0 이고 그 해 종가가 존재(>0)하는 연도만 사용. 유효 연도가 없으면 null.
 * @param annualCloses {YYYY(문자열): 종가} — fetchAnnualCloses 산출.
 */
export function peBand(
  fin: Fin | null,
  sharesOut: number,
  annualCloses: Record<string, number> | null | undefined,
): PeBand | null {
  if (!annualCloses) return null;
  const pts = epsByYear(fin, sharesOut);
  const pes: number[] = [];
  for (const { year, eps } of pts) {
    if (!(eps > 0)) continue;
    const close = annualCloses[String(year)];
    if (!(close != null && close > 0)) continue;
    const pe = close / eps;
    if (isFinite(pe) && pe > 0) pes.push(pe);
  }
  if (!pes.length) return null;
  return { perLo: Math.min(...pes), perHi: Math.max(...pes) };
}

/** 과거 PER 밴드 기하평균 = √(perLo×perHi). 밴드 유효할 때만. */
export function fairMultiple(band: PeBand | null): number | null {
  if (!band) return null;
  const { perLo, perHi } = band;
  if (!(perLo > 0 && perHi > 0)) return null;
  return Math.sqrt(perLo * perHi);
}

/** 내재가치 = eps × fairMultiple(band). eps>0·밴드 유효할 때만. */
export function intrinsicValue(eps: number | null, band: PeBand | null): number | null {
  const mult = fairMultiple(band);
  if (mult == null || eps == null || !(eps > 0)) return null;
  return eps * mult;
}
