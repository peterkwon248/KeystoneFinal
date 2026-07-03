// source/data.jsx enrichGap()(811~870)의 순수 함수 이식 — 내재가치(iv)·iv 히스토리·가격
// 히스토리·시나리오 목표가 스냅샷을 종목별 TUNE 테이블로 결정론적으로 합성한다.
// GapTab(내재가치 vs 가격 괴리 차트)이 소비하는 mock 이음새 —
// trajectory.ts와 같은 성격의 MOCK이며, 마일스톤 6에서 실 히스토리로 교체된다.
import type { UIPlan } from "@/lib/plan-mapper";

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

/** source/data.jsx enrichGap() 835~867 로직을 플랜 1건 기준으로 순수 이식. */
export function gapHistory(plan: UIPlan): GapHistory {
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
