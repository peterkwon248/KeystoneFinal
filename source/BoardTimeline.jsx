// BoardTimeline.jsx — Plan board (kanban) + Plan timeline (gantt)

/* ============ Board ============ */
function BoardCard({ plan, t, lang, onOpen, onDragStart, dragging, onHover, onLeave, props = ["gauge", "return", "fill", "strategy"] }) {
  const strat = STRATEGIES.find(s => s.id === plan.strategyId);
  const ret = planReturn(plan);
  const fill = plan.divisions ? Math.round(plan.round / plan.divisions * 100) : null;
  const base = plan.scenarios.find(s => s.label.en === "Base") || plan.scenarios[0];
  const g = gaugeData(plan);
  const show = (k) => props.includes(k);
  return (
    <div className={"board-card" + (dragging ? " dragging" : "")} draggable onDragStart={(e) => onDragStart(e, plan.id)} onClick={() => onOpen(plan)}
      onMouseEnter={(e) => onHover && onHover(plan, e)} onMouseMove={(e) => onHover && onHover(plan, e)} onMouseLeave={onLeave}>
      <div className="bc-top">
        <span className="bc-id mono">{plan.id}</span>
        {strat && show("strategy") && <span className="bc-strat"><span className="strat-dot" style={{ background: strat.color }} />{strat.name[lang]}</span>}
      </div>
      <div className="bc-name">{plan.name[lang]}</div>
      <div className="bc-ticker"><Flag market={plan.cur === "KRW" ? "KR" : "US"} size={12} /> {plan.tickerName[lang]} · <span className="mono">{plan.ticker}</span></div>
      {base && <div className="bc-thesis">{base.thesis[lang]}</div>}
      {show("gauge") && <div className="bc-gauge"><ScenarioGauge plan={plan} lang={lang} compact /></div>}
      <div className="bc-metrics">
        <div className="bc-metric"><span className="bc-metric-k">{t.current}</span><span className="bc-metric-v mono">{fmtCompact(plan.currentPrice, plan.cur)}</span></div>
        {show("return") && <div className="bc-metric"><span className="bc-metric-k">{t.retRate}</span><span className={"bc-metric-v mono " + (ret ? (ret.rate >= 0 ? "pos" : "neg") : "")}>{ret ? (ret.rate >= 0 ? "+" : "") + ret.rate.toFixed(1) + "%" : "—"}</span></div>}
        {show("fill") && fill != null && <div className="bc-metric"><span className="bc-metric-k">{t.progress}</span><span className="bc-metric-v mono">{plan.round}/{plan.divisions}</span></div>}
      </div>
      <div className="bc-foot">
        <span className="bc-foot-l">
          {(plan.executions || []).length > 0 && <span className="bc-chip"><Lic name="receipt" size={11} cls="icon-sm" color="var(--fg-4)" />{plan.executions.length}</span>}
          {(plan.rules || []).filter(r => r.on).length > 0 && <span className="bc-chip"><Lic name="zap" size={11} cls="icon-sm" color="var(--fg-4)" />{plan.rules.filter(r => r.on).length}</span>}
        </span>
        <span className="bc-upd">{fmtRel(plan.updatedAt, lang)}</span>
      </div>
    </div>
  );
}

