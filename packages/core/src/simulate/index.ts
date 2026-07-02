// futuretest.jsx — "Future-test": a forward-looking, deterministic strategy simulator.
// NOT a price forecast. The user defines an explicit WHAT-IF price scenario (an assumption);
// the engine then plays the chosen strategy through it and shows the mechanical result
// (avg-cost descent, buy points, P&L band, deployed capital) — like backtesting, but on
// a hypothetical future path the user controls. Price path is dashed/anchored to stay honest.

import type {
  Plan,
  Strategy,
  FTShape,
  FTPreset,
  FTAnchor,
  FTPathParams,
  PricePath,
  PathPoint,
  FTCfg,
  SimResult,
  SimStep,
  SimEvent,
  SimSummary,
  SimExit,
} from "../types/index.ts";

/* ============ what-if price scenarios — parametric + custom-draw ============ */
// A path is authored by the user as an ASSUMPTION, never a forecast. Two modes:
//  - parametric: control points [start, extreme@troughT, end] eased + seeded noise
//  - custom: the user drags anchor points to draw an arbitrary path
// presets just seed the parametric knobs (depth / troughT / endPct / vol / peak).
export const FT_PRESETS: Record<FTShape, FTPreset> = {
  vrebound: { depth: 30, troughT: 0.44, endPct: 6,   vol: 26, peak: false },
  lshape:   { depth: 28, troughT: 0.40, endPct: -25, vol: 20, peak: false },
  stair:    { depth: 32, troughT: 0.80, endPct: -30, vol: 34, peak: false },
  range:    { depth: 16, troughT: 0.50, endPct: -3,  vol: 72, peak: false },
  uptrend:  { depth: 30, troughT: 0.82, endPct: 30,  vol: 28, peak: true  },
  spike:    { depth: 33, troughT: 0.32, endPct: 7,   vol: 30, peak: true  },
};
export const FT_SHAPE_LIST: FTShape[] = ["vrebound", "lshape", "stair", "range", "uptrend", "spike"];

export function ftEase(f: number): number { f = Math.max(0, Math.min(1, f)); return 0.5 - 0.5 * Math.cos(Math.PI * f); }

// smooth (AR1) seeded noise, zero-mean
export function ftNoise(seed: string, n: number): number[] {
  let s = 0; for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) % 233280;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const out: number[] = []; let v = 0;
  for (let i = 0; i < n; i++) { v = v * 0.62 + (rnd() - 0.5); out.push(v); }
  return out;
}

// build a price path from a params object.
// params: { anchors?:[{t,pct}], depth, troughT, endPct, vol, peak, seed }
export function buildPricePath(params: FTPathParams | null | undefined, startPrice: number, N: number = 96): PricePath {
  const { anchors, depth = 25, troughT = 0.45, endPct = 0, vol = 30, peak = false, seed = "ft" } = params || {};
  let cps: number[][];
  if (anchors && anchors.length >= 2) {
    cps = anchors.slice().sort((a, b) => a.t - b.t).map(a => [a.t, a.pct]);
    if (cps[0][0] > 0.001) cps.unshift([0, 0]);
  } else {
    cps = [[0, 0], [troughT, (peak ? 1 : -1) * depth], [1, endPct]];
  }
  const noise = ftNoise(seed, N);
  const path: PricePath = [] as unknown as PricePath;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    let a = cps[0], b = cps[cps.length - 1];
    for (let k = 0; k < cps.length - 1; k++) { if (t >= cps[k][0] && t <= cps[k + 1][0]) { a = cps[k]; b = cps[k + 1]; break; } }
    const span = (b[0] - a[0]) || 1;
    let pct = a[1] + (b[1] - a[1]) * ftEase((t - a[0]) / span);
    pct += noise[i] * (vol / 100) * 7 * Math.sin(Math.PI * t); // taper noise at both ends
    path.push({ t, price: startPrice * (1 + pct / 100) });
  }
  path.cps = cps;                       // control points [t,pct] (for honest anchor dots)
  path.anchors = cps.map(c => c[0]);    // their t-positions
  return path;
}

