// security_financials(DB) → 프로토타입 Fin 이음새.
// DB 우선·시드 폴백 — DART sync 시 자동 실데이터화:
//   완전한 실측(net_margin/roe/gross_margin/debt_ratio non-null)이 DB에 있으면 그걸로 FinSeed를
//   복원해 core buildFinFromSeed로 렌더하고, 없으면 종목별 FIN_SEED(합성)로 폴백한다.
// FinancialsTab UI/차트 계산은 프로토타입 그대로 — 데이터 소스만 교체하는 ARCHITECTURE §7 이음새.
import type { Currency, Fin, FinSeed } from "@keystone/core/types";
import { buildFin, buildFinFromSeed } from "@keystone/core/seed";

/** security_financials 한 행(요약 비율 + 절대 매출). seed 머신은 revenue/operating_margin만 차 있음. */
export interface DbFinRow {
  fiscal_year: number;
  revenue: number | null;
  operating_margin: number | null;
  net_margin: number | null;
  roe: number | null;
  gross_margin: number | null;
  debt_ratio: number | null;
  current_ratio: number | null;
  dividend_yield: number | null;
  revenue_growth: number | null;
  unit: string | null;
}

/** 길이 5로 맞춤 — 부족하면 앞을 첫값으로 패딩(프로토타입 5년 시계열 가정). */
function pad5(arr: number[]): number[] {
  if (arr.length >= 5) return arr.slice(-5);
  const first = arr.length ? arr[0] : 0;
  return [...Array<number>(5 - arr.length).fill(first), ...arr];
}

/**
 * DB 실데이터 우선, 없으면 core FIN_SEED 폴백으로 Fin 합성.
 * @returns Fin | null (ticker가 FIN_SEED에 없고 DB도 불완전이면 null)
 */
export function buildPlanFin(
  ticker: string,
  cur: Currency,
  rows: DbFinRow[],
  px: number,
  eps: number,
  sharesOut: number,
): Fin | null {
  const sorted = (rows ?? [])
    .slice()
    .sort((a, b) => a.fiscal_year - b.fiscal_year)
    .slice(-5); // 최근 5년

  // DB 완전성 판정: 마지막 행의 net_margin/roe/gross_margin/debt_ratio가 모두 non-null이면 실데이터.
  const last = sorted.length ? sorted[sorted.length - 1] : null;
  const dbComplete =
    last != null &&
    last.net_margin != null &&
    last.roe != null &&
    last.gross_margin != null &&
    last.debt_ratio != null;

  if (dbComplete) {
    // DB 있음 → FinSeed 복원 후 buildFinFromSeed. DB revenue(절대값)를 FinSeed 스케일(십억/조)로 환산.
    const unit = cur === "KRW" ? 1e12 : 1e9;
    const rev = pad5(sorted.map((r) => (r.revenue ?? 0) / unit));
    const opm = pad5(sorted.map((r) => r.operating_margin ?? 0));
    const seed: FinSeed = {
      unit,
      rev,
      opm,
      npm: last.net_margin ?? 0,
      roe: last.roe ?? 0,
      gpm: last.gross_margin ?? 0,
      debt: last.debt_ratio ?? 0,
      curr: last.current_ratio ?? 0,
      divy: last.dividend_yield ?? 0,
      revg: last.revenue_growth ?? 0,
    };
    return buildFinFromSeed(seed, px, eps, sharesOut);
  }

  // DB 불완전 → core FIN_SEED 폴백(이 머신은 이 경로 — seed에 non-null 실측이 없음).
  return buildFin(ticker, px, eps, sharesOut);
}
