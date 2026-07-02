// trajectory.jsx — performance-trajectory math for the timeline + detail band.
// Market-price path is a deterministic MOCK (real data wires in later via Claude Code).
// Avg-cost path, executions, status transitions are REAL (derived from plan data).

// month index helpers shared with the timeline
const TRAJ_MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
function trajMonthIdx(dateStr) {
  if (!dateStr) return null;
  const mon = dateStr.split(" ")[0];
  const idx = TRAJ_MONTHS.indexOf(mon);
  if (idx < 0) return null;
  const day = parseInt(dateStr.split(" ")[1] || "15");
  return idx + (day / 31); // fractional month
}

// deterministic pseudo-random walk between two endpoints, seeded by ticker
function seededWalk(seed, n, startV, endV, vol) {
  let s = 0; for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) % 233280;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const pts = [];
  for (let i = 0; i < n; i++) {
    const tnorm = i / (n - 1);
    const base = startV + (endV - startV) * tnorm;
    const noise = (rnd() - 0.5) * vol * base * (1 - Math.abs(tnorm - 0.5)); // less noise at ends
    pts.push(base + noise);
  }
  pts[0] = startV; pts[n - 1] = endV;
  return pts;
}

// Build the full trajectory for a plan.
// Returns { start, end, samples:[{t, mkt, avg|null}], execs:[{t,side,price,qty}],
//           transitions:[{t,status}], curRet, won } where t is fractional month index.
function planTrajectory(p) {
  const execs = (p.executions || []).map(e => ({ ...e, t: trajMonthIdx(e.date) })).filter(e => e.t != null).sort((a, b) => a.t - b.t);
  const createdT = trajMonthIdx(p.createdAt) ?? 0;
  const todayT = trajMonthIdx("Jun 8");
  let startT = execs.length ? Math.min(execs[0].t, createdT) : createdT;
  const endT = p.closedAt ? (trajMonthIdx(p.closedAt) ?? todayT) : todayT;
  // give very-recent plans a minimum visual width by stretching the START backward —
  // never push the END past today / the close date (that would draw a line into the future).
  let span = endT - startT;
  if (span < 0.5) { startT = endT - 0.5; span = 0.5; }

  // market price endpoints: derive a plausible start price from avg & current
  const curPrice = p.currentPrice;
  const startPrice = p.avgPrice ? p.avgPrice * 1.04 : curPrice * 0.98;
  const sells = execs.filter(e => e.side === "sell");
  const endPrice = (p.status === "closed" && sells.length) ? sells[sells.length - 1].price : curPrice;
  const vol = p.cur === "USD" ? 0.05 : 0.045;

  const N = 48;
  const mktPath = seededWalk(p.ticker, N, startPrice, endPrice, vol);

  // cumulative avg-cost path: step function rebuilt as buys accrue
  const samples = [];
  for (let i = 0; i < N; i++) {
    const t = startT + (span * i) / (N - 1);
    // avg cost from all buys with exec.t <= t
    let cost = 0, qty = 0;
    execs.forEach(e => { if (e.t <= t && e.side === "buy") { cost += e.price * e.qty; qty += e.qty; } });
    // subtract sells (reduce qty proportionally, keep avg)
    const avg = qty > 0 ? cost / qty : null;
    samples.push({ t, mkt: mktPath[i], avg });
  }

  // status transitions (synthesize a plausible journey from createdAt → first buy → status)
  const transitions = [{ t: createdT, status: "research" }];
  if (execs.length) transitions.push({ t: execs[0].t, status: "active" });
  if (p.status === "paused") transitions.push({ t: startT + span * 0.7, status: "paused" });
  if (p.status === "closing" || p.status === "closed") {
    const firstSell = sells.length ? sells[0].t : startT + span * 0.85;
    transitions.push({ t: firstSell, status: "closing" });
  }
  if (p.status === "closed") transitions.push({ t: endT, status: "closed" });

  const ret = planReturn(p);

  // ---- journey statistics (footer under the trajectory chart) ----
  const firstBuy = execs.find(e => e.side === "buy");
  const holdDays = firstBuy ? Math.max(0, Math.round((endT - firstBuy.t) * 30.4)) : null;
  // avg-cost improvement: first buy price → current avg cost. negative = averaged down (good).
  const avgImprovePct = (firstBuy && p.avgPrice) ? (p.avgPrice / firstBuy.price - 1) * 100 : null;
  // peak / trough unrealized return along the mock path (relative to avg cost)
  let peakRet = null, troughRet = null, mdd = 0, runPeak = -Infinity;
  samples.forEach(s => {
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

Object.assign(window, { planTrajectory, trajMonthIdx, TRAJ_MONTHS, seededWalk, PerfBand, Sparkline });

/* ---- tiny inline sparkline (mock market path, real win/loss tint) — list rows / headers ---- */
function Sparkline({ plan, w = 62, h = 22 }) {
  const tj = planTrajectory(plan);
  if (!tj.hasPosition) return <span className="spark-empty" style={{ width: w, display: "inline-block" }} />;
  const xs = tj.samples.map(s => s.mkt);
  const lo = Math.min(...xs), hi = Math.max(...xs), span = (hi - lo) || 1;
  const pts = tj.samples.map((s, i) => {
    const x = (i / (tj.samples.length - 1)) * (w - 2) + 1;
    const y = (h - 3) - ((s.mkt - lo) / span) * (h - 6) + 1.5;
    return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  const won = tj.won;
  const color = won == null ? "var(--fg-3)" : won ? "var(--pos)" : "var(--neg)";
  const lastX = w - 1, lastY = (h - 3) - ((xs[xs.length - 1] - lo) / span) * (h - 6) + 1.5;
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <path d={pts} stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lastX} cy={lastY} r="1.8" fill={color} />
    </svg>
  );
}

/* ---- full performance band for the detail view (C, large) ---- */
function PerfBand({ plan, lang, t }) {
  const tj = planTrajectory(plan);
  const [hov, setHov] = React.useState(null);
  const W = 760, H = 200, padL = 8, padR = 8, padT = 26, padB = 26;
  const t0 = tj.startT, t1 = Math.max(tj.endT, tj.todayT);
  const tspan = Math.max(0.5, t1 - t0);
  const x = (tt) => padL + ((tt - t0) / tspan) * (W - padL - padR);
  const vals = tj.samples.map(s => s.mkt).concat(tj.samples.filter(s => s.avg != null).map(s => s.avg));
  const lo = Math.min(...vals), hi = Math.max(...vals), vspan = (hi - lo) || 1;
  const y = (v) => padT + (H - padT - padB) - ((v - lo) / vspan) * (H - padT - padB);
  const pts = tj.samples;
  const mktLine = pts.map((s, i) => `${i ? "L" : "M"}${x(s.t).toFixed(1)} ${y(s.mkt).toFixed(1)}`).join(" ");
  const avgPts = pts.filter(s => s.avg != null);
  const avgLine = avgPts.map((s, i) => `${i ? "L" : "M"}${x(s.t).toFixed(1)} ${y(s.avg).toFixed(1)}`).join(" ");
  // win/loss band segments
  const segs = []; let cur = null;
  pts.forEach(s => {
    if (s.avg == null) { if (cur) { segs.push(cur); cur = null; } return; }
    const win = s.mkt >= s.avg;
    if (!cur || cur.win !== win) { if (cur) segs.push(cur); cur = { win, rows: [] }; }
    cur.rows.push(s);
  });
  if (cur) segs.push(cur);
  const won = tj.won;
  const lineColor = won == null ? "var(--fg-3)" : won ? "var(--pos)" : "var(--neg)";
  const money = (v) => fmtCompact(v, plan.cur);
  const todayX = x(tj.todayT);

  // hover crosshair: nearest sample (+ nearby execution) from mouse position
  const onMove = (ev) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const fx = ((ev.clientX - r.left) / r.width) * W;
    const tt = t0 + ((fx - padL) / (W - padL - padR)) * tspan;
    let s = pts[0];
    pts.forEach(p2 => { if (Math.abs(p2.t - tt) < Math.abs(s.t - tt)) s = p2; });
    let ex = null;
    tj.execs.forEach(e => { if (Math.abs(e.t - tt) < tspan * 0.03 && (!ex || Math.abs(e.t - tt) < Math.abs(ex.t - tt))) ex = e; });
    setHov({ s, ex, frac: (x(s.t) - padL) / (W - padL - padR) });
  };
  const trajDate = (tt) => {
    const mi = Math.max(0, Math.min(TRAJ_MONTHS.length - 1, Math.floor(tt)));
    const day = Math.max(1, Math.min(31, Math.round((tt - mi) * 31) || 1));
    return fmtDate(TRAJ_MONTHS[mi] + " " + day, lang);
  };
  const hovRet = hov && hov.s.avg != null ? (hov.s.mkt / hov.s.avg - 1) * 100 : null;
  return (
    <div className="perfband">
      <div className="perfband-head">
        <span className="pb-title">{lang === "ko" ? "성과 궤적" : "Performance"}</span>
        <span className="pb-legend">
          <span><i className="pb-li mkt" style={{ background: lineColor }} />{lang === "ko" ? "시장가" : "Market"}</span>
          <span><i className="pb-li avg" />{lang === "ko" ? "평단가" : "Avg cost"}</span>
        </span>
      </div>
      <div className="perfband-plot" onMouseMove={onMove} onMouseLeave={() => setHov(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="perfband-svg" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map(g => <line key={g} x1={padL} y1={padT + (H - padT - padB) * g} x2={W - padR} y2={padT + (H - padT - padB) * g} stroke="var(--border)" strokeWidth="1" />)}
        {segs.map((seg, i) => {
          if (seg.rows.length < 2) return null;
          const top = seg.rows.map(s => `${x(s.t).toFixed(1)} ${y(s.mkt).toFixed(1)}`);
          const bot = seg.rows.slice().reverse().map(s => `${x(s.t).toFixed(1)} ${y(s.avg).toFixed(1)}`);
          return <path key={i} d={`M${top.join(" L")} L${bot.join(" L")} Z`} fill={seg.win ? "var(--pos)" : "var(--neg)"} opacity="0.15" />;
        })}
        {avgPts.length > 1 && <path d={avgLine} fill="none" stroke="var(--fg-3)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8" />}
        <path d={mktLine} fill="none" stroke={lineColor} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {tj.transitions.map((tr, i) => <line key={"t" + i} x1={x(tr.t)} y1={padT - 4} x2={x(tr.t)} y2={H - padB + 4} stroke={(PLAN_STATUS[tr.status] || {}).color} strokeWidth="1.5" opacity="0.4" strokeDasharray="2 2" />)}
        {tj.execs.map((e, i) => { const s = pts.reduce((a, b) => Math.abs(b.t - e.t) < Math.abs(a.t - e.t) ? b : a); return <circle key={"e" + i} cx={x(e.t)} cy={y(s.mkt)} r="3.5" fill={e.side === "buy" ? "var(--r-active)" : "var(--r-closing)"} stroke="var(--bg-app)" strokeWidth="1.5" />; })}
        <line x1={todayX} y1={padT - 4} x2={todayX} y2={H - padB + 4} stroke="var(--accent)" strokeWidth="1.5" opacity="0.55" />
        {plan.closedAt && <circle cx={x(tj.endT)} cy={y(tj.endPrice)} r="4.5" fill="var(--r-closed)" stroke="var(--bg-app)" strokeWidth="2" />}
        {hov && <g className="pb-hov">
          <line x1={x(hov.s.t)} y1={padT - 4} x2={x(hov.s.t)} y2={H - padB + 4} stroke="var(--fg-3)" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
          <circle cx={x(hov.s.t)} cy={y(hov.s.mkt)} r="3.2" fill={lineColor} stroke="var(--bg-app)" strokeWidth="1.5" />
          {hov.s.avg != null && <circle cx={x(hov.s.t)} cy={y(hov.s.avg)} r="2.6" fill="var(--fg-3)" stroke="var(--bg-app)" strokeWidth="1.5" />}
        </g>}
      </svg>
      {hov && (
        <div className={"pb-tip" + (hov.frac > 0.62 ? " flip" : "")} style={{ left: (hov.frac * 100) + "%" }}>
          <div className="pb-tip-date">{trajDate(hov.s.t)}</div>
          <div className="gtip-row"><span className="gtip-lab">{lang === "ko" ? "시장가" : "Market"}</span><span className="gtip-val">{money(hov.s.mkt)}</span></div>
          {hov.s.avg != null && <div className="gtip-row"><span className="gtip-lab">{lang === "ko" ? "평단가" : "Avg cost"}</span><span className="gtip-val">{money(hov.s.avg)}</span></div>}
          {hovRet != null && <div className="gtip-row"><span className="gtip-lab">{t.retRate}</span><span className={"gtip-val " + (hovRet >= 0 ? "pos" : "neg")}>{(hovRet >= 0 ? "+" : "") + hovRet.toFixed(1) + "%"}</span></div>}
          {hov.ex && <>
            <div className="gtip-sep"></div>
            <div className="gtip-row"><span className="gtip-lab" style={{ color: hov.ex.side === "buy" ? "var(--r-active)" : "var(--r-closing)" }}>{hov.ex.side === "buy" ? (lang === "ko" ? "매수 체결" : "Buy") : (lang === "ko" ? "매도 체결" : "Sell")}</span><span className="gtip-val">{money(hov.ex.price)} × {hov.ex.qty}</span></div>
          </>}
        </div>
      )}
      </div>
      <div className="perfband-foot">
        {(() => {
          const r = planReturn(plan);
          const closed = plan.status === "closed";
          const closing = plan.status === "closing";
          const co = (closed && typeof closeoutSummary === "function") ? closeoutSummary(plan) : null;
          const sgn = (v) => (v >= 0 ? "+" : "");
          const holdCell = tj.holdDays != null
            ? <span key="hold" className="pb-stat" title={t.tip_pb_hold}><span className="pb-k">{t.holdPeriod}</span><span className="pb-v mono">{tj.holdDays}{lang === "ko" ? "일" : "d"}</span></span> : null;
          // total purchases (gross buys incl. carried-forward rounds) — money + share count
          const Lg = (typeof computeLedger === "function") ? computeLedger(plan) : null;
          const buyQty = Lg ? Lg.rows.filter(rw => rw.type === "buy").reduce((a, rw) => a + rw.e.qty, 0) : (plan.executions || []).filter(e => e.side === "buy").reduce((a, e) => a + e.qty, 0);
          const buyAmt = Lg ? Lg.totals.invested : (plan.executions || []).filter(e => e.side === "buy").reduce((a, e) => a + e.qty * e.price, 0);
          const boughtCell = buyQty > 0
            ? <span key="bought" className="pb-stat" title={t.tip_bought}><span className="pb-k">{t.pb_bought}</span><span className="pb-v mono">{money(buyAmt)}<em className="pb-sub">{Math.round(buyQty).toLocaleString("en-US")}{lang === "ko" ? "주" : "sh"}</em></span></span> : null;
          // anchor: avg cost + current/exit price
          const stats = [
            <span key="avg" className="pb-stat" title={t.tip_avgCost}><span className="pb-k">{t.avg}</span><span className="pb-v mono">{money(plan.avgPrice)}</span></span>,
            <span key="cur" className="pb-stat" title={closed ? t.tip_exitPrice : t.tip_current}><span className="pb-k">{closed ? t.exitL : t.current}</span><span className="pb-v mono">{money(closed && co ? co.avgSell : tj.endPrice)}</span></span>,
          ];
          if (closed) {
            const rp = co ? co.realizedPct : null;
            stats.push(
              <span key="rret" className="pb-stat"><span className="pb-k">{t.realizedRet}</span><span className={"pb-v mono " + (rp == null ? "" : rp >= 0 ? "pos" : "neg")}>{rp == null ? "—" : sgn(rp) + rp.toFixed(1) + "%"}</span></span>,
              <span key="rpl" className="pb-stat" title={t.tip_pb_realizedSoFar}><span className="pb-k">{t.realizedPL}</span><span className={"pb-v mono " + (co && co.realized >= 0 ? "pos" : "neg")}>{co ? sgn(co.realized) + money(co.realized) : "—"}</span></span>,
              boughtCell,
              holdCell,
            );
          } else if (closing) {
            stats.push(
              <span key="rpl" className="pb-stat" title={t.tip_pb_realizedSoFar}><span className="pb-k">{t.pb_realizedSoFar}</span><span className={"pb-v mono " + ((plan.realizedPL || 0) >= 0 ? "pos" : "neg")}>{plan.realizedPL ? sgn(plan.realizedPL) + money(plan.realizedPL) : "—"}</span></span>,
              <span key="open" className="pb-stat" title={t.tip_pb_remain}><span className="pb-k">{t.pb_remainPL}</span><span className={"pb-v mono " + (r ? (r.amt >= 0 ? "pos" : "neg") : "")}>{r ? sgn(r.amt) + money(r.amt) : "—"}</span></span>,
              boughtCell,
              holdCell,
            );
          } else {
            // active / paused — return (% + ₩ sub), holding period, cost-basis change
            stats.push(
              <span key="ret" className="pb-stat" title={t.tip_retRate}><span className="pb-k">{t.retRate}</span><span className={"pb-v mono " + (tj.curRet == null ? "" : tj.curRet >= 0 ? "pos" : "neg")}>{tj.curRet == null ? "—" : sgn(tj.curRet) + tj.curRet.toFixed(1) + "%"}{r && <em className="pb-sub">{sgn(r.amt)}{money(r.amt)}</em>}</span></span>,
              boughtCell,
              holdCell,
              tj.avgImprovePct != null
                ? <span key="imp" className="pb-stat" title={t.tip_pb_avgImprove}><span className="pb-k">{t.pb_avgImprove}</span><span className={"pb-v mono " + (tj.avgImprovePct <= 0 ? "pos" : "neg")}>{sgn(tj.avgImprovePct)}{tj.avgImprovePct.toFixed(1)}%</span></span> : null,
            );
          }
          return stats.filter(Boolean);
        })()}
      </div>
      {tj.hasPosition && tj.peakRet != null && (
        <div className="perfband-journey">
          <span className="pbj-k" title={t.tip_pb_mock}>{t.pb_journey}<i className="pbj-mock">{t.pb_mock}</i></span>
          <span className="pbj-stat" title={t.tip_pb_peak}>{t.pb_peak}<b className="mono pos">+{tj.peakRet.toFixed(1)}%</b></span>
          <span className="pbj-stat" title={t.tip_pb_trough}>{t.pb_trough}<b className={"mono " + (tj.troughRet >= 0 ? "pos" : "neg")}>{tj.troughRet >= 0 ? "+" : ""}{tj.troughRet.toFixed(1)}%</b></span>
          <span className="pbj-stat" title={t.tip_pb_mdd}>{t.pb_mdd}<b className="mono neg">{tj.mdd.toFixed(1)}%</b></span>
        </div>
      )}
    </div>
  );
}
