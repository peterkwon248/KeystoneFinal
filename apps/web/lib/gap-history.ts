// source/data.jsx enrichGap()(811~870)의 순수 함수 이식 — 내재가치(iv)·iv 히스토리·가격
// 히스토리·시나리오 목표가 스냅샷.
// GapTab(내재가치 vs 가격 괴리 차트)이 소비하는 이음새.
//
// 마일스톤6 seam 교체: fin(buildPlanFin 실 재무)+annualCloses(fetchAnnualCloses 실 연간 종가)가 주어지면
//   실측 경로 — iv=최신EPS×과거PER밴드 기하평균, ivHistory=연도별 EPS×기하평균배수, priceHistory=실 연말종가.
// 둘 다 없으면(플랜에 fin 미주입) 기존 TUNE mock 폴백.
//
// ⚠️ GapTab 소비 호환성: gap-tab.tsx 는 priceHistory.length 로 축 포인트 수(NQ)를 잡고,
//   ivHistory 를 같은 인덱스로 밴드 중앙선에 매핑한다 → priceHistory 와 ivHistory 는 같은 길이여야 한다.
//   scenarioHistory 는 q(=포인트 인덱스) 기반 계단 스냅샷이므로 q 범위를 [0..NQ-1]로 유지한다.
//   실 재무는 연 5개 포인트(fin.is.length) — 축은 그대로 GapTab이 length에서 파생하므로 구조 불변.
import type { Fin } from "@keystone/core/types";
import type { UIPlan } from "@/lib/plan-mapper";
import { epsByYear, latestEps, peBand, fairMultiple, intrinsicValue } from "@/lib/valuation-history";

export interface QPoint { q: number; v: number }
export interface ScenarioSnap { q: number; base: number; bull: number; bear: number }
export interface GapHistory {
  iv: number;
  ivHistory: QPoint[];
  priceHistory: QPoint[];
  scenarioHistory: ScenarioSnap[];
  gapMonths: number;
}

// 종목별 갭 튜닝: gap=내재가치 대비 현재가 저평가%, dwellQ=저평가 연속 분기, ivTrend=가치추세(논제훼손 판정용)
// source/data.jsx:824~834 TUNE 테이블을 그대로 옮김.
const TUNE: Record<string, { gap: number; dwellQ: number; ivTrend: number }> = {
  "005930": { gap: 18, dwellQ: 5, ivTrend: 6 },   // 삼성 — 깊은 저평가, 오래 기다림
  "000660": { gap: 9, dwellQ: 3, ivTrend: 10 },    // 하이닉스 — 보통
  "AAPL": { gap: 2, dwellQ: 1, ivTrend: 4 },       // Apple — 목표가 근접
  "NVDA": { gap: -6, dwellQ: 0, ivTrend: 12 },     // NVIDIA — 고평가
  "TSLA": { gap: -10, dwellQ: 0, ivTrend: -3 },    // Tesla — 고평가
  "035720": { gap: 24, dwellQ: 6, ivTrend: -8 },   // 카카오 — 깊은 저평가지만 논제 훼손(가치 하락)
  "005380": { gap: 16, dwellQ: 4, ivTrend: 9 },    // 현대차 — 깊은 저평가
  "035420": { gap: 14, dwellQ: 4, ivTrend: 7 },    // NAVER — 저평가
  "GOOGL": { gap: 11, dwellQ: 2, ivTrend: 8 },     // 구글 — 저평가
};

/**
 * source/data.jsx enrichGap() 835~867 로직을 플랜 1건 기준으로 순수 이식(TUNE mock 경로).
 * @param plan 플랜.
 * @param fin  실 재무(buildPlanFin). annualCloses 와 함께 주어지면 실측 경로.
 * @param annualCloses 실 연간 종가 {YYYY: 종가}. fin 과 함께 주어지면 실측 경로.
 */
export function gapHistory(
  plan: UIPlan,
  fin?: Fin | null,
  annualCloses?: Record<string, number> | null,
): GapHistory {
  const real = realGapHistory(plan, fin ?? null, annualCloses ?? null);
  if (real) return real;
  return mockGapHistory(plan);
}

/**
 * 실측 경로 — 실 재무 + 실 연간 종가에서 iv/ivHistory/priceHistory 계산.
 * 계산 불가(재무·종가·밴드 불완전)면 null 반환 → 호출부가 mock 폴백.
 */
