// 투자지표(Metrics) 탭의 멀티플 밴드 차트가 소비하는 mock 이음새 —
// MultipleBandChart / ValFairBandChart 는 plan.priceHistory(연도별 주가 시계열)를 읽어
// 과거 PER/PBR/PSR/EV 밴드에 가격을 오버레이한다. 웹 UIPlan에는 아직 실 priceHistory가 없어
// (실데이터 = 마일스톤 6) fin.is 연도축에 정렬된 결정론적 연간 주가 시계열을 합성한다.
//
// 성격은 lib/gap-history.ts · lib/trajectory.ts 와 동일한 MOCK 이음새다:
//   - 결정론적(티커·현재가·시나리오 스프레드에서만 파생 — 렌더마다 동일)
//   - 마지막 점 = plan.currentPrice (source 밴드 차트의 리샘플 폴백과 일치)
//   - 마일스톤 6에서 실 히스토리컬 시세로 교체하는 단일 지점.
//
// source 밴드 차트는 plan.priceHistory 를 연도 인덱스로 리샘플하고(fin.is 길이에 맞춤)
// 비면 plan.currentPrice 로 폴백한다 — 여기서 fin.is.length 개의 점을 만들어 그 리샘플이
// 항상 유의미한 곡선을 그리도록 한다.
import type { Fin, PricePoint } from "@keystone/core/types";
import type { UIPlan } from "@/lib/plan-mapper";
import { REF_YEAR } from "@/lib/clock";

// gap-history.ts TUNE 과 같은 정신: 종목별 가격 궤적 튜닝(진폭·추세). 없으면 완만한 기본값.
// trend = 과거 첫 해 대비 현재가까지의 누적 추세(가격이 어디서 출발했나), vol = 연도별 흔들림.
const PX_TUNE: Record<string, { trend: number; vol: number }> = {
  "005930": { trend: -0.16, vol: 0.05 },  // 삼성 — 과거보다 눌린 현재가(저평가 서사)
  "000660": { trend: 0.22, vol: 0.08 },   // 하이닉스 — 상승 추세, 사이클 변동성
  "AAPL": { trend: 0.30, vol: 0.05 },     // Apple — 꾸준한 상승
  "NVDA": { trend: 0.85, vol: 0.11 },     // NVIDIA — 급등
  "TSLA": { trend: 0.40, vol: 0.14 },     // Tesla — 변동성 큼
  "035720": { trend: -0.34, vol: 0.09 },  // 카카오 — 고점 대비 하락
  "005380": { trend: 0.12, vol: 0.06 },   // 현대차 — 완만한 상승
  "035420": { trend: -0.05, vol: 0.06 },  // NAVER — 횡보
  "GOOGL": { trend: 0.34, vol: 0.05 },    // 구글 — 상승
};

// 결정론적 pseudo-random: 티커 시드로 [-0.5,0.5) 흔들림 시퀀스 (trajectory.ts seededWalk 정신).
function seeded(ticker: string) {
  let s = 0;
  for (let i = 0; i < ticker.length; i++) s = (s * 31 + ticker.charCodeAt(i)) % 233280;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 - 0.5; };
}

/**
 * fin.is 연도축에 정렬된 연간 주가 시계열(mock)을 합성한다.
 * 마지막 점은 plan.currentPrice. 이전 점들은 현재가 / (1+trend) 에서 출발해
 * 결정론적 흔들림을 얹은 선형 보간. 항상 fin.is.length 개.
 * @returns PricePoint[] — q = 연도 인덱스, v = 그 해의 주가.
 */
export function finPriceHistory(plan: UIPlan, fin: Fin | null): PricePoint[] {
  const px = plan.currentPrice;
  const years = fin?.is ?? [];
  const n = years.length;
  if (!n || !(px > 0)) return [];

  // 실 연간 종가(annualCloses)가 있으면 위치 기반 정렬로 실 주가 시계열을 쓴다(마일스톤6 seam 교체).
  // fin.is는 오름차순(오래된→최신), 마지막 = 현행 회계연도 → REF_YEAR. i번째 = REF_YEAR-(n-1-i)년 종가.
  // 마지막 점은 라이브 현재가. 해당 연도 실종가 없으면 현재가 폴백.
  const ac = plan.annualCloses;
  if (ac && Object.keys(ac).length) {
    return years.map((_, i) => {
      if (i === n - 1) return { q: i, v: px };
      const c = ac[String(REF_YEAR - (n - 1 - i))];
      return { q: i, v: c != null && c > 0 ? c : px };
    });
  }

  const tu = PX_TUNE[plan.ticker] || { trend: 0.08, vol: 0.05 };
  const start = px / (1 + tu.trend);
  const rnd = seeded(plan.ticker);
  const rndCur = plan.cur === "USD" ? (v: number) => Math.round(v * 100) / 100 : (v: number) => Math.round(v / 10) * 10;
  return years.map((_, i) => {
    if (i === n - 1) return { q: i, v: px };  // 마지막 = 라이브 현재가
    const tnorm = n > 1 ? i / (n - 1) : 0;
    const base = start + (px - start) * tnorm;
    // 양 끝으로 갈수록 흔들림 감소(중앙에서 최대) — trajectory.seededWalk 와 같은 완화.
    const noise = rnd() * tu.vol * base * (1 - Math.abs(tnorm - 0.5));
    return { q: i, v: rndCur(Math.max(base * 0.4, base + noise)) };
  });
}
