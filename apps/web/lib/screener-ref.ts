// 스크리너 pure/label 상수 — source/P4Views.jsx:154-260 이식(웹 로컬).
// SCV_* 라벨·verdict/value/tone 상수 + FIN_FLAG_DEFS + finFlags(fin) + NUM_CATS.
// core는 import만(finOf/gradeWithFw/lensThreshOf) — 골든 불변. SEC_SEED는 마일스톤6 실데이터 seam.
import type { Fin, Lang } from "@keystone/core/types";

// ⚠️ mock seam(마일스톤6 실데이터 교체) — source/securities.jsx:23-37의 eps/perLo/perHi 그대로.
// 웹 DB엔 eps/perLo/perHi가 없어(change/spark와 동일 seam) 프로토타입 수치를 복사해 동일 결과를 낸다.
export const SEC_SEED: Record<string, { eps: number; perLo: number; perHi: number }> = {
  "005930": { eps: 4830, perLo: 9, perHi: 18 },
  "000660": { eps: 9870, perLo: 6, perHi: 20 },
  "035720": { eps: 1240, perLo: 25, perHi: 55 },
  "005380": { eps: 47200, perLo: 4, perHi: 8 },
  "035420": { eps: 11200, perLo: 13, perHi: 30 },
  "005490": { eps: 31800, perLo: 7, perHi: 16 },
  "207940": { eps: 24600, perLo: 35, perHi: 70 },
  "AAPL": { eps: 6.43, perLo: 20, perHi: 34 },
  "NVDA": { eps: 18.90, perLo: 35, perHi: 75 },
  "GOOGL": { eps: 7.54, perLo: 18, perHi: 30 },
  "TSLA": { eps: 3.65, perLo: 40, perHi: 110 },
  "MSFT": { eps: 11.80, perLo: 25, perHi: 38 },
  "AMD": { eps: 2.57, perLo: 35, perHi: 90 },
  "TSM": { eps: 6.85, perLo: 15, perHi: 28 },
};

// source/P4Views.jsx:154 — verdict(pass/watch/fail) 라벨·색.
export type Verdict = "pass" | "watch" | "fail";
export const SCV_VERDICT: Record<Verdict, { ko: string; en: string; color: string }> = {
  pass: { ko: "통과", en: "Pass", color: "var(--pos)" },
  watch: { ko: "관찰", en: "Watch", color: "var(--r-base)" },
  fail: { ko: "탈락", en: "Fail", color: "var(--neg)" },
};
export const SCV_ORDER: Verdict[] = ["pass", "watch", "fail"];

// source/P4Views.jsx:175 — value verdict(저평가/적정/고평가).
export type ValV = "under" | "fair" | "over";
export const SCV_VAL: Record<ValV, { ko: string; en: string; color: string }> = {
  under: { ko: "저평가", en: "Undervalued", color: "var(--pos)" },
  fair: { ko: "적정", en: "Fairly valued", color: "var(--r-base)" },
  over: { ko: "고평가", en: "Overvalued", color: "var(--neg)" },
};
export const SCV_VAL_ORDER: ValV[] = ["under", "fair", "over"];

// source/P4Views.jsx:177 — 지표 라벨(전체).
export function SCV_INDLAB(k: string, ko: boolean): string {
  const map: Record<string, string> = {
    PER: "PER", PBR: "PBR", PSR: "PSR", PCR: "PCR", EVEB: "EV/EBITDA", PEG: "PEG", ROE: "ROE", ROA: "ROA",
    OPM: ko ? "영업이익률" : "Op. margin", NPM: ko ? "순이익률" : "Net margin", GPM: ko ? "매출총이익률" : "Gross margin",
    REVG: ko ? "매출성장" : "Rev growth", OPG: ko ? "영업이익성장" : "OP growth", NPG: ko ? "순이익성장" : "NI growth",
    DEBT: ko ? "부채비율" : "Debt", CURR: ko ? "유동비율" : "Current", INTCOV: ko ? "이자보상" : "Int cov",
    DIVY: ko ? "배당수익률" : "Div yield", PAYOUT: ko ? "배당성향" : "Payout", DIVG: ko ? "배당성장" : "Div growth",
  };
  return map[k] || k;
}