function BoardView({ plans, t, lang, onOpen, onMove, props = ["gauge", "return", "fill", "strategy"], ordering = "updated", onQuickAdd }) {
  const [drag, setDrag] = React.useState(null);
  const [over, setOver] = React.useState(null);
  const [tip, setTip] = React.useState(null);
  const onDragStart = (e, id) => { setDrag(id); e.dataTransfer.effectAllowed = "move"; };
  const onHover = (plan, e) => { if (drag) return; const ret = planReturn(plan); setTip({ plan, ret, x: e.clientX, y: e.clientY }); };
  return (
    <div className="board" onMouseLeave={() => setTip(null)}>
      {STATUS_ORDER.map(st => {
        const items = orderPlans(plans.filter(p => p.status === st), ordering, lang);
        return (
          <div key={st} className={"board-col" + (over === st ? " dragover" : "")}
            onDragOver={(e) => { e.preventDefault(); setOver(st); }}
            onDragLeave={() => setOver(o => o === st ? null : o)}
            onDrop={(e) => { e.preventDefault(); if (drag) onMove(drag, st); setDrag(null); setOver(null); }}>
            <div className="board-col-head">
              <StatusIcon status={st} size={15} />
              <span className="board-col-title">{t["s_" + st]}</span>
              <span className="board-col-count">{items.length}</span>
              {onQuickAdd && <span className="grp-add" title={t.newPlan} onClick={(e) => { e.stopPropagation(); onQuickAdd({ status: st }); }}><Lic name="plus" size={14} cls="icon-sm" color="currentColor" /></span>}
            </div>
            <div className="board-col-body">
              {items.map(p => <BoardCard key={p.id} plan={p} t={t} lang={lang} onOpen={onOpen} onDragStart={onDragStart} dragging={drag === p.id} onHover={onHover} onLeave={() => setTip(null)} props={props} />)}
            </div>
          </div>
        );
      })}
      {tip && <div className="bc-tip" style={{ left: Math.min(tip.x + 14, window.innerWidth - 200), top: Math.min(tip.y + 14, window.innerHeight - 160) }}>
        <div className="bc-tip-head"><Flag market={tip.plan.cur === "KRW" ? "KR" : "US"} size={12} /> {tip.plan.tickerName[lang]} · <span className="mono">{tip.plan.ticker}</span></div>
        <div className="tl-tip-row"><span>{t.current}</span><span className="mono">{fmtMoney(tip.plan.currentPrice, tip.plan.cur)}</span></div>
        {tip.plan.avgPrice != null && <div className="tl-tip-row"><span>{t.avg}</span><span className="mono">{fmtMoney(tip.plan.avgPrice, tip.plan.cur)}</span></div>}
        <div className="tl-tip-row"><span>{t.retRate}</span><span className={"mono " + (tip.ret ? (tip.ret.rate >= 0 ? "pos" : "neg") : "")}>{tip.ret ? (tip.ret.rate >= 0 ? "+" : "") + tip.ret.rate.toFixed(1) + "%" : "—"}</span></div>
        {tip.plan.scenarios.map((s, i) => { const gap = (s.target / tip.plan.currentPrice - 1) * 100; return <div className="tl-tip-row" key={i}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="scsum-dot" style={{ background: s.color }} />{s.label[lang]}</span><span className="mono">{fmtCompact(s.target, tip.plan.cur)} <span style={{ color: gap >= 0 ? "var(--pos)" : "var(--neg)" }}>{gap >= 0 ? "+" : ""}{gap.toFixed(0)}%</span></span></div>; })}
      </div>}
    </div>
  );
}

/* ============ Timeline — performance trajectory (A+C fusion) ============ */
const TL_MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const TL_MONTH_LABEL = { Sep: { en: "Sep", ko: "9월" }, Oct: { en: "Oct", ko: "10월" }, Nov: { en: "Nov", ko: "11월" }, Dec: { en: "Dec", ko: "12월" }, Jan: { en: "Jan '26", ko: "1월" }, Feb: { en: "Feb", ko: "2월" }, Mar: { en: "Mar", ko: "3월" }, Apr: { en: "Apr", ko: "4월" }, May: { en: "May", ko: "5월" }, Jun: { en: "Jun", ko: "6월" } };
const TL_COLW = 116;
const TL_NAMEW = 210;
const TL_ROWH = 56;
const TODAY_T = 9 + 8 / 31; // Jun 8