// seed a draggable anchor set (t fixed, pct sampled from current path) for custom-draw mode
export function seedAnchors(params: FTPathParams, months: number = 9, N: number = 96): FTAnchor[] {
  // ALWAYS 7 evenly-spaced anchors regardless of the time unit/period — a predictable,
  // grabbable grid. Coarse SHAPE only; daily wiggle comes from the volatility slider.
  // (User can click empty chart space to add up to FT_MAX_ANCHORS for finer control.)
  const steps = 6; // → 7 anchors (0..1)
  const ts: number[] = []; for (let k = 0; k <= steps; k++) ts.push(k / steps);
  const path = buildPricePath({ ...params, vol: 0 }, 100, N);
  return ts.map(t => {
    const s = path.reduce((a, b) => Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a);
    return { t, pct: Math.round((s.price / 100 - 1) * 100) };
  });
}
export const FT_MAX_ANCHORS = 13, FT_MIN_ANCHORS = 3;

/* ============ deterministic strategy engine ============ */
// cfg: { kind, budget, startPrice, intervalSteps, buyAmount, tpPct,
//        valueStep, gridLow, gridHigh, gridCount, perGrid, costPct }
// costPct = per-side trading cost (commission+slippage) in % — buys fill above, sells below.
export function simulateStrategy(pricePath: PricePath | PathPoint[], cfg: FTCfg): SimResult {
  const steps: SimStep[] = [], events: SimEvent[] = [];
  let qty = 0, cost = 0, bought = 0, sold = 0, realized = 0, maxDeployed = 0, mdd = 0, rounds = 0, tpHit = false, lastLevel: number | null = null, exit: SimExit | null = null;
  let sigPeak = 0, sigEntry = 0, sigWasAbove = false, sigTrades = 0;
  const N = pricePath.length;
  const cf = 1 + (cfg.costPct || 0) / 100;   // buy-side cost factor
  const cs = 1 - (cfg.costPct || 0) / 100;   // sell-side cost factor
  const gridStep = cfg.gridCount ? ((cfg.gridHigh as number) - (cfg.gridLow as number)) / cfg.gridCount : 0;

  pricePath.forEach((pt, i) => {
    const price = pt.price;
    const avgBefore = qty > 0 ? cost / qty : null;
    const isBuyTick = cfg.intervalSteps ? (i % cfg.intervalSteps === 0) : false;
    let action: "buy" | "sell" | null = null, side: "buy" | "sell" | null = null, aQty = 0, aAmt = 0;

    const doBuy = (amt: number) => {
      amt = Math.min(amt, Math.max(0, cfg.budget - bought + sold));
      if (amt <= 1) return false;
      const q = amt / (price * cf); qty += q; cost += amt; bought += amt; rounds++;
      action = side = "buy"; aQty = q; aAmt = amt; return true;
    };
    const doSell = (sq: number) => {
      sq = Math.min(sq, qty);
      if (sq <= 0) return false;
      const a = cost / qty; realized += sq * (price * cs - a); cost -= a * sq; qty -= sq; sold += sq * price * cs;
      action = side = "sell"; aQty = sq; aAmt = sq * price * cs; return true;
    };

    if (!tpHit) {
      if (cfg.kind === "hold") {
        if (i === 0) doBuy(cfg.budget);
      } else if (cfg.kind === "infinite") {
        if (isBuyTick) doBuy(avgBefore != null && price < avgBefore ? (cfg.buyAmount as number) * 2 : (cfg.buyAmount as number));
      } else if (cfg.kind === "dca") {
        if (isBuyTick) doBuy(cfg.buyAmount as number);
      } else if (cfg.kind === "value") {
        if (isBuyTick) {
          const desired = (cfg.valueStep as number) * (rounds + 1);
          const diff = desired - qty * price;
          if (diff > (cfg.valueStep as number) * 0.04) doBuy(diff);
          else if (diff < (cfg.valueStep as number) * -0.04) doSell(Math.min(qty, -diff / price));
          rounds++; // value-averaging counts every check as a round
        }
      } else if (cfg.kind === "grid") {
        const level = Math.floor((price - (cfg.gridLow as number)) / (gridStep || 1));
        if (lastLevel == null) lastLevel = level;
        if (level < lastLevel && price >= (cfg.gridLow as number)) doBuy((cfg.perGrid as number) * (lastLevel - level));
        else if (level > lastLevel && qty > 0 && price <= (cfg.gridHigh as number)) doSell(Math.min(qty, ((cfg.perGrid as number) * (level - lastLevel)) / price));
        lastLevel = level;
      } else if (cfg.kind === "rebalance") {
        // band rebalancing: hold a target position value; buy/sell back to it when bands breach
        if (i === 0) { doBuy(cfg.targetValue as number); }
        else if (isBuyTick) {
          const posVal = qty * price;
          if (posVal < (cfg.targetValue as number) * ((cfg.bandLow as number) / 100)) doBuy((cfg.targetValue as number) - posVal);
          else if (posVal > (cfg.targetValue as number) * ((cfg.bandHigh as number) / 100)) doSell(Math.min(qty, (posVal - (cfg.targetValue as number)) / price));
        }
      } else if (cfg.kind === "signal") {
        // trend-following: enter on MA up-cross, exit on trailing/hard stop, re-enter on next cross
        const w = cfg.maWin || 5, lo = Math.max(0, i - w + 1);
        let s = 0; for (let k = lo; k <= i; k++) s += pricePath[k].price;
        const ma = s / (i - lo + 1);
        const above = price > ma;
        if (qty <= 0) {
          if (above && !sigWasAbove && i > 0) { if (doBuy(cfg.budget - bought + sold)) { sigEntry = price; sigPeak = price; } }
        } else {
          sigPeak = Math.max(sigPeak, price);
          const trail = cfg.trailPct || 12, stop = cfg.stopPct || 8;
          if (price <= sigPeak * (1 - trail / 100) || price <= sigEntry * (1 - stop / 100)) {
            if (doSell(qty)) { sigTrades++; exit = { type: "sl", t: pt.t }; }
          }
        }
        sigWasAbove = above;
      } else { // fallback = dca-like
        if (isBuyTick) doBuy(cfg.buyAmount as number);
      }
    }

    // universal exit rules: take-profit / stop-loss — by return % OR by P&L amount.
    // signal manages its own trailing/hard-stop exits (and re-entry), so skip the global halt for it.
    if (!tpHit && qty > 0 && cfg.kind !== "signal") {
      const a = cost / qty, r = (price / a - 1) * 100;
      const upnl = qty * price - cost;   // unrealized P&L in plan currency
      const tpFire = cfg.tpMode === "amt" ? ((cfg.tpAmt as number) > 0 && upnl >= (cfg.tpAmt as number)) : ((cfg.tpPct as number) > 0 && r >= (cfg.tpPct as number));
      const slFire = cfg.slMode === "amt" ? ((cfg.slAmt as number) > 0 && upnl <= -(cfg.slAmt as number)) : ((cfg.slPct as number) > 0 && r <= -(cfg.slPct as number));
      if (tpFire && rounds >= 1) { doSell(qty); tpHit = true; exit = { type: "tp", t: pt.t }; }
      else if (slFire) { doSell(qty); tpHit = true; exit = { type: "sl", t: pt.t }; }
    }

    const avg = qty > 0 ? cost / qty : avgBefore;
    const unreal = avg != null && qty > 0 ? qty * (price - avg) : 0;
    if (unreal < mdd) mdd = unreal;
    maxDeployed = Math.max(maxDeployed, cost);
    if (action) events.push({ t: pt.t, side: side as unknown as "buy" | "sell", price, qty: aQty, amount: aAmt, round: rounds });
    steps.push({ t: pt.t, price, avg: qty > 0 ? cost / qty : null, qty, deployed: cost, value: qty * price, pnl: unreal + realized });
  });

  const last = pricePath[N - 1];
  const finalValue = qty * last.price;
  const totalPnl = finalValue + sold - bought;
  const summary: SimSummary = {
    finalAvg: qty > 0 ? cost / qty : null,
    maxDeployed, rounds: events.filter(e => e.side === "buy").length,
    sells: events.filter(e => e.side === "sell").length,
    mdd, mddPct: maxDeployed > 0 ? (mdd / maxDeployed) * 100 : 0,
    breakeven: qty > 0 ? cost / qty : null, finalValue,
    finalRet: maxDeployed > 0 ? (totalPnl / maxDeployed) * 100 : 0,
    won: totalPnl >= 0, tpHit, exit, sigTrades, kind: cfg.kind,
  };
  return { steps, events, summary };
}