// source/P4Views.jsx:184 — 지표 라벨(short, ko 전용 축약).
export function SCV_INDLAB_SHORT(k: string, ko: boolean): string {
  if (!ko) return SCV_INDLAB(k, ko);
  const map: Record<string, string> = {
    OPM: "영업익", NPM: "순익", GPM: "매출총익", REVG: "매출성장", OPG: "영업성장", NPG: "순익성장",
    DEBT: "부채", CURR: "유동", INTCOV: "이자보상", DIVY: "배당", PAYOUT: "배당성향", DIVG: "배당성장",
  };
  return map[k] || SCV_INDLAB(k, ko);
}

// source/P4Views.jsx:246 — %로 표기하는 지표 키.
export const SCV_PCT_KEYS = ["ROE", "ROA", "OPM", "NPM", "GPM", "REVG", "OPG", "NPG", "DEBT", "CURR", "DIVY", "PAYOUT", "DIVG"];

// source/P4Views.jsx:248 — tone → 라벨·점수.
export const SCV_TONE: Record<string, { ko: string; en: string; pt: number }> = {
  good: { ko: "우수", en: "Strong", pt: 2 },
  mid: { ko: "보통", en: "Fair", pt: 1 },
  bad: { ko: "미달", en: "Weak", pt: 0 },
};

// source/P4Views.jsx:211 — tone → 색.
export function scvToneCol(tn: string | null | undefined): string {
  return tn === "good" ? "var(--pos)" : tn === "bad" ? "var(--neg)" : tn === "mid" ? "var(--r-base)" : "var(--fg-4)";
}
// source/P4Views.jsx:247 — 지표 단위.
export function scvUnit(k: string, ko: boolean): string {
  return SCV_PCT_KEYS.includes(k) ? "%" : ko ? "배" : "×";
}
// source/P4Views.jsx:212 — 지표값 포맷.
export function scvFmtV(m: { v: number | null; fmt?: string } | null | undefined, ko: boolean): string {
  if (!m || m.v == null || !isFinite(m.v)) return "—";
  return m.fmt === "x" ? m.v.toFixed(1) + (ko ? "배" : "×") : m.v.toFixed(1) + "%";
}

// source/P4Views.jsx:352 scvHeatScore — 히트맵 타일 채움(품질 ratio 0..1): red → amber → green.
export function scvHeatScore(ratio: number): string {
  const lerp = (a: number, b: number, tt: number) => Math.round(a + (b - a) * tt);
  let c1: number[], c2: number[], tt: number;
  if (ratio < 0.5) { c1 = [235, 87, 87]; c2 = [242, 201, 76]; tt = ratio / 0.5; }
  else { c1 = [242, 201, 76]; c2 = [39, 174, 96]; tt = (ratio - 0.5) / 0.5; }
  return `rgb(${lerp(c1[0], c2[0], tt)},${lerp(c1[1], c2[1], tt)},${lerp(c1[2], c2[2], tt)})`;
}
// source/P4Views.jsx:360 scvHeatChange — 히트맵 타일 채움(당일 등락%): 반투명 red/green, ±4% clamp.
export function scvHeatChange(chg: number): string {
  const m = Math.max(-1, Math.min(1, chg / 4));
  const a = (0.16 + Math.abs(m) * 0.64).toFixed(2);
  return m >= 0 ? `rgba(39,174,96,${a})` : `rgba(235,87,87,${a})`;
}

