// 스크리너 데이터 파이프라인 — source/P4Views.jsx:414-432 scored 이식.
// buildScored(securities, plans, fwId) → ScoredRow[]. SEC_SEED(eps/perLo/perHi) + core finOf/gradeWithFw/finFlags 사용.
// 컴포넌트 밖(순수)에서 계산 — SWC 안전(JSX 안 계산·IIFE 없음). fin=null(SEC_SEED 없는 종목)은 필터.
import type { Fin, Indicator } from "@keystone/core/types";
import { finOf } from "@keystone/core/seed";
import { gradeWithFw } from "@keystone/core/screener";
import type { UISecurity } from "@/lib/security-mapper";
import type { UIPlan } from "@/lib/plan-mapper";
import { SEC_SEED, finFlags, type Verdict, type ValV } from "@/lib/screener-ref";

/** source/P4Views.jsx scored 각 행 — 종목 + 지표값 + 밸류에이션 + (렌즈)등급. */
export interface ScoredRow {
  s: UISecurity;
  vals: Record<string, number | null>;
  midPer: number | null;
  fair: number | null;
  valUp: number | null;
  valV: ValV | null;
  flags: Record<string, boolean>;
  n: number; // 이 종목의 플랜 수
  inds: Indicator[]; // 렌즈 focus 지표(등급 재산출)
  sc: number | null;
  max: number | null;
  ratio: number | null;
  verdict: Verdict | null;
}

// source/securities.jsx:47 plansForTicker 인라인.
function plansForTicker(plans: UIPlan[], ticker: string): number {
  return plans.filter((p) => p.ticker === ticker).length;
}

/**
 * source/P4Views.jsx:414-432 scored 파이프라인 이식.
 * @param fwId 활성 렌즈 id( "none" 또는 null → noLens: 등급 없이 raw 필터만 ).
 * @param focus 활성 렌즈의 gradeFocus(등급 채점 지표 키). noLens면 무시.
 */
export function buildScored(
  securities: UISecurity[],
  plans: UIPlan[],
  fwId: string | null,
  focus: string[],
): ScoredRow[] {
  const noLens = !fwId || fwId === "none";
  const out: ScoredRow[] = [];
  for (const s of securities) {
    // eps: SEC_SEED 우선(프로토타입 수치) → DB s.eps 폴백. price/sharesOut은 DB(s).
    const eps = SEC_SEED[s.ticker]?.eps ?? (s.eps ?? 0);
    const fin: Fin | null = finOf(s.ticker, s.price, eps, s.sharesOut);
    if (!fin) continue; // SEC_SEED/FIN_SEED 없는 종목 → 제외(원본 if(!fin) return null + filter(Boolean)).
    const vals: Record<string, number | null> = {};
    fin.indicators.forEach((m) => { vals[m.key] = m.v; });
    // 밸류에이션 축(렌즈 독립): fair = EPS × 5년 PER 밴드 기하평균(SEC_SEED perLo/perHi).
    const seed = SEC_SEED[s.ticker];
    const perLo = seed?.perLo ?? 0, perHi = seed?.perHi ?? 0;
    const midPer = perLo > 0 && perHi > 0 ? Math.sqrt(perLo * perHi) : null;
    const fair = midPer && eps > 0 ? eps * midPer : null;
    const valUp = fair ? (fair / s.price - 1) * 100 : null; // + = 저평가 · − = 고평가
    const valV: ValV | null = valUp == null ? null : valUp >= 15 ? "under" : valUp <= -15 ? "over" : "fair";
    const flags = finFlags(fin);
    const n = plansForTicker(plans, s.ticker);
    const base = { s, vals, midPer, fair, valUp, valV, flags, n };
    if (noLens) {
      out.push({ ...base, inds: [], sc: null, max: null, ratio: null, verdict: null });
      continue;
    }
    const inds: Indicator[] = focus
      .map((k) => fin.indicators.find((x) => x.key === k))
      .filter((m): m is Indicator => Boolean(m))
      .map((m) => {
        const tone = gradeWithFw(fwId, m.key, m.v);
        return tone === m.tone ? m : { ...m, tone };
      });
    const sc = inds.reduce((a, m) => a + (m.tone === "good" ? 2 : m.tone === "mid" ? 1 : 0), 0);
    const max = inds.length * 2 || 1;
    const ratio = sc / max;
    const verdict: Verdict = ratio >= 0.8 ? "pass" : ratio >= 0.5 ? "watch" : "fail";
    out.push({ ...base, inds, sc, max, ratio, verdict });
  }
  return out;
}