function realGapHistory(
  plan: UIPlan,
  fin: Fin | null,
  annualCloses: Record<string, number> | null,
): GapHistory | null {
  if (!fin || !annualCloses || !Object.keys(annualCloses).length) return null;
  const sharesOut = plan.sharesOut;
  const band = peBand(fin, sharesOut, annualCloses);   // 과거 PER 밴드(실측)
  const mult = fairMultiple(band);                     // √(perLo×perHi)
  const epsPts = epsByYear(fin, sharesOut);            // 연도별 EPS
  const lastEps = latestEps(fin, sharesOut);
  if (band == null || mult == null || !epsPts.length || lastEps == null) return null;

  const iv0 = intrinsicValue(lastEps, band);           // 최신 EPS × 기하평균배수
  if (iv0 == null || !(iv0 > 0)) return null;
  const rnd = (v: number) => plan.cur === "USD" ? Math.round(v * 100) / 100 : Math.round(v / 10) * 10;
  const iv = rnd(iv0);
  const n = epsPts.length;

  // ivHistory = 연도별 EPS × 기하평균배수 (eps≤0 인 해는 앞/뒤 유효값으로 보간해 선이 끊기지 않게).
  // priceHistory = 실 연말종가(annualCloses). 두 배열은 같은 길이(n) — GapTab 인덱스 정합 필수.
  const ivRaw = epsPts.map((p) => p.eps > 0 ? p.eps * mult : NaN);
  fillGaps(ivRaw, iv0);
  const ivHistory: QPoint[] = ivRaw.map((v, i) => ({ q: i, v: rnd(v) }));

  const px = plan.currentPrice;
  const priceHistory: QPoint[] = epsPts.map((p, i) => {
    if (i === n - 1) return { q: i, v: px };            // 마지막 = 라이브 현재가
    const c = annualCloses[String(p.year)];
    return { q: i, v: c != null && c > 0 ? rnd(c) : px };
  });

  // gapMonths = 최근 연속 저평가(종가<iv) 연수 → 개월. 각 해 종가 vs 그 해 iv 비교(오래된→최신 역순 카운트).
  let streak = 0;
  for (let i = n - 1; i >= 0; i--) {
    const p = priceHistory[i].v, v = ivHistory[i].v;
    if (p < v) streak++; else break;
  }
  const gapMonths = streak * 12;

  // scenarioHistory = 시나리오 목표가 스냅샷(계단식 '내 기준'선). 재무 mock 아님 — 시나리오 목표가 기반(기존 로직 유지).
  //  실측 경로에선 가치추세(ivTrend)를 실 ivHistory 처음↔끝에서 도출해 스냅 지점을 결정한다.
  const ivAgo = ivHistory[0].v, ivNow = ivHistory[n - 1].v;
  const ivTrend = ivAgo ? (ivNow - ivAgo) / ivAgo * 100 : 0;
  const scenarioHistory = scenarioSnaps(plan, iv, n, ivTrend, rnd);

  return { iv, ivHistory, priceHistory, scenarioHistory, gapMonths };
}

/** NaN(무효 EPS) 구간을 인접 유효값으로 채운다(양끝은 fallback). 선이 끊기지 않게. */
function fillGaps(arr: number[], fallback: number): void {
  const n = arr.length;
  // forward fill
  let last = NaN;
  for (let i = 0; i < n; i++) { if (!isNaN(arr[i])) last = arr[i]; else if (!isNaN(last)) arr[i] = last; }
  // backward fill (leading NaNs)
  let next = NaN;
  for (let i = n - 1; i >= 0; i--) { if (!isNaN(arr[i])) next = arr[i]; else if (!isNaN(next)) arr[i] = next; }
  for (let i = 0; i < n; i++) if (isNaN(arr[i])) arr[i] = fallback;
}

/**
 * 시나리오 목표가 계단 스냅샷 — source/data.jsx enrichGap 후반부 로직(재무 mock 아님).
 * 마지막 스냅은 현재 라이브 목표가. 축 포인트 수(NQ=n)에 맞춰 q 인덱스를 스케일.
 */