// source/P4Views.jsx:187 — 재무제표 flags 정의(L10n·tip 유지).
export interface FinFlagDef {
  key: string;
  ko: string;
  en: string;
  tip: { ko: string; en: string };
}
export const FIN_FLAG_DEFS: FinFlagDef[] = [
  { key: "fcf_pos", ko: "FCF 흑자", en: "FCF positive", tip: { ko: "최근 회계연도 잉여현금흐름(영업CF−CapEx) > 0", en: "Latest-FY free cash flow (OCF−CapEx) > 0" } },
  { key: "fcf_streak", ko: "FCF 3년 연속 흑자", en: "FCF 3yr positive", tip: { ko: "최근 3개 회계연도 모두 잉여현금흐름 흑자", en: "Free cash flow positive in each of the last 3 FYs" } },
  { key: "op_turn", ko: "영업익 흑자전환", en: "Op. turnaround", tip: { ko: "직전 연도 영업적자 → 최근 연도 영업흑자", en: "Operating loss last year → operating profit this year" } },
  { key: "rev_streak", ko: "매출 3년 연속 성장", en: "Revenue 3yr ↑", tip: { ko: "최근 3개 연도 매출이 매년 증가", en: "Revenue rose every year over the last 3 FYs" } },
  { key: "op_streak", ko: "영업익 3년 연속 증가", en: "Op. income 3yr ↑", tip: { ko: "최근 3개 연도 영업이익이 매년 증가", en: "Operating income rose every year over the last 3 FYs" } },
  { key: "net_cash", ko: "순현금·저부채", en: "Net cash / low debt", tip: { ko: "부채가 자본의 30% 미만 — 사실상 순현금 우량 재무구조", en: "Total liabilities under 30% of equity — net-cash-like balance sheet" } },
];

// source/P4Views.jsx:195 — fin 시계열 → boolean flags.
export function finFlags(fin: Fin | null): Record<string, boolean> {
  if (!fin) return {};
  const is = fin.is || [], cf = fin.cf || [], bs = fin.bs || [];
  const n = is.length;
  const f: Record<string, boolean> = {};
  const L = is[n - 1] || ({} as Fin["is"][number]);
  const P = is[n - 2] || ({} as Fin["is"][number]);
  const cfL = cf[cf.length - 1] || ({} as Fin["cf"][number]);
  const lb = bs[bs.length - 1] || ({} as Fin["bs"][number]);
  f.fcf_pos = cfL.fcf > 0;
  f.fcf_streak = cf.length >= 3 && cf.slice(-3).every((c) => c.fcf > 0);
  f.op_profit = L.op > 0;
  f.op_turn = P.op != null && P.op <= 0 && L.op > 0;
  f.rev_streak = n >= 3 && is[n - 3].rev < is[n - 2].rev && is[n - 2].rev < is[n - 1].rev;
  f.op_streak = n >= 3 && is[n - 3].op < is[n - 2].op && is[n - 2].op < is[n - 1].op;
  f.net_cash = lb.liab != null && lb.equity > 0 && lb.liab < lb.equity * 0.3;
  return f;
}

// source/P4Views.jsx:490 — 지표 조건 필터 그룹(투자지표 카드와 동일 구성).
export interface NumCat { cat: string; label: string; keys: string[] }
export function numCats(ko: boolean): NumCat[] {
  return [
    { cat: "value", label: ko ? "밸류에이션" : "Valuation", keys: ["PER", "PBR", "PSR", "PCR", "EVEB", "PEG"] },
    { cat: "profit", label: ko ? "수익성" : "Profitability", keys: ["ROE", "ROA", "OPM", "NPM", "GPM"] },
    { cat: "growth", label: ko ? "성장성" : "Growth", keys: ["REVG", "OPG", "NPG"] },
    { cat: "stability", label: ko ? "안정성" : "Stability", keys: ["DEBT", "CURR", "INTCOV"] },
    { cat: "dividend", label: ko ? "배당" : "Dividend", keys: ["DIVY", "PAYOUT", "DIVG"] },
  ];
}

// lang 편의 alias(컴포넌트에서 lang→ko 파생 없이 쓰게).
export function isKo(lang: Lang): boolean { return lang === "ko"; }