// one plan's trajectory drawn as a mini line chart spanning its active months
function TrajectoryRow({ plan, lang, mode, overlays, yMode = "price", yDomain = null }) {
  const ov = overlays || { avg: true, band: true, execs: true, transitions: true };
  const tj = planTrajectory(plan);
  const x = (t) => TL_NAMEW + t * TL_COLW + TL_COLW * 0.5;
  const rowTop = 6, rowH = TL_ROWH - 12;
  const pts = tj.samples;
  const isPct = yMode === "pct";
  const base = pts[0] ? pts[0].mkt : 1;
  const conv = (v) => isPct ? (v / base - 1) * 100 : v;
  // y-scale: per-row price range (price mode) or shared % domain (pct mode)
  const vals = pts.map(s => s.mkt).concat(pts.filter(s => s.avg != null).map(s => s.avg));
  let lo, hi;
  if (isPct && yDomain) { lo = yDomain.lo; hi = yDomain.hi; }
  else { lo = Math.min(...vals); hi = Math.max(...vals); }
  const vspan = (hi - lo) || 1;
  const y = (v) => rowTop + rowH - ((conv(v) - lo) / vspan) * rowH;
  const mktLine = pts.map((s, i) => `${i ? "L" : "M"}${x(s.t).toFixed(1)} ${y(s.mkt).toFixed(1)}`).join(" ");
  // avg line only where defined
  const avgPts = pts.filter(s => s.avg != null);
  const avgLine = avgPts.map((s, i) => `${i ? "L" : "M"}${x(s.t).toFixed(1)} ${y(s.avg).toFixed(1)}`).join(" ");
  // P/L shaded band between mkt & avg, split into win(green)/loss(red) segments
  const bandSegs = [];
  if (avgPts.length) {
    let cur = null;
    pts.forEach((s) => {
      if (s.avg == null) { if (cur) { bandSegs.push(cur); cur = null; } return; }
      const win = s.mkt >= s.avg;
      if (!cur || cur.win !== win) { if (cur) bandSegs.push(cur); cur = { win, rows: [] }; }
      cur.rows.push(s);
    });
    if (cur) bandSegs.push(cur);
  }
  const won = tj.won;
  const lineColor = won == null ? "var(--fg-3)" : won ? "var(--pos)" : "var(--neg)";
  // journey mode: status active at each sample → status-colored line segments
  const statusAt = (tt) => { let st = tj.transitions[0] ? tj.transitions[0].status : "research"; tj.transitions.forEach(tr => { if (tr.t <= tt) st = tr.status; }); return st; };
  const journeySegs = [];
  if (mode === "journey") {
    let cur = null;
    pts.forEach((s) => { const st = statusAt(s.t); if (!cur || cur.st !== st) { if (cur) journeySegs.push(cur); cur = { st, rows: [] }; if (journeySegs.length) cur.rows.push(pts[pts.indexOf(s) - 1] || s); } cur.rows.push(s); });
    if (cur) journeySegs.push(cur);
  }
  return (
    <g>
      {/* P/L band (performance only) */}
      {ov.band && mode !== "journey" && bandSegs.map((seg, i) => {
        if (seg.rows.length < 2) return null;
        const top = seg.rows.map(s => `${x(s.t).toFixed(1)} ${y(s.mkt).toFixed(1)}`);
        const bot = seg.rows.slice().reverse().map(s => `${x(s.t).toFixed(1)} ${y(s.avg).toFixed(1)}`);
        const d = `M${top.join(" L")} L${bot.join(" L")} Z`;
        return <path key={i} d={d} fill={seg.win ? "var(--pos)" : "var(--neg)"} opacity="0.13" />;
      })}
      {/* avg-cost line (performance only) */}
      {ov.avg && mode !== "journey" && avgPts.length > 1 && <path d={avgLine} fill="none" stroke="var(--fg-3)" strokeWidth="1" strokeDasharray="3 2.5" opacity="0.7" />}
      {/* market line: single color (performance) or status-segmented (journey) */}
      {mode === "journey"
        ? journeySegs.map((seg, i) => seg.rows.length < 2 ? null : <path key={"j" + i} d={seg.rows.map((s, j) => `${j ? "L" : "M"}${x(s.t).toFixed(1)} ${y(s.mkt).toFixed(1)}`).join(" ")} fill="none" stroke={(PLAN_STATUS[seg.st] || {}).color} strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />)
        : <path d={mktLine} fill="none" stroke={lineColor} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />}
      {/* execution ticks */}
      {ov.execs && tj.execs.map((e, i) => {
        const px = x(e.t), s = pts.reduce((a, b) => Math.abs(b.t - e.t) < Math.abs(a.t - e.t) ? b : a);
        return <circle key={"e" + i} cx={px} cy={y(s.mkt)} r={mode === "journey" ? 3 : 2.6} fill={e.side === "buy" ? "var(--r-active)" : "var(--r-closing)"} stroke="var(--bg-app)" strokeWidth="1.2" />;
      })}
      {/* status transition markers */}
      {ov.transitions && tj.transitions.map((tr, i) => {
        const px = x(tr.t);
        return <g key={"t" + i}>
          <line x1={px} y1={rowTop - 2} x2={px} y2={rowTop + rowH + 2} stroke={(PLAN_STATUS[tr.status] || {}).color} strokeWidth={mode === "journey" ? 1.5 : 1} opacity={mode === "journey" ? 0.5 : 0.26} strokeDasharray={mode === "journey" ? "" : "2 2"} />
          {mode === "journey" && i > 0 && <circle cx={px} cy={rowTop + rowH / 2} r="3.5" fill={(PLAN_STATUS[tr.status] || {}).color} stroke="var(--bg-app)" strokeWidth="1.5" />}
        </g>;
      })}
      {/* end cap: closed = filled dot at exit */}
      {plan.closedAt && <circle cx={x(tj.endT)} cy={y(tj.endPrice)} r="3.5" fill="var(--r-closed)" stroke="var(--bg-app)" strokeWidth="1.5" />}
    </g>
  );
}

