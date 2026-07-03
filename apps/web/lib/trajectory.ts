// source/trajectory.jsx의 planTrajectory/seededWalk/trajMonthIdx 이식본.
// 시장가 경로는 프로토타입과 동일한 결정론적 MOCK (Sep~Jun 앵커 창) —
// 실제 히스토리컬 시세는 마일스톤 6+에서 교체된다. 평단 경로/체결/전이는 실데이터 파생.
import type { Plan } from "@keystone/core/types";
import { planReturn } from "@keystone/core/analytics";

export const TRAJ_MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

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
}

export function planTrajectory(p: Plan): Trajectory {
  const execs = (p.executions || [])
    .map((e) => ({ side: e.side, price: e.price, qty: e.qty, t: trajMonthIdx(e.date) }))
    .filter((e): e is TrajExec => e.t != null)
    .sort((a, b) => a.t - b.t);
  const createdT = trajMonthIdx(p.createdAt) ?? 0;
  const todayT = trajMonthIdx("Jun 8") as number;
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
  const mktPath = seededWalk(p.ticker, N, startPrice, endPrice, vol);

  // cumulative avg-cost path: step function rebuilt as buys accrue
  const samples: TrajSample[] = [];
  for (let i = 0; i < N; i++) {
    const t = startT + (span * i) / (N - 1);
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
  };
}