// derive per-kind tick intervals from the editable params (shared by all FT modes)
export function deriveFTCfg(cfg: FTCfg, N: number): FTCfg {
  const c = { ...cfg };
  if (c.kind === "infinite") { c.intervalSteps = Math.max(2, Math.round(N / Math.max(4, c.divisions as number))); c.buyAmount = Math.round(c.budget / Math.max(1, c.divisions as number)); }
  else if (c.kind === "dca") { const buys = Math.max(2, Math.round(c.budget / Math.max(1, c.buyAmount as number))); c.intervalSteps = Math.max(2, Math.min(24, Math.floor(N / buys))); }
  else if (c.kind === "value") { c.intervalSteps = 6; }
  else if (c.kind === "rebalance") { c.intervalSteps = 5; }
  return c;
}

// the four canonical strategies compared on one path (same budget, same costs)
export function ftCompareSet(plan: Plan, baseCfg: FTCfg) {
  const b = baseCfg.budget, costPct = baseCfg.costPct || 0;
  return [
    { key: "infinite", cfg: { ...baseCfg, kind: "infinite", budget: b, costPct } },
    { key: "dca", cfg: { ...baseCfg, kind: "dca", budget: b, costPct, buyAmount: Math.round(b / 16) } },
    { key: "rebalance", cfg: { ...baseCfg, kind: "rebalance", budget: b, costPct, targetValue: Math.round(b * 0.5), bandLow: 80, bandHigh: 120 } },
    { key: "hold", cfg: { ...baseCfg, kind: "hold", budget: b, costPct } },
  ];
}

