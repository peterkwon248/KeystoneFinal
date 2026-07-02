// futuretest_view.jsx — PlayoutView (condition builder + animated chart w/ draggable anchors) + ValuationCalc
// Loaded after futuretest.jsx; referenced there by name via window.

const FT_W = 772, FT_H = 220, FT_PADL = 8, FT_PADR = 8, FT_PADT = 22, FT_PADB = 26;

// horizon label with adaptive unit: ≤2mo → days, <12mo → months, else years
function ftHorizon(m, lang) {
  const ko = lang === "ko";
  if (m <= 2) return Math.round(m * 30) + (ko ? "일" : "d");
  if (m < 12) { const mr = Math.round(m * 10) / 10; return (Number.isInteger(mr) ? mr : mr.toFixed(1)) + (ko ? "개월" : "mo"); }
  const y = Math.round((m / 12) * 10) / 10;
  return (Number.isInteger(y) ? y : y.toFixed(1)) + (ko ? "년" : "y");
}

// explicit-unit time formatter (panel-level 일/월/년 toggle)
function ftT(m, unit, lang) {
  const ko = lang === "ko";
  if (unit === "d") return Math.max(1, Math.round(m * 30)) + (ko ? "일" : "d");
  if (unit === "y") { const y = Math.round((m / 12) * 10) / 10; return (Number.isInteger(y) ? y : y.toFixed(1)) + (ko ? "년" : "y"); }
  const mr = Math.round(m * 10) / 10;
  return (Number.isInteger(mr) ? mr : mr.toFixed(1)) + (ko ? "개월" : "mo");
}
// display-currency conversion (mock FX, same rate as dashboard)
const FT_FX = 1380;
// NOTE: FT has its OWN ₩/$ toggle, so formatting must bypass the app-global
// display-currency layer (fmtCompact converts via the global toggle, which
// would override the panel-local choice). Raw formatter, same style as fmtCompact:
function ftFmtRaw(v, cur) {
  if (v == null) return "—";
  if (cur === "USD") return "$" + (Math.abs(v) >= 1000 ? v.toLocaleString("en-US", { maximumFractionDigits: 0 }) : v.toFixed(2));
  return "₩" + Math.round(v).toLocaleString("en-US");
}
function ftMoney(v, planCur, dispCur) {
  if (!dispCur || dispCur === planCur) return ftFmtRaw(v, planCur);
  const conv = planCur === "KRW" ? v / FT_FX : v * FT_FX;
  return "≈" + ftFmtRaw(conv, dispCur);
}

// label with a hover definition tooltip (dotted underline = "설명 있음")
function FTLab({ text, tip }) {
  return <span className="ft-deflab" data-tip={tip}>{text}</span>;
}

// slider value readout that becomes a number input on click
function FTNum({ display, value, min, max, step = 1, onCommit, title }) {
  const [editing, setEditing] = React.useState(false);
  if (editing) {
    return <input className="ft-num-in mono" type="number" autoFocus defaultValue={value} step={step}
      onFocus={e => e.target.select()}
      onBlur={e => { setEditing(false); const n = Number(e.target.value); if (!isNaN(n) && e.target.value !== "") onCommit(Math.max(min, Math.min(max, n))); }}
      onKeyDown={e => { if (e.key === "Enter") { e.stopPropagation(); e.target.blur(); } if (e.key === "Escape") { e.stopPropagation(); e.target.value = ""; setEditing(false); } }} />;
  }
  return <b className="mono ft-num" title={title || ""} onClick={() => setEditing(true)}>{display}</b>;
}

// shared horizon control — unit is panel-controlled
function FTHorizon({ months, setMonths, lang, t, unit = "m" }) {
  // slider covers common ranges; click-to-type unlocks the long tail up to CAP (≈ "practically unlimited")
  const R = { d: [7, 365], m: [1, 120], y: [1, 30] };
  const CAP = { d: 1825, m: 600, y: 50 };
  const toU = (m) => unit === "d" ? Math.round(m * 30) : unit === "y" ? Math.max(1, Math.round(m / 12)) : Math.round(m);
  const fromU = (v) => unit === "d" ? v / 30 : unit === "y" ? v * 12 : v;
  const [lo, hi] = R[unit];
  const cur = toU(months);
  const val = Math.max(lo, Math.min(hi, cur));
  return (
    <label className="ft-slider">
      <span className="ft-slider-lab"><FTLab text={t.ft_horizon} tip={t.tip_horizon} /><FTNum display={ftT(months, unit, lang)} value={cur} min={lo} max={CAP[unit]} onCommit={(n) => setMonths(fromU(n))} title={t.tip_click} /></span>
      <input type="range" min={lo} max={hi} step="1" value={val} onChange={e => setMonths(fromU(Number(e.target.value)))} />
    </label>
  );
}