function TimelineView({ plans, t, lang, onOpen, mode: modeProp, setMode: setModeProp, ordering = "return", grouping = "none", overlays, yMode = "price" }) {
  const [modeLocal, setModeLocal] = React.useState("performance");
  const mode = modeProp || modeLocal;
  const setMode = setModeProp || setModeLocal;
  const [hover, setHover] = React.useState(null);
  const width = TL_MONTHS.length * TL_COLW;
  const H_HEAD = 34;
  const scrollRef = React.useRef(null);
  const areaRef = React.useRef(null);
  const todayX = TL_NAMEW + TODAY_T * TL_COLW + TL_COLW * 0.5;
  React.useEffect(() => { if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, todayX - scrollRef.current.clientWidth + 80); }, []);

  // build grouped entries with cumulative y-offsets (header rows + plan rows)
  const buildGroups = () => {
    if (grouping === "status") return STATUS_ORDER.map(st => ({ label: t["s_" + st], statusKey: st, items: plans.filter(p => p.status === st) })).filter(g => g.items.length);
    if (grouping === "strategy") {
      const gs = EXEC_STRATEGIES.map(s => ({ label: s.name[lang], dot: s.color, items: plans.filter(p => p.execId === s.id) })).filter(g => g.items.length);
      const none = plans.filter(p => !p.execId); if (none.length) gs.push({ label: t.noStrategy, items: none });
      return gs;
    }
    if (grouping === "category") {
      const gs = strategyCats(t).map(([v, lab]) => ({ label: lab, items: plans.filter(p => catOfPlan(p) === v) })).filter(g => g.items.length);
      const none = plans.filter(p => catOfPlan(p) === "none"); if (none.length) gs.push({ label: t.noStrategy, items: none });
      return gs;
    }
    if (grouping === "portfolio") return PORTFOLIOS.map(pf => ({ label: pf.name[lang], dot: pf.color, items: plans.filter(p => p.portfolioId === pf.id) })).filter(g => g.items.length);
    return null;
  };
  const entries = []; let yAcc = 0;
  const grp = grouping === "none" ? null : buildGroups();
  if (!grp) {
    orderPlans(plans, ordering, lang).forEach(p => { entries.push({ type: "plan", plan: p, top: yAcc }); yAcc += TL_ROWH; });
  } else {
    grp.forEach(g => {
      entries.push({ type: "head", label: g.label, dot: g.dot, statusKey: g.statusKey, count: g.items.length, top: yAcc }); yAcc += H_HEAD;
      orderPlans(g.items, ordering, lang).forEach(p => { entries.push({ type: "plan", plan: p, top: yAcc }); yAcc += TL_ROWH; });
    });
  }
  const totalH = yAcc;
  const planEntries = entries.filter(e => e.type === "plan");

  // shared % domain (pct mode) so rows are comparable on one scale
  let yDomain = null;
  if (yMode === "pct") {
    let mn = 0, mx = 0;
    plans.forEach(p => { const tj = planTrajectory(p); const b = tj.samples[0] ? tj.samples[0].mkt : 1; tj.samples.forEach(s => { const pc = (s.mkt / b - 1) * 100; if (pc < mn) mn = pc; if (pc > mx) mx = pc; if (s.avg != null) { const pa = (s.avg / b - 1) * 100; if (pa < mn) mn = pa; if (pa > mx) mx = pa; } }); });
    const pad = (mx - mn) * 0.1 || 5; yDomain = { lo: mn - pad, hi: mx + pad };
  }

  const xToT = (px) => (px - TL_NAMEW - TL_COLW * 0.5) / TL_COLW;
  const onMove = (e) => {
    const rect = areaRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    if (px < TL_NAMEW) { setHover(null); return; }
    const ent = planEntries.find(en => py >= en.top && py < en.top + TL_ROWH);
    if (!ent) { setHover(null); return; }
    const tt = Math.max(0, Math.min(9.99, xToT(px)));
    setHover({ plan: ent.plan, top: ent.top, t: tt, clientX: e.clientX, clientY: e.clientY });
  };

  let tip = null;
  if (hover) {
    const p = hover.plan;
    const tj = planTrajectory(p);
    if (hover.t >= tj.startT - 0.3 && hover.t <= Math.max(tj.endT, tj.todayT) + 0.3) {
      const s = tj.samples.reduce((a, b) => Math.abs(b.t - hover.t) < Math.abs(a.t - hover.t) ? b : a);
      const pl = s.avg != null ? ((s.mkt / s.avg - 1) * 100) : null;
      const mi = Math.max(0, Math.min(9, Math.round(hover.t)));
      tip = { plan: p, mkt: s.mkt, avg: s.avg, pl, month: TL_MONTH_LABEL[TL_MONTHS[mi]][lang], x: hover.clientX, y: hover.clientY };
    }
  }

  return (
    <div className="tl-wrap">
      <div className="tl-ctrl">
        <span style={{ font: "var(--fw-semi) 13px var(--font-sans)", color: "var(--fg)" }}>{mode === "journey" ? (lang === "ko" ? "여정 타임라인" : "Journey") : (lang === "ko" ? "성과 타임라인" : "Performance")}{yMode === "pct" ? " · %" : ""}</span>
        <div className="tl-legend">
          {mode === "journey" ? <>
            {["research", "active", "paused", "closing", "closed"].map(s => (
              <span key={s}><i style={{ background: (PLAN_STATUS[s] || {}).color }} />{t["s_" + s]}</span>
            ))}
          </> : <>
            <span><i style={{ background: "var(--pos)" }} />{lang === "ko" ? "수익" : "Profit"}</span>
            <span><i style={{ background: "var(--neg)" }} />{lang === "ko" ? "손실" : "Loss"}</span>
            <span><i className="tl-leg-dash" />{lang === "ko" ? "평단가" : "Avg cost"}</span>
            <span><i style={{ background: "var(--r-active)" }} />{lang === "ko" ? "매수" : "Buy"}</span>
            <span><i style={{ background: "var(--r-closing)" }} />{lang === "ko" ? "매도" : "Sell"}</span>
          </>}
        </div>
        <div className="tl-zoom">
          {[["performance", lang === "ko" ? "성과" : "Performance"], ["journey", lang === "ko" ? "여정" : "Journey"]].map(([z, lab]) => (
            <div key={z} className={"seg" + (mode === z ? " active" : "")} style={{ height: 26, fontSize: 12 }} onClick={() => setMode(z)}>{lab}</div>
          ))}
        </div>
      </div>
      <div className="tl-scroll" ref={scrollRef}>
        <div style={{ minWidth: TL_NAMEW + width, position: "relative" }}>
          <div className="tl-axis">
            <div className="tl-month" style={{ width: TL_NAMEW, borderLeft: 0, position: "sticky", left: 0, background: "var(--bg-app)", zIndex: 5 }} />
            {TL_MONTHS.map(m => <div key={m} className="tl-month" style={{ width: TL_COLW }}><span className="tl-mlabel">{TL_MONTH_LABEL[m][lang]}</span></div>)}
          </div>
          <div style={{ position: "relative" }} ref={areaRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
            <div className="tl-today" style={{ left: todayX, top: 0, bottom: 0 }} />
            <div className="tl-today-pill" style={{ left: todayX }}>{lang === "ko" ? "오늘" : "Today"}</div>
            {hover && <div className="tl-crosshair" style={{ left: TL_NAMEW + hover.t * TL_COLW + TL_COLW * 0.5, top: 0, height: totalH }} />}
            {hover && <div className="tl-rowhi" style={{ top: hover.top, height: TL_ROWH, left: TL_NAMEW, width: width }} />}
            {/* name column: group headers + plan rows */}
            {entries.map((en, i) => {
              if (en.type === "head") {
                return <div className="tl-group-head" key={"h" + i} style={{ height: H_HEAD }}>
                  {en.dot && <span className="pf-dot" style={{ background: en.dot }} />}{en.statusKey && <StatusIcon status={en.statusKey} size={13} />}<span className="tl-group-lab">{en.label}</span><span className="tl-group-count">{en.count}</span>
                </div>;
              }
              const p = en.plan, ret = planReturn(p);
              return <div className="tl-prow" key={p.id} style={{ height: TL_ROWH }} onClick={() => onOpen(p)}>
                <div className="tl-name" style={{ width: TL_NAMEW, height: TL_ROWH }}>
                  <StatusIcon status={p.status} size={14} />
                  <span className="tl-nm">
                    <span className="tl-nm-title"><Flag market={p.cur === "KRW" ? "KR" : "US"} size={13} /> {p.tickerName[lang]}</span>
                    <span className="tl-nm-sub mono">{p.ticker} · {t["s_" + p.status]}</span>
                  </span>
                  <span className={"tl-nm-ret mono " + (ret ? (ret.rate >= 0 ? "pos" : "neg") : "")}>{ret ? (ret.rate >= 0 ? "+" : "") + ret.rate.toFixed(1) + "%" : "—"}</span>
                </div>
              </div>;
            })}
            <svg className="tl-traj-svg" style={{ left: 0, top: 0, width: TL_NAMEW + width, height: totalH }} width={TL_NAMEW + width} height={totalH}>
              {planEntries.map((en) => (
                <g key={en.plan.id} transform={`translate(0 ${en.top})`}>
                  <TrajectoryRow plan={en.plan} lang={lang} mode={mode} overlays={overlays} yMode={yMode} yDomain={yDomain} />
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>
      {tip && <div className="tl-tip" style={{ left: Math.min(tip.x + 14, window.innerWidth - 180), top: tip.y + 14 }}>
        <div className="tl-tip-head">{tip.plan.tickerName[lang]} · <span className="mono">{tip.month}</span></div>
        <div className="tl-tip-row"><span>{lang === "ko" ? "시장가" : "Market"}</span><span className="mono">{fmtMoney(Math.round(tip.mkt), tip.plan.cur)}</span></div>
        {tip.avg != null && <div className="tl-tip-row"><span>{lang === "ko" ? "평단가" : "Avg cost"}</span><span className="mono">{fmtMoney(Math.round(tip.avg), tip.plan.cur)}</span></div>}
        {tip.pl != null ? <div className="tl-tip-row"><span>{lang === "ko" ? "손익" : "P/L"}</span><span className={"mono " + (tip.pl >= 0 ? "pos" : "neg")}>{tip.pl >= 0 ? "+" : ""}{tip.pl.toFixed(1)}%</span></div>
          : <div className="tl-tip-row"><span style={{ color: "var(--fg-4)" }}>{lang === "ko" ? "미보유" : "No position"}</span></div>}
      </div>}
    </div>
  );
}
Object.assign(window, { BoardView, TimelineView });
