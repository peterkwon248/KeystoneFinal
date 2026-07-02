// futuretest.jsx — "Future-test": a forward-looking, deterministic strategy simulator.
// NOT a price forecast. The user defines an explicit WHAT-IF price scenario (an assumption);
// the engine then plays the chosen strategy through it and shows the mechanical result
// (avg-cost descent, buy points, P&L band, deployed capital) — like backtesting, but on
// a hypothetical future path the user controls. Price path is dashed/anchored to stay honest.

/* ============ what-if price scenarios — parametric + custom-draw ============ */
// A path is authored by the user as an ASSUMPTION, never a forecast. Two modes:
//  - parametric: control points [start, extreme@troughT, end] eased + seeded noise
//  - custom: the user drags anchor points to draw an arbitrary path
// presets just seed the parametric knobs (depth / troughT / endPct / vol / peak).
const FT_PRESETS = {
  vrebound: { depth: 30, troughT: 0.44, endPct: 6,   vol: 26, peak: false },
  lshape:   { depth: 28, troughT: 0.40, endPct: -25, vol: 20, peak: false },
  stair:    { depth: 32, troughT: 0.80, endPct: -30, vol: 34, peak: false },
  range:    { depth: 16, troughT: 0.50, endPct: -3,  vol: 72, peak: false },
  uptrend:  { depth: 30, troughT: 0.82, endPct: 30,  vol: 28, peak: true  },
  spike:    { depth: 33, troughT: 0.32, endPct: 7,   vol: 30, peak: true  },
};
const FT_SHAPE_LIST = ["vrebound", "lshape", "stair", "range", "uptrend", "spike"];

function ftEase(f) { f = Math.max(0, Math.min(1, f)); return 0.5 - 0.5 * Math.cos(Math.PI * f); }

// smooth (AR1) seeded noise, zero-mean
function ftNoise(seed, n) {
  let s = 0; for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) % 233280;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const out = []; let v = 0;
  for (let i = 0; i < n; i++) { v = v * 0.62 + (rnd() - 0.5); out.push(v); }
  return out;
}