/* ---------- precise per-anchor editor (click an anchor in draw mode) ---------- */
function FTAnchorEdit({ idx, pct, tFrac, months, unit, lang, t, leftPct, onSet, onClose, canRemove, onRemove }) {
  const [v, setV] = React.useState(pct);
  React.useEffect(() => { setV(pct); }, [pct, idx]);
  const mo = Math.round((tFrac || 0) * months);
  const chips = [-20, -10, 0, 10, 20, 30];
  const side = leftPct > 62 ? " right" : "";
  return (
    <>
      <div className="ft-anchor-scrim" onPointerDown={onClose}></div>
      <div className={"ft-anchor-pop" + side} style={{ left: leftPct + "%" }} onPointerDown={(e) => e.stopPropagation()}>
        <div className="ft-anchor-pop-h">
          <span>+{ftT(mo, unit, lang)}{lang === "ko" ? " 시점" : ""}</span>
          {canRemove && <button className="ft-anchor-rm" title={lang === "ko" ? "점 삭제" : "Remove point"} onClick={onRemove}><Lic name="trash-2" size={11} cls="icon-sm" color="currentColor" /></button>}
        </div>
        <div className="ft-anchor-pop-row">
          <input className="mono ft-anchor-in" type="number" autoFocus value={v}
            onChange={e => { const n = Math.max(-50, Math.min(40, Number(e.target.value) || 0)); setV(n); onSet(n); }}
            onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") { e.stopPropagation(); onClose(); } }} />
          <span className="ft-anchor-unit">% {lang === "ko" ? "(현재가 대비)" : "vs now"}</span>
        </div>
        <div className="ft-anchor-chips">
          {chips.map(p => <button key={p} className={"sc-edit-chip" + (p === 0 ? " base" : "")} onClick={() => { setV(p); onSet(p); }}>{p === 0 ? (lang === "ko" ? "현재가" : "Now") : (p > 0 ? "+" : "") + p + "%"}</button>)}
        </div>
      </div>
    </>
  );
}