/* ============ strategy config derived from plan + editable params ============ */
export function defaultFTParams(plan: Plan, strat: Strategy | null | undefined): FTCfg {
  const base = plan.currentPrice;
  const budget = (plan.totalInvested || base * 100) * 2.2;
  const kindMap: Record<string, string> = { st1: "infinite", st4: "dca", st5: "value", st6: "grid", st3: "rebalance", st7: "rebalance", st2: "signal" };
  const kind = kindMap[strat ? strat.id : ""] || (strat && (strat.cat as string) === "rebal" ? "rebalance" : strat && (strat.cat as string) === "signal" ? "signal" : strat && (strat.cat as string) === "accum" ? "dca" : "dca");
  const targetWeight = strat && strat.id === "st7" ? 0.6 : 0.5;
  const isTight = strat && strat.id === "st7"; // 60/40 uses a tighter drift band
  return {
    kind: kind as FTCfg["kind"],
    budget: Math.round(budget),
    startPrice: base,
    divisions: plan.divisions || 24,
    intervalSteps: 6,
    buyAmount: Math.round(budget / (plan.divisions || 24)),
    tpPct: 10,
    slPct: 0,
    tpMode: "pct",
    slMode: "pct",
    tpAmt: Math.round(budget * 0.1),
    slAmt: Math.round(budget * 0.1),
    valueStep: Math.round(budget / 18),
    gridLow: Math.round(base * 0.8),
    gridHigh: Math.round(base * 1.15),
    gridCount: 10,
    perGrid: Math.round(budget / 12),
    targetValue: Math.round(budget * targetWeight),
    bandLow: isTight ? 90 : 80,
    bandHigh: isTight ? 110 : 120,
    // signal (trend-following): MA up-cross entry, trailing + hard stop exit, re-entry allowed
    maWin: 5,
    trailPct: 12,
    stopPct: 8,
    costPct: 0,
  };
}
