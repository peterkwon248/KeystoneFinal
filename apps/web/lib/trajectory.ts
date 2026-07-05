// source/trajectory.jsx의 planTrajectory/seededWalk/trajMonthIdx 이식본.
// 궤적 창은 refNow(실 today) 월로 끝나는 최근 10개월 rolling 창(real-now 기준) —
// 실 종가가 있으면 그 시점 종가로, 없으면 결정론적 mock(seededWalk)로 시장가 경로를 그린다.
// 평단 경로/체결/전이는 실데이터 파생.
import type { Plan } from "@keystone/core/types";
import { planReturn } from "@keystone/core/analytics";
import { MON_EN } from "@keystone/core/format";
import { refNow } from "./clock";

// 궤적 창 = refNow(실 today) 월로 끝나는 최근 10개월 rolling 창. 각 슬롯은 {월약칭, 월번호(1-12),
// 실연도}를 안다. 예: 오늘 7월이면 창 = Oct'25 … Jul'26 (oldest→newest). 10<12개월이라 창 내
// 월약칭은 유일 → indexOf 파싱 안전. year-less "Mon D" exec/note는 이 창 기준으로 월인덱스를 얻는다.
const WINDOW_LEN = 10;
function buildWindow() {
  const now = refNow(); const endY = now.getFullYear(), endM0 = now.getMonth();
  const out: { mon: string; num: number; year: number }[] = [];
  for (let k = WINDOW_LEN - 1; k >= 0; k--) { const d = new Date(endY, endM0 - k, 1); out.push({ mon: MON_EN[d.getMonth()], num: d.getMonth() + 1, year: d.getFullYear() }); }
  return out;
}
const WINDOW = buildWindow();
export const TRAJ_MONTHS = WINDOW.map((w) => w.mon);

/** 실 종가(오름차순). planTrajectory에 넘기면 mock 경로 대신 실 시세로 시장가 경로를 그린다. */
export interface PriceClose { date: string; close: number }