// build a price path from a params object.
// params: { anchors?:[{t,pct}], depth, troughT, endPct, vol, peak, seed }
function buildPricePath(params, startPrice, N = 96) {
  const { anchors, depth = 25, troughT = 0.45, endPct = 0, vol = 30, peak = false, seed = "ft" } = params || {};
  let cps;
  if (anchors && anchors.length >= 2) {
    cps = anchors.slice().sort((a, b) => a.t - b.t).map(a => [a.t, a.pct]);
    if (cps[0][0] > 0.001) cps.unshift([0, 0]);
  } else {
    cps = [[0, 0], [troughT, (peak ? 1 : -1) * depth], [1, endPct]];
  }
  const noise = ftNoise(seed, N);
  const path = [];
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
function seedAnchors(params, months = 9, N = 96) {
  // ALWAYS 7 evenly-spaced anchors regardless of the time unit/period — a predictable,
  // grabbable grid. Coarse SHAPE only; daily wiggle comes from the volatility slider.
  // (User can click empty chart space to add up to FT_MAX_ANCHORS for finer control.)
  const steps = 6; // → 7 anchors (0..1)
  const ts = []; for (let k = 0; k <= steps; k++) ts.push(k / steps);
  const path = buildPricePath({ ...params, vol: 0 }, 100, N);
  return ts.map(t => {
    const s = path.reduce((a, b) => Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a);
    return { t, pct: Math.round((s.price / 100 - 1) * 100) };
  });
}
const FT_MAX_ANCHORS = 13, FT_MIN_ANCHORS = 3;

/* ============ deterministic strategy engine ============ */
// cfg: { kind, budget, startPrice, intervalSteps, buyAmount, tpPct,
//        valueStep, gridLow, gridHigh, gridCount, perGrid, costPct }
// costPct = per-side trading cost (commission+slippage) in % — buys fill above, sells below.
function simulateStrategy(pricePath, cfg) {
  const steps = [], events = [];
  let qty = 0, cost = 0, bought = 0, sold = 0, realized = 0, maxDeployed = 0, mdd = 0, rounds = 0, tpHit = false, lastLevel = null, exit = null;
  let sigPeak = 0, sigEntry = 0, sigWasAbove = false, sigTrades = 0;
  const N = pricePath.length;
  const cf = 1 + (cfg.costPct || 0) / 100;   // buy-side cost factor
  const cs = 1 - (cfg.costPct || 0) / 100;   // sell-side cost factor
  const gridStep = cfg.gridCount ? (cfg.gridHigh - cfg.gridLow) / cfg.gridCount : 0;

  pricePath.forEach((pt, i) => {
    const price = pt.price;
    const avgBefore = qty > 0 ? cost / qty : null;
    const isBuyTick = cfg.intervalSteps ? (i % cfg.intervalSteps === 0) : false;
    let action = null, side = null, aQty = 0, aAmt = 0;

    const doBuy = (amt) => {
      amt = Math.min(amt, Math.max(0, cfg.budget - bought + sold));
      if (amt <= 1) return false;
      const q = amt / (price * cf); qty += q; cost += amt; bought += amt; rounds++;
      action = side = "buy"; aQty = q; aAmt = amt; return true;
    };
    const doSell = (sq) => {
      sq = Math.min(sq, qty);
      if (sq <= 0) return false;
      const a = cost / qty; realized += sq * (price * cs - a); cost -= a * sq; qty -= sq; sold += sq * price * cs;
      action = side = "sell"; aQty = sq; aAmt = sq * price * cs; return true;
    };

    if (!tpHit) {
      if (cfg.kind === "hold") {
        if (i === 0) doBuy(cfg.budget);
      } else if (cfg.kind === "infinite") {
        if (isBuyTick) doBuy(avgBefore != null && price < avgBefore ? cfg.buyAmount * 2 : cfg.buyAmount);
      } else if (cfg.kind === "dca") {
        if (isBuyTick) doBuy(cfg.buyAmount);
      } else if (cfg.kind === "value") {
        if (isBuyTick) {
          const desired = cfg.valueStep * (rounds + 1);
          const diff = desired - qty * price;
          if (diff > cfg.valueStep * 0.04) doBuy(diff);
          else if (diff < -cfg.valueStep * 0.04) doSell(Math.min(qty, -diff / price));
          rounds++; // value-averaging counts every check as a round
        }
      } else if (cfg.kind === "grid") {
        const level = Math.floor((price - cfg.gridLow) / (gridStep || 1));
        if (lastLevel == null) lastLevel = level;
        if (level < lastLevel && price >= cfg.gridLow) doBuy(cfg.perGrid * (lastLevel - level));
        else if (level > lastLevel && qty > 0 && price <= cfg.gridHigh) doSell(Math.min(qty, (cfg.perGrid * (level - lastLevel)) / price));
        lastLevel = level;
      } else if (cfg.kind === "rebalance") {
        // band rebalancing: hold a target position value; buy/sell back to it when bands breach
        if (i === 0) { doBuy(cfg.targetValue); }
        else if (isBuyTick) {
          const posVal = qty * price;
          if (posVal < cfg.targetValue * (cfg.bandLow / 100)) doBuy(cfg.targetValue - posVal);
          else if (posVal > cfg.targetValue * (cfg.bandHigh / 100)) doSell(Math.min(qty, (posVal - cfg.targetValue) / price));
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
        if (isBuyTick) doBuy(cfg.buyAmount);
      }
    }

    // universal exit rules: take-profit / stop-loss — by return % OR by P&L amount.
    // signal manages its own trailing/hard-stop exits (and re-entry), so skip the global halt for it.
    if (!tpHit && qty > 0 && cfg.kind !== "signal") {
      const a = cost / qty, r = (price / a - 1) * 100;
      const upnl = qty * price - cost;   // unrealized P&L in plan currency
      const tpFire = cfg.tpMode === "amt" ? (cfg.tpAmt > 0 && upnl >= cfg.tpAmt) : (cfg.tpPct > 0 && r >= cfg.tpPct);
      const slFire = cfg.slMode === "amt" ? (cfg.slAmt > 0 && upnl <= -cfg.slAmt) : (cfg.slPct > 0 && r <= -cfg.slPct);
      if (tpFire && rounds >= 1) { doSell(qty); tpHit = true; exit = { type: "tp", t: pt.t }; }
      else if (slFire) { doSell(qty); tpHit = true; exit = { type: "sl", t: pt.t }; }
    }

    const avg = qty > 0 ? cost / qty : avgBefore;
    const unreal = avg != null && qty > 0 ? qty * (price - avg) : 0;
    if (unreal < mdd) mdd = unreal;
    maxDeployed = Math.max(maxDeployed, cost);
    if (action) events.push({ t: pt.t, side, price, qty: aQty, amount: aAmt, round: rounds });
    steps.push({ t: pt.t, price, avg: qty > 0 ? cost / qty : null, qty, deployed: cost, value: qty * price, pnl: unreal + realized });
  });

  const last = pricePath[N - 1];
  const finalValue = qty * last.price;
  const totalPnl = finalValue + sold - bought;
  const summary = {
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
function deriveFTCfg(cfg, N) {
  const c = { ...cfg };
  if (c.kind === "infinite") { c.intervalSteps = Math.max(2, Math.round(N / Math.max(4, c.divisions))); c.buyAmount = Math.round(c.budget / Math.max(1, c.divisions)); }
  else if (c.kind === "dca") { const buys = Math.max(2, Math.round(c.budget / Math.max(1, c.buyAmount))); c.intervalSteps = Math.max(2, Math.min(24, Math.floor(N / buys))); }
  else if (c.kind === "value") { c.intervalSteps = 6; }
  else if (c.kind === "rebalance") { c.intervalSteps = 5; }
  return c;
}

// the four canonical strategies compared on one path (same budget, same costs)
function ftCompareSet(plan, baseCfg) {
  const b = baseCfg.budget, costPct = baseCfg.costPct || 0;
  return [
    { key: "infinite", cfg: { ...baseCfg, kind: "infinite", budget: b, costPct } },
    { key: "dca", cfg: { ...baseCfg, kind: "dca", budget: b, costPct, buyAmount: Math.round(b / 16) } },
    { key: "rebalance", cfg: { ...baseCfg, kind: "rebalance", budget: b, costPct, targetValue: Math.round(b * 0.5), bandLow: 80, bandHigh: 120 } },
    { key: "hold", cfg: { ...baseCfg, kind: "hold", budget: b, costPct } },
  ];
}

/* ============ strategy config derived from plan + editable params ============ */
function defaultFTParams(plan, strat) {
  const base = plan.currentPrice;
  const budget = (plan.totalInvested || base * 100) * 2.2;
  const kindMap = { st1: "infinite", st4: "dca", st5: "value", st6: "grid", st3: "rebalance", st7: "rebalance", st2: "signal" };
  const kind = kindMap[strat ? strat.id : ""] || (strat && strat.cat === "rebal" ? "rebalance" : strat && strat.cat === "signal" ? "signal" : strat && strat.cat === "accum" ? "dca" : "dca");
  const targetWeight = strat && strat.id === "st7" ? 0.6 : 0.5;
  const isTight = strat && strat.id === "st7"; // 60/40 uses a tighter drift band
  return {
    kind,
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

Object.assign(window, { buildPricePath, seedAnchors, simulateStrategy, deriveFTCfg, ftCompareSet, defaultFTParams, FT_PRESETS, FT_SHAPE_LIST, FutureTest });

/* ============ the Future-test panel ============ */
// small labeled dropdown for panel-level settings (unit / display currency)
function FTSelect({ value, options, onPick, title }) {
  const [open, setOpen] = React.useState(false);
  const cur = options.find(o => o[0] === value);
  return (
    <span className="ft-sel-wrap">
      <button className="ft-sel" title={title} onClick={() => setOpen(o => !o)}>
        {cur ? cur[1] : value}
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && <>
        <div className="v-menu-scrim" onClick={() => setOpen(false)} />
        <div className="v-menu ft-sel-menu">
          {options.map(([v, lab]) => (
            <div key={v} className="v-menu-item" onClick={() => { onPick(v); setOpen(false); }}>
              <span>{lab}</span>
              {v === value && <Lic name="check" size={13} cls="icon-sm" color="var(--accent)" />}
            </div>
          ))}
        </div>
      </>}
    </span>
  );
}

function FutureTest({ plan, t, lang }) {
  // strategy under test — defaults to the plan's own, switchable in 전개/스트레스 ("what if this were DCA?")
  const [stratId, setStratId] = React.useState(plan.strategyId);
  React.useEffect(() => { setStratId(plan.strategyId); }, [plan.id]);
  const strat = STRATEGIES.find(s => s.id === stratId);
  const supported = strat && (strat.cat === "accum" || strat.cat === "rebal" || strat.cat === "signal");
  const [ftMode, setFtMode] = React.useState("playout"); // playout | compare | stress
  const [unit, setUnit] = React.useState("m");           // d | m | y — every time label follows
  const [dispCur, setDispCur] = React.useState(plan.cur); // ₩/$ display toggle (mock FX)
  const pickUnit = (u) => {
    setUnit(u);
    // clamp horizon into the new unit's range so slider & labels stay coherent
    const R = { d: [7 / 30, 3], m: [1, 36], y: [12, 60] };
    setMonths(m => Math.max(R[u][0], Math.min(R[u][1], m)));
  };
  const [shape, setShape] = React.useState("vrebound");
  // parametric scenario knobs (seeded by the preset)
  const [scn, setScn] = React.useState(() => ({ ...FT_PRESETS.vrebound }));
  const [months, setMonths] = React.useState(9);
  const [drawMode, setDrawMode] = React.useState(false);
  const [anchors, setAnchors] = React.useState(null); // custom-draw control points
  const [cfg, setCfg] = React.useState(() => defaultFTParams(plan, strat));
  // re-seed params when the strategy under test changes (keeps budget/cost, swaps mechanics)
  React.useEffect(() => { setCfg(c => ({ ...defaultFTParams(plan, strat), budget: c.budget, costPct: c.costPct, tpPct: c.tpPct, slPct: c.slPct, tpMode: c.tpMode, slMode: c.slMode, tpAmt: c.tpAmt, slAmt: c.slAmt, tpCur: c.tpCur, slCur: c.slCur })); }, [stratId]);
  const [prog, setProg] = React.useState(1);      // 0..1 reveal
  const [playing, setPlaying] = React.useState(false);
  const rafRef = React.useRef(0);
  const N = 96;

  // pick a preset → seed knobs, drop any custom drawing
  const pickShape = (id) => { setShape(id); setScn({ ...FT_PRESETS[id] }); setAnchors(seedAnchors(FT_PRESETS[id], months, N)); };
  const setScnK = (k, v) => setScn(s => ({ ...s, [k]: v }));
  const toggleDraw = () => {
    setDrawMode(d => {
      const next = !d;
      if (next && !anchors) setAnchors(seedAnchors(scn, months, N));
      return next;
    });
  };
  const setAnchor = (i, pct) => setAnchors(a => { const n = a.slice(); n[i] = { ...n[i], pct }; return n; });
  // click empty chart space → add an anchor (cap FT_MAX_ANCHORS); ignore if too close in time
  const addAnchor = (t, pct) => setAnchors(a => {
    if (!a || a.length >= FT_MAX_ANCHORS) return a;
    if (a.some(an => Math.abs(an.t - t) < 0.04)) return a;
    return a.concat([{ t, pct }]).sort((x, y) => x.t - y.t);
  });
  // remove an interior anchor (never the locked start or the end); keep ≥ FT_MIN_ANCHORS
  const removeAnchor = (i) => setAnchors(a => (a && a.length > FT_MIN_ANCHORS && i > 0 && i < a.length - 1) ? a.filter((_, j) => j !== i) : a);

  // anchors are t-FRACTIONS (0..1), so changing the period keeps the drawn SHAPE intact —
  // no re-seed on months change. Only a preset pick or first entry seeds.

  // freeze the baseline while live ticks run — the FT chart is an assumption, not a quote feed
  const ftBase = React.useMemo(() => plan.currentPrice, [plan.id]);
  const pricePath = React.useMemo(() => buildPricePath(
    drawMode ? { anchors, vol: scn.vol, seed: plan.ticker } : { ...scn, seed: plan.ticker },
    ftBase, N
  ), [drawMode, anchors, scn, ftBase, plan.ticker]);

  const effCfg = React.useMemo(() => deriveFTCfg(cfg, N), [cfg]);
  const sim = React.useMemo(() => simulateStrategy(pricePath, effCfg), [pricePath, effCfg]);

  // when inputs change, snap to full result (instant feedback) — but never mid-playback
  React.useEffect(() => { cancelAnimationFrame(rafRef.current); setPlaying(false); setProg(1); }, [scn, anchors, drawMode, months, cfg]);
  React.useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const play = () => {
    cancelAnimationFrame(rafRef.current);
    if (playing) { setPlaying(false); return; }
    setPlaying(true); setProg(0);
    let start = null; const dur = 2600;
    const tick = (ts) => {
      if (start == null) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      setProg(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick); else setPlaying(false);
    };
    rafRef.current = requestAnimationFrame(tick);
  };
  const setParam = (k, v) => setCfg(c => ({ ...c, [k]: v }));

  return (
    <div className="ft-panel">
      <div className="ft-head">
        <div className="ft-titlewrap">
          <Lic name="flask-conical" size={15} cls="icon-sm" color="var(--accent)" />
          <span className="ft-title">{t.futureTest}</span>
        </div>
        <div className="ft-tools">
          {ftMode !== "compare" && <FTSelect title={lang === "ko" ? "테스트할 전략 — 기본은 플랜 전략" : "Strategy under test — defaults to the plan's"} value={stratId} onPick={setStratId}
            options={(plan.strategyId ? [] : [[null, t.noStrategy]]).concat(STRATEGIES.map(s => [s.id, s.name[lang] + (s.id === plan.strategyId ? (lang === "ko" ? " · 플랜" : " · plan") : "")]))} />}
          <FTSelect title={lang === "ko" ? "시간 단위" : "Time unit"} value={unit} onPick={pickUnit}
            options={[["d", lang === "ko" ? "일" : "Days"], ["m", lang === "ko" ? "월" : "Months"], ["y", lang === "ko" ? "년" : "Years"]]} />
          <FTSelect title={lang === "ko" ? "표시 통화 (≈₩1,380/$)" : "Display currency (≈₩1,380/$)"} value={dispCur} onPick={setDispCur}
            options={[["KRW", lang === "ko" ? "₩ 원화" : "₩ KRW"], ["USD", lang === "ko" ? "$ 달러" : "$ USD"]]} />
          <div className="ft-modeseg">
            {[["playout", t.ftm_playout], ["compare", t.ftm_compare], ["stress", t.ftm_stress]].map(([v, lab]) => (
              <div key={v} className={"ft-mode" + (ftMode === v ? " on" : "")} onClick={() => setFtMode(v)}>{lab}</div>
            ))}
          </div>
        </div>
      </div>

      {ftMode === "compare" && <CompareView plan={plan} t={t} lang={lang} pricePath={pricePath} cfg={effCfg} N={N}
        shape={shape} pickShape={pickShape} scn={scn} setScnK={setScnK} months={months} setMonths={setMonths} drawMode={drawMode} unit={unit} dispCur={dispCur} />}
      {ftMode === "stress" && <StressView plan={plan} t={t} lang={lang} strat={strat} cfg={effCfg} N={N} months={months} setMonths={setMonths} ftBase={ftBase} unit={unit} dispCur={dispCur} />}
      {ftMode === "playout" && <PlayoutView plan={plan} t={t} lang={lang} strat={strat} supported={supported}
        shape={shape} pickShape={pickShape} scn={scn} setScnK={setScnK}
        months={months} setMonths={setMonths} cfg={cfg} setParam={setParam}
        drawMode={drawMode} toggleDraw={toggleDraw} anchors={anchors} setAnchor={setAnchor} addAnchor={addAnchor} removeAnchor={removeAnchor} maxAnchors={FT_MAX_ANCHORS}
        pricePath={pricePath} sim={sim} prog={prog} playing={playing} play={play} setProg={setProg} unit={unit} dispCur={dispCur} />}
    </div>
  );
}