function scenarioSnaps(
  plan: UIPlan,
  iv: number,
  n: number,
  ivTrend: number,
  rnd: (v: number) => number,
): ScenarioSnap[] {
  const getT = (en: string) => { const s = plan.scenarios.find((x) => x.label && x.label.en === en); return s ? s.target : null; };
  const bN2 = getT("Base") || iv, uN2 = getT("Bull") || Math.round(iv * 1.25), dN2 = getT("Bear") || Math.round(iv * 0.75);
  const lastIdx = n - 1;
  let snapQs: number[];
  // 원본 dwellQ 대신 실 ivTrend 로 스냅 지점 결정(mock 과 같은 질감): 상승 추세→2회 상향, 하락→1회 하향, 그 외→초반 1회.
  if (ivTrend >= 8) snapQs = [0, Math.round(lastIdx * 0.6), lastIdx];
  else if (ivTrend <= -3) snapQs = [0, Math.round(lastIdx * 0.8)];
  else snapQs = [0, Math.round(lastIdx * 0.4)];
  snapQs = [...new Set(snapQs.filter((q) => q >= 0 && q <= lastIdx))].sort((a, b) => a - b);
  if (!snapQs.length) snapQs = [0];
  const lastQ = snapQs[snapQs.length - 1];
  const oldF = 1 / (1 + ivTrend / 100);
  return snapQs.map((qi, k) => {
    const isLast = k === snapQs.length - 1;
    const f = isLast ? 1 : (lastQ ? (oldF + (1 - oldF) * (qi / lastQ)) : 1);
    return { q: qi, base: rnd(bN2 * f), bull: rnd(uN2 * f), bear: rnd(dN2 * f) };
  });
}

/** source/data.jsx enrichGap() 835~867 로직 — 종목별 TUNE 테이블로 결정론적 합성(폴백). */
function mockGapHistory(plan: UIPlan): GapHistory {
  const tu = TUNE[plan.ticker] || { gap: 8, dwellQ: 2, ivTrend: 5 };
  const iv = Math.round(plan.currentPrice * (1 + tu.gap / 100));  // 현재가 기준 목표 갭으로 내재가치 설정
  const rnd = (v: number) => plan.cur === "USD" ? Math.round(v * 100) / 100 : Math.round(v / 10) * 10;
  const ivStart = iv / (1 + tu.ivTrend / 100);                    // 가치 추세(상승/하락)
  const ivHistory: QPoint[] = [0, 1, 2, 3, 4, 5].map((i) => ({ q: i, v: rnd(ivStart + (iv - ivStart) * (i / 5)) }));
  // 가격 히스토리: 최근 dwellQ 분기는 내재가치 아래(저평가 체류), 그 이전은 위
  const priceHistory: QPoint[] = [0, 1, 2, 3, 4, 5].map((i) => {
    const ivAtI = ivStart + (iv - ivStart) * (i / 5);
    const underwater = i >= (6 - tu.dwellQ);
    if (i === 5) return { q: i, v: plan.currentPrice };
    const f = underwater ? (0.82 + 0.06 * Math.sin(i * 1.7)) : (1.04 + 0.05 * Math.sin(i * 1.3));
    return { q: i, v: rnd(ivAtI * f) };
  });
  const gapMonths = tu.dwellQ * 3;
  // 시나리오 목표가 편집 스냅샷(계단식 '내 기준'선용). 마지막 = 현재 목표가.
  const getT = (en: string) => { const s = plan.scenarios.find((x) => x.label && x.label.en === en); return s ? s.target : null; };
  const bN2 = getT("Base") || iv, uN2 = getT("Bull") || Math.round(iv * 1.25), dN2 = getT("Bear") || Math.round(iv * 0.75);
  let snapQs: number[];
  if (tu.dwellQ >= 5) snapQs = [0];                 // 장기 보유·소신 유지 → 변경 없음(평평)
  else if (tu.ivTrend >= 8) snapQs = [0, 3, 5];     // 가치 상승에 맞춰 목표가 2회 상향
  else if (tu.ivTrend <= -3) snapQs = [0, 4];       // 논제 약화로 목표가 하향
  else snapQs = [0, 2];                              // 초반 1회 수정
  const lastQ = snapQs[snapQs.length - 1];
  const oldF = 1 / (1 + tu.ivTrend / 100);          // 과거(q=0) 목표가 배율
  const scenarioHistory: ScenarioSnap[] = snapQs.map((qi, k) => {
    const isLast = k === snapQs.length - 1;
    const f = isLast ? 1 : (lastQ ? (oldF + (1 - oldF) * (qi / lastQ)) : 1);
    return { q: qi, base: rnd(bN2 * f), bull: rnd(uN2 * f), bear: rnd(dN2 * f) };
  });
  return { iv, ivHistory, priceHistory, scenarioHistory, gapMonths };
}