/** 분수 월인덱스 t(0…WINDOW_LEN-1) → 실 달력 ISO(YYYY-MM-DD). 슬롯의 실연도·월번호 사용. */
function monthIdxToISO(t: number): string {
  const mi = Math.max(0, Math.min(TRAJ_MONTHS.length - 1, Math.floor(t)));
  const slot = WINDOW[mi];
  const frac = Math.max(0, Math.min(0.999, t - mi));
  const day = Math.max(1, Math.min(28, Math.round(frac * 28) || 1)); // 28 캡 = 월말 초과·2월 무효날짜 회피
  return `${slot.year}-${String(slot.num).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 분수 월인덱스 mi → 그 슬롯의 실 연도(perf-band 툴팁 날짜용). */
export function trajSlotYear(mi: number): number {
  const c = Math.max(0, Math.min(WINDOW.length - 1, Math.floor(mi)));
  return WINDOW[c].year;
}

/** iso 시점의 종가 = iso 이하 마지막 봉(휴장/주말은 직전 거래일로 forward-fill). closes는 오름차순 가정. */
function closeAt(closes: PriceClose[], iso: string): number {
  let lo = 0, hi = closes.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (closes[mid].date <= iso) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans >= 0 ? closes[ans].close : closes[0].close; // iso가 창 이전이면 최초봉
}

export function trajMonthIdx(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const mon = dateStr.split(" ")[0];
  const idx = TRAJ_MONTHS.indexOf(mon);
  if (idx < 0) return null;
  const day = parseInt(dateStr.split(" ")[1] || "15");
  return idx + (day / 31); // fractional month
}

// deterministic pseudo-random walk between two endpoints, seeded by ticker
export function seededWalk(seed: string, n: number, startV: number, endV: number, vol: number): number[] {
  let s = 0; for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) % 233280;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const tnorm = i / (n - 1);
    const base = startV + (endV - startV) * tnorm;
    const noise = (rnd() - 0.5) * vol * base * (1 - Math.abs(tnorm - 0.5)); // less noise at ends
    pts.push(base + noise);
  }
  pts[0] = startV; pts[n - 1] = endV;
  return pts;
}

export interface TrajSample { t: number; mkt: number; avg: number | null }
export interface TrajExec { t: number; side: "buy" | "sell"; price: number; qty: number }
export interface TrajTransition { t: number; status: string }
export interface Trajectory {
  startT: number; endT: number; todayT: number;
  samples: TrajSample[]; execs: TrajExec[]; transitions: TrajTransition[];
  startPrice: number; endPrice: number; curPrice: number;
  holdDays: number | null; avgImprovePct: number | null;
  peakRet: number | null; troughRet: number | null; mdd: number;
  curRet: number | null; won: boolean | null; hasPosition: boolean;
  isMockPath: boolean; // 시장가 경로가 mock(seededWalk)인지 실 종가인지 — 배지 표시 판단용
}

export function planTrajectory(p: Plan, closes?: PriceClose[]): Trajectory {
  const execs = (p.executions || [])
    .map((e) => ({ side: e.side, price: e.price, qty: e.qty, t: trajMonthIdx(e.date) }))
    .filter((e): e is TrajExec => e.t != null)
    .sort((a, b) => a.t - b.t);
  const createdT = trajMonthIdx(p.createdAt) ?? 0;
  // 앱 기준 '오늘' = refNow(실 today)의 월/일. trajMonthIdx는 "Mon D" 파싱(이제 rolling 창에 포함).
  const todayT = (trajMonthIdx(`${MON_EN[refNow().getMonth()]} ${refNow().getDate()}`) ?? (TRAJ_MONTHS.length - 1)) as number;
  let startT = execs.length ? Math.min(execs[0].t, createdT) : createdT;
  const endT = p.closedAt ? (trajMonthIdx(p.closedAt) ?? todayT) : todayT;
  // give very-recent plans a minimum visual width by stretching the START backward —
  // never push the END past today / the close date (that would draw a line into the future).
  let span = endT - startT;
  if (span < 0.5) { startT = endT - 0.5; span = 0.5; }

  // market price endpoints: derive a plausible start price from avg & current
  const curPrice = p.currentPrice;
  const startPrice = p.avgPrice ? p.avgPrice * 1.04 : curPrice * 0.98;
  const sells = execs.filter((e) => e.side === "sell");
  const endPrice = (p.status === "closed" && sells.length) ? sells[sells.length - 1].price : curPrice;
  const vol = p.cur === "USD" ? 0.05 : 0.045;

  const N = 48;
  const tAt = (i: number) => startT + (span * i) / (N - 1);
  // 실 종가(closes)가 있으면 각 샘플의 월인덱스를 실 날짜로 되돌려 그 시점 종가를 쓴다.
  // 없으면 프로토타입과 동일한 결정론적 mock 경로(seededWalk)로 폴백.
  const useReal = !!(closes && closes.length >= 2);
  const mktPath = useReal
    ? Array.from({ length: N }, (_, i) => closeAt(closes!, monthIdxToISO(tAt(i))))
    : seededWalk(p.ticker, N, startPrice, endPrice, vol);

  // cumulative avg-cost path: step function rebuilt as buys accrue
  const samples: TrajSample[] = [];
  for (let i = 0; i < N; i++) {
    const t = tAt(i);
    let cost = 0, qty = 0;
    execs.forEach((e) => { if (e.t <= t && e.side === "buy") { cost += e.price * e.qty; qty += e.qty; } });
    const avg = qty > 0 ? cost / qty : null;
    samples.push({ t, mkt: mktPath[i], avg });
  }

  // status transitions (synthesize a plausible journey from createdAt → first buy → status)
  const transitions: TrajTransition[] = [{ t: createdT, status: "research" }];
  if (execs.length) transitions.push({ t: execs[0].t, status: "active" });
  if (p.status === "paused") transitions.push({ t: startT + span * 0.7, status: "paused" });
  if (p.status === "closing" || p.status === "closed") {
    const firstSell = sells.length ? sells[0].t : startT + span * 0.85;
    transitions.push({ t: firstSell, status: "closing" });
  }
  if (p.status === "closed") transitions.push({ t: endT, status: "closed" });

  const ret = planReturn(p);

  // ---- journey statistics ----
  const firstBuy = execs.find((e) => e.side === "buy");
  const holdDays = firstBuy ? Math.max(0, Math.round((endT - firstBuy.t) * 30.4)) : null;
  const avgImprovePct = (firstBuy && p.avgPrice) ? (p.avgPrice / firstBuy.price - 1) * 100 : null;
  let peakRet: number | null = null, troughRet: number | null = null, mdd = 0, runPeak = -Infinity;
  samples.forEach((s) => {
    if (s.avg != null && s.avg > 0) {
      const r = (s.mkt / s.avg - 1) * 100;
      peakRet = peakRet == null ? r : Math.max(peakRet, r);
      troughRet = troughRet == null ? r : Math.min(troughRet, r);
    }
    runPeak = Math.max(runPeak, s.mkt);
    if (runPeak > 0) mdd = Math.min(mdd, (s.mkt / runPeak - 1) * 100);
  });

  return {
    startT, endT, todayT, samples, execs, transitions,
    startPrice, endPrice, curPrice,
    holdDays, avgImprovePct, peakRet, troughRet, mdd,
    curRet: ret ? ret.rate : null,
    won: ret ? ret.rate >= 0 : null,
    hasPosition: execs.length > 0,
    isMockPath: !useReal,
  };
}