/* ---------- animated future-test chart (+ draggable anchors in draw mode) ---------- */
function FTChart({ pricePath, sim, prog, plan, t, lang, months, supported, drawMode, anchors, setAnchor, addAnchor, removeAnchor, maxAnchors = 12, unit, dispCur }) {
  const svgRef = React.useRef(null);
  const dragRef = React.useRef(null);
  const [hot, setHot] = React.useState(null);      // hovered/dragging anchor → shows % label
  const [editIdx, setEditIdx] = React.useState(null); // click (no drag) → precise-input popover
  const [hov, setHov] = React.useState(null);       // playout-mode hover readout
  const [startHot, setStartHot] = React.useState(false); // hover on the fixed start point
  const xt = (tt) => FT_PADL + tt * (FT_W - FT_PADL - FT_PADR);
  const plotH = FT_H - FT_PADT - FT_PADB;

  // y-domain: auto-fit normally; fixed in draw mode so handles don't jump while dragging
  let lo, hi;
  if (drawMode) {
    lo = plan.currentPrice * 0.55; hi = plan.currentPrice * 1.4;
  } else {
    const allP = pricePath.map(p => p.price).concat(sim.steps.filter(s => s.avg != null).map(s => s.avg));
    const mn = Math.min(...allP), mx = Math.max(...allP), sp = (mx - mn) || 1, vp = sp * 0.08;
    lo = mn - vp; hi = mx + vp;
  }
  const span = (hi - lo) || 1;
  const y = (v) => FT_PADT + plotH - ((v - lo) / span) * plotH;
  const yToPct = (clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    const yPx = (clientY - rect.top) / rect.height * FT_H;
    const v = lo + ((FT_PADT + plotH - yPx) / plotH) * span;
    return Math.max(-50, Math.min(40, Math.round((v / plan.currentPrice - 1) * 100)));
  };

  const visible = sim.steps.filter(s => s.t <= prog + 1e-6);
  const cur = visible[visible.length - 1] || sim.steps[0];
  const won = cur.avg != null ? cur.price >= cur.avg : true;
  const avgColor = cur.avg == null ? "var(--fg-3)" : won ? "var(--pos)" : "var(--neg)";

  const priceFull = pricePath.map((p, i) => `${i ? "L" : "M"}${xt(p.t).toFixed(1)} ${y(p.price).toFixed(1)}`).join(" ");
  const visPrice = pricePath.filter(p => p.t <= prog + 1e-6);
  const priceRev = visPrice.map((p, i) => `${i ? "L" : "M"}${xt(p.t).toFixed(1)} ${y(p.price).toFixed(1)}`).join(" ");
  const avgPts = visible.filter(s => s.avg != null);
  const avgLine = avgPts.map((s, i) => `${i ? "L" : "M"}${xt(s.t).toFixed(1)} ${y(s.avg).toFixed(1)}`).join(" ");

  const segs = []; let cs = null;
  visible.forEach(s => {
    if (s.avg == null) { if (cs) { segs.push(cs); cs = null; } return; }
    const w = s.price >= s.avg;
    if (!cs || cs.w !== w) { if (cs) segs.push(cs); cs = { w, rows: [] }; }
    cs.rows.push(s);
  });
  if (cs) segs.push(cs);

  const events = supported && !drawMode ? sim.events.filter(e => e.t <= prog + 1e-6) : [];
  const playheadX = xt(Math.min(prog, 1));
  const midMo = Math.max(1, Math.round(months / 2));
  const near = (tt) => pricePath.reduce((a, b) => Math.abs(b.t - tt) < Math.abs(a.t - tt) ? b : a);

  // drag handlers (draw mode) — distinguishes a click (open precise editor) from a drag
  const onMove = (e) => {
    const d = dragRef.current; if (d == null) return;
    e.preventDefault();
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 3) d.moved = true;
    setAnchor(d.i, yToPct(e.clientY));
  };
  const endDrag = (e) => {
    const d = dragRef.current;
    if (d) {
      try { svgRef.current.releasePointerCapture(e.pointerId); } catch (_) {}
      if (!d.moved) { setEditIdx(d.i === editIdx ? null : d.i); }
      else { setHot(null); }
    }
    dragRef.current = null;
  };
  const grab = (i) => (e) => { e.preventDefault(); dragRef.current = { i, sx: e.clientX, sy: e.clientY, moved: false }; setHot(i); try { svgRef.current.setPointerCapture(e.pointerId); } catch (_) {} };
  // draw mode: click empty plot space → add an anchor there (cap maxAnchors)
  const addAt = (e) => {
    if (!drawMode || !svgRef.current || !addAnchor) return;
    const rect = svgRef.current.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width * FT_W;
    const tt = Math.max(0.03, Math.min(0.97, (fx - FT_PADL) / (FT_W - FT_PADL - FT_PADR)));
    addAnchor(tt, yToPct(e.clientY));
  };
  // draw-mode y-axis reference grid: % vs current price
  const pctY = (p) => y(plan.currentPrice * (1 + p / 100));
  const gridPcts = [40, 20, 0, -20, -40];
  // playout-mode hover: read the assumed price / vs-avg / distance-to-target at the cursor's time
  const baseTarget = ((plan.scenarios || []).find(s => s.label.en === "Base") || {}).target;
  const onHover = (e) => {
    if (drawMode || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width * FT_W;
    const tt = Math.max(0, Math.min(1, (fx - FT_PADL) / (FT_W - FT_PADL - FT_PADR)));
    const pp = pricePath.reduce((a, b) => Math.abs(b.t - tt) < Math.abs(a.t - tt) ? b : a);
    // avg cost in effect at/just before this time (carry forward last held avg) — so a SELL
    // point shows price-vs-cost (= its realized gain); hidden only after the final full exit
    const sells = sim.events ? sim.events.filter(e => e.side === "sell") : [];
    const exitT = sells.length ? Math.max(...sells.map(e => e.t)) : 1;
    let av = null;
    for (const s of sim.steps) { if (s.t <= pp.t + 1e-6 && s.avg != null && s.qty > 1e-6) av = s.avg; }
    setHov({ t: pp.t, price: pp.price, avg: (av != null && pp.t <= exitT + 1e-6) ? av : null });
  };

  return (
    <div className="ft-chart">
      <div className="ft-chart-head">
        <span className="ft-assump"><Lic name={drawMode ? "pencil" : "info"} size={12} cls="icon-sm" color="var(--fg-4)" />{drawMode ? t.ft_drawHint : t.ft_assumption}</span>
        <span className="ft-legend">
          {drawMode && <span className="ft-anchor-count">{lang === "ko" ? "점" : "Points"} {anchors ? anchors.length : 0}/{maxAnchors} · {(anchors && anchors.length >= maxAnchors) ? (lang === "ko" ? "최대" : "max") : (lang === "ko" ? "빈 곳 클릭해 추가" : "click to add")}</span>}
          {!drawMode && <span><i className="ft-li price" />{t.ft_market}</span>}
          {supported && !drawMode && <span><i className="ft-li avg" style={{ background: avgColor }} />{t.ft_avg}</span>}
          {supported && !drawMode && <span><i className="ft-li buy" />{t.buy}</span>}
          {supported && !drawMode && <span><i className="ft-li sell" />{t.sell}</span>}
        </span>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${FT_W} ${FT_H}`} className={"ft-svg" + (drawMode ? " drawing" : "")} preserveAspectRatio="none"
        onPointerMove={onMove} onPointerUp={endDrag} onPointerLeave={endDrag}
        onMouseMove={onHover} onMouseLeave={() => setHov(null)}>
        {!drawMode && [0.25, 0.5, 0.75].map(g => <line key={g} x1={FT_PADL} y1={FT_PADT + plotH * g} x2={FT_W - FT_PADR} y2={FT_PADT + plotH * g} stroke="var(--border)" strokeWidth="1" />)}
        {!drawMode && <line x1={FT_PADL} y1={y(plan.currentPrice)} x2={FT_W - FT_PADR} y2={y(plan.currentPrice)} stroke="var(--fg-4)" strokeWidth="1" strokeDasharray="1 4" opacity="0.5" />}

        {/* draw mode: % reference grid (vs current price) + click-to-add background */}
        {drawMode && gridPcts.map(p => (
          <g key={"g" + p}>
            <line x1={FT_PADL} y1={pctY(p)} x2={FT_W - FT_PADR} y2={pctY(p)} stroke={p === 0 ? "var(--fg-4)" : "var(--border)"} strokeWidth="1" strokeDasharray={p === 0 ? "1 4" : "0"} opacity={p === 0 ? 0.7 : 1} />
            <text x={FT_PADL - 4} y={pctY(p) + 3} textAnchor="end" className="ft-grid-lab">{(p > 0 ? "+" : "") + p + "%"}</text>
          </g>
        ))}
        {drawMode && <rect x={FT_PADL} y={FT_PADT} width={FT_W - FT_PADL - FT_PADR} height={plotH} fill="transparent" className="ft-addzone" onPointerDown={addAt} />}
        {supported && !drawMode && segs.map((seg, i) => {
          if (seg.rows.length < 2) return null;
          const top = seg.rows.map(s => `${xt(s.t).toFixed(1)} ${y(s.price).toFixed(1)}`);
          const bot = seg.rows.slice().reverse().map(s => `${xt(s.t).toFixed(1)} ${y(s.avg).toFixed(1)}`);
          return <path key={i} d={`M${top.join(" L")} L${bot.join(" L")} Z`} fill={seg.w ? "var(--pos)" : "var(--neg)"} opacity="0.14" />;
        })}

        {/* assumed price path — dashed = "assumption" */}
        <path d={priceFull} fill="none" stroke="var(--fg-3)" strokeWidth="1.4" strokeDasharray="5 4" opacity="0.26" vectorEffect="non-scaling-stroke" />
        <path d={priceRev} fill="none" stroke="var(--fg-2)" strokeWidth="1.8" strokeDasharray="5 4" opacity="0.92" vectorEffect="non-scaling-stroke" />

        {supported && !drawMode && avgPts.length > 1 && <path d={avgLine} fill="none" stroke={avgColor} strokeWidth="2.2" vectorEffect="non-scaling-stroke" />}

        {events.map((e, i) => {
          const s = near(e.t);
          return <circle key={"e" + i} cx={xt(e.t)} cy={y(s.price)} r={e.side === "buy" ? 3.4 : 3.8}
            fill={e.side === "buy" ? "var(--r-active)" : "var(--r-closing)"} stroke="var(--bg-app)" strokeWidth="1.4" />;
        })}

        {/* anchor dots (parametric) or draggable handles (draw mode) */}
        {!drawMode && (pricePath.anchors || []).filter(at => at <= prog + 1e-6).map((at, i) => {
          const pp = near(at);
          return <circle key={"an" + i} cx={xt(at)} cy={y(pp.price)} r="2.4" fill="var(--bg-app)" stroke="var(--fg-3)" strokeWidth="1.3" />;
        })}
        {drawMode && anchors && anchors.map((an, i) => {
          const px = xt(an.t), py = y(plan.currentPrice * (1 + an.pct / 100));
          const locked = i === 0; // start point fixed at current price
          return <g key={"h" + i}>
            {!locked && <line x1={px} y1={FT_PADT} x2={px} y2={FT_PADT + plotH} stroke="var(--accent)" strokeWidth="1" opacity="0.18" />}
            {!locked && <circle cx={px} cy={py} r="15" fill="transparent" className="ft-hit" onPointerDown={grab(i)}
              onPointerEnter={() => { if (!dragRef.current) setHot(i); }} onPointerLeave={() => { if (!dragRef.current) setHot(h => h === i ? null : h); }} />}
            {locked && <circle cx={px} cy={py} r="13" fill="transparent" style={{ cursor: "help" }}
              onPointerEnter={() => setStartHot(true)} onPointerLeave={() => setStartHot(false)} />}
            <circle cx={px} cy={py} r={locked ? 3.5 : 6} fill={locked ? "var(--fg-4)" : "var(--accent)"} stroke="var(--bg-app)" strokeWidth="2"
              className={locked ? "" : "ft-handle"} onPointerDown={locked ? undefined : grab(i)} />
          </g>;
        })}
        {drawMode && hot != null && anchors && anchors[hot] && editIdx == null && dragRef.current != null && (() => {
          const an = anchors[hot], px = xt(an.t), py = y(plan.currentPrice * (1 + an.pct / 100));
          return <text x={px} y={py - 13} textAnchor="middle" className="ft-anchor-lab">{(an.pct >= 0 ? "+" : "") + an.pct + "%"}</text>;
        })()}

        {!drawMode && hov && <line x1={xt(hov.t)} y1={FT_PADT - 4} x2={xt(hov.t)} y2={FT_H - FT_PADB + 4} stroke="var(--fg-3)" strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />}
        {!drawMode && prog < 1 && <line x1={playheadX} y1={FT_PADT - 4} x2={playheadX} y2={FT_H - FT_PADB + 4} stroke="var(--accent)" strokeWidth="1.5" opacity="0.7" />}
      </svg>
      {!drawMode && hov && (() => {
        const vsAvg = hov.avg ? (hov.price / hov.avg - 1) * 100 : null;
        const toTgt = baseTarget ? (baseTarget / hov.price - 1) * 100 : null;
        const leftPct = xt(hov.t) / FT_W * 100;
        return <div className={"ft-hovtip" + (leftPct > 62 ? " right" : "")} style={{ left: leftPct + "%" }}>
          <div className="ft-hovtip-t">+{ftT(hov.t * months, unit, lang)}</div>
          <div className="ft-hovtip-px mono">{ftMoney(hov.price, plan.cur, dispCur)}</div>
          {(() => { const vsNow = (hov.price / plan.currentPrice - 1) * 100; return <div className="ft-hovtip-row"><span>{lang === "ko" ? "현재가 대비" : "vs now"}</span><b className={"mono " + (vsNow >= 0 ? "pos" : "neg")}>{(vsNow >= 0 ? "+" : "") + vsNow.toFixed(1)}%</b></div>; })()}
          {vsAvg != null && <div className="ft-hovtip-row"><span>{lang === "ko" ? "평단 대비" : "vs avg"}</span><b className={"mono " + (vsAvg >= 0 ? "pos" : "neg")}>{(vsAvg >= 0 ? "+" : "") + vsAvg.toFixed(1)}%</b></div>}
          {toTgt != null && <div className="ft-hovtip-row"><span>{lang === "ko" ? "기준가까지" : "to base"}</span><b className={"mono " + (toTgt >= 0 ? "pos" : "neg")}>{(toTgt >= 0 ? "+" : "") + toTgt.toFixed(1)}%</b></div>}
        </div>;
      })()}
      {drawMode && hot != null && hot > 0 && dragRef.current == null && editIdx == null && anchors && anchors[hot] && (() => {
        const an = anchors[hot], leftPct = xt(an.t) / FT_W * 100, price = plan.currentPrice * (1 + an.pct / 100);
        return <div className={"ft-hovtip" + (leftPct > 62 ? " right" : "")} style={{ left: leftPct + "%" }}>
          <div className="ft-hovtip-t">+{ftT(an.t * months, unit, lang)}</div>
          <div className="ft-hovtip-px mono">{ftMoney(price, plan.cur, dispCur)}</div>
          <div className="ft-hovtip-row"><span>{lang === "ko" ? "현재가 대비" : "vs now"}</span><b className={"mono " + (an.pct >= 0 ? "pos" : "neg")}>{(an.pct >= 0 ? "+" : "") + an.pct}%</b></div>
          <div className="ft-hovtip-hint">{lang === "ko" ? "드래그 · 클릭해 입력" : "drag · click to type"}</div>
        </div>;
      })()}
      {drawMode && startHot && anchors && anchors[0] && (
        <div className="ft-starttip" style={{ left: (xt(anchors[0].t) / FT_W * 100) + "%" }}>
          <div className="ft-starttip-h">{lang === "ko" ? "시작점 · 고정" : "Start · fixed"}</div>
          <div className="ft-starttip-b">{lang === "ko" ? "경로는 현재가에서 출발해요" : "Path starts at current price"}</div>
          <div className="ft-starttip-px mono">{ftMoney(plan.currentPrice, plan.cur, dispCur)}</div>
        </div>
      )}
      {drawMode && editIdx != null && anchors && anchors[editIdx] && (
        <FTAnchorEdit key={editIdx} idx={editIdx} pct={anchors[editIdx].pct} tFrac={anchors[editIdx].t} months={months} unit={unit} lang={lang} t={t}
          leftPct={xt(anchors[editIdx].t) / FT_W * 100}
          canRemove={removeAnchor && editIdx > 0 && editIdx < anchors.length - 1 && anchors.length > 3}
          onRemove={() => { removeAnchor && removeAnchor(editIdx); setEditIdx(null); setHot(null); }}
          onSet={(p) => setAnchor(editIdx, p)} onClose={() => { setEditIdx(null); setHot(null); }} />
      )}
      <div className="ft-xaxis">
        <span>{t.ft_now}</span>
        <span>+{ftT(months / 2, unit, lang)}</span>
        <span>{t.ft_end} · +{ftT(months, unit, lang)}</span>
      </div>
    </div>
  );
}

/* ---------- live count-up stats ---------- */
function FTStats({ sim, prog, plan, t, supported, dispCur, months, unit, lang, exitOn }) {
  const money = (v) => ftMoney(v, plan.cur, dispCur);
  const visible = sim.steps.filter(s => s.t <= prog + 1e-6);
  const cur = visible[visible.length - 1] || sim.steps[0];
  if (!supported) {
    const drop = (Math.min(...sim.steps.map(s => s.price)) / plan.currentPrice - 1) * 100;
    const end = (sim.steps[sim.steps.length - 1].price / plan.currentPrice - 1) * 100;
    return (
      <div className="ft-stats">
        <FTStat lab={t.ft_maxdrop} val={drop.toFixed(1) + "%"} tone="neg" />
        <FTStat lab={t.ft_end} val={(end >= 0 ? "+" : "") + end.toFixed(1) + "%"} tone={end >= 0 ? "pos" : "neg"} big />
      </div>
    );
  }
  const maxDep = Math.max(...visible.map(s => s.deployed), 0);
  const mdd = Math.min(...visible.map(s => (s.avg != null ? s.value - s.deployed : 0)), 0);
  const buys = sim.events.filter(e => e.side === "buy" && e.t <= prog + 1e-6).length;
  const ret = maxDep > 0 ? (cur.pnl / maxDep) * 100 : 0;
  const won = ret >= 0;
  const ex = sim.summary.exit;
  const exShown = ex && ex.t <= prog + 1e-6 ? ex : null;
  const isSignal = sim.summary.kind === "signal";
  const tradesDone = sim.events.filter(e => e.side === "sell" && e.t <= prog + 1e-6).length;
  return (
    <div className="ft-stats">
      <FTStat lab={t.ft_finalAvg} val={cur.avg != null && cur.qty > 1e-6 ? money(cur.avg) : "—"} />
      <FTStat lab={t.ft_maxDeployed} val={money(maxDep)} />
      <FTStat lab={isSignal ? t.ft_entries : t.ft_rounds} val={String(buys)} />
      <FTStat lab={t.ft_mdd} val={mdd < 0 ? money(mdd) : "—"} tone="neg" />
      {isSignal
        ? <FTStat lab={t.ft_trades} val={tradesDone > 0 ? String(tradesDone) + t.ft_tradesUnit : t.ft_holding} tone={cur.qty > 1e-6 ? "" : ""} />
        : exitOn && <FTStat lab={t.ft_exitAt}
            val={exShown ? (exShown.type === "tp" ? "▲ +" : t.ft_slFired + " +") + ftT(exShown.t * months, unit, lang) : t.ft_exitNone}
            tone={exShown ? (exShown.type === "tp" ? "pos" : "neg") : ""} />}
      <FTStat lab={t.ft_finalValue} val={cur.qty > 1e-6 ? money(cur.value) : "—"} />
      <FTStat lab={t.ft_return} val={(won ? "+" : "") + ret.toFixed(1) + "%"} tone={won ? "pos" : "neg"} big />
    </div>
  );
}
// exit-rule unit dropdown: % (relative) / ₩ / $ (absolute, currency picked here)
function FTUnitPick({ value, onPick }) {
  const [open, setOpen] = React.useState(false);
  const lab = value === "pct" ? "%" : value === "USD" ? "$" : "₩";
  const opts = [["pct", "%"], ["KRW", "₩"], ["USD", "$"]];
  return (
    <span className="val-mode-wrap">
      <button type="button" className="ft-unitpick" onClick={(e) => { e.preventDefault(); setOpen(o => !o); }}>
        {lab}<Lic name="chevron-down" size={10} cls="icon-sm" color="var(--fg-4)" />
      </button>
      {open && <>
        <div className="val-mode-scrim" onClick={() => setOpen(false)}></div>
        <div className="v-menu val-mode-menu left ft-unit-menu">
          {opts.map(([k, l]) => (
            <div key={k} className="v-menu-item" onClick={() => { setOpen(false); if (k !== value) onPick(k); }}>
              <span className="val-slot-chk">{k === value && <Lic name="check" size={11} cls="icon-sm" color="var(--accent)" />}</span>
              <span>{l}</span>
            </div>
          ))}
        </div>
      </>}
    </span>
  );
}

// exit-rule row: label + %/₩/$ unit dropdown + value input (TP green / SL red)
function FTExitRow({ kind, cfg, setParam, t, plan, dispCur, label }) {
  const isTp = kind === "tp";
  const mode = cfg[isTp ? "tpMode" : "slMode"] || "pct";
  const pctKey = isTp ? "tpPct" : "slPct", amtKey = isTp ? "tpAmt" : "slAmt", modeKey = isTp ? "tpMode" : "slMode", curKey = isTp ? "tpCur" : "slCur";
  // amount is stored in the plan's native currency (engine works in plan.cur);
  // it is shown/entered in the unit picked here (₩ or $), converting via the same mock FX.
  const rowCur = mode === "amt" ? (cfg[curKey] || plan.cur) : plan.cur;
  const toDisp = (v) => rowCur === plan.cur ? v : (plan.cur === "KRW" ? v / FT_FX : v * FT_FX);
  const toNative = (v) => rowCur === plan.cur ? v : (plan.cur === "KRW" ? v * FT_FX : v / FT_FX);
  const dispStep = rowCur === "USD" ? 100 : 100000;
  const dispAmt = Math.round(toDisp(cfg[amtKey] || 0));
  const name = isTp ? t.ft_tpName : t.ft_slName;
  const pickVal = mode === "pct" ? "pct" : rowCur;
  const onPick = (k) => { if (k === "pct") { setParam(modeKey, "pct"); } else { setParam(modeKey, "amt"); setParam(curKey, k); } };
  return (
    <label className={"ft-param ft-exit " + kind}>
      <span className="ft-param-lab"><FTLab text={name} tip={t.tip_tpsl} /></span>
      <span className="ft-exit-ctl">
        {mode === "pct"
          ? <input className="ft-param-in mono" type="number" min="0" value={cfg[pctKey] || 0} onChange={e => setParam(pctKey, Math.max(0, Number(e.target.value) || 0))} />
          : <input className="ft-param-in mono" type="number" min="0" step={dispStep} value={dispAmt} onChange={e => setParam(amtKey, Math.max(0, Math.round(toNative(Number(e.target.value) || 0))))} />}
        <FTUnitPick value={pickVal} onPick={onPick} />
      </span>
    </label>
  );
}

function FTStat({ lab, val, tone, big }) {
  return (
    <div className={"ft-stat" + (big ? " big" : "")}>
      <div className="ft-stat-lab">{lab}</div>
      <div className={"ft-stat-val mono" + (tone ? " " + tone : "")}>{val}</div>
    </div>
  );
}

/* ---------- condition builder + chart + transport ---------- */
function PlayoutView({ plan, t, lang, strat, supported, shape, pickShape, scn, setScnK, months, setMonths, cfg, setParam, drawMode, toggleDraw, anchors, setAnchor, addAnchor, removeAnchor, maxAnchors, pricePath, sim, prog, playing, play, setProg, unit, dispCur }) {
  const num = (k, v) => setParam(k, Number(v) || 0);
  const baseRows = ({
    infinite: [["budget", t.ft_budget], ["divisions", t.ft_divisions]],
    dca: [["budget", t.ft_budget], ["buyAmount", t.ft_buyAmount]],
    value: [["budget", t.ft_budget], ["valueStep", t.ft_valueStep]],
    grid: [["gridLow", t.ft_gridLow], ["gridHigh", t.ft_gridHigh], ["gridCount", t.ft_gridCount]],
    signal: [["budget", t.ft_budget], ["maWin", t.ft_maWin], ["trailPct", t.ft_trailPct], ["stopPct", t.ft_stopPct]],
    rebalance: [["targetValue", t.ft_targetVal], ["bandLow", t.ft_bandLow], ["bandHigh", t.ft_bandHigh]],
  })[cfg.kind] || [["budget", t.ft_budget], ["buyAmount", t.ft_buyAmount]];
  // strategy mechanics (incl. friction cost) vs. universal exit rules — rendered as two sub-groups
  const buyRows = baseRows.concat([["costPct", <FTLab text={t.ft_cost} tip={t.tip_cost} />, { step: 0.05, min: 0 }]]);

  const sgn = (v) => (v > 0 ? "+" : "") + v + "%";
  // trough/horizon expressed in the panel's time unit for direct numeric entry
  const tU = (m) => unit === "d" ? Math.round(m * 30) : unit === "y" ? +(m / 12).toFixed(1) : +m.toFixed(1);
  const fromTU = (n) => unit === "d" ? n / 30 : unit === "y" ? n * 12 : n;

  return (
    <div className="ft-body">
      <div className="ft-hint">{t.ftHint}</div>

      <div className="ft-build">
        <div className="ft-build-block">
          <div className="ft-build-cap">
            <span>{t.ft_scenario}</span>
            <button className={"ft-drawtog" + (drawMode ? " on" : "")} onClick={toggleDraw}>
              <Lic name="pencil" size={11} cls="icon-sm" color="currentColor" />{t.ft_draw}
            </button>
          </div>
          <div className="ft-chips">
            {FT_SHAPE_LIST.map(s => (
              <button key={s} className={"ft-chip" + (!drawMode && shape === s ? " on" : "")} onClick={() => pickShape(s)}>{t["scn_" + s]}</button>
            ))}
          </div>
          {drawMode ? (
            <div className="ft-sliders">
              <div className="ft-drawnote"><Lic name="hand" size={12} cls="icon-sm" color="var(--fg-4)" />{t.ft_drawNote}</div>
              <label className="ft-slider">
                <span className="ft-slider-lab">{t.ft_vol}<b className="mono">{scn.vol}%</b></span>
                <input type="range" min="0" max="100" step="1" value={scn.vol} onChange={e => setScnK("vol", Number(e.target.value))} />
              </label>
              <FTHorizon months={months} setMonths={setMonths} lang={lang} t={t} unit={unit} />
            </div>
          ) : (
            <div className="ft-sliders ft-sliders-2">
              <label className="ft-slider">
                <span className="ft-slider-lab"><FTLab text={scn.peak ? t.ft_peak : t.ft_maxdrop} tip={t.tip_depth} /><FTNum display={scn.depth + "%"} value={scn.depth} min={5} max={60} onCommit={(n) => setScnK("depth", Math.round(n))} title={t.tip_click} /></span>
                <input type="range" min="5" max="60" step="1" value={scn.depth} onChange={e => setScnK("depth", Number(e.target.value))} />
              </label>
              <label className="ft-slider">
                <span className="ft-slider-lab"><FTLab text={scn.peak ? t.ft_peakT : t.ft_troughT} tip={t.tip_trough} /><FTNum display={ftT(scn.troughT * months, unit, lang)} value={tU(scn.troughT * months)} min={tU(months * 0.15)} max={tU(months * 0.85)} step={unit === "y" ? 0.1 : 1} onCommit={(n) => setScnK("troughT", Math.max(0.15, Math.min(0.85, fromTU(n) / months)))} title={t.tip_click} /></span>
                <input type="range" min="0.15" max="0.85" step="0.01" value={scn.troughT} onChange={e => setScnK("troughT", Number(e.target.value))} />
              </label>
              <label className="ft-slider">
                <span className="ft-slider-lab"><FTLab text={t.ft_landing} tip={t.tip_landing} /><span className="ft-num-pair"><FTNum display={sgn(scn.endPct)} value={scn.endPct} min={-40} max={40} onCommit={(n) => setScnK("endPct", Math.round(n))} title={t.tip_click} /><b className="mono dim3"> · {ftMoney(plan.currentPrice * (1 + scn.endPct / 100), plan.cur, dispCur)}</b></span></span>
                <input type="range" min="-40" max="40" step="1" value={scn.endPct} onChange={e => setScnK("endPct", Number(e.target.value))} />
                <span className="ft-qrow">
                  {["Bear", "Base", "Bull"].map(k => {
                    const sc = (plan.scenarios || []).find(s => s.label.en === k);
                    if (!sc) return null;
                    const v = Math.max(-40, Math.min(40, Math.round((sc.target / plan.currentPrice - 1) * 100)));
                    return <i key={k} className={"ft-qchip" + (scn.endPct === v ? " on" : "")} title={ftMoney(sc.target, plan.cur, dispCur)} onClick={(e) => { e.preventDefault(); setScnK("endPct", v); }}>{sc.label[lang]} {(v >= 0 ? "+" : "") + v}%</i>;
                  })}
                </span>
              </label>
              <label className="ft-slider">
                <span className="ft-slider-lab"><FTLab text={t.ft_vol} tip={t.tip_vol} /><FTNum display={scn.vol + "%"} value={scn.vol} min={0} max={100} onCommit={(n) => setScnK("vol", Math.round(n))} title={t.tip_click} /></span>
                <input type="range" min="0" max="100" step="1" value={scn.vol} onChange={e => setScnK("vol", Number(e.target.value))} />
              </label>
              <FTHorizon months={months} setMonths={setMonths} lang={lang} t={t} unit={unit} />
            </div>
          )}
        </div>

        <div className="ft-build-block" style={{ display: drawMode ? "none" : undefined }}>
          <div className="ft-build-cap"><span>{t.ft_params} · {strat ? strat.name[lang] : "—"}</span></div>

          <div className="ft-subcap">{t.ft_buyGroup}</div>
          <div className="ft-params">
            {buyRows.map(([k, lab, opt]) => (
              <label className="ft-param" key={k}>
                <span className="ft-param-lab">{typeof lab === "string" && t["tip_p_" + k] ? <FTLab text={lab} tip={t["tip_p_" + k]} /> : lab}</span>
                <input className="ft-param-in mono" type="number" step={opt && opt.step || 1} min={opt && opt.min} value={cfg[k] || 0} onChange={e => setParam(k, opt ? Math.max(opt.min || 0, Number(e.target.value) || 0) : (Number(e.target.value) || 0))} />
              </label>
            ))}
          </div>

          {cfg.kind === "signal"
            ? <div className="ft-signote"><Lic name="git-branch" size={12} cls="icon-sm" color="var(--fg-4)" />{t.ft_signalNote}</div>
            : <React.Fragment>
                <div className="ft-subcap exit">{t.ft_exitGroup}</div>
                <div className="ft-params">
                  <FTExitRow kind="tp" cfg={cfg} setParam={setParam} t={t} plan={plan} dispCur={dispCur} label={t.ft_tpPct} />
                  <FTExitRow kind="sl" cfg={cfg} setParam={setParam} t={t} plan={plan} dispCur={dispCur} label={t.ft_slPct} />
                </div>
              </React.Fragment>}
        </div>
      </div>

      {!supported && <div className="ft-warn"><Lic name="triangle-alert" size={13} cls="icon-sm" color="var(--r-paused)" />{t.ft_noPlayout}</div>}

      <FTChart pricePath={pricePath} sim={sim} prog={prog} plan={plan} t={t} lang={lang} months={months} supported={supported}
        drawMode={drawMode} anchors={anchors} setAnchor={setAnchor} addAnchor={addAnchor} removeAnchor={removeAnchor} maxAnchors={maxAnchors} unit={unit} dispCur={dispCur} />

      <div className="ft-transport">
        <button className="ft-play" onClick={play} disabled={drawMode} title={playing ? t.ft_pause : (prog >= 1 ? t.ft_replay : t.ft_play)} aria-label={playing ? t.ft_pause : (prog >= 1 ? t.ft_replay : t.ft_play)}>
          <Lic name={playing ? "pause" : (prog >= 1 ? "rotate-ccw" : "play")} size={15} cls="icon-sm" color="currentColor" />
        </button>
        <input className="ft-scrub" type="range" min="0" max="1" step="0.01" value={prog} onChange={e => setProg(Number(e.target.value))} disabled={drawMode}
          style={{ background: `linear-gradient(to right, var(--accent) ${prog * 100}%, var(--border-strong) ${prog * 100}%)` }} />
        <span className="ft-prog-pct mono">{prog <= 0.005 ? t.ft_now : "+" + ftT(prog * months, unit, lang)}</span>
      </div>

      <FTStats sim={sim} prog={prog} plan={plan} t={t} supported={supported} dispCur={dispCur} months={months} unit={unit} lang={lang} exitOn={((cfg.tpMode === "amt" ? cfg.tpAmt : cfg.tpPct) > 0 || (cfg.slMode === "amt" ? cfg.slAmt : cfg.slPct) > 0)} />
    </div>
  );
}

/* ---------- valuation: target price → reverse-engineered metrics ---------- */
function ValuationCalc({ plan, t }) {
  const base = plan.scenarios.find(s => s.label.en === "Base") || plan.scenarios[0];
  const [target, setTarget] = React.useState(base.target);
  const [eps, setEps] = React.useState(plan.eps);
  const per = eps > 0 ? target / eps : 0;
  const capStr = fmtMktCap(target * plan.sharesOut * 1e6, plan.cur);
  const ret = (target / plan.currentPrice - 1) * 100;
  return (
    <div className="ft-body">
      <div className="ft-hint">{t.simHint}</div>
      <div className="sim-row">
        <div className="sim-field">
          <label className="sim-label">{t.targetPrice}</label>
          <input className="sim-input mono" type="number" value={target} onChange={e => setTarget(Number(e.target.value) || 0)} />
        </div>
        <div className="sim-field">
          <label className="sim-label">{t.currentEps}</label>
          <input className="sim-input mono" type="number" value={eps} onChange={e => setEps(Number(e.target.value) || 0)} />
        </div>
        <div className="sim-field">
          <label className="sim-label">{t.sharesOut} (M)</label>
          <input className="sim-input mono" type="number" value={plan.sharesOut} readOnly style={{ color: "var(--fg-4)" }} />
        </div>
      </div>
      <div className="sim-out">
        <div className="sim-out-cell"><div className="sim-out-lab">{t.impliedPer}</div><div className="sim-out-val mono">{per.toFixed(1)}×</div></div>
        <div className="sim-out-cell"><div className="sim-out-lab">{t.impliedCap}</div><div className="sim-out-val mono">{capStr}</div></div>
        <div className="sim-out-cell"><div className="sim-out-lab">{t.impliedRet}</div><div className="sim-out-val mono" style={{ color: ret >= 0 ? "var(--pos)" : "var(--neg)" }}>{ret >= 0 ? "+" : ""}{ret.toFixed(1)}%</div></div>
      </div>
    </div>
  );
}

Object.assign(window, { FTChart, FTStats, FTStat, PlayoutView, ValuationCalc, FTHorizon, FTLab, ftHorizon, ftT, ftMoney });
