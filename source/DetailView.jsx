// DetailView.jsx — single Trade Plan: main content (4 tabs) + properties sidebar

// localize known English strategy-field values (Select/Text defaults) + tidy "auto"
const STRAT_VAL_KO = { Monthly: "매월", Quarterly: "분기별", Weekly: "매주", Daily: "매일", Annually: "연 1회", Yearly: "연 1회" };
// 보유 기간: createdAt("Feb 18") 부터 현재(2026-06)까지 개월 수
function holdingPeriod(createdAt, lang) {
  if (!createdAt) return "—";
  const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const m = createdAt.match(/([A-Za-z]{3})\s*(\d+)/);
  if (!m || MON[m[1]] == null) return "—";
  const now = new Date(2026, 5, 17);
  let mo = (now.getFullYear() * 12 + now.getMonth()) - (2025 * 12 + MON[m[1]]);
  if (mo < 0) mo += 12;
  if (mo < 1) return lang === "ko" ? "1개월 미만" : "<1mo";
  if (mo < 12) return mo + (lang === "ko" ? "개월" : "mo");
  const y = Math.floor(mo / 12), rm = mo % 12;
  return lang === "ko" ? (y + "년" + (rm ? " " + rm + "개월" : "")) : (y + "y" + (rm ? " " + rm + "mo" : ""));
}
function locStratVal(v, lang) {
  if (v === "auto") return "—";
  if (lang === "ko" && STRAT_VAL_KO[v]) return STRAT_VAL_KO[v];
  return v;
}

function MiniDropdown({ trigger, items, onPick, width = 190, align = "left", onCreate, createLabel, searchable, lang, maxRows = 50 }) {
  const [open, setOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [nv, setNv] = React.useState("");
  const [q, setQ] = React.useState("");
  const searchRef = React.useRef(null);
  // focus the search box WITHOUT letting the browser scroll it into view (which shifts the page/pane)
  React.useEffect(() => { if (open && searchable && searchRef.current) searchRef.current.focus({ preventScroll: true }); }, [open, searchable]);
  // panel is position:fixed (anchored to the trigger) so it overlays siblings and is never clipped by an overflow ancestor
  const triggerRef = React.useRef(null);
  const panelRef = React.useRef(null);
  const [coords, setCoords] = React.useState(null);
  const place = () => { const el = triggerRef.current; if (!el) return; const r = el.getBoundingClientRect(); const left = align === "right" ? r.right - width : Math.min(r.left, window.innerWidth - width - 8); setCoords({ top: Math.round(r.bottom + 4), left: Math.round(Math.max(8, left)) }); };
  React.useLayoutEffect(() => {
    if (!open) { setCoords(null); return; }
    place();
    const onScroll = (e) => { if (panelRef.current && e.target && panelRef.current.contains && panelRef.current.contains(e.target)) return; place(); };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", place);
    return () => { window.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", place); };
  }, [open]);
  const close = () => { setOpen(false); setCreating(false); setNv(""); setQ(""); };
  const submit = () => { const v = nv.trim(); if (v && onCreate) onCreate(v); close(); };
  const ql = q.trim().toLowerCase();
  const fItems = !searchable || !ql ? items : items.filter(it => it.cap || it.sep ? false : String(it.search || it.label || "").toLowerCase().includes(ql));
  // render cap: never mount more than maxRows selectable rows (scales to thousands of securities) —
  // captions/separators are kept but don't count; remainder is revealed by typing in the search box.
  let pickCount = 0, truncated = 0;
  const cItems = [];
  for (const it of fItems) {
    if (it.cap || it.sep) { cItems.push(it); continue; }
    if (pickCount < maxRows) { cItems.push(it); pickCount++; }
    else truncated++;
  }
  // drop a trailing caption left with no items under it
  while (cItems.length && cItems[cItems.length - 1].cap) cItems.pop();
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <span ref={triggerRef} onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }} style={{ cursor: "pointer", display: "inline-flex" }}>{trigger}</span>
      {open && <>
        <div className="overlay" style={{ position: "fixed", inset: 0, zIndex: 48 }} onClick={(e) => { e.stopPropagation(); close(); }} />
        {coords && <div className="panel" ref={panelRef} style={{ position: "fixed", top: coords.top, left: coords.left, width, zIndex: 49 }}>
          {searchable && <div className="md-search"><Lic name="search" size={14} cls="icon-sm" color="var(--fg-4)" /><input className="md-search-in" ref={searchRef} value={q} placeholder={searchable === true ? "Search…" : searchable} onChange={e => setQ(e.target.value)} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === "Escape") close(); }} /></div>}
          <div className={searchable ? "md-scroll" : undefined}>
          {cItems.map((it, i) => (
            it.sep ? <div className="md-sep" key={i} />
            : it.cap ? <div className="md-cap" key={i}>{it.cap}</div>
            : <div className={"v-menu-item md-item" + (it.on ? " on" : "")} key={i} onClick={(e) => { e.stopPropagation(); onPick(it.value); close(); }}>
              {it.icon && <span className="md-ico">{it.icon}</span>}<span className="md-lab">{it.label}{it.sub && <span className="md-sub">{it.sub}</span>}</span>{!it.on && it.right != null && <span className="md-right">{it.right}</span>}{it.on && <span className="check"><Lic name="check" size={14} cls="icon-sm" color="var(--accent)" /></span>}
            </div>
          ))}
          {truncated > 0 && <div className="md-more">{lang === "ko" ? `+${truncated}개 더 · 검색해 좁히기` : `+${truncated} more · type to narrow`}</div>}
          {searchable && ql && fItems.length === 0 && <div className="md-empty">{lang === "ko" ? "\uacb0\uacfc \uc5c6\uc74c" : "No results"}</div>}
          </div>
          {onCreate && <>
            <div className="menu-sep" />
            {creating
              ? <div className="md-create" onClick={(e) => e.stopPropagation()}>
                  <input className="md-create-in" autoFocus value={nv} placeholder={createLabel} onChange={e => setNv(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setCreating(false); setNv(""); } }} />
                  <button className="md-create-go" onClick={submit} disabled={!nv.trim()}><Lic name="corner-down-left" size={13} color="currentColor" /></button>
                </div>
              : <div className="v-menu-item md-create-row" onClick={(e) => { e.stopPropagation(); setCreating(true); }}><Lic name="plus" size={14} cls="icon-sm" color="var(--fg-4)" /><span>{createLabel}</span></div>}
          </>}
        </div>}
      </>}
    </span>
  );
}

/* ---- Scenario simulator (target price → reverse-engineered metrics) ---- */
function Simulator({ plan, t }) {
  const base = plan.scenarios.find(s => s.label.en === "Base") || plan.scenarios[0];
  const [target, setTarget] = React.useState(base.target);
  const [eps, setEps] = React.useState(plan.eps);
  const per = eps > 0 ? target / eps : 0;
  const capStr = fmtMktCap(target * plan.sharesOut * 1e6, plan.cur);
  const ret = (target / plan.currentPrice - 1) * 100;
  return (
    <div className="sim-panel">
      <div className="sim-head"><Lic name="calculator" size={15} cls="icon-sm" color="var(--accent)" />{t.simulator}</div>
      <div style={{ font: "var(--fw-regular) 12px var(--font-sans)", color: "var(--fg-4)", marginBottom: 14 }}>{t.simHint}</div>
      <div className="sim-row">
        <div className="sim-field">
          <label className="sim-label">{t.targetPrice}</label>
          <input className="sim-input" type="number" value={target} onChange={e => setTarget(Number(e.target.value) || 0)} />
        </div>
        <div className="sim-field">
          <label className="sim-label">{t.currentEps}</label>
          <input className="sim-input" type="number" value={eps} onChange={e => setEps(Number(e.target.value) || 0)} />
        </div>
        <div className="sim-field">
          <label className="sim-label">{t.sharesOut} (M)</label>
          <input className="sim-input" type="number" value={plan.sharesOut} readOnly style={{ color: "var(--fg-4)" }} />
        </div>
      </div>
      <div className="sim-out">
        <div className="sim-out-cell"><div className="sim-out-lab">{t.impliedPer}</div><div className="sim-out-val">{per.toFixed(1)}×</div></div>
        <div className="sim-out-cell"><div className="sim-out-lab">{t.impliedCap}</div><div className="sim-out-val">{capStr}</div></div>
        <div className="sim-out-cell"><div className="sim-out-lab">{t.impliedRet}</div><div className="sim-out-val" style={{ color: ret >= 0 ? "var(--pos)" : "var(--neg)" }}>{ret >= 0 ? "+" : ""}{ret.toFixed(1)}%</div></div>
      </div>
    </div>
  );
}

/* ---- inline-editable number (click value → edit) ---- */
function EditableNum({ value, cur, onCommit, cls, quickBase }) {
  const [editing, setEditing] = React.useState(false);
  const [v, setV] = React.useState(value);
  React.useEffect(() => { setV(value); }, [value]);
  const rnd = (x) => cur === "USD" ? Math.round(x * 100) / 100 : Math.round(x / 100) * 100;
  if (editing) {
    const chips = quickBase > 0 ? [-20, -10, 0, 10, 20, 30] : null;
    return (
      <span className="sc-edit-pop">
        <input className="sc-target-input mono" type="number" autoFocus value={v}
          onChange={e => setV(Number(e.target.value) || 0)}
          onBlur={() => { setEditing(false); if (v > 0 && v !== value) onCommit(v); else setV(value); }}
          onKeyDown={e => { if (e.key === "Enter") { e.stopPropagation(); e.target.blur(); } if (e.key === "Escape") { e.stopPropagation(); setV(value); setEditing(false); } }} />
        {chips && <span className="sc-edit-chips" title={t_quickTip}>
          {chips.map(p => <button key={p} className={"sc-edit-chip" + (p === 0 ? " base" : "")}
            onMouseDown={(e) => { e.preventDefault(); const nv = rnd(quickBase * (1 + p / 100)); setV(nv); setEditing(false); if (nv > 0 && nv !== value) onCommit(nv); }}>
            {p === 0 ? t_curLabel : (p > 0 ? "+" : "") + p + "%"}</button>)}
        </span>}
      </span>
    );
  }
  return <span className={(cls || "") + " editable"} onClick={() => setEditing(true)} title={t_clickEdit}>
    {fmtMoney(value, cur)}
    <svg className="edit-pen" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /></svg>
  </span>;
}
let t_clickEdit = "";
let t_curLabel = "";
let t_quickTip = "";

/* ---- Scenarios tab ---- */
const SC_STATUSES = ["tracking", "approaching", "realized", "invalidated"];
function ScStatusPick({ status, onPick, t }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener("pointerdown", h);
    return () => window.removeEventListener("pointerdown", h);
  }, [open]);
  const sc = SC_STATUS_COLOR[status];
  return (
    <span className="sc-statuspick" ref={ref}>
      <button className="sc-ministatus sc-ministatus-btn" style={{ background: sc.bg, color: sc.fg }} onClick={() => setOpen(o => !o)} title={t.scEditStatus}>
        {t["sc_" + status]}<Lic name="chevron-down" size={11} color="currentColor" cls="sc-pill-caret" />
      </button>
      {open && <span className="v-menu sc-status-menu">
        {SC_STATUSES.map(st => {
          const c = SC_STATUS_COLOR[st];
          return <button key={st} className={"v-menu-item sc-status-opt" + (st === status ? " on" : "")} onClick={() => { onPick(st); setOpen(false); }}>
            <span className="sc-status-dot" style={{ background: c.fg }} />{t["sc_" + st]}
            {st === status && <Lic name="check" size={13} color="var(--accent)" cls="sc-status-check" />}
          </button>;
        })}
      </span>}
    </span>
  );
}
/* ---- 수렴 분석 — 가격이 가치로 수렴할 때 기대 IRR (구 퓨처테스트 자리) ---- */
function ConvergenceTest({ plan, t, lang }) {
  const ko = lang === "ko";
  const px = plan.currentPrice, sc = plan.scenarios || [];
  const tOf = en => { const s = sc.find(x => x.label && x.label.en === en); return s ? s.target : null; };
  const rows = [
    { key: "bull", lab: ko ? "상단" : "Bull", color: "var(--r-bull)", tgt: tOf("Bull") || plan.iv * 1.25 },
    { key: "base", lab: ko ? "중간" : "Base", color: "var(--accent)", tgt: tOf("Base") || plan.iv },
    { key: "bear", lab: ko ? "하단" : "Bear", color: "var(--r-bear)", tgt: tOf("Bear") || plan.iv * 0.78 },
  ];
  const horizons = [1, 2, 3];
  const irr = (tgt, yrs) => (Math.pow(tgt / px, 1 / yrs) - 1) * 100;
  const tone = v => v >= 12 ? "pos" : v >= 0 ? "" : "neg";
  return (
    <div className="conv">
      <div className="conv-head">
        <span className="conv-title">{ko ? "수렴 분석 · 기대 연수익률(IRR)" : "Convergence · expected IRR"}</span>
        <span className="conv-sub">{ko ? "가격이 각 가치 시나리오로 수렴한다고 가정할 때" : "If price converges to each value scenario"}</span>
      </div>
      <table className="conv-table">
        <thead><tr><th>{ko ? "시나리오" : "Scenario"}</th><th>{ko ? "목표가" : "Target"}</th><th>{ko ? "총수익" : "Total"}</th>{horizons.map(h => <th key={h}>{h}{ko ? "년" : "y"}</th>)}</tr></thead>
        <tbody>
          {rows.map(r => {
            const total = (r.tgt / px - 1) * 100;
            return (
              <tr key={r.key}>
                <td><span className="conv-dot" style={{ background: r.color }} />{r.lab}</td>
                <td className="mono">{fmtMoney(r.tgt, plan.cur)}</td>
                <td className={"mono " + (total >= 0 ? "pos" : "neg")}>{total >= 0 ? "+" : ""}{total.toFixed(0)}%</td>
                {horizons.map(h => { const v = irr(r.tgt, h); return <td key={h} className={"mono conv-irr " + tone(v)}>{v >= 0 ? "+" : ""}{v.toFixed(1)}%</td>; })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="conv-note">{ko ? "IRR = (목표가/현재가)^(1/기간) − 1. 12% 이상이면 강조됩니다. 수렴 시점은 가정이며 예측이 아닙니다." : "IRR = (target/price)^(1/yrs) − 1. Convergence timing is an assumption, not a forecast."}</div>
    </div>
  );
}

function PlanValueBar({ plan, t, lang, onUpdateScenario, onPatchPlan, title }) {
  const g = gaugeData(plan);
  const fmtT = (n) => fmtCompact(n, plan.cur);
  const buys = (plan.executions || []).filter(e => e.side === "buy");
  const entryPx = buys.length ? buys.reduce((a, b) => ((a.round ?? 99) <= (b.round ?? 99) ? a : b)).price : null;
  const roundN = plan.round || buys.length;
  const roundTxt = roundN > 0 ? (plan.divisions ? `${roundN}/${plan.divisions}${t.roundUnit}` : `${roundN}${t.roundUnit}`) : null;
  const avgLabel = plan.avgPrice == null ? t.avg : [
    entryPx != null && Math.abs(entryPx - plan.avgPrice) > 0.001 ? `${t.entry} ${fmtT(entryPx)}` : null,
    `${t.avg} ${fmtT(plan.avgPrice)}`,
    roundTxt,
  ].filter(Boolean).join("  ·  ");
  const barRef = React.useRef(null);
  const dragRef = React.useRef(null);
  const startDrag = (sc) => (e) => {
    if (!onUpdateScenario || !barRef.current) return;
    const idx = plan.scenarios.indexOf(sc);
    if (idx < 0) return;
    e.preventDefault();
    dragRef.current = { idx, lo: g.lo, hi: g.hi };
    const move = (ev) => {
      const d = dragRef.current; if (!d) return;
      const r = barRef.current.getBoundingClientRect();
      const f = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
      let v = d.lo + f * (d.hi - d.lo);
      v = plan.cur === "USD" ? Math.round(v * 100) / 100 : Math.round(v / 100) * 100;
      if (v > 0) onUpdateScenario(plan.id, d.idx, { target: v });
    };
    const up = () => { dragRef.current = null; window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const startDragLine = (key) => (e) => {
    if (!onPatchPlan || !barRef.current) return;
    e.preventDefault(); e.stopPropagation();
    const d = { lo: g.lo, hi: g.hi };
    const move = (ev) => {
      const r = barRef.current.getBoundingClientRect();
      const f = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
      let v = d.lo + f * (d.hi - d.lo);
      v = plan.cur === "USD" ? Math.round(v * 100) / 100 : Math.round(v / 100) * 100;
      if (v > 0) onPatchPlan(plan.id, key === "sl" ? { slPrice: v } : { tpPrice: v });
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <div className="sc-range">
      <div className="sc-range-head">
        <span className="sc-range-title">{title || (lang === "ko" ? "시나리오 범위" : "Scenario range")}</span>
        <span className="sc-range-hint">{lang === "ko" ? "핀을 드래그해 목표가 수정" : "Drag pins to edit targets"}</span>
        <span className="sc-range-now">{t.now} · <b className="mono" style={{ color: "var(--fg)" }}>{fmtMoney(plan.currentPrice, plan.cur)}</b></span>
      </div>
      <div className="sc-bar" ref={barRef}>
        {g && <>
          {(() => { const atPos = (v) => Math.max(0, Math.min(100, (v - g.lo) / (g.hi - g.lo) * 100)); const lines = planActionLines(plan); return <>
            {lines.sl != null && <div className="sc-bar-tick sl draggable" onPointerDown={startDragLine("sl")} style={{ left: atPos(lines.sl) + "%" }} data-label={t.stopLoss + " " + fmtT(lines.sl)} title={t.tip_actionDrag} />}
            {lines.tp != null && <div className="sc-bar-tick tp draggable" onPointerDown={startDragLine("tp")} style={{ left: atPos(lines.tp) + "%" }} data-label={t.takeProfit + " " + fmtT(lines.tp)} title={t.tip_actionDrag} />}
            {g.avgPos != null && <div className="sc-bar-avg" style={{ left: g.avgPos + "%" }} data-label={t.avg + " " + fmtT(g.avgPrice)} data-tip={avgLabel} />}
          </>; })()}
          <div className="sc-bar-pin draggable" onPointerDown={startDrag(g.bear)} data-label={g.bear.label[lang] + " " + fmtT(g.bear.target)} style={{ left: g.bearPos + "%", background: "var(--r-bear)" }} />
          <div className="sc-bar-pin draggable" onPointerDown={startDrag(g.base)} data-label={g.base.label[lang] + " " + fmtT(g.base.target)} style={{ left: g.basePos + "%", background: "var(--r-base)" }} />
          <div className="sc-bar-pin draggable" onPointerDown={startDrag(g.bull)} data-label={g.bull.label[lang] + " " + fmtT(g.bull.target)} style={{ left: g.bullPos + "%", background: "var(--r-bull)" }} />
          {plan.scenarios.map((s, i) => {
            if (["Bull", "Base", "Bear"].includes(s.label.en)) return null;
            const pos = Math.max(0, Math.min(100, (s.target - g.lo) / (g.hi - g.lo) * 100));
            return <div key={"cust" + i} className="sc-bar-pin custom draggable" onPointerDown={startDrag(s)} data-label={s.label[lang] + " " + fmtT(s.target)} style={{ left: pos + "%", background: s.color }} />;
          })}
          <div className="sc-bar-marker" data-label={fmtT(g.primary)} data-hover={(g.isExit ? (t.exitL || t.current) : t.current) + " " + fmtT(g.primary) + (g.avgPrice ? " · " + (lang === "ko" ? "평단 대비 " : "vs avg ") + ((g.primary / g.avgPrice - 1) >= 0 ? "+" : "") + ((g.primary / g.avgPrice - 1) * 100).toFixed(1) + "%" : "")} style={{ left: g.pos + "%" }} />
        </>}
      </div>
    </div>
  );
}

function scProbOf(s) {
  if (typeof s.prob === "number") return s.prob;
  const en = (s.label && s.label.en) || "";
  return en === "Base" ? 50 : (en === "Bull" || en === "Bear") ? 25 : 20;
}
function ScProbEdit({ value, onCommit }) {
  const [editing, setEditing] = React.useState(false);
  const [v, setV] = React.useState(value);
  React.useEffect(() => setV(value), [value]);
  if (editing) {
    return (
      <span className="sc-prob-edit">
        <input className="sc-prob-input mono" type="number" min="0" max="100" autoFocus value={v}
          onChange={(e) => setV(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
          onBlur={() => { setEditing(false); if (v !== value) onCommit(v); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }} />
        <span className="sc-prob-pct">%</span>
      </span>
    );
  }
  return <button className="sc-prob-pill" title={"\ud655\ub960 " + value + "% \u00b7 \ud074\ub9ad\ud574 \ud3b8\uc9d1"} onClick={() => setEditing(true)}>{value}%</button>;
}
function ScAvgTip({ children }) {
  const [pos, setPos] = React.useState(null);
  const ref = React.useRef(null);
  return (
    <span ref={ref} className="sc-avg-q" onMouseEnter={() => { const r = ref.current.getBoundingClientRect(); setPos({ left: r.right, top: r.bottom + 7 }); }} onMouseLeave={() => setPos(null)}>
      <span className="ind-q">?</span>
      {pos && <span className="sc-avg-tip" style={{ left: pos.left + "px", top: pos.top + "px" }}>{children}</span>}
    </span>
  );
}
function ScenariosTab({ plan, t, lang, onUpdateScenario, onAddScenario, onRemoveScenario, onPatchPlan, onGotoValuation }) {
  const [view, setView] = React.useState("cases");
  const fw = STRATEGIES.find(s => s.id === plan.strategyId);
  const swingField = fw && fw.fields ? fw.fields.find(f => f.swing) : null;
  const swingLab = swingField ? swingField.label[lang] : (lang === "ko" ? "가정 PER" : "Assumed P/E");
  const swingUnit = (fw && (fw.model === "DCF" || fw.model === "DDM")) ? "%" : "×";
  const capFmt = v => { if (!v) return "—"; const d = toDispCur(v, plan.cur); const usd = d.cur === "USD"; const x = d.v / (usd ? 1e9 : 1e12); return (Math.abs(x) >= 100 ? Math.round(x).toLocaleString() : x.toFixed(1)) + (usd ? "B" : "조"); };
  t_clickEdit = lang === "ko" ? "\ud074\ub9ad\ud574 \ubaa9\ud45c\uac00 \uc218\uc815" : "Click to edit target";
  t_curLabel = lang === "ko" ? "현재가" : "Now";
  t_quickTip = lang === "ko" ? "현재가 대비 빠른 설정" : "Quick-set vs current price";
  const g = gaugeData(plan);
  const fmtT = (n) => fmtCompact(n, plan.cur);
  // avg marker hover tooltip: entry price → avg price → current round
  const buys = (plan.executions || []).filter(e => e.side === "buy");
  const entryPx = buys.length ? buys.reduce((a, b) => ((a.round ?? 99) <= (b.round ?? 99) ? a : b)).price : null;
  const roundN = plan.round || buys.length;
  const roundTxt = roundN > 0 ? (plan.divisions ? `${roundN}/${plan.divisions}${t.roundUnit}` : `${roundN}${t.roundUnit}`) : null;
  const avgLabel = plan.avgPrice == null ? t.avg : [
    entryPx != null && Math.abs(entryPx - plan.avgPrice) > 0.001 ? `${t.entry} ${fmtT(entryPx)}` : null,
    `${t.avg} ${fmtT(plan.avgPrice)}`,
    roundTxt,
  ].filter(Boolean).join("  ·  ");
  // drag-to-edit the bear/base/bull pins on the range bar
  const barRef = React.useRef(null);
  const dragRef = React.useRef(null); // { idx, lo, hi } — scale frozen at drag start
  const startDrag = (sc) => (e) => {
    if (!onUpdateScenario || !barRef.current) return;
    const idx = plan.scenarios.indexOf(sc);
    if (idx < 0) return;
    e.preventDefault();
    dragRef.current = { idx, lo: g.lo, hi: g.hi };
    const move = (ev) => {
      const d = dragRef.current; if (!d) return;
      const r = barRef.current.getBoundingClientRect();
      const f = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
      let v = d.lo + f * (d.hi - d.lo);
      v = plan.cur === "USD" ? Math.round(v * 100) / 100 : Math.round(v / 100) * 100;
      if (v > 0) onUpdateScenario(plan.id, d.idx, { target: v });
    };
    const up = () => { dragRef.current = null; window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  // drag the SL/TP action ticks — sets a per-plan override (slPrice/tpPrice)
  const startDragLine = (key) => (e) => {
    if (!onPatchPlan || !barRef.current) return;
    e.preventDefault(); e.stopPropagation();
    const d = { lo: g.lo, hi: g.hi };
    const move = (ev) => {
      const r = barRef.current.getBoundingClientRect();
      const f = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
      let v = d.lo + f * (d.hi - d.lo);
      v = plan.cur === "USD" ? Math.round(v * 100) / 100 : Math.round(v / 100) * 100;
      if (v > 0) onPatchPlan(plan.id, key === "sl" ? { slPrice: v } : { tpPrice: v });
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <div>
      <GapTab plan={plan} t={t} lang={lang} onUpdateScenario={onUpdateScenario} onPatchPlan={onPatchPlan} part="track" onGotoValuation={onGotoValuation} />
      {<React.Fragment>
      <div className="sc-range" style={{ display: "none" }}>
        <div className="sc-range-head">
          <span className="sc-range-title">{lang === "ko" ? "시나리오 범위" : "Scenario range"}</span>
          <span className="sc-range-hint">{lang === "ko" ? "\ud540\uc744 \ub4dc\ub798\uadf8\ud574 \ubaa9\ud45c\uac00 \uc218\uc815" : "Drag pins to edit targets"}</span>
          <span className="sc-range-now">{t.now} · <b className="mono" style={{ color: "var(--fg)" }}>{fmtMoney(plan.currentPrice, plan.cur)}</b></span>
        </div>
        <div className="sc-bar" ref={barRef}>
          {g && <>
            {(() => { const atPos = (v) => Math.max(0, Math.min(100, (v - g.lo) / (g.hi - g.lo) * 100)); const lines = planActionLines(plan); return <>
              {lines.sl != null && <div className="sc-bar-tick sl draggable" onPointerDown={startDragLine("sl")} style={{ left: atPos(lines.sl) + "%" }} data-label={t.stopLoss + " " + fmtT(lines.sl)} title={t.tip_actionDrag} />}
              {lines.tp != null && <div className="sc-bar-tick tp draggable" onPointerDown={startDragLine("tp")} style={{ left: atPos(lines.tp) + "%" }} data-label={t.takeProfit + " " + fmtT(lines.tp)} title={t.tip_actionDrag} />}
              {g.avgPos != null && <div className="sc-bar-avg" style={{ left: g.avgPos + "%" }} data-label={t.avg + " " + fmtT(g.avgPrice)} data-tip={avgLabel} />}
            </>; })()}
            <div className="sc-bar-pin draggable" onPointerDown={startDrag(g.bear)} data-label={g.bear.label[lang] + " " + fmtT(g.bear.target)} style={{ left: g.bearPos + "%", background: "var(--r-bear)" }} />
            <div className="sc-bar-pin draggable" onPointerDown={startDrag(g.base)} data-label={g.base.label[lang] + " " + fmtT(g.base.target)} style={{ left: g.basePos + "%", background: "var(--r-base)" }} />
            <div className="sc-bar-pin draggable" onPointerDown={startDrag(g.bull)} data-label={g.bull.label[lang] + " " + fmtT(g.bull.target)} style={{ left: g.bullPos + "%", background: "var(--r-bull)" }} />
            {plan.scenarios.map((s, i) => {
              if (["Bull", "Base", "Bear"].includes(s.label.en)) return null;
              const pos = Math.max(0, Math.min(100, (s.target - g.lo) / (g.hi - g.lo) * 100));
              return <div key={"cust" + i} className="sc-bar-pin custom draggable" onPointerDown={startDrag(s)} data-label={s.label[lang] + " " + fmtT(s.target)} style={{ left: pos + "%", background: s.color }} />;
            })}
            <div className="sc-bar-marker" data-label={fmtT(g.primary)} data-hover={(g.isExit ? (t.exitL || t.current) : t.current) + " " + fmtT(g.primary) + (g.avgPrice ? " · " + (lang === "ko" ? "평단 대비 " : "vs avg ") + ((g.primary / g.avgPrice - 1) >= 0 ? "+" : "") + ((g.primary / g.avgPrice - 1) * 100).toFixed(1) + "%" : "")} style={{ left: g.pos + "%" }} />
          </>}
        </div>
      </div>

      <div className="sc-grid">
        {plan.scenarios.map((s, i) => {
          const ret = (s.target / plan.currentPrice - 1) * 100;
          const prog = Math.max(0, Math.min(100, (plan.currentPrice / s.target) * 100));
          const isCore = ["Bull", "Base", "Bear"].includes(s.label.en);
          return (
            <div className="sc-card" key={i}>
              <div className="sc-card-bar" style={{ background: s.color }} />
              <div className="sc-card-head">
                {isCore
                  ? <span className="sc-label"><FTLab text={s.label[lang]} tip={t["tip_" + s.label.en.toLowerCase()]} /></span>
                  : <span className="sc-label sc-editable" contentEditable suppressContentEditableWarning data-ph={t.scNamePh}
                      onBlur={(e) => { const v = e.target.textContent.trim(); if (v && onUpdateScenario) onUpdateScenario(plan.id, i, { label: { en: v, ko: v } }); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }}>{s.label[lang]}</span>}
                {s.auto && <span className="sc-auto" title={t.scAutoTip}>{t.scAuto}</span>}
                <span className="sc-ministatus-wrap">{(() => { const st = scAutoStatus(plan, s.target); const c = SC_STATUS_COLOR[st]; return <span className="sc-ministatus" style={{ background: c.bg, color: c.fg }} title={t.scAutoStatusTip || t.scEditStatus}>{t["sc_" + st]}</span>; })()}</span>
                {!isCore && onRemoveScenario && <button className="sc-card-del" title={t.delete} onClick={() => onRemoveScenario(plan.id, i)}><Lic name="x" size={13} color="currentColor" /></button>}
              </div>
              <div className="sc-thesis sc-editable" contentEditable suppressContentEditableWarning data-ph={t.scThesisPh} title={t.scEditHint}
                onBlur={(e) => { const v = e.target.textContent.trim(); if (onUpdateScenario) onUpdateScenario(plan.id, i, { thesis: { en: v, ko: v } }); }}>{s.thesis[lang]}</div>
              <div className="sc-target">
                <span className="sc-target-edit" title={t.scEditHint}><EditableNum value={s.target} cur={plan.cur} cls="sc-target-val" quickBase={plan.currentPrice} onCommit={(nv) => onUpdateScenario && onUpdateScenario(plan.id, i, { target: nv })} /></span>
                <span className={"sc-target-ret " + (ret >= 0 ? "pos" : "neg")}>{ret >= 0 ? "+" : ""}{ret.toFixed(1)}%</span>
              </div>
              <div className="sc-prog-track"><div className="sc-prog-fill" style={{ width: prog + "%", background: s.color }} /></div>
              <div className="sc-metrics">
                <div className="sc-metric"><span className="sc-metric-lab">{swingLab}</span><span className="sc-metric-val">{s.per.toFixed(1)}{swingUnit}</span></div>
                <div className="sc-metric"><span className="sc-metric-lab">{lang === "ko" ? "함의 시총" : "Impl. cap"}</span><span className="sc-metric-val">{capFmt(s.target * (plan.sharesOut || 0) * 1e6)}</span></div>
                <div className="sc-metric"><span className="sc-metric-lab">{lang === "ko" ? "현재가 대비" : "vs price"}</span><span className={"sc-metric-val " + (ret >= 0 ? "pos" : "neg")}>{ret >= 0 ? "+" : ""}{ret.toFixed(0)}%</span></div>
                <div className="sc-metric"><span className="sc-metric-lab">{t.expPL}</span><span className="sc-metric-val">{plan.totalShares ? fmtCompact((s.target - plan.avgPrice) * plan.totalShares, plan.cur) : "—"}</span></div>
              </div>
            </div>
          );
        })}
        {(() => {
          const ko = lang === "ko";
          const ts = plan.scenarios.map(s => s.target).filter(v => v > 0);
          if (!ts.length) return null;
          const avgPrice = Math.round(ts.reduce((a, b) => a + b, 0) / ts.length);
          const avgRet = (avgPrice / plan.currentPrice - 1) * 100;
          const avgPL = plan.totalShares ? (avgPrice - plan.avgPrice) * plan.totalShares : null;
          const lo = Math.min(...ts), hi = Math.max(...ts);
          const prog = Math.max(0, Math.min(100, (plan.currentPrice / avgPrice) * 100));
          return (
            <div className="sc-card sc-card--avg">
              <div className="sc-card-bar" style={{ background: "var(--accent)" }} />
              <div className="sc-card-head">
                <span className="sc-label">{ko ? "평균" : "Average"}</span>
                <ScAvgTip><b>{(ko ? "시나리오 평균 " : "Average ") + fmtMoney(avgPrice, plan.cur)}</b><span className="fin-tip-def">{ko ? "상단·중간·하단 세 목표가를 단순 평균한 값이에요. 확률을 가정하지 않은 중립적 기준점이라 어느 한쪽으로 치우치지 않아요." : "Simple average of the bull/base/bear targets — a neutral reference that assumes no probabilities."}</span><span className="fin-tip-f">{"(" + ts.map(v => fmtMoney(v, plan.cur)).join(" + ") + ") ÷ " + ts.length + " = " + fmtMoney(avgPrice, plan.cur)}</span></ScAvgTip>
              </div>
              <div className="sc-exp-form">{ko ? "상단·중간·하단 목표가의 단순 평균이에요." : "Simple average of the three targets."}</div>
              <div className="sc-target">
                <span className="sc-target-val mono">{fmtMoney(avgPrice, plan.cur)}</span>
                <span className={"sc-target-ret " + (avgRet >= 0 ? "pos" : "neg")}>{avgRet >= 0 ? "+" : ""}{avgRet.toFixed(1)}%</span>
              </div>
              <div className="sc-prog-track"><div className="sc-prog-fill" style={{ width: prog + "%", background: "var(--accent)" }} /></div>
              <div className="sc-metrics">
                <div className="sc-metric"><span className="sc-metric-lab">{ko ? "목표 범위" : "Range"}</span><span className="sc-metric-val">{fmtCompact(lo, plan.cur) + "~" + fmtCompact(hi, plan.cur)}</span></div>
                <div className="sc-metric"><span className="sc-metric-lab">{ko ? "평균 손익" : "Avg P/L"}</span><span className="sc-metric-val">{avgPL != null ? fmtCompact(avgPL, plan.cur) : "—"}</span></div>
              </div>
            </div>
          );
        })()}
      </div>
      <GapTab plan={plan} t={t} lang={lang} onUpdateScenario={onUpdateScenario} onPatchPlan={onPatchPlan} part="head" />
      <ConvergenceTest plan={plan} t={t} lang={lang} />
      </React.Fragment>}
    </div>
  );
}

/* ---- Executions tab ---- */
function ExecutionsTab({ plan, t, lang, onAddExec }) {
  const [open, setOpen] = React.useState(false);
  const [side, setSide] = React.useState("buy");
  const [price, setPrice] = React.useState("");
  const [qty, setQty] = React.useState("");
  const sym = plan.cur === "USD" ? "$" : "₩";
  const reset = () => { setPrice(""); setQty(""); setSide("buy"); };
  const submit = () => {
    const p = Number(price), q = Number(qty);
    if (!(p > 0) || !(q > 0)) return;
    onAddExec && onAddExec(plan.id, { side, price: p, qty: q, date: "now" });
    reset(); setOpen(false);
  };
  return (
    <div>
      {(plan.executions || []).length > 0 && <PerfBand plan={plan} lang={lang} t={t} />}
      <ExecutionLedger plan={plan} t={t} lang={lang} />
      {!plan.executions.length && <div style={{ padding: "32px 0", textAlign: "center", color: "var(--fg-4)", font: "var(--fw-medium) 13px var(--font-sans)" }}>{lang === "ko" ? "아직 체결이 없습니다" : "No executions yet"}</div>}
      {open ? (
        <div className="exec-form">
          <div className="exec-form-seg">
            <button className={"exec-side-btn buy" + (side === "buy" ? " on" : "")} onClick={() => setSide("buy")}>{t.buy}</button>
            <button className={"exec-side-btn sell" + (side === "sell" ? " on" : "")} onClick={() => setSide("sell")}>{t.sell}</button>
          </div>
          <label className="exec-field">
            <span className="exec-field-lab">{t.price}</span>
            <span className="exec-input-wrap"><span className="exec-cur">{sym}</span><input className="exec-input mono" type="number" autoFocus value={price} onChange={e => setPrice(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") setOpen(false); }} /></span>
          </label>
          <label className="exec-field">
            <span className="exec-field-lab">{t.qty}</span>
            <input className="exec-input mono" type="number" value={qty} onChange={e => setQty(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") setOpen(false); }} />
          </label>
          <div className="exec-form-actions">
            <button className="v-btn exec-cancel" onClick={() => { reset(); setOpen(false); }}>{t.cancel}</button>
            <button className="v-btn v-btn--primary exec-save" onClick={submit} disabled={!(Number(price) > 0 && Number(qty) > 0)}>{t.addExec}</button>
          </div>
        </div>
      ) : (
        <button className="add-row" style={{ marginTop: 6, width: "100%" }} onClick={() => setOpen(true)}><Lic name="plus" size={15} color="var(--fg-4)" />{t.addExec}</button>
      )}
    </div>
  );
}

/* ---- Rules tab ---- */
const RULE_TRIGS = [
  { id: "price_le", ko: "현재가 ≤", en: "Price ≤", hasValue: true, unit: "", descKo: "현재가가 입력한 가격 이하로 내려가면 발동합니다. 저가 매수 타이밍에 씁니다.", descEn: "Fires when price drops to or below your value — a buy-the-dip trigger." },
  { id: "price_ge", ko: "현재가 ≥", en: "Price ≥", hasValue: true, unit: "", descKo: "현재가가 입력한 가격 이상으로 오르면 발동합니다.", descEn: "Fires when price rises to or above your value." },
  { id: "ret_ge", ko: "수익률 ≥", en: "Return ≥", hasValue: true, unit: "%", descKo: "내 평단가 대비 수익률이 목표% 이상이면 발동합니다. 익절 신호로 자주 씁니다.", descEn: "Fires when return vs your avg cost reaches the target %. Common for take-profit." },
  { id: "ret_le", ko: "수익률 ≤", en: "Return ≤", hasValue: true, unit: "%", descKo: "수익률이 입력% 이하로 떨어지면 발동합니다. 손절·추가매수 검토에 씁니다.", descEn: "Fires when return falls to or below the value. For stop-loss or add-on review." },
  { id: "loc_hit", ko: "LOC 가격 도달", en: "LOC price hit", hasValue: false, unit: "", descKo: "LOC(Limit-On-Close)는 장 마감가(종가)로 자동 매수하는 주문 방식이에요. 현재가가 ‘LOC 기준 %’로 계산된 LOC 가격에 닿으면 발동해요.", descEn: "LOC (Limit-On-Close) auto-buys at the closing price. Fires when price reaches the LOC price from the 'LOC %' field." },
  { id: "target_hit", ko: "상단 목표가 도달", en: "Bull target hit", hasValue: false, unit: "", descKo: "상단(낙관) 시나리오 목표가에 도달하면 발동합니다.", descEn: "Fires when price reaches the bull-case target." },
  { id: "buy_exec", ko: "매수 체결됨", en: "Buy filled", hasValue: false, unit: "", descKo: "매수 체결이 입력될 때마다 발동합니다. 회차 자동 증가 등에 씁니다.", descEn: "Fires whenever a buy fill is logged. Used for auto round-counting." },
];
const RULE_ACTS = [
  { id: "notify", ko: "알림 보내기", en: "Notify", descKo: "푸시·인앱 알림을 보냅니다.", descEn: "Sends a notification." },
  { id: "notify_buy", ko: "매수 알림", en: "Buy alert", descKo: "매수 신호 알림과 함께 1회 매수금을 표시합니다.", descEn: "Buy-signal alert with the per-round amount." },
  { id: "notify_sell", ko: "청산 제안", en: "Suggest exit", descKo: "청산(매도)을 제안하는 알림을 보냅니다.", descEn: "Alerts you to consider exiting." },
  { id: "round_inc", ko: "회차 +1", en: "Round +1", descKo: "분할 매수 회차를 +1 하고 평단가를 재계산합니다.", descEn: "Increments the round and recalculates avg cost." },
  { id: "note", ko: "메모 남기기", en: "Log note", descKo: "활동 로그에 자동으로 메모를 남깁니다.", descEn: "Logs a note to the activity feed." },
];
const RULE_LEGACY_DESC = {
  "LOC 매수 알림": { ko: "현재가가 LOC 가격(‘LOC 기준 %’로 계산된 매수 기준가) 이하로 떨어지면 매수 알림과 1회 매수금을 보여줘요.", en: "Shows a buy alert and the per-round amount when price drops to the LOC price." },
  "회차 증가": { ko: "매수 체결이 입력되면 분할 매수 회차를 +1 하고 평단가를 다시 계산합니다.", en: "On a buy fill, increment the round and recalculate the average cost." },
  "익절 알림": { ko: "수익률이 익절 기준(예: 10%) 이상이면 청산(매도)을 제안하는 알림을 보냅니다.", en: "When return reaches the take-profit threshold, suggest exiting." },
};
function evalRule(plan, r, ko) {
  const px = plan.currentPrice, avg = plan.avgPrice || 0;
  const ret = avg > 0 ? (px - avg) / avg * 100 : null;
  const ex = (typeof EXEC_STRATEGIES !== "undefined") ? EXEC_STRATEGIES.find(s => s.id === plan.execId) : null;
  const fdNum = (k, d) => { const f = ex && ex.fields ? ex.fields.find(x => x.key === k) : null; const n = f ? parseFloat(String(f.default).replace(/[^0-9.\-]/g, "")) : NaN; return isNaN(n) ? d : n; };
  const locPx = avg > 0 ? avg * (1 + fdNum("loc_pct", -5) / 100) : null;
  const tpPct = fdNum("tp_pct", 10);
  const bull = (plan.scenarios || []).find(s => s.label && s.label.en === "Bull");
  const fired = (on, meta) => ({ state: on ? "fired" : "armed", meta });
  const ev = (meta) => ({ state: "event", meta });
  // custom (structured) rules
  if (r.trig) {
    const v = parseFloat(String(r.trigVal).replace(/[^0-9.\-]/g, ""));
    switch (r.trig) {
      case "price_le": return fired(px <= v, (ko ? "현재가 " : "Price ") + fmtMoney(px, plan.cur) + (px <= v ? " ≤ " : " > ") + fmtMoney(v, plan.cur));
      case "price_ge": return fired(px >= v, (ko ? "현재가 " : "Price ") + fmtMoney(px, plan.cur) + (px >= v ? " ≥ " : " < ") + fmtMoney(v, plan.cur));
      case "ret_ge": return ret == null ? ev(ko ? "보유 없음" : "no position") : fired(ret >= v, (ko ? "수익률 " : "Return ") + ret.toFixed(1) + "% " + (ret >= v ? "≥" : "<") + " " + v + "%");
      case "ret_le": return ret == null ? ev(ko ? "보유 없음" : "no position") : fired(ret <= v, (ko ? "수익률 " : "Return ") + ret.toFixed(1) + "% " + (ret <= v ? "≤" : ">") + " " + v + "%");
      case "loc_hit": return locPx == null ? ev(ko ? "보유 없음" : "no position") : fired(px <= locPx, (ko ? "현재가 " : "Price ") + fmtMoney(px, plan.cur) + (px <= locPx ? " ≤ " : " > ") + "LOC " + fmtMoney(locPx, plan.cur));
      case "target_hit": return !bull ? ev("—") : fired(px >= bull.target, (ko ? "현재가 " : "Price ") + fmtMoney(px, plan.cur) + (px >= bull.target ? " ≥ " : " < ") + fmtMoney(bull.target, plan.cur));
      case "buy_exec": return ev(ko ? "체결 시 발동" : "on fill");
      default: return ev("—");
    }
  }
  // legacy strategy rules by name
  const nm = (r.name && (r.name.en || r.name.ko)) || "";
  const isVRex = ex && ex.fields && ex.fields.some(f => f.key === "vr_vline");
  if (isVRex) {
    const vW = plan.totalInvested || (avg * (plan.totalShares || 0));
    const valW = (plan.totalShares || 0) * px;
    if (!vW) return ev(ko ? "진입 전" : "no position");
    if (/상단|upper|매도|trim|초과/i.test(nm)) { const hiW = vW * (1 + Math.abs(fdNum("vr_upper", 15)) / 100); return fired(valW >= hiW, (ko ? "평가액 " : "Value ") + fmtMoney(valW, plan.cur) + (valW >= hiW ? " ≥ " : " < ") + (ko ? "상단 " : "upper ") + fmtMoney(hiW, plan.cur)); }
    if (/하단|lower|매수|add|이탈/i.test(nm)) { const loW = vW * (1 - Math.abs(fdNum("vr_lower", 15)) / 100); return fired(valW <= loW, (ko ? "평가액 " : "Value ") + fmtMoney(valW, plan.cur) + (valW <= loW ? " ≤ " : " > ") + (ko ? "하단 " : "lower ") + fmtMoney(loW, plan.cur)); }
  }
  if (/LOC|loc/i.test(nm)) return locPx == null ? ev(ko ? "보유 없음" : "no position") : fired(px <= locPx, (ko ? "현재가 " : "Price ") + fmtMoney(px, plan.cur) + (px <= locPx ? " ≤ " : " > ") + "LOC " + fmtMoney(locPx, plan.cur));
  if (/익절|take|profit/i.test(nm)) return ret == null ? ev(ko ? "보유 없음" : "no position") : fired(ret >= tpPct, (ko ? "수익률 " : "Return ") + ret.toFixed(1) + "% " + (ret >= tpPct ? "≥" : "<") + " " + tpPct + "%");
  if (/회차|round|증가|increment/i.test(nm)) return ev(ko ? "체결 시 발동" : "on fill");
  return ev("—");
}
const RULE_STATE_LABEL = { fired: { ko: "발동 중", en: "Firing" }, armed: { ko: "대기", en: "Armed" }, event: { ko: "이벤트", en: "Event" } };
function ruleWarn(plan, r, ko) {
  const ex = (typeof EXEC_STRATEGIES !== "undefined") ? EXEC_STRATEGIES.find(s => s.id === plan.execId) : null;
  const hasField = k => ex && ex.fields && ex.fields.some(f => f.key === k);
  const needs = (k, label) => !hasField(k) ? (ko ? `이 규칙은 '${label}' 필드가 필요해요` : `Needs the '${label}' field`) : null;
  const trig = r.trig || "";
  const nm = (r.name && (r.name.en || r.name.ko)) || "";
  if (trig === "loc_hit" || /LOC/i.test(nm)) return needs("loc_pct", ko ? "LOC 기준" : "LOC %");
  if ((trig === "ret_ge" || /익절|take|profit/i.test(nm)) && !(plan.avgPrice > 0)) return ko ? "보유(평단)가 없어 평가할 수 없어요" : "No position to evaluate";
  return null;
}

const FIELD_TIPS = {
  divisions: { ko: "전체 투자금을 몇 번에 나눠 매수할지 (예: 40 = 40회 분할).", en: "How many buys the budget is split into." },
  loc_pct: { ko: "직전 평단 대비 이만큼 내려간 지정가(LOC)에 다음 매수를 겁니다.", en: "Next buy is placed this far below the current avg cost." },
  unit_buy: { ko: "1회분 매수 금액 = 전체 투자금 ÷ 분할 수. 자동 계산.", en: "Per-round amount = budget ÷ divisions. Auto." },
  tp_pct: { ko: "평단 대비 이만큼 오르면 1회분(또는 전량) 익절합니다.", en: "Take profit when price rises this far above avg cost." },
  round: { ko: "현재까지 진행된 매수 회차. 체결에서 자동 집계.", en: "Rounds bought so far. Auto from fills." },
  loc_price: { ko: "다음 매수가 = 평단 × (1 + LOC 기준). 자동 계산.", en: "Next-buy price = avg × (1 + LOC%). Auto." },
  amount: { ko: "매 주기마다 고정으로 매수하는 금액.", en: "Fixed amount bought each period." },
  interval: { ko: "매수 주기 (매일·매주·격주·매월).", en: "How often the fixed buy happens." },
  avg_cost: { ko: "현재까지의 평균 매수 단가. 체결에서 자동 집계.", en: "Average cost so far. Auto from fills." },
  target_path: { ko: "포지션 평가액이 매월 이만큼씩 커지도록 목표선을 설정합니다.", en: "Target value the position should grow by each month." },
  gap: { ko: "현재 평가액과 목표선의 차이 — 부족하면 매수, 초과하면 매도.", en: "Distance from the target path — buy if below, sell if above." },
  upper: { ko: "그리드 매매의 상단 가격. 이 위로는 격자 매도.", en: "Top of the grid band." },
  lower: { ko: "그리드 매매의 하단 가격. 이 아래로는 격자 매수.", en: "Bottom of the grid band." },
  grids: { ko: "상단~하단을 몇 칸으로 나눌지. 칸마다 매수·매도.", en: "How many steps the band is divided into." },
  vr_vline: { ko: "매년 커지는 목표 가치선(V). 평가액을 이 선에 맞춥니다. 자동.", en: "Target value line that grows yearly. Auto." },
  vr_upper: { ko: "가치선 위로 이만큼 넘으면 초과분을 매도(현금풀로).", en: "Trim above this % over the value line." },
  vr_lower: { ko: "가치선 아래로 이만큼 이탈하면 현금풀로 매수.", en: "Add below this % under the value line." },
  vr_growth: { ko: "목표 가치선이 매년 커지는 비율.", en: "Yearly growth rate of the value line." },
  vr_pool: { ko: "전체 자본 중 매수 대기 현금풀로 두는 비율 한도.", en: "Cap on the cash pool reserved for buys." },
  equity_w: { ko: "주식 목표 비중 (나머지는 방어자산).", en: "Target equity weight (rest is defensive)." },
  rebal: { ko: "비중을 다시 맞추는 주기.", en: "How often weights are rebalanced." },
  lookback: { ko: "상대강도를 측정하는 조회 기간.", en: "Lookback window for relative strength." },
  stop: { ko: "고점 대비 이만큼 하락하면 추세 이탈로 보고 정리.", en: "Exit when price falls this far from the peak." },
};

function StrategyTab({ plan, t, lang, onToggle, onAdd, onPatch, onRemove, onPatchPlan }) {
  const ko = lang === "ko";
  const ex = (typeof EXEC_STRATEGIES !== "undefined") ? EXEC_STRATEGIES.find(s => s.id === plan.execId) : null;
  const [vizOpen, setVizOpen] = React.useState(false);
  const goalDispCur = toDispCur(1, plan.cur).cur;
  const goalFromDisp = (v) => goalDispCur === plan.cur ? v : (plan.cur === "KRW" ? v * getFxRate() : v / getFxRate());
  const goalToDisp = (v) => goalDispCur === plan.cur ? v : (plan.cur === "KRW" ? v / getFxRate() : v * getFxRate());
  const [goalEdit, setGoalEdit] = React.useState(false);
  const [gType, setGType] = React.useState(plan.goal ? plan.goal.type : "return");
  const [gVal, setGVal] = React.useState(plan.goal ? String(plan.goal.type === "price" ? Math.round(goalToDisp(plan.goal.value) * (goalDispCur === "USD" ? 100 : 1)) / (goalDispCur === "USD" ? 100 : 1) : plan.goal.value) : "");
  const openGoalEdit = (type, nativeVal) => { setGType(type); setGVal(nativeVal == null ? "" : String(type === "price" ? Math.round(goalToDisp(nativeVal) * (goalDispCur === "USD" ? 100 : 1)) / (goalDispCur === "USD" ? 100 : 1) : nativeVal)); setGoalEdit(true); };
  const saveGoal = () => { const raw = parseFloat(String(gVal).replace(/[^0-9.\-]/g, "")); if (!isFinite(raw)) return; const v = gType === "price" ? goalFromDisp(raw) : raw; if (onPatchPlan) onPatchPlan(plan.id, { goal: { type: gType, value: v } }); setGoalEdit(false); };
  const removeGoal = () => { if (onPatchPlan) onPatchPlan(plan.id, { goal: null }); setGoalEdit(false); };
  const stratName = ex ? ex.name[lang] : (ko ? "전략" : "Strategy");
  const diverged = plan.rules.some(r => !r.custom && (r.edited || !r.on));
  const edit = (rid, key) => (e) => { const v = e.target.textContent.trim(); if (onPatch && v) onPatch(plan.id, rid, { [key]: { en: v, ko: v } }); };
  const ruleDesc = (r) => { if (r.custom) { const tt = RULE_TRIGS.find(x => x.id === r.trig), aa = RULE_ACTS.find(x => x.id === r.act); return [tt ? (ko ? tt.descKo : tt.descEn) : "", aa ? (ko ? aa.descKo : aa.descEn) : ""].filter(Boolean).join(" "); } const d = RULE_LEGACY_DESC[r.name.ko] || RULE_LEGACY_DESC[r.name.en]; return d ? (ko ? d.ko : d.en) : (ko ? "이 규칙의 조건이 충족되면 지정한 동작을 실행합니다." : "Runs the action when the condition is met."); };
  const keyDown = (e) => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } };
  const MON3 = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
  const locLast = (s) => { if (s === "Never") return t.never; if (!ko) return s; let r = s.replace("Today", "오늘"); r = r.replace(/([A-Z][a-z]{2})\s+(\d+)/, (m, mon, d) => MON3[mon] ? `${MON3[mon]}월 ${d}일` : m); return r; };
  return (
    <div>
      {ex && <div className="rules-stratbar">
        <span className="strat-dot" style={{ background: ex.color }} />
        <span className="rules-strat-name">{stratName}</span>
        {diverged && <span className="rules-mod">{ko ? "수정됨" : "Modified"}</span>}
        <span className="rules-strat-hint">{ko ? "전략 규칙은 끌 수 있고, 내 규칙은 자유롭게 추가·삭제됩니다" : "Strategy rules can be toggled; your own rules can be added or removed."}</span>
      </div>}
      {ex && (() => {
        const fnum = (k, d) => { const f = ex.fields ? ex.fields.find(x => x.key === k) : null; const n = f ? parseFloat(String(f.default).replace(/[^0-9.\-]/g, "")) : NaN; return isNaN(n) ? d : n; };
        const div = plan.divisions, round = plan.round || 0, avg = plan.avgPrice || 0, px = plan.currentPrice;
        const locP = fnum("loc_pct", null), tpP = fnum("tp_pct", null);
        const locPx = (avg > 0 && locP != null) ? avg * (1 + locP / 100) : null;
        const tpPx = (avg > 0 && tpP != null) ? avg * (1 + tpP / 100) : null;
        const ret = avg > 0 ? (px - avg) / avg * 100 : null;
        const deployed = div ? Math.round(round / div * 100) : null;
        let act = null;
        if (locPx != null) {
          if (px <= locPx) act = { tone: "buy", icon: "arrow-down-left", label: ko ? "지금 매수 신호" : "Buy signal", detail: ko ? `현재가가 LOC ${fmtMoney(locPx, plan.cur)} 이하 — ${div ? `${round + 1}/${div}회차 매수 알림` : "분할 매수 알림"}` : `Price at/below LOC ${fmtMoney(locPx, plan.cur)}` };
          else { const gap = (px - locPx) / px * 100; act = { tone: "wait", icon: "clock", label: ko ? "다음 매수 대기" : "Next buy armed", detail: ko ? `${fmtMoney(locPx, plan.cur)}까지 ${gap.toFixed(1)}% 더 내리면 ${div ? `${round + 1}/${div}회차 ` : ""}매수 알림` : `${gap.toFixed(1)}% lower → buy alert` }; }
        }
        if (tpPx != null && ret != null && tpP != null && ret >= tpP) act = { tone: "sell", icon: "arrow-up-right", label: ko ? "익절 신호" : "Take-profit", detail: ko ? `수익률 ${ret.toFixed(1)}% ≥ 목표 ${tpP}% — 청산 검토 알림` : `Return ${ret.toFixed(1)}% ≥ target ${tpP}%` };
        if (!act) act = { tone: "wait", icon: "activity", label: ko ? "조건 대기 중" : "Armed", detail: ko ? "발동 조건에 도달하면 알림이 옵니다." : "Waiting for a trigger." };
        const sc = plan.scenarios || [];
        const tOf = en => { const s = sc.find(x => x.label && x.label.en === en); return s ? s.target : null; };
        const bull = tOf("Bull"), bear = tOf("Bear");
        const hasGrid = (ex.fields || []).some(f => f.key === "grids");
        const hasMom = (ex.fields || []).some(f => f.key === "stop") && (ex.fields || []).some(f => f.key === "lookback");
        const isPrice = !hasGrid && !hasMom && (locPx != null || (ex.fields || []).some(f => ["upper", "lower", "target_path"].includes(f.key)));
        const isGrid = hasGrid;
        const isMomentum = hasMom;
        const isVR = (ex.fields || []).some(f => f.key === "vr_vline") && !isPrice;
        const wField = (ex.fields || []).find(f => f.key === "target_w" || f.key === "equity_w");
        const isWeight = !!wField && !isPrice && !isVR;
        const isTime = !isPrice && !isVR && !isWeight && (ex.fields || []).some(f => f.key === "interval") && (ex.fields || []).some(f => f.key === "amount");
        let overlay = null, timeInfo = null;
        if (isTime) {
          const intDays = { Daily: 1, Weekly: 7, Biweekly: 14, Monthly: 30 };
          const intF = (ex.fields || []).find(f => f.key === "interval");
          const intVal = intF ? intF.default : "Weekly";
          const stepD = intDays[intVal] || 7;
          const intKo = intF && intF.options ? ((intF.options.find(o => o.en === intVal) || {}).ko || intVal) : intVal;
          const amtF = (ex.fields || []).find(f => f.key === "amount");
          const amtStr = amtF ? String(amtF.default).replace(/[^0-9.,]/g, "") : "";
          const MENJS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const parseD = s => { const m = (s || "").match(/([A-Za-z]{3})\s*(\d+)/); return (m && MON3[m[1]]) ? new Date(2025, MON3[m[1]] - 1, +m[2]) : null; };
          const fmtMD = d => ko ? `${d.getMonth() + 1}월 ${d.getDate()}일` : `${MENJS[d.getMonth()]} ${d.getDate()}`;
          const DAY = 86400000;
          const buys = (plan.executions || []).filter(e => e.side === "buy").map(e => ({ ...e, d: parseD(e.date) })).filter(e => e.d).sort((a, b) => a.d - b.d);
          if (buys.length) {
            const last = buys[buys.length - 1].d;
            const nextBuy = new Date(last.getTime() + stepD * DAY);
            const today = new Date(last.getTime() + Math.round(stepD * 0.6) * DAY);
            const countdown = Math.max(0, Math.round((nextBuy - today) / DAY));
            const start = new Date(Math.min(buys[0].d.getTime(), last.getTime() - stepD * DAY));
            const end = new Date(nextBuy.getTime() + stepD * 0.5 * DAY);
            const span = (end - start) || 1;
            const xp = d => Math.max(0, Math.min(100, (d - start) / span * 100));
            let _tq = 0, _tc = 0; const bcum = buys.map((b) => { _tq += b.qty; _tc += b.qty * b.price; return { q: _tq, inv: _tc, avg: _tc / _tq }; });
            timeInfo = { nextLabel: fmtMD(nextBuy), countdown, buyCount: buys.length, intKo };
            act = { tone: "wait", icon: "calendar-clock", label: ko ? "다음 매수 예정" : "Next buy scheduled", detail: ko ? `${fmtMD(nextBuy)} · 회당 ${amtStr ? fmtMoney(parseFloat(amtStr.replace(/,/g, "")), plan.cur) : "정액"} 매수 알림 (${countdown}일 후)` : `${fmtMD(nextBuy)} · in ${countdown}d` };
            overlay = (
              <div className="sc-axis-card">
                <div className="sc-axis-cap">{ko ? "매수 주기 타임라인" : "Buy schedule"}<span className="sc-waxis-zone wait">{ko ? `${intKo} 적립` : intVal}</span></div>
                <div className="sc-taxis">
                  <div className="sc-taxis-track" />
                  <div className="sc-taxis-fill" style={{ left: 0, width: xp(today) + "%" }} />
                  {buys.map((b, i) => <div key={i} className="sc-taxis-buy" style={{ left: xp(b.d) + "%" }}><span className="sc-taxis-dot" /><span className="sc-axis-tip sc-waxis-tip"><b>{ko ? `${i + 1}회차 매수` : `Buy #${i + 1}`} · {fmtMD(b.d)}</b><span className="sc-axis-tip-row"><span>{ko ? "체결가" : "Price"}</span><b className="mono">{fmtMoney(b.price, plan.cur)}</b></span><span className="sc-axis-tip-row"><span>{ko ? "수량" : "Qty"}</span><b className="mono">{b.qty}{ko ? "주" : ""}</b></span><span className="sc-axis-tip-row"><span>{ko ? "누적 수량" : "Position"}</span><b className="mono">{Math.round(bcum[i].q)}{ko ? "주" : ""}</b></span><span className="sc-axis-tip-row"><span>{ko ? "누적 투입" : "Invested"}</span><b className="mono">{fmtMoney(bcum[i].inv, plan.cur)}</b></span><span className="sc-axis-tip-row"><span>{ko ? "체결 후 평단" : "Avg cost"}</span><b className="mono">{fmtMoney(bcum[i].avg, plan.cur)}</b></span></span></div>)}
                  <div className="sc-taxis-today" style={{ left: xp(today) + "%" }}><span className="sc-taxis-today-lab">{ko ? "오늘" : "Now"}</span></div>
                  <div className="sc-taxis-next" style={{ left: xp(nextBuy) + "%" }}><span className="sc-taxis-next-dot" /><span className="sc-taxis-next-lab">{ko ? "다음 " : "Next "}{fmtMD(nextBuy)}</span><span className="sc-axis-tip sc-waxis-tip"><b>{ko ? "다음 매수 예정" : "Next buy"} · {fmtMD(nextBuy)}</b><span className="sc-axis-tip-row"><span>{ko ? "예정 금액" : "Amount"}</span><b className="mono">{amtStr ? fmtMoney(parseFloat(amtStr.replace(/,/g, "")), plan.cur) : (ko ? "정액" : "fixed")}</b></span><span className="sc-axis-tip-row"><span>{ko ? "남은 기간" : "Countdown"}</span><b className="mono">{ko ? `${countdown}일 후` : `in ${countdown}d`}</b></span><span className="sc-axis-tip-note">{ko ? `${intKo} 주기에 따라 가격과 무관하게 자동 매수합니다.` : "Fixed amount, regardless of price."}</span></span></div>
                </div>
                <div className="sc-waxis-foot">{ko ? `${intKo} 같은 금액을 매수합니다 — 가격과 무관하게 ${countdown}일 후 다음 알림. 누적 ${buys.length}회 매수.` : `Buys a fixed amount on schedule — next alert in ${countdown}d · ${buys.length} buys so far.`}</div>
              </div>
            );
          } else {
            act = { tone: "wait", icon: "calendar-clock", label: ko ? "적립 대기" : "Scheduled", detail: ko ? `진입하면 ${intKo} 회당 ${amtStr ? fmtMoney(parseFloat(amtStr.replace(/,/g, "")), plan.cur) : "정액"} 매수가 시작됩니다.` : "Starts on entry." };
            overlay = (
              <div className="sc-axis-card">
                <div className="sc-axis-cap">{ko ? "매수 주기 타임라인" : "Buy schedule"}<span className="sc-waxis-zone wait">{ko ? "진입 전" : "Not started"}</span></div>
                <div className="sc-taxis"><div className="sc-taxis-track" /><div className="sc-taxis-next" style={{ left: "14%" }}><span className="sc-taxis-next-dot" /><span className="sc-taxis-next-lab">{ko ? "첫 매수" : "First buy"}</span></div></div>
                <div className="sc-waxis-foot">{ko ? `아직 진입 전입니다. 진입하면 ${intKo} 같은 금액을 자동 적립합니다.` : "Not started. Buys begin on entry."}</div>
              </div>
            );
          }
        } else if (isVR) {
          const up = Math.abs(fnum("vr_upper", 15)), lo = Math.abs(fnum("vr_lower", 15)), gr = fnum("vr_growth", 15);
          const loB = 100 - lo, hiB = 100 + up;
          const curV = avg > 0 ? px / avg * 100 : null;   // 평가액 지수 (가치선 V = 100)
          const axMin = 100 - lo * 2.2, axMax = 100 + up * 2.2, axSp = (axMax - axMin) || 1;
          const wp = v => Math.max(0, Math.min(100, (v - axMin) / axSp * 100));
          const drift = curV != null ? curV - 100 : null;
          const zone = curV == null ? "pre" : (curV > hiB ? "trim" : curV < loB ? "add" : "in");
          const zoneLab = { pre: ko ? "진입 전" : "Not started", in: ko ? "밴드 안 · 유지" : "In band · hold", trim: ko ? "상단 초과 · 매도" : "Above · sell", add: ko ? "하단 이탈 · 매수" : "Below · buy" }[zone];
          const zoneTone = { pre: "wait", in: "hold", trim: "sell", add: "buy" }[zone];
          // concrete won values: V = cost basis (invested); value = shares × price
          const vW = (plan.totalInvested || (avg * (plan.totalShares || 0))) || null;
          const valW = (plan.totalShares || 0) * px;
          const hiW = vW != null ? vW * (1 + up / 100) : null;
          const loW = vW != null ? vW * (1 - lo / 100) : null;
          const gapToHi = hiW != null ? (valW - hiW) : null;
          const gapToLo = loW != null ? (valW - loW) : null;
          const mkTip = (h, rows, note, tone) => <span className="sc-axis-tip sc-waxis-tip"><b>{h}</b>{rows.map((r, j) => <span className="sc-axis-tip-row" key={j}><span>{r[0]}</span><b className={"mono" + (r[2] ? " " + r[2] : "")}>{r[1]}</b></span>)}{note && <span className="sc-axis-tip-note">{note}</span>}</span>;
          overlay = (
            <div className="sc-axis-card">
              <div className="sc-axis-cap">{ko ? "가치선 대비 현재 평가액" : "Value vs target line"}<span className={"sc-waxis-zone " + zoneTone}>{zoneLab}</span></div>
              <div className="sc-waxis">
                <div className="sc-waxis-track" />
                <div className="sc-waxis-band" style={{ left: wp(loB) + "%", width: (wp(hiB) - wp(loB)) + "%" }} />
                <div className="sc-waxis-target" style={{ left: wp(100) + "%" }}><span className="sc-waxis-target-lab"><span className="wx-word">{ko ? "가치선 V" : "Line V"}</span>{vW != null && <span className="wx-val">{fmtMoney(vW, plan.cur)}</span>}</span>{vW != null && mkTip(ko ? "목표 가치선 V" : "Value line V", [[ko ? "현재 V (원가 기준)" : "V (cost basis)", fmtMoney(vW, plan.cur)], [ko ? "성장 속도" : "Growth", (ko ? "연 " : "") + gr + "%" + (ko ? "" : "/yr")]], ko ? "기준 자본선. 매일 조금씩 상승하며, 평가액을 이 선에 맞춰 매수·매도합니다." : "Baseline that compounds daily; you trade your value back toward it.")}</div>
                <div className="sc-waxis-tick add" style={{ left: wp(loB) + "%" }}><span className="sc-waxis-tick-lab"><span className="wx-word">{ko ? "하단" : "Lower"}</span><span className="wx-val">−{lo}%</span></span>{loW != null && mkTip(ko ? `하단 밴드 −${lo}%` : `Lower −${lo}%`, [[ko ? "하단 밴드" : "Lower band", fmtMoney(loW, plan.cur)], [ko ? "= V ×" : "= V ×", (1 - lo / 100).toFixed(2)], [ko ? "현재 평가액과" : "vs value", (gapToLo >= 0 ? "+" : "") + fmtMoney(gapToLo, plan.cur), gapToLo >= 0 ? "" : "neg"]], ko ? "평가액이 이 선 아래로 내려가면 현금풀로 매수해 가치선까지 끌어올립니다." : "Below this, buy from the cash pool back up to V.")}</div>
                <div className="sc-waxis-tick trim" style={{ left: wp(hiB) + "%" }}><span className="sc-waxis-tick-lab"><span className="wx-word">{ko ? "상단" : "Upper"}</span><span className="wx-val">+{up}%</span></span>{hiW != null && mkTip(ko ? `상단 밴드 +${up}%` : `Upper +${up}%`, [[ko ? "상단 밴드" : "Upper band", fmtMoney(hiW, plan.cur)], [ko ? "= V ×" : "= V ×", (1 + up / 100).toFixed(2)], [ko ? "현재 평가액과" : "vs value", (gapToHi >= 0 ? "+" : "") + fmtMoney(gapToHi, plan.cur), gapToHi >= 0 ? "pos" : ""]], ko ? "평가액이 이 선 위로 올라가면 초과분을 매도해 가치선으로 되돌립니다." : "Above this, sell the excess back down to V.")}</div>
                {curV != null && <div className={"sc-waxis-now " + zoneTone} style={{ left: wp(curV) + "%" }}><span className="sc-waxis-now-dot" /><span className="sc-waxis-now-lab mono">{drift >= 0 ? "+" : ""}{drift.toFixed(1)}%</span>{mkTip(ko ? "현재 평가액" : "Current value", [[ko ? "평가액" : "Value", fmtMoney(valW, plan.cur)], [ko ? "현재가" : "Price", fmtMoney(px, plan.cur)], [ko ? "가치선 대비" : "vs V", (drift >= 0 ? "+" : "") + drift.toFixed(1) + "%", drift >= 0 ? "pos" : "neg"], [ko ? "현재 상태" : "Zone", zoneLab]], zone === "trim" ? (ko ? "상단 밴드를 넘었습니다 — 매도 구간." : "Above upper band — sell zone.") : zone === "add" ? (ko ? "하단 밴드 아래입니다 — 매수 구간." : "Below lower band — buy zone.") : (ko ? "밴드 안 — 매매 없이 유지합니다." : "Inside band — hold."))}</div>}
              </div>
              <div className="sc-waxis-foot">{curV == null
                ? (ko ? "아직 진입 전입니다. 진입하면 평가액이 여기 표시되고, 밴드를 벗어나면 매수·매도 알림이 옵니다." : "Not started. Once you enter, your position value appears here.")
                : (ko ? `← 하단 이탈 시 현금풀로 매수 · 상단 초과 시 매도 →  가치선은 연 ${gr}% 성장` : `← add below · trim above →  value line grows ${gr}%/yr`)}</div>
            </div>
          );
        } else if (isWeight) {
          const tw = fnum(wField.key, 20);
          const bandF = fnum("band", null);
          const band = bandF != null ? Math.abs(bandF) : Math.max(3, Math.round(tw * 0.25));
          const loB = Math.max(0, tw - band), hiB = tw + band;
          const curW = avg > 0 ? Math.max(0, Math.min(tw * 2.2, tw * (px / avg))) : null;
          const axMin = Math.max(0, tw - band * 2.4), axMax = tw + band * 2.4, axSp = (axMax - axMin) || 1;
          const wp = v => Math.max(0, Math.min(100, (v - axMin) / axSp * 100));
          const drift = curW != null ? curW - tw : null;
          const zone = curW == null ? "pre" : (curW > hiB ? "trim" : curW < loB ? "add" : "in");
          const zoneLab = { pre: ko ? "진입 전" : "Not started", in: ko ? "밴드 안 · 유지" : "In band · hold", trim: ko ? "상한 초과 · 매도" : "Above · sell", add: ko ? "하한 미만 · 매수" : "Below · buy" }[zone];
          const zoneTone = { pre: "wait", in: "hold", trim: "sell", add: "buy" }[zone];
          const mkTip = (h, rows, note) => <span className="sc-axis-tip sc-waxis-tip"><b>{h}</b>{rows.map((r, j) => <span className="sc-axis-tip-row" key={j}><span>{r[0]}</span><b className={"mono" + (r[2] ? " " + r[2] : "")}>{r[1]}</b></span>)}{note && <span className="sc-axis-tip-note">{note}</span>}</span>;
          overlay = (
            <div className="sc-axis-card">
              <div className="sc-axis-cap">{ko ? "목표 비중 위 현재 위치" : "Weight vs target band"}<span className={"sc-waxis-zone " + zoneTone}>{zoneLab}</span></div>
              <div className="sc-waxis">
                <div className="sc-waxis-track" />
                <div className="sc-waxis-band" style={{ left: wp(loB) + "%", width: (wp(hiB) - wp(loB)) + "%" }} />
                <div className="sc-waxis-target" style={{ left: wp(tw) + "%" }} title={(ko ? "목표 비중 " : "Target ") + tw + "%"}><span className="sc-waxis-target-lab"><span className="wx-word">{ko ? "목표" : "Target"}</span><span className="wx-val">{tw}%</span></span></div>
                <div className="sc-waxis-tick add" style={{ left: wp(loB) + "%" }} title={(ko ? "하한 밴드 " : "Lower ") + loB + "%"}><span className="sc-waxis-tick-lab"><span className="wx-word">{ko ? "하한" : "Lower"}</span><span className="wx-val">{loB}%</span></span></div>
                <div className="sc-waxis-tick trim" style={{ left: wp(hiB) + "%" }} title={(ko ? "상한 밴드 " : "Upper ") + hiB + "%"}><span className="sc-waxis-tick-lab"><span className="wx-word">{ko ? "상한" : "Upper"}</span><span className="wx-val">{hiB}%</span></span></div>
                {curW != null && <div className={"sc-waxis-now " + zoneTone} style={{ left: wp(curW) + "%" }}><span className="sc-waxis-now-dot" /><span className="sc-waxis-now-lab mono">{curW.toFixed(1)}%{drift != null ? ` (${drift >= 0 ? "+" : ""}${drift.toFixed(1)})` : ""}</span>{mkTip(ko ? "현재 비중" : "Current weight", [[ko ? "현재 비중" : "Weight", curW.toFixed(1) + "%"], [ko ? "목표 대비" : "vs target", (drift >= 0 ? "+" : "") + (drift || 0).toFixed(1) + "%p", drift >= 0 ? "pos" : "neg"], [ko ? "현재가" : "Price", fmtMoney(px, plan.cur)], [ko ? "현재 상태" : "Zone", zoneLab]], zone === "trim" ? (ko ? "상한 초과 — 일부 매도 구간." : "Above band — trim.") : zone === "add" ? (ko ? "하한 미만 — 매수 구간." : "Below band — buy.") : (ko ? "밴드 안 — 유지." : "In band — hold."))}</div>}
              </div>
              <div className="sc-waxis-foot">{curW == null
                ? (ko ? "아직 진입 전입니다. 진입하면 현재 비중이 여기 표시되고, 밴드를 벗어나면 매수·매도 알림이 옵니다." : "Not started. Once you enter, your weight appears here.")
                : (ko ? `← 하한 미만이면 매수 · 상한 초과면 매도 →  목표 ${tw}% ±${band}%p 유지` : `← add below · trim above →  hold ${tw}% ±${band}%p`)}</div>
            </div>
          );
        } else if (isGrid) {
          const gLo = fnum("lower", null), gHi = fnum("upper", null), gN = Math.max(2, Math.round(fnum("grids", 20)));
          const span = (gHi - gLo) || 1, step = span / gN;
          const pad = span * 0.08, axMin = gLo - pad, axMax = gHi + pad, axSp = (axMax - axMin) || 1;
          const wp = v => Math.max(0, Math.min(100, (v - axMin) / axSp * 100));
          const below = Math.max(0, Math.min(gN, Math.round((px - gLo) / step)));
          const zone = px < gLo ? "add" : px > gHi ? "trim" : "in";
          const zoneLab = { in: ko ? "구간 안 · 격자 매매" : "In grid", add: ko ? "하단 이탈" : "Below grid", trim: ko ? "상단 돌파" : "Above grid" }[zone];
          const zoneTone = { in: "hold", add: "buy", trim: "sell" }[zone];
          const lines = Array.from({ length: gN + 1 }, (_, i) => gLo + i * step);
          const mkTip = (h, rows, note) => <span className="sc-axis-tip sc-waxis-tip"><b>{h}</b>{rows.map((r, j) => <span className="sc-axis-tip-row" key={j}><span>{r[0]}</span><b className={"mono" + (r[2] ? " " + r[2] : "")}>{r[1]}</b></span>)}{note && <span className="sc-axis-tip-note">{note}</span>}</span>;
          act = { tone: zoneTone === "hold" ? "wait" : zoneTone, icon: zone === "add" ? "arrow-down-left" : zone === "trim" ? "arrow-up-right" : "grid-3x3",
            label: zone === "in" ? (ko ? "격자 매매 중" : "Grid active") : zone === "add" ? (ko ? "하단 이탈" : "Below range") : (ko ? "상단 돌파" : "Above range"),
            detail: zone === "in" ? (ko ? `현재가 ${fmtMoney(px, plan.cur)} — 한 칸(${fmtMoney(step, plan.cur)}) 내리면 매수 · 오르면 매도` : `Step ${fmtMoney(step, plan.cur)}`) : zone === "add" ? (ko ? `하단 ${fmtMoney(gLo, plan.cur)} 아래 — 격자 소진(전량 보유)` : "Below grid") : (ko ? `상단 ${fmtMoney(gHi, plan.cur)} 위 — 격자 청산(현금)` : "Above grid") };
          overlay = (
            <div className="sc-axis-card">
              <div className="sc-axis-cap">{ko ? "가격 구간 위 현재가" : "Price in grid"}<span className={"sc-waxis-zone " + zoneTone}>{zoneLab}</span></div>
              <div className="sc-waxis">
                <div className="sc-waxis-track" />
                <div className="sc-waxis-band" style={{ left: wp(gLo) + "%", width: (wp(gHi) - wp(gLo)) + "%" }} />
                {lines.map((lv, i) => <div key={i} className="sc-grid-line" style={{ left: wp(lv) + "%" }} />)}
                <div className="sc-waxis-tick add" style={{ left: wp(gLo) + "%" }}><span className="sc-waxis-tick-lab"><span className="wx-word">{ko ? "하단" : "Lower"}</span><span className="wx-val">{fmtMoney(gLo, plan.cur)}</span></span>{mkTip(ko ? "하단" : "Lower", [[ko ? "하단 가격" : "Lower", fmtMoney(gLo, plan.cur)], [ko ? "이탈 시" : "If below", ko ? "격자 소진" : "all bought"]], ko ? "여기까지 내려오며 칸마다 매수합니다." : "Buys ladder down to here.")}</div>
                <div className="sc-waxis-tick trim" style={{ left: wp(gHi) + "%" }}><span className="sc-waxis-tick-lab"><span className="wx-word">{ko ? "상단" : "Upper"}</span><span className="wx-val">{fmtMoney(gHi, plan.cur)}</span></span>{mkTip(ko ? "상단" : "Upper", [[ko ? "상단 가격" : "Upper", fmtMoney(gHi, plan.cur)], [ko ? "돌파 시" : "If above", ko ? "격자 청산" : "all sold"]], ko ? "여기까지 오르며 칸마다 매도합니다." : "Sells ladder up to here.")}</div>
                <div className={"sc-waxis-now " + zoneTone} style={{ left: wp(px) + "%" }}><span className="sc-waxis-now-dot" /><span className="sc-waxis-now-lab mono">{fmtMoney(px, plan.cur)}</span>{mkTip(ko ? "현재가" : "Price", [[ko ? "현재가" : "Price", fmtMoney(px, plan.cur)], [ko ? "채워진 칸" : "Rungs", `${below}/${gN}`], [ko ? "한 칸 간격" : "Step", fmtMoney(step, plan.cur)]], zone === "in" ? (ko ? "한 칸 내리면 매수, 오르면 매도." : "Buy a step down, sell a step up.") : zone === "add" ? (ko ? "하단 아래 — 격자를 다 매수한 상태." : "Below — fully bought.") : (ko ? "상단 위 — 격자를 다 매도한 상태." : "Above — fully sold."))}</div>
              </div>
              <div className="sc-waxis-foot">{ko ? `하단 ${fmtMoney(gLo, plan.cur)} ~ 상단 ${fmtMoney(gHi, plan.cur)}를 ${gN}칸으로 — 한 칸 내리면 매수 · 오르면 매도. 현재 ${below}/${gN}칸.` : `${gN} rungs from ${fmtMoney(gLo, plan.cur)} to ${fmtMoney(gHi, plan.cur)} — buy a step down, sell a step up.`}</div>
            </div>
          );
        } else if (isMomentum) {
          const stopPct = Math.abs(fnum("stop", 15));
          const lookF = (ex.fields || []).find(f => f.key === "lookback");
          const lookStr = lookF ? lookF.default : "";
          const started = avg > 0;
          const refHigh = started ? Math.max(px, avg) : px;
          const stopLine = refHigh * (1 - stopPct / 100);
          const sp2 = (refHigh - stopLine) || (refHigh * 0.01);
          const axMin = stopLine - sp2 * 0.6, axMax = refHigh + sp2 * 0.45, axSp = (axMax - axMin) || 1;
          const wp = v => Math.max(0, Math.min(100, (v - axMin) / axSp * 100));
          const toStop = (px - stopLine) / px * 100;
          const zone = !started ? "pre" : (px <= stopLine ? "trim" : "hold");
          const zoneLab = { pre: ko ? "진입 대기" : "Armed", hold: ko ? "추세 보유 · 스탑 추적" : "Trend held", trim: ko ? "스탑 이탈 · 청산" : "Stop hit" }[zone];
          const zoneTone = { pre: "wait", hold: "hold", trim: "sell" }[zone];
          const mkTip = (h, rows, note) => <span className="sc-axis-tip sc-waxis-tip"><b>{h}</b>{rows.map((r, j) => <span className="sc-axis-tip-row" key={j}><span>{r[0]}</span><b className={"mono" + (r[2] ? " " + r[2] : "")}>{r[1]}</b></span>)}{note && <span className="sc-axis-tip-note">{note}</span>}</span>;
          act = { tone: zone === "trim" ? "sell" : "wait", icon: zone === "trim" ? "arrow-up-right" : "activity",
            label: zone === "pre" ? (ko ? "진입 신호 대기" : "Armed") : zone === "trim" ? (ko ? "트레일링 스탑 도달" : "Stop hit") : (ko ? "추세 보유 중" : "Trend held"),
            detail: zone === "pre" ? (ko ? `추세 상향 돌파(${lookStr || "모멘텀"}) 시 진입 — 이후 고점 대비 −${stopPct}%에서 청산` : `Enter on up-cross; trail −${stopPct}%`) : (ko ? `고점 ${fmtMoney(refHigh, plan.cur)} 대비 스탑 ${fmtMoney(stopLine, plan.cur)} — 현재가까지 ${toStop >= 0 ? "+" : ""}${toStop.toFixed(1)}% 여유` : `Stop ${fmtMoney(stopLine, plan.cur)} · ${toStop.toFixed(1)}% headroom`) };
          overlay = (
            <div className="sc-axis-card">
              <div className="sc-axis-cap">{ko ? "추세 위 현재가 · 트레일링 스탑" : "Trend & trailing stop"}<span className={"sc-waxis-zone " + zoneTone}>{zoneLab}</span></div>
              <div className="sc-waxis">
                <div className="sc-waxis-track" />
                <div className="sc-waxis-band" style={{ left: wp(stopLine) + "%", width: (wp(refHigh) - wp(stopLine)) + "%" }} />
                <div className="sc-waxis-tick add" style={{ left: wp(stopLine) + "%" }}><span className="sc-waxis-tick-lab"><span className="wx-word">{ko ? "스탑" : "Stop"}</span><span className="wx-val">−{stopPct}%</span></span>{mkTip(ko ? `트레일링 스탑 −${stopPct}%` : `Trailing stop −${stopPct}%`, [[ko ? "스탑 가격" : "Stop", fmtMoney(stopLine, plan.cur)], [ko ? "= 고점 ×" : "= peak ×", (1 - stopPct / 100).toFixed(2)], [ko ? "현재가까지" : "Headroom", (toStop >= 0 ? "+" : "") + toStop.toFixed(1) + "%", toStop >= 0 ? "pos" : "neg"]], ko ? "고점을 따라 같이 올라가는 청산선. 여기로 내려오면 추세 종료로 보고 청산합니다." : "Rises with the peak; exit if price falls to it.")}</div>
                <div className="sc-waxis-target" style={{ left: wp(refHigh) + "%" }}><span className="sc-waxis-target-lab"><span className="wx-word">{ko ? "고점" : "Peak"}</span><span className="wx-val">{fmtMoney(refHigh, plan.cur)}</span></span>{mkTip(ko ? "기준 고점" : "Reference peak", [[ko ? "고점" : "Peak", fmtMoney(refHigh, plan.cur)], [ko ? "조회 기간" : "Lookback", lookStr || "—"]], ko ? "진입 후 기록한 최고가(근사). 스탑선은 이 값의 −" + stopPct + "%입니다." : "Highest since entry; stop trails −" + stopPct + "%.")}</div>
                <div className={"sc-waxis-now " + zoneTone} style={{ left: wp(px) + "%" }}><span className="sc-waxis-now-dot" /><span className="sc-waxis-now-lab mono">{fmtMoney(px, plan.cur)}</span>{mkTip(ko ? "현재가" : "Price", [[ko ? "현재가" : "Price", fmtMoney(px, plan.cur)], [ko ? "스탑까지" : "To stop", (toStop >= 0 ? "+" : "") + toStop.toFixed(1) + "%", toStop >= 0 ? "pos" : "neg"], [ko ? "현재 상태" : "Zone", zoneLab]], zone === "pre" ? (ko ? "아직 진입 전 — 추세 상향 돌파 시 진입합니다." : "Armed — enters on an up-cross.") : zone === "trim" ? (ko ? "스탑 이탈 — 청산 신호." : "Stop hit — exit.") : (ko ? "추세 유지 중 — 스탑이 고점을 따라 올라갑니다." : "Holding — stop trails the peak."))}</div>
              </div>
              <div className="sc-waxis-foot">{ko ? `${started ? `고점 ${fmtMoney(refHigh, plan.cur)} 대비 −${stopPct}% 스탑 · 현재 ${toStop >= 0 ? "+" : ""}${toStop.toFixed(1)}% 여유` : `진입 후 고점 대비 −${stopPct}%에서 청산`} — 추세를 따라가다 꺾이면 빠집니다.` : `Trail −${stopPct}% below the peak — ride the trend, exit on reversal.`}</div>
            </div>
          );
        } else if (isPrice) {
          const pre = !(avg > 0);
          if (pre) {
            const firstAmt = div ? (plan.totalBudget || plan.budget || 0) / div : null;
            act = { tone: "wait", icon: "flag", label: ko ? "진입 대기" : "Not started", detail: ko
              ? `아직 진입 전입니다. 진입하면 현재가 ${fmtMoney(px, plan.cur)} 부근에서 1회차${firstAmt ? ` 약 ${fmtMoney(firstAmt, plan.cur)}` : ""}를 매수하고, 이후 하락 시 분할 매수가 시작됩니다.`
              : `Not started. On entry you buy round 1 near ${fmtMoney(px, plan.cur)}${firstAmt ? ` (~${fmtMoney(firstAmt, plan.cur)})` : ""}; splits begin as price falls.` };
          }
          const marks = [];
          if (bear != null) marks.push({ p: bear, lab: ko ? "하단" : "Low", cls: "bear" });
          if (avg > 0) marks.push({ p: avg, lab: ko ? "평단" : "Avg", cls: "avg" });
          if (locPx != null && px > locPx) marks.push({ p: locPx, lab: ko ? "다음매수" : "Buy", cls: "buy" });
          if (tpPx != null) marks.push({ p: tpPx, lab: ko ? "익절" : "TP", cls: "tp" });
          if (bull != null) marks.push({ p: bull, lab: ko ? "상단" : "High", cls: "bull" });
          const all = marks.map(m => m.p).concat([px]);
          const lo = Math.min(...all) * 0.93, hi = Math.max(...all) * 1.07, sp = (hi - lo) || 1;
          const xp = v => Math.max(0, Math.min(100, (v - lo) / sp * 100));
          overlay = (
            <div className="sc-axis-card">
              <div className="sc-axis-cap">{ko ? "가격 범위 위 전략 위치" : "Strategy on the price range"}{pre && <span className="sc-waxis-zone wait">{ko ? "진입 전" : "Not started"}</span>}</div>
              <div className="sc-axis">
                <div className="sc-axis-line" />
                {!pre && avg > 0 && <div className={"sc-axis-fill " + (px >= avg ? "pos" : "neg")} style={{ left: Math.min(xp(avg), xp(px)) + "%", width: Math.abs(xp(px) - xp(avg)) + "%" }} />}
                {marks.map((m, i) => {
                  const pri = m.cls === "avg" || m.cls === "buy";
                  const _xpv = xp(m.p);
                  const edge = _xpv < 24 ? " tip-l" : (_xpv > 76 ? " tip-r" : "");
                  const meaning = { bear: ko ? "밸류 하단 · 최대 분할 지점" : "Value floor · max splits", avg: ko ? "손익 분기 · 위는 수익, 아래는 손실" : "Breakeven · profit above, loss below", buy: ko ? "다음 분할 매수 트리거" : "Next split-buy trigger", tp: ko ? "익절가 · 도달 시 분할 매도" : "Take-profit · trim on reach", bull: ko ? "밸류 상단 · 비중 축소" : "Value ceiling · reduce" }[m.cls];
                  const mnote = { avg: ko ? "회차가 진행돼 평단이 바뀌면 이 선도 같이 움직여요." : "Moves as your avg cost changes each round.", buy: ko ? `평단 ${locP != null ? locP.toFixed(1) : "−5"}% 아래에 자동으로 걸리는 다음 분할가 — 평단 따라 이동해요.` : `Auto-set ${locP != null ? locP.toFixed(1) : "−5"}% below avg — moves with avg cost.`, tp: ko ? `전략이 평단 × (1 + 익절 ${tpP != null ? tpP.toFixed(0) : "10"}%)로 자동 계산 — 회차마다 평단 따라 이동해요.` : `Strategy auto-line: avg × (1 + TP ${tpP != null ? tpP.toFixed(0) : "10"}%) — moves with avg each round.` }[m.cls];
                  let dlt;
                  if (m.cls === "avg") { const d = avg > 0 ? (px / avg - 1) * 100 : 0; dlt = { txt: (ko ? "현재가 평단 " : "price vs avg ") + (d >= 0 ? "+" : "") + d.toFixed(1) + "%", tone: d >= 0 ? "pos" : "neg" }; }
                  else { const d = (m.p / px - 1) * 100; dlt = { txt: (ko ? "현재가 " : "price ") + (d >= 0 ? "+" : "") + d.toFixed(1) + (ko ? "% 지점" : "%"), tone: "" }; }
                  return <div key={i} className={"sc-axis-mark " + m.cls + (pri ? " pri" : "") + edge} style={{ left: xp(m.p) + "%" }}><span className="sc-axis-tick" /><span className="sc-axis-lab">{m.lab}</span><span className="sc-axis-num mono">{fmtMoney(m.p, plan.cur)}</span><span className="sc-axis-tip"><b>{meaning}</b><span className={"sc-axis-tip-d mono" + (dlt.tone ? " " + dlt.tone : "")}>{dlt.txt}</span>{mnote && <span className="sc-axis-tip-note">{mnote}</span>}</span></div>;
                })}
                <div className={"sc-axis-now" + (pre ? " pre" : "")} style={{ left: xp(px) + "%" }} title={(ko ? "현재가 " : "Price ") + fmtMoney(px, plan.cur)}><span className="sc-axis-now-tick" /><span className="sc-axis-now-lab mono">{fmtMoney(px, plan.cur)}{pre && <span className="sc-axis-now-pre">{ko ? " 진입 예정" : " entry"}</span>}</span></div>
              </div>
              {pre && <div className="sc-waxis-foot">{ko ? "현재가 마커가 1회차 매수 예상 지점입니다. 진입 후 하락하면 추가 분할이 채워집니다." : "The price marker is where round 1 would buy. Splits fill in as price falls after entry."}</div>}
            </div>
          );
        }
        const stats = [];
        if (plan.totalShares > 0) stats.push({ k: ko ? "평가액" : "Value", v: fmtMoney((plan.totalShares || 0) * px, plan.cur), sub: (plan.totalShares || 0).toLocaleString("en-US") + (ko ? "주" : ""), tip: { h: ko ? "평가액" : "Market value", rows: [[ko ? "보유 수량" : "Shares", (plan.totalShares || 0).toLocaleString("en-US") + (ko ? "주" : "")], [ko ? "× 현재가" : "× Price", fmtMoney(px, plan.cur)]], note: ko ? "현재가 × 보유 수량" : "Shares × current price" } });
        if (avg > 0) stats.push({ k: ko ? "평단가" : "Avg cost", v: fmtMoney(avg, plan.cur), tip: { h: ko ? "평단가" : "Avg cost", rows: [[ko ? "누적 투입" : "Deployed", fmtMoney((plan.totalInvested || avg * (plan.totalShares || 0)), plan.cur)], [ko ? "÷ 보유 수량" : "÷ Shares", (plan.totalShares || 0).toLocaleString("en-US") + (ko ? "주" : "")]], note: ko ? "누적 투입 ÷ 보유 수량" : "Deployed ÷ shares" } });
        if (ret != null) { const plAmt = (plan.totalShares || 0) * (px - avg); stats.push({ k: ko ? "평가손익" : "P/L", v: (plAmt >= 0 ? "+" : "") + fmtMoney(plAmt, plan.cur), sub: (ret >= 0 ? "+" : "") + ret.toFixed(1) + "%", tone: ret >= 0 ? "pos" : "neg", tip: { h: ko ? "평가손익" : "Unrealized P/L", rows: [[ko ? "현재가 − 평단" : "Price − avg", ((px - avg) >= 0 ? "+" : "") + fmtMoney(px - avg, plan.cur)], [ko ? "× 보유 수량" : "× Shares", (plan.totalShares || 0).toLocaleString("en-US") + (ko ? "주" : "")]], note: ko ? "(현재가 − 평단) × 보유 수량 · 매도 전 미실현" : "(price − avg) × shares · unrealized" } }); }
        if (locPx != null && px > locPx) stats.push({ k: ko ? "다음 매수가" : "Next buy", v: fmtMoney(locPx, plan.cur), tip: { h: ko ? "다음 매수가 (LOC)" : "Next buy (LOC)", rows: [[ko ? "현재 평단" : "Avg cost", fmtMoney(avg, plan.cur)], [ko ? "LOC 기준" : "LOC band", (locP != null ? (locP > 0 ? "+" : "") + locP.toFixed(1) + "%" : "")], [ko ? "현재가까지" : "From price", "−" + (((px - locPx) / px) * 100).toFixed(1) + "%"]], note: ko ? "평단 아래 LOC 기준만큼 내려간 지정가" : "Limit set LOC% below avg cost" } });
        else if (tpPx != null) stats.push({ k: ko ? "익절가" : "TP price", v: fmtMoney(tpPx, plan.cur), tone: "pos", tip: { h: ko ? "익절가" : "Take-profit", rows: [[ko ? "현재 평단" : "Avg cost", fmtMoney(avg, plan.cur)], [ko ? "익절 기준" : "TP band", (tpP != null ? (tpP > 0 ? "+" : "") + tpP.toFixed(1) + "%" : "")]], note: ko ? "평단 위 익절 기준만큼 올라간 목표가" : "Target set TP% above avg cost" } });
        if (isTime && timeInfo) { stats.unshift({ k: ko ? "누적 매수" : "Buys", v: timeInfo.buyCount + (ko ? "회" : ""), sub: timeInfo.intKo }); stats.push({ k: ko ? "다음 매수일" : "Next buy", v: timeInfo.nextLabel, sub: ko ? `${timeInfo.countdown}일 후` : `in ${timeInfo.countdown}d` }); }
        const _MONP = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
        const pdstr = (s) => { if (!s) return ""; const m = String(s).match(/([A-Za-z]{3})\s*(\d+)/); return m ? (ko ? `${_MONP[m[1]] + 1}월 ${m[2]}일` : `${m[1]} ${m[2]}`) : s; };
        const _bf = (plan.executions || []).filter(e => e.side === "buy").slice().sort((a, b) => { const pa = String(a.date || "").match(/([A-Za-z]{3})\s*(\d+)/), pb = String(b.date || "").match(/([A-Za-z]{3})\s*(\d+)/); const va = pa ? _MONP[pa[1]] * 100 + +pa[2] : 0, vb = pb ? _MONP[pb[1]] * 100 + +pb[2] : 0; return va - vb; });
        let _pq = 0, _pc = 0; const progSnaps = _bf.map((e, i) => { _pq += e.qty; _pc += e.qty * e.price; return { n: i + 1, price: e.price, date: e.date, qAfter: _pq, invAfter: _pc, avg: _pc / _pq }; });
        // capital deployment (staged-buy strategies)
        const invested = plan.totalInvested || 0;
        const perRoundAvg = round > 0 ? invested / round : null;
        const plannedCap = (div && perRoundAvg) ? perRoundAvg * div : null;
        const remainingCap = plannedCap != null ? Math.max(0, plannedCap - invested) : null;
        const capPct = plannedCap ? Math.round(invested / plannedCap * 100) : null;
        const remainRounds = (div && round != null) ? Math.max(0, div - round) : null;
        const showCap = div && invested > 0 && plannedCap != null;
        // optional goal (목표가 / 목표수익률) — off by default
        const goal = plan.goal || null;
        let goalView = null;
        if (goal) {
          if (goal.type === "return") {
            const cur = ret, tgt = goal.value;
            const pct = cur != null && tgt ? Math.max(0, Math.min(100, (cur / tgt) * 100)) : 0;
            const reached = cur != null && cur >= tgt;
            goalView = { kind: "return", tgtLab: (tgt >= 0 ? "+" : "") + tgt + "%", curLab: cur != null ? ((cur >= 0 ? "+" : "") + cur.toFixed(1) + "%") : "—", pct, reached,
              remainLab: cur == null ? (ko ? "진입 전" : "Not started") : (reached ? (ko ? "달성" : "Reached") : ((ko ? "" : "+") + (tgt - cur).toFixed(1) + (ko ? "%p 남음" : "%p left"))),
              tipNote: ko ? "평단가 대비 평가수익률이 이 목표에 도달하면 알림이 옵니다 (회차 익절과는 별개)." : "Cumulative return on the whole position vs. avg cost (separate from per-round take-profit)." };
          } else {
            const tgt = goal.value, base = avg > 0 ? avg : px;
            const pct = Math.max(0, Math.min(100, ((px - base) / ((tgt - base) || 1)) * 100));
            const reached = px >= tgt, remainPct = (tgt - px) / px * 100;
            goalView = { kind: "price", tgtLab: fmtMoney(tgt, plan.cur), curLab: fmtMoney(px, plan.cur), pct, reached,
              remainLab: reached ? (ko ? "달성" : "Reached") : ((ko ? "" : "+") + remainPct.toFixed(1) + (ko ? "% 남음" : "% left")),
              tipNote: ko ? "현재가가 목표가에 도달하면 알림이 옵니다." : "Alerts when price hits the target." };
          }
        }
        return (
          <div className="sc-cockpit">
            <div className={"sc-next sc-next--" + act.tone}>
              <span className="sc-next-ic"><Lic name={act.icon} size={16} cls="icon-sm" color="currentColor" /></span>
              <div className="sc-next-body"><div className="sc-next-lab">{ko ? "다음 액션" : "Next action"}</div><div className="sc-next-title">{act.label}</div><div className="sc-next-detail">{act.detail}</div></div>
            </div>
            {overlay}
            {deployed != null && <div className="sc-prog"><div className="sc-prog-head"><span>{ko ? `${round} / ${div}회차 진행` : `${round} / ${div} rounds`}</span><span className="mono">{deployed}%</span></div><div className="sc-prog-track">{Array.from({ length: Math.min(div || 0, 40) }).map((_, i) => {
              const cnt = Math.min(div || 0, 40);
              const filled = i < round;
              const snap = filled ? progSnaps[i] : null;
              const align = i < 5 ? " tip-l" : (i > cnt - 6 ? " tip-r" : "");
              return <span key={i} className={"sc-prog-cell" + (filled ? " on" : "")}>{snap
                ? <span className={"sc-prog-tip" + align}>
                    <span className="sc-tl-tip-h">{ko ? `${snap.n}회차 매수 체결` : `Buy fill #${snap.n}`}{snap.date ? " · " + pdstr(snap.date) : ""}</span>
                    <span className="sc-tl-tip-row"><span>{ko ? "체결가" : "Price"}</span><b className="mono">{fmtMoney(snap.price, plan.cur)}</b></span>
                    <span className="sc-tl-tip-row"><span>{ko ? "체결 후 누적 수량" : "Position after"}</span><b className="mono">{Math.round(snap.qAfter).toLocaleString("en-US")}{ko ? "주" : ""}</b></span>
                    <span className="sc-tl-tip-row"><span>{ko ? "체결 후 누적 투입" : "Invested after"}</span><b className="mono">{fmtMoney(snap.invAfter, plan.cur)}</b></span>
                    <span className="sc-tl-tip-row"><span>{ko ? "체결 후 평단" : "Avg cost after"}</span><b className="mono">{fmtMoney(snap.avg, plan.cur)}</b></span>
                  </span>
                : <span className={"sc-prog-tip mini" + align}><span className="sc-tl-tip-h" style={{ borderBottom: "none", paddingBottom: 0 }}>{filled ? (ko ? `${i + 1}회차 · 매수 완료` : `Round ${i + 1} · filled`) : (ko ? `${i + 1}회차 · 미실행` : `Round ${i + 1} · pending`)}</span></span>}</span>;
            })}</div></div>}
            {showCap && <div className="sc-cap">
              <div className="sc-cap-head"><span>{ko ? "자금 배치" : "Capital deployment"}</span><span className="mono">{capPct}%{ko ? " 투입" : ""}</span></div>
              <div className="sc-cap-bar"><div className="sc-cap-fill" style={{ width: Math.min(100, capPct) + "%" }} /></div>
              <div className="sc-cap-figs">
                <div className="sc-cap-fig">
                  <span className="sc-cap-k">{ko ? "계획" : "Planned"}</span><span className="sc-cap-v mono">{fmtMoney(plannedCap, plan.cur)}</span>
                  <span className="sc-cap-tip tip-l"><span className="sc-tl-tip-h">{ko ? "계획 자본" : "Planned capital"}</span><span className="sc-tl-tip-row"><span>{ko ? "회당 평균 투입" : "Avg per round"}</span><b className="mono">{fmtMoney(perRoundAvg, plan.cur)}</b></span><span className="sc-tl-tip-row"><span>{ko ? "× 분할 수" : "× divisions"}</span><b className="mono">{div}{ko ? "회" : ""}</b></span><span className="sc-cap-tipnote">{ko ? "현재 회차 평균으로 추정한 총 예산" : "Total budget est. from avg per round"}</span></span>
                </div>
                <div className="sc-cap-fig">
                  <span className="sc-cap-k">{ko ? "투입" : "Deployed"}</span><span className="sc-cap-v mono on">{fmtMoney(invested, plan.cur)}</span>
                  <span className="sc-cap-tip"><span className="sc-tl-tip-h">{ko ? "누적 투입" : "Deployed"}</span><span className="sc-tl-tip-row"><span>{ko ? "체결 누적 금액" : "Sum of fills"}</span><b className="mono">{fmtMoney(invested, plan.cur)}</b></span><span className="sc-tl-tip-row"><span>{ko ? "진행 회차" : "Rounds"}</span><b className="mono">{round}/{div}{ko ? "회" : ""}</b></span><span className="sc-tl-tip-row"><span>{ko ? "자본 기준 진행률" : "By capital"}</span><b className="mono">{capPct}%</b></span></span>
                </div>
                <div className="sc-cap-fig">
                  <span className="sc-cap-k">{ko ? "잔여" : "Remaining"}</span><span className="sc-cap-v mono">{fmtMoney(remainingCap, plan.cur)}</span>
                  <span className="sc-cap-tip tip-r"><span className="sc-tl-tip-h">{ko ? "남은 실탄" : "Remaining"}</span><span className="sc-tl-tip-row"><span>{ko ? "계획 − 투입" : "Planned − deployed"}</span><b className="mono">{fmtMoney(remainingCap, plan.cur)}</b></span><span className="sc-tl-tip-row"><span>{ko ? "남은 회차" : "Rounds left"}</span><b className="mono">{remainRounds}{ko ? "회" : ""}</b></span><span className="sc-cap-tipnote">{ko ? "추가 하락 시 분할 매수에 쓸 수 있는 자본" : "Capital available for further staged buys"}</span></span>
                </div>
              </div>
              <div className="sc-cap-foot">{ko ? `회당 평균 ${fmtMoney(perRoundAvg, plan.cur)} · 남은 ${remainRounds}회` : `Avg ${fmtMoney(perRoundAvg, plan.cur)}/round · ${remainRounds} left`}</div>
            </div>}
            {stats.length > 0 && <div className="sc-statline">{stats.map((s, i) => <div className={"sc-stat" + (s.tip ? " sc-stat--tip" : "")} key={i}><div className="sc-stat-k">{s.k}</div><div className={"sc-stat-v mono" + (s.tone ? " " + s.tone : "")}>{s.v}</div>{s.sub && <div className="sc-stat-sub mono">{s.sub}</div>}{s.tip && <span className={"sc-stat-tip" + (i === 0 ? " tip-l" : (i === stats.length - 1 ? " tip-r" : ""))}><span className="sc-tl-tip-h">{s.tip.h}</span>{s.tip.rows.map((r, j) => <span className="sc-tl-tip-row" key={j}><span>{r[0]}</span><b className="mono">{r[1]}</b></span>)}{s.tip.note && <span className="sc-cap-tipnote">{s.tip.note}</span>}</span>}</div>)}</div>}
            {goalEdit ? (
              <div className="sc-goal sc-goal--edit">
                <div className="sc-goal-seg">
                  <button className={"sc-goal-seg-b" + (gType === "return" ? " on" : "")} onClick={() => setGType("return")}>{ko ? "목표 수익률" : "Return"}</button>
                  <button className={"sc-goal-seg-b" + (gType === "price" ? " on" : "")} onClick={() => setGType("price")}>{ko ? "목표가" : "Price"}</button>
                </div>
                <div className="sc-goal-inwrap"><span className="sc-goal-unit">{gType === "return" ? "%" : (goalDispCur === "USD" ? "$" : "₩")}</span><input className="sc-goal-input mono" autoFocus value={gVal} onChange={e => setGVal(e.target.value)} placeholder={gType === "return" ? "20" : "0"} onKeyDown={e => { if (e.key === "Enter") saveGoal(); if (e.key === "Escape") setGoalEdit(false); }} /></div>
                <button className="v-btn v-btn--primary sc-goal-save" onClick={saveGoal}>{ko ? "저장" : "Save"}</button>
                <button className="sc-goal-cancel" onClick={() => setGoalEdit(false)}>{ko ? "취소" : "Cancel"}</button>
              </div>
            ) : goalView ? (
              <div className="sc-goal" onClick={() => openGoalEdit(goal.type, goal.value)}>
                <div className="sc-goal-head">
                  <span className="sc-goal-lab sc-goal-tipwrap" onClick={e => e.stopPropagation()}><Lic name="target" size={13} cls="icon-sm" color="var(--accent)" />{goal.type === "return" ? (ko ? "목표 수익률" : "Return goal") : (ko ? "목표가" : "Price goal")}<b className="mono">{goalView.tgtLab}</b><Lic name="help-circle" size={12} cls="icon-sm" color="var(--fg-4)" />
                    <span className="sc-cap-tip tip-l"><span className="sc-tl-tip-h">{goal.type === "return" ? (ko ? "목표 수익률" : "Return goal") : (ko ? "목표가" : "Price goal")}</span><span className="sc-tl-tip-row"><span>{ko ? "목표" : "Target"}</span><b className="mono">{goalView.tgtLab}</b></span><span className="sc-tl-tip-row"><span>{ko ? "현재" : "Now"}</span><b className="mono">{goalView.curLab}</b></span><span className="sc-tl-tip-row"><span>{ko ? "달성률" : "Progress"}</span><b className="mono">{goalView.reached ? (ko ? "달성" : "Reached") : Math.round(goalView.pct) + "%"}</b></span><span className="sc-cap-tipnote">{goalView.tipNote}</span></span>
                  </span>
                  <span className="sc-goal-actions">
                    <span className={"sc-goal-pct mono" + (goalView.reached ? " reached" : "")}>{goalView.reached ? (ko ? "달성 ✓" : "Reached ✓") : (ko ? "달성 " : "") + Math.round(goalView.pct) + "%"}</span>
                  </span>
                </div>
                <span className="sc-goal-edit-actions">
                  <button className="iconbtn sc-goal-mini" onClick={e => { e.stopPropagation(); openGoalEdit(goal.type, goal.value); }} title={ko ? "수정" : "Edit"}><Lic name="pencil" size={12} /></button>
                  <button className="iconbtn sc-goal-mini" onClick={e => { e.stopPropagation(); removeGoal(); }} title={ko ? "삭제" : "Remove"}><Lic name="x" size={12} /></button>
                </span>
                <div className="sc-goal-bar"><div className={"sc-goal-fill" + (goalView.reached ? " reached" : "")} style={{ width: Math.min(100, goalView.pct) + "%" }} /></div>
                <div className="sc-goal-foot"><span>{ko ? "현재 " : "Now "}<b className="mono">{goalView.curLab}</b></span><span className="sc-goal-remain">{goalView.remainLab}</span></div>
              </div>
            ) : (
              <button className="sc-goal-add" onClick={() => openGoalEdit("return", null)}><Lic name="target" size={13} cls="icon-sm" color="currentColor" />{ko ? "목표 설정 (선택)" : "Set a goal (optional)"}</button>
            )}
          </div>
        );
      })()}
      {ex && (ex.fields || []).some(f => !f.auto) && (() => {
        const fields = (ex.fields || []).filter(f => !f.auto);
        if (!fields.length) return null;
        return (
          <div className="sc-fields-card">
            <div className="sc-fields-cap">{ko ? "전략 파라미터" : "Parameters"}</div>
            <div className="sc-fields-grid">{fields.map(f => { const tip = FIELD_TIPS[f.key]; return <div className={"sc-field" + (tip ? " sc-field--tip" : "")} key={f.key}><span className="sc-field-k">{f.label[lang]}</span><span className="sc-field-v mono">{f.type === "Percent" ? String(f.default).replace(/[^0-9.\-]/g, "") + "%" : f.type === "Select" ? locStratVal(f.default, lang) : f.default}</span>{tip && <span className="sc-cap-tip"><span className="sc-tl-tip-h">{f.label[lang]}</span><span className="sc-cap-tipnote">{tip[lang] || tip.ko}</span></span>}</div>; })}</div>
          </div>
        );
      })()}
      {ex && plan.executions && plan.executions.filter(e => e.side === "buy").length > 0 && (() => {
        const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
        const fills = plan.executions.slice().sort((a, b) => { const pa = (a.date || "").match(/([A-Za-z]{3})\s*(\d+)/), pb = (b.date || "").match(/([A-Za-z]{3})\s*(\d+)/); const va = pa ? MON[pa[1]] * 100 + +pa[2] : 0, vb = pb ? MON[pb[1]] * 100 + +pb[2] : 0; return va - vb; });
        const dstr = (s) => { if (!s) return ""; const m = s.match(/([A-Za-z]{3})\s*(\d+)/); return m ? (ko ? `${MON[m[1]] + 1}월 ${m[2]}일` : `${m[1]} ${m[2]}`) : s; };
        let qcum = 0, ccum = 0, bn = 0; const rows = [];
        fills.forEach(e => { if (e.side === "buy") { qcum += e.qty; ccum += e.qty * e.price; bn += 1; rows.push({ ...e, n: bn, avg: ccum / qcum, qAfter: qcum, invAfter: ccum }); } else { const avg = qcum > 0 ? ccum / qcum : 0; const realized = e.qty * (e.price - avg); ccum -= e.qty * avg; qcum -= e.qty; rows.push({ ...e, sell: true, avg: qcum > 0 ? ccum / qcum : 0, qAfter: qcum, invAfter: ccum, realized }); } });
        return (
          <div className="sc-tl-card">
            <div className="sc-tl-cap"><span>{ko ? "실행 타임라인" : "Execution timeline"}</span><span className="sc-tl-sub">{ko ? "회차별 매수 · 평단 변화" : "rounds & avg cost"}</span></div>
            {rows.slice().reverse().map((e, i) => (
              <div className="sc-tl-row" key={i}>
                <span className={"sc-tl-dot " + (e.sell ? "sell" : "buy")} />
                <span className="sc-tl-n">{e.sell ? (ko ? "매도" : "Sell") : (plan.divisions ? `${e.n}/${plan.divisions}${ko ? "회" : ""}` : `#${e.n}`)}</span>
                <span className="sc-tl-when">{dstr(e.date)}</span>
                <span className="sc-tl-price mono">{fmtMoney(e.price, plan.cur)}</span>
                <span className="sc-tl-qty mono">{e.qty}{ko ? "주" : ""}</span>
                <span className="sc-tl-avg mono">{ko ? "평단 " : "avg "}{fmtMoney(e.avg, plan.cur)}</span>
                <span className="sc-tl-tip">
                  <span className="sc-tl-tip-h">{e.sell ? (ko ? "매도 체결" : "Sell fill") : (ko ? `${e.n}회차 매수 체결` : `Buy fill #${e.n}`)} · {dstr(e.date)}</span>
                  <span className="sc-tl-tip-row"><span>{ko ? "체결가 × 수량" : "Price × qty"}</span><b className="mono">{fmtMoney(e.price, plan.cur)} × {e.qty}{ko ? "주" : ""}</b></span>
                  <span className="sc-tl-tip-row"><span>{ko ? "체결 후 누적 수량" : "Position after"}</span><b className="mono">{Math.round(e.qAfter).toLocaleString("en-US")}{ko ? "주" : ""}</b></span>
                  <span className="sc-tl-tip-row"><span>{ko ? "체결 후 누적 투입" : "Invested after"}</span><b className="mono">{fmtMoney(e.invAfter, plan.cur)}</b></span>
                  <span className="sc-tl-tip-row"><span>{ko ? "체결 후 평단" : "Avg cost after"}</span><b className="mono">{fmtMoney(e.avg, plan.cur)}</b></span>
                  {e.sell && <span className="sc-tl-tip-row"><span>{ko ? "실현손익" : "Realized P/L"}</span><b className={"mono " + (e.realized >= 0 ? "pos" : "neg")}>{(e.realized >= 0 ? "+" : "") + fmtMoney(e.realized, plan.cur)}</b></span>}
                </span>
              </div>
            ))}
          </div>
        );
      })()}
      {ex && (typeof stratDiagram === "function") && stratDiagram(ex, lang) && (
        <div className="rules-viz">
          <div className="rules-viz-bar" onClick={() => setVizOpen(o => !o)}>
            <Lic name="workflow" size={14} cls="icon-sm" color="var(--fg-3)" />
            <span className="rules-viz-title">{ko ? `${stratName} 작동 원리` : `How ${stratName} works`}</span>
            <span className="rules-viz-sub">{vizOpen ? (ko ? "접기" : "Hide") : (ko ? "이 규칙들이 어떻게 맞물리는지 보기" : "See how these rules fit together")}</span>
            <Lic name={vizOpen ? "chevron-up" : "chevron-down"} size={15} cls="icon-sm" color="var(--fg-4)" />
          </div>
          {vizOpen && <div className="rules-viz-body">{stratDiagram(ex, lang)}</div>}
        </div>
      )}
      {(() => { const live = plan.rules.filter(r => r.on).map(r => ({ r, e: evalRule(plan, r, ko) })); const firing = live.filter(x => x.e.state === "fired"); return (
        <div className="rules-live">
          <div className="rules-live-top"><span className={"rules-live-dot " + (firing.length ? "on" : "")} /><span className="rules-live-h">{ko ? "실시간 규칙 평가" : "Live rule check"}</span><span className="rules-live-sub">{ko ? `현재가 ${fmtMoney(plan.currentPrice, plan.cur)} 기준` : `at ${fmtMoney(plan.currentPrice, plan.cur)}`}</span></div>
          {firing.length > 0 ? <div className="rules-live-msg">{firing.map((x, i) => <span className="rules-live-chip fired" key={i}><Lic name="zap" size={12} cls="icon-sm" color="var(--pos)" />{x.r.name[lang]}</span>)}</div>
            : <div className="rules-live-msg none">{ko ? "지금 발동 중인 규칙이 없습니다 — 모두 조건 대기 중" : "No rules firing right now — all armed"}</div>}
          <div className="rules-live-foot">{ko ? "실제 시세 연동 전이라 플랜의 현재가 데이터로 판정합니다." : "Evaluated on the plan's current-price data (no live feed yet)."}</div>
        </div>
      ); })()}
      {plan.rules.map(r => { const td = r.trig ? RULE_TRIGS.find(x => x.id === r.trig) : null; const ad = r.act ? RULE_ACTS.find(x => x.id === r.act) : null; const ev = evalRule(plan, r, ko); return (
        <div className="rule-card" key={r.id}>
          <div className="rule-head">
            <span className={"toggle" + (r.on ? " on" : "")} onClick={() => onToggle(r.id)} />
            <span className="rule-name rule-ed" contentEditable suppressContentEditableWarning onBlur={edit(r.id, "name")} onKeyDown={keyDown}>{r.name[lang]}</span>
            <span className="fin-term rule-help"><span className="ind-q">?</span><span className="fin-tip"><b>{r.name[lang]}</b><span className="fin-tip-def">{ruleDesc(r)}</span></span></span>
            {r.on && <span className={"rule-state " + ev.state} title={ev.meta}><span className="rule-state-dot" />{RULE_STATE_LABEL[ev.state][lang]}</span>}
            {(() => { const w = ruleWarn(plan, r, ko); return w ? <span className="rule-warn fin-term"><Lic name="alert-triangle" size={12} cls="icon-sm" color="var(--r-paused)" /><span className="fin-tip fin-tip-r"><b>{ko ? "필드 누락" : "Missing field"}</b><span className="fin-tip-def">{w}</span></span></span> : null; })()}
            <span className={"rule-tag " + (r.custom ? "mine" : "strat")}>{r.custom ? (ko ? "내 규칙" : "Custom") : stratName}{!r.custom && r.edited ? " · " + (ko ? "수정" : "edited") : ""}</span>
            <span className="rule-last">{t.lastTriggered}: {locLast(r.last)}</span>
            {r.custom && onRemove && <button className="rule-del" title={t.delete} onClick={() => onRemove(plan.id, r.id)}><Lic name="x" size={13} color="currentColor" /></button>}
          </div>
          <div className="rule-flow">
            <span className="rule-blk when">{t.when}</span>
            {td ? <React.Fragment>
              <MiniDropdown width={172} trigger={<span className="rule-blk cond pick">{ko ? td.ko : td.en}<Lic name="chevron-down" size={11} cls="icon-sm" color="var(--fg-4)" /></span>} items={RULE_TRIGS.map(x => ({ value: x.id, label: ko ? x.ko : x.en, on: x.id === r.trig }))} onPick={(v) => onPatch(plan.id, r.id, { trig: v })} />
              {td.hasValue && <span className="rule-blk cond rule-valblk"><input className="rule-valinp mono" value={r.trigVal ?? ""} onChange={(e) => onPatch(plan.id, r.id, { trigVal: e.target.value.replace(/[^0-9.\-]/g, "") })} />{td.unit}</span>}
              <span className="fin-term rule-help"><span className="ind-q">?</span><span className="fin-tip"><b>{ko ? td.ko : td.en}</b><span className="fin-tip-def">{ko ? td.descKo : td.descEn}</span></span></span>
            </React.Fragment> : <span className="rule-blk cond">{(r.when || {})[lang]}</span>}
            <span className="rule-arrow"><Lic name="arrow-right" size={15} cls="icon-sm" color="var(--fg-4)" /></span>
            <span className="rule-blk then">{t.then}</span>
            {ad ? <React.Fragment><MiniDropdown width={158} trigger={<span className="rule-blk cond pick">{ko ? ad.ko : ad.en}<Lic name="chevron-down" size={11} cls="icon-sm" color="var(--fg-4)" /></span>} items={RULE_ACTS.map(x => ({ value: x.id, label: ko ? x.ko : x.en, on: x.id === r.act }))} onPick={(v) => onPatch(plan.id, r.id, { act: v })} />
              <span className="fin-term rule-help"><span className="ind-q">?</span><span className="fin-tip fin-tip-r"><b>{ko ? ad.ko : ad.en}</b><span className="fin-tip-def">{ko ? ad.descKo : ad.descEn}</span></span></span></React.Fragment>
              : <span className="rule-blk cond">{(r.then || {})[lang]}</span>}
          </div>
        </div>
      ); })}
      {!plan.rules.length && <div style={{ padding: "32px 0", textAlign: "center", color: "var(--fg-4)", font: "var(--fw-medium) 13px var(--font-sans)" }}>{lang === "ko" ? "규칙이 없습니다" : "No rules"}</div>}
      <button className="add-row" style={{ marginTop: 6, width: "100%" }} onClick={() => onAdd && onAdd(plan.id)}><Lic name="plus" size={15} color="var(--fg-4)" />{t.addRule}</button>
    </div>
  );
}

/* ---- Activity tab ---- */
function ActivityTab({ plan, lang }) {
  const items = [];
  plan.executions.forEach(e => items.push({ type: "exec", icon: e.side === "buy" ? "arrow-down-left" : "arrow-up-right", color: e.side === "buy" ? "var(--r-active)" : "var(--r-closing)", when: e.date,
    text: lang === "ko" ? `${e.side === "buy" ? "매수" : "매도"} 체결 ${e.qty}주 @ ${fmtMoney(e.price, plan.cur)}` : `${e.side === "buy" ? "Bought" : "Sold"} ${e.qty} @ ${fmtMoney(e.price, plan.cur)}` }));
  plan.rules.filter(r => r.last !== "Never").forEach(r => items.push({ type: "rule", icon: "zap", color: "var(--r-base)", when: r.last,
    text: lang === "ko" ? `규칙 "${r.name.ko}" 트리거됨` : `Rule "${r.name.en}" triggered` }));
  items.push({ type: "sys", icon: "circle-plus", color: "var(--fg-3)", when: plan.createdAt,
    text: lang === "ko" ? "플랜 생성됨" : "Plan created" });
  return (
    <div className="act-feed">
      {items.map((it, i) => (
        <div className="act-item" key={i}>
          <div className="act-rail">
            <div className="act-ico"><Lic name={it.icon} size={14} cls="icon-sm" color={it.color} /></div>
            {i < items.length - 1 && <div className="act-line" />}
          </div>
          <div className="act-body">
            <div className="act-text">{it.text}</div>
            <div className="act-time">{it.when}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- Properties sidebar ---- */
const CF_TYPES = [["text", "Aa"], ["number", "#"], ["percent", "%"], ["date", "☷"], ["select", "▾"]];
function PropsSidebar({ plan, t, lang, onStatus, onPatchPlan, onCreatePortfolio, onOpenSecurity, onToggleRight }) {
  const strat = STRATEGIES.find(s => s.id === plan.strategyId);
  const pf = PORTFOLIOS.find(p => p.id === plan.portfolioId);
  const fields = strat ? strat.fields : [];
  const exec = (typeof EXEC_STRATEGIES !== "undefined") ? EXEC_STRATEGIES.find(s => s.id === plan.execId) : null;
  const execFields = exec ? (exec.fields || []) : [];
  const cfs = plan.customFields || [];
  const notes = plan.notes || [];
  const [noteDraft, setNoteDraft] = React.useState("");
  const [showAllNotes, setShowAllNotes] = React.useState(false);
  const saveNotes = (list) => onPatchPlan && onPatchPlan(plan.id, { notes: list });
  const addNote = () => { const v = noteDraft.trim(); if (!v) return; const d = new Date(2026, 5, 22); const stamp = lang === "ko" ? `${d.getMonth() + 1}월 ${d.getDate()}일` : `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]} ${d.getDate()}`; saveNotes([{ id: "nt" + Date.now(), when: stamp, text: v, price: plan.currentPrice }, ...notes]); setNoteDraft(""); };
  const removeNote = (id) => saveNotes(notes.filter(n => n.id !== id));
  const [editId, setEditId] = React.useState(null);
  const [editText, setEditText] = React.useState("");
  const startEdit = (n) => { setEditId(n.id); setEditText(n.text); };
  const cancelEdit = () => { setEditId(null); setEditText(""); };
  const commitEdit = () => { const v = editText.trim(); if (!v) return cancelEdit(); saveNotes(notes.map(n => n.id === editId ? { ...n, text: v, editedAt: Date.now() } : n)); cancelEdit(); };
  const [adding, setAdding] = React.useState(false);
  const [cfLabel, setCfLabel] = React.useState("");
  const [cfType, setCfType] = React.useState("text");
  const saveCf = (list) => onPatchPlan && onPatchPlan(plan.id, { customFields: list });
  const addCf = () => {
    const label = cfLabel.trim(); if (!label) return;
    saveCf([...cfs, { id: "cf" + Date.now(), label, type: cfType, value: "" }]);
    setCfLabel(""); setCfType("text"); setAdding(false);
  };
  const updateCf = (id, value) => saveCf(cfs.map(f => f.id === id ? { ...f, value } : f));
  const removeCf = (id) => saveCf(cfs.filter(f => f.id !== id));
  const cfPlaceholder = (ty) => ty === "percent" ? "0" : ty === "number" ? "0" : ty === "date" ? (lang === "ko" ? "예: 6월 8일" : "e.g. Jun 8") : ty === "select" ? (lang === "ko" ? "값 입력" : "value") : (lang === "ko" ? "값 입력" : "value");
  const statusItems = STATUS_ORDER.map(s => ({ value: s, label: t["s_" + s], icon: <StatusIcon status={s} size={14} />, on: plan.status === s }));
  return (
    <div className="detail-side">
      {onToggleRight && <div className="ds-toolbar"><button className="iconbtn" onClick={onToggleRight} title={t.hideProps}><PanelIcon side="right" size={15} /></button></div>}
      {plan.status === "closed" ? (() => { const co = closeoutSummary(plan); return (
        <div className="side-group">
          <div className="side-cap">{lang === "ko" ? "청산 요약" : "Closeout"}</div>
          <div className="prop-line"><span className="pl-label">{t.realizedPL}</span><span className={"pl-value mono " + (co.realized >= 0 ? "pos" : "neg")}>{(co.realized >= 0 ? "+" : "") + fmtCompact(co.realized, plan.cur)}</span></div>
          <div className="prop-line"><span className="pl-label">{t.totalInvestedLab}</span><span className="pl-value mono">{fmtCompact(co.invested, plan.cur)}</span></div>
          <div className="prop-line"><span className="pl-label">{t.totalBought}</span><span className="pl-value mono">{co.buyQty.toLocaleString("en-US")}{lang === "ko" ? "주" : ""} · {co.rounds}{lang === "ko" ? "회" : "×"}</span></div>
          <div className="prop-line"><span className="pl-label">{t.avgBuySell}</span><span className="pl-value mono">{fmtMoney(co.avgBuy, plan.cur)} → {co.avgSell != null ? fmtMoney(co.avgSell, plan.cur) : "—"}</span></div>
        </div>
      ); })() : (plan.totalShares > 0 || plan.totalInvested > 0) && (
        <div className="side-group">
          <div className="side-cap">{lang === "ko" ? "포지션" : "Position"}</div>
          <div className="prop-line"><span className="pl-label">{t.invested}</span><span className="pl-value mono">{fmtCompact(plan.totalInvested, plan.cur)}</span></div>
          <div className="prop-line"><span className="pl-label">{t.shares}</span><span className="pl-value mono">{(plan.totalShares || 0).toLocaleString("en-US")}</span></div>
          <div className="prop-line"><span className="pl-label">{t.dash_value}</span><span className="pl-value mono">{fmtCompact(plan.currentPrice * (plan.totalShares || 0), plan.cur)}</span></div>
          <div className="prop-line"><span className="pl-label">{lang === "ko" ? "보유 기간" : "Holding period"}</span><span className="pl-value mono">{holdingPeriod(plan.createdAt, lang)}</span></div>
        </div>
      )}
      <div className="side-group">
        <div className="side-cap">{t.sysProps}</div>
        <div className="prop-line"><span className="pl-label">{t.status}</span>
          <MiniDropdown trigger={<span className="pl-value pick"><StatusIcon status={plan.status} size={14} />{t["s_" + plan.status]}</span>} items={statusItems} onPick={(v) => onStatus(plan.id, v)} />
        </div>
        <div className="prop-line"><span className="pl-label">{t.portfolio}</span>
          {onPatchPlan
            ? <MiniDropdown trigger={<span className="pl-value pick"><span className="pf-dot" style={{ background: pf.color }} />{pf.name[lang]}</span>}
                items={[{ value: null, label: t.noPortfolio, icon: <span className="pf-dot" style={{ background: "var(--fg-4)" }} />, on: !plan.portfolioId }].concat(PORTFOLIOS.map(p => ({ value: p.id, label: p.name[lang], icon: <span className="pf-dot" style={{ background: p.color }} />, on: plan.portfolioId === p.id })))}
                onPick={(v) => onPatchPlan(plan.id, { portfolioId: v })}
                onCreate={onCreatePortfolio ? (name) => onCreatePortfolio(plan.id, name) : undefined} createLabel={t.newPortfolio} />
            : <span className="pl-value"><span className="pf-dot" style={{ background: pf.color }} />{pf.name[lang]}</span>}
        </div>
        <div className="prop-line"><span className="pl-label">{t.strategy}</span>
          {onPatchPlan
            ? <MiniDropdown trigger={<span className="pl-value pick">{exec ? <><span className="strat-dot" style={{ background: exec.color }} />{exec.name[lang]}</> : <span style={{ color: "var(--fg-4)" }}>{t.noStrategy}</span>}<Lic name="chevron-down" size={11} cls="icon-sm" color="var(--fg-4)" /></span>}
                items={[{ value: null, label: t.noStrategy, icon: <span className="strat-dot" style={{ background: "var(--fg-4)" }} />, on: !exec }].concat(EXEC_STRATEGIES.map(s => ({ value: s.id, label: s.name[lang], icon: <span className="strat-dot" style={{ background: s.color }} />, on: exec && exec.id === s.id })))}
                onPick={(v) => onPatchPlan(plan.id, { execId: v })} />
            : <span className="pl-value">{exec ? <><span className="strat-dot" style={{ background: exec.color }} />{exec.name[lang]}</> : <span style={{ color: "var(--fg-4)" }}>{t.noStrategy}</span>}</span>}
        </div>
        <div className="prop-line"><span className="pl-label">{t.ticker}</span><span className="pl-value c-link" onClick={() => onOpenSecurity && onOpenSecurity(plan.ticker)} style={{ cursor: onOpenSecurity ? "pointer" : "default" }}>{plan.flag} <span className="mono">{plan.ticker}</span></span></div>
        <div className="prop-line"><span className="pl-label">{t.created}</span><span className="pl-value" style={{ color: "var(--fg-3)" }}>{fmtDate(plan.createdAt, lang)}</span></div>
        <div className="prop-line"><span className="pl-label">{t.updated}</span><span className="pl-value" style={{ color: "var(--fg-3)" }}>{fmtRel(plan.updatedAt, lang)}</span></div>
      </div>

      {(() => {
        const px = plan.currentPrice, avg = plan.avgPrice || 0;
        const ret = avg > 0 ? (px - avg) / avg * 100 : null;
        const rows = [{ k: lang === "ko" ? "현재가" : "Price", v: fmtCompact(px, plan.cur) }];
        if (avg > 0) rows.push({ k: lang === "ko" ? "평단가" : "Avg cost", v: fmtCompact(avg, plan.cur) });
        if (ret != null) rows.push({ k: lang === "ko" ? "평가손익" : "P/L", v: (ret >= 0 ? "+" : "") + ret.toFixed(1) + "%", tone: ret >= 0 ? "pos" : "neg" });
        if (plan.divisions) rows.push({ k: lang === "ko" ? "회차" : "Round", v: `${plan.round ?? 0}/${plan.divisions}` });
        return (
          <div className="side-group">
            <div className="side-cap">{lang === "ko" ? "현황" : "Vitals"}</div>
            {rows.map((r, i) => (
              <div className="field-line" key={i}>
                <span className="fl-key">{r.k}</span>
                <span className="fl-val" style={r.tone === "pos" ? { color: "var(--pos)" } : r.tone === "neg" ? { color: "var(--neg)" } : null}>{r.v}</span>
              </div>
            ))}
            {plan.execId && <div className="side-vitals-foot">{lang === "ko" ? "전략 파라미터·규칙은 전략 탭에서" : "Parameters & rules in the Strategy tab"}</div>}
          </div>
        );
      })()}

      <div className="side-group side-group--notes">
        <div className="side-cap">{lang === "ko" ? "메모 (투자 일지)" : "Notes"}</div>
        <div className="note-compose">
          <textarea className="note-input" rows="2" placeholder={lang === "ko" ? "관찰·결정을 기록하세요…" : "Log an observation or decision…"} value={noteDraft}
            onChange={e => setNoteDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote(); }} />
          {noteDraft.trim() && <button className="v-btn v-btn--primary note-save" onClick={addNote}>{lang === "ko" ? "기록" : "Log"}</button>}
        </div>
        {notes.length === 0 ? <div className="note-empty">{lang === "ko" ? "아직 메모가 없습니다." : "No notes yet."}</div>
          : <div className={"note-list" + (showAllNotes ? " scroll" : "")}>{(showAllNotes ? notes : notes.slice(0, 3)).map(n => (
            <div className="note-item" key={n.id}>
              <div className="note-meta"><span className="note-when">{n.when && typeof n.when === "object" ? (n.when[lang] || n.when.en) : n.when}{n.editedAt && <span className="note-edited">{lang === "ko" ? " · 수정됨" : " · edited"}</span>}</span>
                {editId !== n.id && <span className="note-acts">
                  <button className="note-edit" title={lang === "ko" ? "수정" : "Edit"} onClick={() => startEdit(n)}><Lic name="pencil" size={11} color="currentColor" /></button>
                  <button className="note-del" title={t.delete} onClick={() => removeNote(n.id)}><Lic name="x" size={12} color="currentColor" /></button>
                </span>}
              </div>
              {editId === n.id
                ? <div className="note-edit-box">
                    <textarea className="note-input" autoFocus rows="3" value={editText} onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commitEdit(); if (e.key === "Escape") cancelEdit(); }} />
                    <div className="note-edit-acts">
                      <button className="note-cancel" onClick={cancelEdit}>{lang === "ko" ? "취소" : "Cancel"}</button>
                      <button className="v-btn v-btn--primary note-save" onClick={commitEdit}>{lang === "ko" ? "저장" : "Save"}</button>
                    </div>
                  </div>
                : <div className="note-text">{n.text}</div>}
            </div>
          ))}</div>}
        {notes.length > 3 && <button className="note-more" onClick={() => setShowAllNotes(v => !v)}>{showAllNotes ? (lang === "ko" ? "접기" : "Show less") : (lang === "ko" ? ("메모 " + (notes.length - 3) + "개 더 보기") : ("Show " + (notes.length - 3) + " more"))}</button>}
      </div>

      <div className="side-group">
        <div className="side-cap">{t.scSummary}</div>
        {plan.scenarios.map((s, i) => {
          const gap = (s.target / plan.currentPrice - 1) * 100;
          return (
            <div className="scsum-row" key={i}>
              <span className="scsum-dot" style={{ background: s.color }} />
              <span className="scsum-lab">{s.label[lang]} · <span className="mono">{fmtCompact(s.target, plan.cur)}</span></span>
              <span className={"scsum-pct " + (gap >= 0 ? "pos" : "neg")}>{gap >= 0 ? "+" : ""}{gap.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Detail shell ---- */
function applyFairTargets(plan, tg, onUpdateScenario) {
  plan.scenarios.forEach((s, i) => {
    const en = (s.label && s.label.en) || "";
    const target = en === "Bull" ? tg.bull : en === "Bear" ? tg.bear : tg.base;
    if (target > 0) onUpdateScenario(plan.id, i, { target });
  });
}

/* ---- 손익 워터폴 — 매출에서 순이익까지 돈이 어디서 새는지 ---- */
function Waterfall({ steps, cur, lang }) {
  const ko = lang === "ko";
  const fv = v => fmtCompact(Math.abs(v), cur);
  // 누적 위치 계산
  let run = 0; const segs = [];
  steps.forEach(s => {
    if (s.total) { segs.push({ ...s, from: 0, to: s.val, total: true }); run = s.val; }
    else { const from = run; run += s.val; segs.push({ ...s, from, to: run }); }
  });
  const max = Math.max(...segs.map(s => Math.max(s.from, s.to))) * 1.04;
  const W = 760, H = 250, PADX = 8, TOP = 16, BOT = 42, n = segs.length;
  const gap = 14, bw = (W - 2 * PADX - gap * (n - 1)) / n;
  const y = v => TOP + (H - TOP - BOT) * (1 - v / (max || 1));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {[0, 0.5, 1].map((f, i) => <line key={i} x1={PADX} x2={W - PADX} y1={TOP + (H - TOP - BOT) * f} y2={TOP + (H - TOP - BOT) * f} stroke="var(--border)" />)}
      {segs.map((s, i) => {
        const x = PADX + i * (bw + gap);
        const yTop = y(Math.max(s.from, s.to)), yBot = y(Math.min(s.from, s.to));
        const h = Math.max(2, yBot - yTop);
        const color = s.total ? "var(--accent)" : s.val >= 0 ? "color-mix(in srgb, var(--pos) 70%, transparent)" : "color-mix(in srgb, var(--neg) 70%, transparent)";
        return (
          <g key={i} className="wf-col">
            {i < n - 1 && <line x1={x} x2={x + bw + gap} y1={y(s.to)} y2={y(s.to)} stroke="var(--border-strong)" strokeDasharray="2 2" />}
            <rect x={x} y={yTop} width={bw} height={h} rx="2" fill={color} />
            <text x={x + bw / 2} y={yTop - 5} textAnchor="middle" style={{ fill: "var(--fg-2)", font: "var(--fw-semi) 10px var(--font-mono)" }}>{(s.val >= 0 || s.total ? "" : "−") + fv(s.val)}</text>
            <text x={x + bw / 2} y={H - BOT + 15} textAnchor="middle" style={{ fill: "var(--fg-3)", font: "var(--fw-medium) 10px var(--font-sans)" }}>{s.label}</text>
            {s.pct != null && <text x={x + bw / 2} y={H - BOT + 28} textAnchor="middle" style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 9px var(--font-mono)" }}>{s.pct}</text>}
          </g>
        );
      })}
    </svg>
  );
}

/* ---- 커스텀 재무 차트 빌더 — 항목을 골라 한 차트에서 비교 ---- */
function FinChartBuilder({ fin, plan, lang, fv, stmt }) {
  const ko = lang === "ko";
  const SRC0 = [
    ["rev", ko ? "매출액" : "Revenue", "is", r => r.rev, "var(--accent)"],
    ["op", ko ? "영업이익" : "Op. income", "is", r => r.op, "#4CB782"],
    ["net", ko ? "순이익" : "Net income", "is", r => r.net, "#4C8DFF"],
    ["gross", ko ? "매출총이익" : "Gross profit", "is", r => r.gross, "#BB6BD9"],
    ["cogs", ko ? "매출원가" : "COGS", "is", r => r.cogs, "var(--neg)"],
    ["sga", ko ? "판관비" : "SG&A", "is", r => r.sga, "#F2994A"],
    ["tax", ko ? "법인세" : "Tax", "is", r => r.tax, "#8A8F98"],
    ["assets", ko ? "자산총계" : "Assets", "bs", r => r.assets, "#F2994A"],
    ["curAssets", ko ? "유동자산" : "Current assets", "bs", r => r.curAssets, "var(--accent)"],
    ["nonCurAssets", ko ? "비유동자산" : "Non-cur. assets", "bs", r => r.nonCurAssets, "#4CB782"],
    ["liab", ko ? "부채총계" : "Liabilities", "bs", r => r.liab, "var(--neg)"],
    ["curLiab", ko ? "유동부채" : "Current liab.", "bs", r => r.curLiab, "#E0A93E"],
    ["nonCurLiab", ko ? "비유동부채" : "Non-cur. liab.", "bs", r => r.nonCurLiab, "#BB6BD9"],
    ["equity", ko ? "자본총계" : "Equity", "bs", r => r.equity, "#2D9CDB"],
    ["ocf", ko ? "영업CF" : "Operating CF", "cf", r => r.ocf, "#4CB782"],
    ["icf", ko ? "투자CF" : "Investing CF", "cf", r => r.icf, "var(--neg)"],
    ["fcf_fin", ko ? "재무CF" : "Financing CF", "cf", r => r.fcf_fin, "#2D9CDB"],
    ["fcf", ko ? "FCF" : "Free cash flow", "cf", r => r.fcf, "#9B6BD9"],
    ["da", ko ? "감가상각" : "D&A", "cf", r => r.da, "#F2994A"],
    ["capex", ko ? "CAPEX" : "Capex", "cf", r => Math.abs(r.capex), "#E0A93E"],
  ];
  const SRC = (stmt && stmt !== "all") ? SRC0.filter(s => s[2] === stmt) : SRC0;
  const DEFAULTS = { is: ["rev", "op", "net"], bs: ["assets", "liab", "equity"], cf: ["ocf", "fcf", "capex"], all: ["rev", "op", "net"] };
  const [sel, setSel] = React.useState(DEFAULTS[stmt || "all"] || ["rev", "op", "net"]);
  const [kind, setKind] = React.useState("line");
  const [basis, setBasis] = React.useState("abs");      // abs | pctRev | index | yoy
  const rows = src => src === "is" ? fin.is : src === "bs" ? fin.bs : fin.cf;
  const years = fin.is.map(r => r.y);
  const canPctRev = (stmt === "is");
  const effBasis = (basis === "pctRev" && !canPctRev) ? "abs" : basis;
  const transform = (rawVals, srcKey) => {
    if (effBasis === "pctRev") return rawVals.map((v, i) => v / (fin.is[i].rev || 1) * 100);
    if (effBasis === "index") { const base = rawVals[0] || 1; return rawVals.map(v => v / base * 100); }
    if (effBasis === "yoy") return rawVals.map((v, i) => i === 0 ? null : (v - rawVals[i - 1]) / Math.abs(rawVals[i - 1] || 1) * 100);
    return rawVals;
  };
  const isPctish = effBasis !== "abs";
  const series = sel.map(k => SRC.find(s => s[0] === k)).filter(Boolean).map(d => { const raw = rows(d[2]).map(d[3]); return { k: d[0], lab: d[1], color: d[4], raw, vals: transform(raw, d[0]) }; });
  const all = series.flatMap(s => s.vals).filter(v => v != null);
  const max = Math.max(...all, isPctish ? 0 : 1), min = Math.min(...all, 0);
  const W = 760, H = 220, PX = 12, TOP = 14, BOT = 28, n = years.length;
  const x = i => PX + (W - 2 * PX) * i / (n - 1 || 1);
  const y = v => TOP + (H - TOP - BOT) * (1 - (v - min) / ((max - min) || 1));
  const toggle = k => setSel(s => s.includes(k) ? s.filter(x => x !== k) : [...s, k]);
  const [hov, setHov] = React.useState(null);
  return (
    <div className="fcb">
      <div className="fcb-bar">
        <span className="fcb-lab">{ko ? "비교 항목" : "Compare"}</span>
        {SRC.map(d => <span key={d[0]} className={"fcb-chip" + (sel.includes(d[0]) ? " on" : "")} onClick={() => toggle(d[0])} style={sel.includes(d[0]) ? { borderColor: d[4], color: d[4] } : null}><span className="fcb-dot" style={{ background: d[4] }} />{d[1]}</span>)}
      </div>
      <div className="fcb-controls">
        <div className="fcb-ctl">
          <span className="fcb-lab">{ko ? "유형" : "Type"}</span>
          <div className="seg-toggle fcb-kind">
            <div className={"st" + (kind === "line" ? " active" : "")} onClick={() => setKind("line")}>{ko ? "선" : "Line"}</div>
            <div className={"st" + (kind === "bar" ? " active" : "")} onClick={() => setKind("bar")}>{ko ? "막대" : "Bar"}</div>
          </div>
        </div>
        <div className="fcb-ctl">
          <span className="fcb-lab">{ko ? "기준" : "Basis"}</span>
          <div className="seg-toggle">
            <div className={"st" + (basis === "abs" ? " active" : "")} onClick={() => setBasis("abs")}>{ko ? "금액" : "Amount"}</div>
            {canPctRev && <div className={"st" + (basis === "pctRev" ? " active" : "")} onClick={() => setBasis("pctRev")}>{ko ? "매출 대비" : "% rev"}</div>}
            <div className={"st" + (basis === "index" ? " active" : "")} onClick={() => setBasis("index")}>{ko ? "지수" : "Index"}</div>
            <div className={"st" + (basis === "yoy" ? " active" : "")} onClick={() => setBasis("yoy")}>{ko ? "전년 대비" : "YoY"}</div>
          </div>
        </div>
      </div>
      {series.length ? (
        <div className="fcb-wrap" style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
          {[0, 0.5, 1].map((f, i) => <line key={i} x1={PX} x2={W - PX} y1={TOP + (H - TOP - BOT) * f} y2={TOP + (H - TOP - BOT) * f} stroke="var(--border)" />)}
          {hov != null && <line x1={x(hov)} x2={x(hov)} y1={TOP} y2={H - BOT} stroke="var(--border-strong)" strokeDasharray="3 3" />}
          {kind === "line" ? series.map(s => (
            <g key={s.k}>
              <path d={s.vals.map((v, i) => v == null ? null : `${s.vals.slice(0, i).every(x => x == null) ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).filter(Boolean).join(" ")} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinejoin="round" />
              {s.vals.map((v, i) => v == null ? null : <circle key={i} cx={x(i)} cy={y(v)} r={hov === i ? 4 : 2.5} fill={s.color} />)}
            </g>
          )) : years.map((yr, i) => {
            const slotW = (W - 2 * PX) / n, groupW = slotW * 0.62, bw = groupW / series.length;
            const gx = PX + slotW * i + (slotW - groupW) / 2;
            return <g key={i}>{series.map((s, si) => { const v = s.vals[i]; if (v == null) return null; const yy = y(v), zero = y(0); return <rect key={si} x={gx + si * bw} y={Math.min(yy, zero)} width={bw * 0.82} height={Math.abs(zero - yy) || 1} rx="1.5" fill={s.color} opacity={hov == null || hov === i ? 1 : 0.45} />; })}</g>;
          })}
          {years.map((yr, i) => { const slotW = (W - 2 * PX) / n; const cx = kind === "bar" ? PX + slotW * (i + 0.5) : x(i); return <rect key={"hz" + i} x={cx - slotW / 2} y={TOP} width={slotW} height={H - TOP - BOT} fill="transparent" style={{ pointerEvents: "all" }} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(h => h === i ? null : h)} />; })}
          {years.map((yr, i) => { const slotW = (W - 2 * PX) / n; const cx = kind === "bar" ? PX + slotW * (i + 0.5) : x(i); return <text key={i} x={cx} y={H - 9} textAnchor="middle" style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 10px var(--font-sans)" }}>{yr}</text>; })}
        </svg>
        {hov != null && <div className="fcb-tip" style={{ left: (x(hov) / W * 100) + "%" }}>
          <div className="fcb-tip-yr">{years[hov]}</div>
          {series.map(s => <div className="fcb-tip-row" key={s.k}><span className="fcb-tip-dot" style={{ background: s.color }} /><span className="fcb-tip-lab">{s.lab}</span><span className="fcb-tip-val mono">{s.vals[hov] == null ? "—" : isPctish ? (effBasis === "index" ? s.vals[hov].toFixed(0) : (s.vals[hov] >= 0 && effBasis === "yoy" ? "+" : "") + s.vals[hov].toFixed(1) + (effBasis === "index" ? "" : "%")) : fv(s.vals[hov])}</span></div>)}
        </div>}
        </div>
      ) : <div className="empty-tab">{ko ? "항목을 1개 이상 선택하세요" : "Pick at least one"}</div>}
    </div>
  );
}

/* ---- 재무 탭 — 손익계산서/재무상태표/현금흐름표 (K-IFRS 연결) ---- */
function FinancialsTab({ plan, t, lang, onPatchPlan }) {
  const fin = plan.fin;
  const [fwSel, setFwSel] = React.useState(null);
  const _fwIdF = fwSel === "none" ? null : (fwSel || plan.strategyId);
  const fwObj = (typeof STRATEGIES !== "undefined" ? (STRATEGIES.find(s => s.id === _fwIdF) || {}) : {});
  const fwModel2 = fwObj.model;
  const fwColor = fwObj.color || "var(--accent)";
  const FW_HILITE = { PER: ["op", "net", "gross"], DCF: ["rev", "fcf", "op"], PBR: ["equity", "assets", "net"], DDM: ["fcf", "net", "ocf"], EV: ["op", "fcf", "liab"], PSR: ["rev", "gross", "op"] };
  // hiliteLines 슬롯이 채워져 있으면 직접 지정(B), 없으면 모델 자동 매핑. (API 연동 시 B 편집 UI만 붙이면 됨)
  const fwHiliteLines = (fwObj.hiliteLines && fwObj.hiliteLines.length) ? fwObj.hiliteLines : (FW_HILITE[fwModel2] || null);
  const FW_WHY = { PER: lang === "ko" ? "이익의 크기와 질이 PER 평가의 근거라, 영업이익·순이익·마진을 핵심으로 봅니다." : "Earnings size & quality drive P/E.", DCF: lang === "ko" ? "미래 현금흐름 할인이 핵심이라, 매출 성장과 잉여현금(FCF) 창출력을 봅니다." : "Future cash flows drive DCF.", PBR: lang === "ko" ? "순자산 대비 가치가 기준이라, 자본·자산 규모와 이익을 봅니다." : "Net assets drive P/B.", DDM: lang === "ko" ? "배당 지속성이 핵심이라, 배당 재원인 FCF·영업현금·순이익을 봅니다." : "Dividend sustainability drives DDM.", EV: lang === "ko" ? "정상화 영업이익과 부채(순부채)가 EV 평가를 좌우합니다." : "Normalized EBIT & net debt drive EV.", PSR: lang === "ko" ? "적자·고성장 단계라 매출 규모·성장과 마진 잠재력을 봅니다." : "Revenue scale drives P/S." };
  const KEY_WHY = lang === "ko" ? { rev: "성장의 출발점", gross: "원가 경쟁력·가격결정력", op: "본업의 수익성", net: "최종 이익·EPS의 원천", assets: "사업 규모", liab: "부채 부담·안정성", equity: "순자산(청산) 가치", ocf: "실제 현금 창출력", fcf: "배당·재투자 재원" } : {};
  const hiSet = new Set(fwHiliteLines || []);
  const [stmt, setStmt] = React.useState("all");
  const [fmode, setFmode] = React.useState("table");
  const [barHov, setBarHov] = React.useState(null);
  React.useEffect(() => { if (!(fwHiliteLines && fwHiliteLines.length)) setStmt(s => s === "focus" ? "all" : s); }, [_fwIdF]);
  if (!fin) return <div className="empty-tab">{lang === "ko" ? "재무 데이터 없음" : "No financials"}</div>;
  const ko = lang === "ko";
  const isUs = plan.cur === "USD";
  const dispCur = toDispCur(1, plan.cur).cur;
  const unitLab = dispCur === "USD" ? "B" : "조";
  const fv = v => { if (v == null) return "—"; const d = toDispCur(v, plan.cur); const div = dispCur === "USD" ? 1e9 : 1e12; const x = d.v / div; const s = (Math.abs(x) >= 100 ? Math.round(x).toLocaleString() : x.toFixed(1)); return (x < 0 ? "(" + s.replace("-", "") + ")" : s) + unitLab; };
  const years = fin.is.map(r => r.y);
  const SUBTABS = [["all", ko ? "전체" : "All"], ["is", ko ? "손익계산서" : "Income"], ["bs", ko ? "재무상태표" : "Balance sheet"], ["cf", ko ? "현금흐름표" : "Cash flow"]];
  // 행 정의: {label, get, bold?, sub?(들여쓰기), pct?(매출대비)}
  const FIN_DEF = (() => { const D = {
    rev: { ko: ["기업이 제품·서비스를 팔아 벌어들인 총액이에요.", "수량 × 단가"], en: ["Total earned from selling goods/services.", "units × price"] },
    cogs: { ko: ["판매된 제품을 만드는 데 직접 든 원가예요(재료·인건비 등).", "매출 − 매출총이익"], en: ["Direct cost of goods sold (materials, labor).", "Revenue − Gross profit"] },
    gross: { ko: ["매출에서 원가를 뺀 1차 이익이에요. 제품 경쟁력·가격결정력을 보여줘요.", "매출 − 매출원가"], en: ["First-line profit after COGS — pricing power.", "Revenue − COGS"] },
    rnd: { ko: ["미래 제품·기술에 투자한 연구개발 비용이에요.", ""], en: ["Spend on future products and technology.", ""] },
    sga: { ko: ["판매·관리에 쓴 비용이에요(마케팅·임직원 등).", ""], en: ["Selling, general & admin overhead.", ""] },
    op: { ko: ["본업으로 번 이익이에요. 영업외 요소를 뺀 핵심 수익성이에요.", "매출총이익 − 판관비"], en: ["Profit from core operations.", "Gross − operating expenses"] },
    nonop: { ko: ["본업 외 손익이에요(이자·외환·지분법 등).", ""], en: ["Non-operating items (interest, FX).", ""] },
    pretax: { ko: ["세금을 내기 전 이익이에요.", "영업이익 ± 영업외손익"], en: ["Profit before income tax.", "Operating ± non-op"] },
    tax: { ko: ["법인세 비용이에요.", ""], en: ["Provision for income taxes.", ""] },
    net: { ko: ["모든 비용·세금을 뺀 최종 이익이에요. EPS·배당의 원천이에요.", "세전이익 − 법인세"], en: ["Bottom-line profit — source of EPS & dividends.", "Pretax − tax"] },
    curAssets: { ko: ["1년 안에 현금으로 바꿀 수 있는 자산이에요(현금·재고·매출채권).", ""], en: ["Assets convertible to cash within a year.", ""] },
    nonCurAssets: { ko: ["오래 보유하는 자산이에요(설비·토지·무형자산).", ""], en: ["Long-term assets (PP&E, intangibles).", ""] },
    assets: { ko: ["기업이 가진 모든 자산을 합한 거예요.", "부채 + 자본"], en: ["Everything the company owns.", "Liabilities + Equity"] },
    curLiab: { ko: ["1년 안에 갚아야 할 빚이에요(매입채무·단기차입).", ""], en: ["Debts due within a year.", ""] },
    nonCurLiab: { ko: ["1년 뒤에 갚는 장기 부채예요(회사채·장기차입).", ""], en: ["Long-term debt due beyond a year.", ""] },
    liab: { ko: ["기업이 갚아야 할 모든 빚을 합한 거예요.", "유동부채 + 비유동부채"], en: ["Everything the company owes.", "Current + long-term"] },
    equity: { ko: ["자산에서 부채를 뺀 주주 몫이에요. 순자산이에요.", "자산 − 부채"], en: ["Shareholders' stake — net worth.", "Assets − Liabilities"] },
    ocf: { ko: ["본업에서 실제로 들어온 현금이에요. 이익의 질을 보여줘요.", "순이익 + 감가상각 ± 운전자본"], en: ["Cash actually generated by operations.", "Net + D&A ± WC"] },
    da: { ko: ["설비·무형자산의 가치 감소분이에요(현금이 빠져나가지 않는 비용).", ""], en: ["Non-cash value decline of assets.", ""] },
    icf: { ko: ["투자로 오간 현금이에요(설비·지분 매입/매각).", ""], en: ["Cash from investing activities.", ""] },
    capex: { ko: ["설비·시설에 투자한 지출이에요. 미래 성장을 위한 비용이에요.", ""], en: ["Spend on property & equipment.", ""] },
    fcf_fin: { ko: ["차입·상환·배당·증자로 오간 현금이에요.", ""], en: ["Cash from financing activities.", ""] },
    fcf: { ko: ["영업현금에서 설비투자를 뺀 진짜 자유현금이에요. 배당·자사주 재원이에요.", "영업CF − CAPEX"], en: ["True free cash after capex.", "OCF − Capex"] },
  }; const DIR = { rev: 1, cogs: -1, gross: 1, rnd: 0, sga: -1, op: 1, nonop: 0, pretax: 1, tax: -1, net: 1, curAssets: 1, nonCurAssets: 0, assets: 1, curLiab: -1, nonCurLiab: -1, liab: -1, equity: 1, ocf: 1, da: 0, icf: 0, capex: 0, fcf_fin: 0, fcf: 1 }; const o = {}; for (const k in D) o[k] = { def: D[k][ko ? "ko" : "en"][0], f: D[k][ko ? "ko" : "en"][1], dir: DIR[k] === 1 ? (ko ? "높을수록 좋아요" : "Higher is better") : DIR[k] === -1 ? (ko ? "낮을수록 좋아요" : "Lower is better") : "" }; return o; })();
  const SPECS = {
    is: isUs ? [
      { k: "rev", label: ko ? "매출액" : "Net sales", g: r => r.rev, bold: true },
      { k: "cogs", label: ko ? "매출원가" : "Cost of revenue", g: r => -r.cogs, sub: true },
      { k: "gross", label: ko ? "매출총이익" : "Gross profit", g: r => r.gross, bold: true },
      { k: "rnd", label: ko ? "연구개발비" : "Research & development", g: r => -r.sga * 0.42, sub: true },
      { k: "sga", label: ko ? "판매·일반관리비" : "Selling, general & admin", g: r => -r.sga * 0.58, sub: true },
      { k: "op", label: ko ? "영업이익" : "Operating income", g: r => r.op, bold: true, accent: true },
      { k: "nonop", label: ko ? "기타수익·비용" : "Other income (expense), net", g: r => r.nonOp, sub: true },
      { k: "pretax", label: ko ? "법인세비용차감전순이익" : "Income before income taxes", g: r => r.pretax },
      { k: "tax", label: ko ? "법인세비용" : "Provision for income taxes", g: r => -r.tax, sub: true },
      { k: "net", label: ko ? "당기순이익" : "Net income", g: r => r.net, bold: true, accent: true },
    ] : [
      { k: "rev", label: ko ? "매출액" : "Revenue", g: r => r.rev, bold: true },
      { k: "cogs", label: ko ? "매출원가" : "Cost of sales", g: r => -r.cogs, sub: true },
      { k: "gross", label: ko ? "매출총이익" : "Gross profit", g: r => r.gross, bold: true },
      { k: "sga", label: ko ? "판매관리비" : "SG&A", g: r => -r.sga, sub: true },
      { k: "op", label: ko ? "영업이익" : "Operating income", g: r => r.op, bold: true, accent: true },
      { k: "nonop", label: ko ? "영업외손익" : "Non-op. items", g: r => r.nonOp, sub: true },
      { k: "pretax", label: ko ? "법인세차감전순이익" : "Pretax income", g: r => r.pretax },
      { k: "tax", label: ko ? "법인세비용" : "Income tax", g: r => -r.tax, sub: true },
      { k: "net", label: ko ? "당기순이익" : "Net income", g: r => r.net, bold: true, accent: true },
    ],
    bs: isUs ? [
      { k: "curAssets", label: ko ? "유동자산" : "Total current assets", g: r => r.curAssets, sub: true },
      { k: "nonCurAssets", label: ko ? "비유동자산" : "Total non-current assets", g: r => r.nonCurAssets, sub: true },
      { k: "assets", label: ko ? "자산총계" : "Total assets", g: r => r.assets, bold: true, accent: true },
      { k: "curLiab", label: ko ? "유동부채" : "Total current liabilities", g: r => r.curLiab, sub: true },
      { k: "nonCurLiab", label: ko ? "비유동부채" : "Long-term liabilities", g: r => r.nonCurLiab, sub: true },
      { k: "liab", label: ko ? "부채총계" : "Total liabilities", g: r => r.liab, bold: true },
      { k: "equity", label: ko ? "자본총계" : "Total stockholders' equity", g: r => r.equity, bold: true, accent: true },
    ] : [
      { k: "curAssets", label: ko ? "유동자산" : "Current assets", g: r => r.curAssets, sub: true },
      { k: "nonCurAssets", label: ko ? "비유동자산" : "Non-current assets", g: r => r.nonCurAssets, sub: true },
      { k: "assets", label: ko ? "자산총계" : "Total assets", g: r => r.assets, bold: true, accent: true },
      { k: "curLiab", label: ko ? "유동부채" : "Current liabilities", g: r => r.curLiab, sub: true },
      { k: "nonCurLiab", label: ko ? "비유동부채" : "Non-current liabilities", g: r => r.nonCurLiab, sub: true },
      { k: "liab", label: ko ? "부채총계" : "Total liabilities", g: r => r.liab, bold: true },
      { k: "equity", label: ko ? "자본총계" : "Total equity", g: r => r.equity, bold: true, accent: true },
    ],
    cf: isUs ? [
      { k: "ocf", label: ko ? "영업활동 현금흐름" : "Cash from operating activities", g: r => r.ocf, bold: true, accent: true },
      { k: "da", label: ko ? "감가상각비" : "Depreciation & amortization", g: r => r.da, sub: true },
      { k: "icf", label: ko ? "투자활동 현금흐름" : "Cash used in investing activities", g: r => r.icf, bold: true },
      { k: "capex", label: ko ? "자본적지출(CAPEX)" : "Capital expenditures", g: r => r.capex, sub: true },
      { k: "fcf_fin", label: ko ? "재무활동 현금흐름" : "Cash from financing activities", g: r => r.fcf_fin, bold: true },
      { k: "fcf", label: ko ? "잉여현금흐름(FCF)" : "Free cash flow", g: r => r.fcf, bold: true, accent: true },
    ] : [
      { k: "ocf", label: ko ? "영업활동 현금흐름" : "Operating CF", g: r => r.ocf, bold: true, accent: true },
      { k: "da", label: ko ? "감가상각비" : "D&A", g: r => r.da, sub: true },
      { k: "icf", label: ko ? "투자활동 현금흐름" : "Investing CF", g: r => r.icf, bold: true },
      { k: "capex", label: ko ? "CAPEX" : "Capex", g: r => r.capex, sub: true },
      { k: "fcf_fin", label: ko ? "재무활동 현금흐름" : "Financing CF", g: r => r.fcf_fin, bold: true },
      { k: "fcf", label: ko ? "잉여현금흐름(FCF)" : "Free cash flow", g: r => r.fcf, bold: true, accent: true },
    ],
  };
  const data = stmt === "is" ? fin.is : stmt === "bs" ? fin.bs : fin.cf;
  const specs = SPECS[stmt];
  // 손익 막대(매출/영업이익)는 IS에서만
  const maxRev = Math.max(...fin.is.map(r => r.rev));
  return (
    <div>
      <div className="fin-subbar">
        <div className="seg-toggle fin-subtabs">
          {SUBTABS.map(([k, lab]) => <div key={k} className={"st" + (stmt === k ? " active" : "")} onClick={() => setStmt(k)}>{k === "focus" && <span className="strat-dot" style={{ background: fwColor, width: 7, height: 7, marginRight: 5, display: "inline-block", verticalAlign: "middle" }} />}{lab}</div>)}
        </div>
        <LensPicker value={fwObj && fwObj.id ? fwObj.id : "none"} onPick={(v) => setFwSel(v)} lang={lang} width={200} />
        {fwObj.name && <span className="fin-term" style={{ marginLeft: 6 }}><span className="ind-q">?</span><span className="fin-tip"><b style={{ color: fwColor }}>{fwObj.name[lang]}</b><span className="fin-tip-def">{fwObj.desc ? fwObj.desc[lang] : ""}</span><span className="fin-tip-def" style={{ color: "var(--fg-2)" }}>{FW_WHY[fwModel2] || ""}</span><span className="fin-tip-f" style={{ color: fwColor }}>{ko ? "핵심 항목" : "Key lines"}: {(FW_HILITE[fwModel2] || []).map(kk => ({ rev: "매출", gross: "매출총이익", op: "영업이익", net: "순이익", assets: "자산", liab: "부채", equity: "자본", ocf: "영업CF", fcf: "FCF" }[kk] || kk)).join(" · ")}</span></span></span>}
        <span className="fcb-spacer" />
        <div className="seg-toggle modes">{[["cards", "layout-grid", ko ? "카드" : "Cards"], ["table", "table", ko ? "표" : "Table"], ["comp", "pie-chart", ko ? "구성" : "Composition"], ["chart", "trending-up", ko ? "차트" : "Chart"]].map(([k, ic, lab]) => <div key={k} className={"st mode-st" + (fmode === k ? " active" : "")} onClick={() => setFmode(k)} title={lab}><Lic name={ic} size={15} cls="icon-sm" color="currentColor" />{fmode === k && <span>{lab}</span>}</div>)}</div>
      </div>
      {(() => {
        const KLAB = { rev: ko ? "매출액" : "Revenue", gross: ko ? "매출총이익" : "Gross profit", op: ko ? "영업이익" : "Op. income", net: ko ? "순이익" : "Net income", assets: ko ? "자산총계" : "Assets", liab: ko ? "부채총계" : "Liabilities", equity: ko ? "자본총계" : "Equity", ocf: ko ? "영업CF" : "Operating CF", capex: ko ? "CAPEX" : "CapEx", fcf: ko ? "FCF" : "Free cash flow" };
        const KGET = { rev: r => r.rev, gross: r => r.gross, op: r => r.op, net: r => r.net, assets: r => r.assets, liab: r => r.liab, equity: r => r.equity, ocf: r => r.ocf, capex: r => Math.abs(r.capex), fcf: r => r.fcf };
        const SRC = { rev: "is", gross: "is", op: "is", net: "is", assets: "bs", liab: "bs", equity: "bs", ocf: "cf", capex: "cf", fcf: "cf" };
        const lensOn = !!(fwHiliteLines && fwHiliteLines.length);
        const keys = (lensOn ? fwHiliteLines : ["rev", "op", "net"]).filter(k => KGET[k]);
        if (!keys.length) return null;
        if (stmt !== "all") { if (!lensOn) return null; return (
          <div className="lens-strip" style={{ "--fw-c": fwColor }}>
            <span className="ls-title"><Lic name="scan-search" size={13} cls="icon-sm" color={fwColor} />{fwObj.name ? fwObj.name[lang] : (ko ? "관점" : "Lens")}</span>
            <span className="ls-sep" />
            {keys.map(k => { const arr = fin[SRC[k]]; const lv = KGET[k](arr[arr.length - 1]), pv = KGET[k](arr[arr.length - 2]); const yoy = pv ? (lv - pv) / Math.abs(pv) * 100 : null; return <span className="ls-item" key={k}>{KLAB[k]} <b>{fv(lv)}</b>{yoy != null && <span className={"ls-yoy " + (yoy >= 0 ? "pos" : "neg")}>{(yoy >= 0 ? "+" : "") + yoy.toFixed(0)}%</span>}</span>; })}
          </div>
        ); }
        return (
          <div className="fin-keycards" style={{ "--fw-c": fwColor }}>
            <div className="fin-keycards-cap"><Lic name="star" size={13} cls="icon-sm" color={fwColor} />{lensOn ? (fwObj.name ? (ko ? `${fwObj.name.ko} 핵심 항목` : `${fwObj.name.en} key lines`) : (ko ? "핵심 항목" : "Key lines")) : (ko ? "손익 헤드라인" : "Income highlights")}</div>
            <div className="fin-keycard-grid">
              {keys.map(k => { const arr = fin[SRC[k]]; const lv = KGET[k](arr[arr.length - 1]), pv = KGET[k](arr[arr.length - 2]); const yoy = pv ? (lv - pv) / Math.abs(pv) * 100 : null; const _d = (FIN_DEF[k] && FIN_DEF[k].dir) || ""; const dir = /높을|Higher/.test(_d) ? 1 : /낮을|Lower/.test(_d) ? -1 : 0; const sy = yoy == null ? null : dir * yoy; const g = yoy == null || dir === 0 ? "neutral" : sy >= 10 ? "good" : sy >= 0 ? "mid" : "bad"; const gl = { good: ko ? "우수" : "Good", mid: ko ? "보통" : "Fair", bad: ko ? "주의" : "Watch", neutral: "—" }; return (
                <div className="fin-keycard" key={k}>
                  <div className="fin-keycard-top"><span className="fin-keycard-lab fin-term">{KLAB[k]}<span className="ind-q">?</span>{FIN_DEF[k] && <span className="fin-tip"><b>{KLAB[k]}</b><span className="fin-tip-def">{FIN_DEF[k].def}{FIN_DEF[k].dir && <span className="fin-tip-dir"> {FIN_DEF[k].dir}</span>}</span>{lensOn && KEY_WHY[k] && <span className="fin-tip-def" style={{ color: fwColor }}>{fwObj.name ? fwObj.name[lang] + " 관점 — " : ""}{KEY_WHY[k]}{KEY_WHY[k] ? "(이)라 핵심으로 봅니다." : ""}</span>}{FIN_DEF[k].f && <span className="fin-tip-f">{FIN_DEF[k].f}</span>}</span>}</span><span className={"ind-grade ind-" + g}><span className="ind-dot" />{gl[g]}</span></div>
                  <div className="fin-keycard-val">{fv(lv)}</div>
                  {yoy != null && <div className={"fin-keycard-yoy " + (yoy >= 0 ? "pos" : "neg")}>{(yoy >= 0 ? "+" : "") + yoy.toFixed(0)}% YoY</div>}
                </div>
              ); })}
            </div>
          </div>
        );
      })()}
      {fmode === "chart" && <FinChartBuilder fin={fin} plan={plan} lang={lang} fv={fv} stmt={stmt} />}
      {stmt !== "builder" && fmode === "cards" && (() => {
        const LB = { rev: ko ? "매출액" : "Revenue", op: ko ? "영업이익" : "Op. income", net: ko ? "순이익" : "Net income", assets: ko ? "자산총계" : "Assets", liab: ko ? "부채총계" : "Liabilities", equity: ko ? "자본총계" : "Equity", ocf: ko ? "영업CF" : "Operating CF", fcf: ko ? "FCF" : "Free cash flow" };
        const SRC2 = { rev: fin.is.map(r => r.rev), op: fin.is.map(r => r.op), net: fin.is.map(r => r.net), assets: fin.bs.map(r => r.assets), liab: fin.bs.map(r => r.liab), equity: fin.bs.map(r => r.equity), ocf: fin.cf.map(r => r.ocf), fcf: fin.cf.map(r => r.fcf) };
        const byStmt = { all: Object.keys(LB), is: ["rev", "op", "net"], bs: ["assets", "liab", "equity"], cf: ["ocf", "fcf"] };
        const showKeys = byStmt[stmt] || Object.keys(LB);
        const spark = (arr) => { const v = arr.filter(x => x != null && isFinite(x)); if (v.length < 2) return null; const mn = Math.min(...v), mx = Math.max(...v), sp = (mx - mn) || 1; const pts = arr.map((x, i) => `${(i / (arr.length - 1) * 72).toFixed(1)},${(18 - (x - mn) / sp * 16 - 1).toFixed(1)}`).join(" "); const up = arr[arr.length - 1] >= arr[0]; return <svg width="72" height="18" style={{ display: "block" }}><polyline points={pts} fill="none" stroke={up ? "var(--pos)" : "var(--neg)"} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" /></svg>; };
        return (
          <div className="fin-sumcards">
            {showKeys.map(k => { const arr = SRC2[k]; const lv = arr[arr.length - 1], pv = arr[arr.length - 2]; const yoy = pv ? (lv - pv) / Math.abs(pv) * 100 : null; const d = FIN_DEF[k]; return (
              <div className="fin-sumcard" key={k}>
                <div className="fin-sumcard-top"><span className="fin-sumcard-lab fin-term">{LB[k]}{d && <React.Fragment><span className="ind-q">?</span><span className="fin-tip"><b>{LB[k]}</b><span className="fin-tip-def">{d.def}{d.dir && <span className="fin-tip-dir"> {d.dir}</span>}</span>{d.f && <span className="fin-tip-f">{d.f}</span>}</span></React.Fragment>}</span>{yoy != null && <span className={"fin-sumcard-yoy " + (yoy >= 0 ? "pos" : "neg")}>{(yoy >= 0 ? "+" : "") + yoy.toFixed(0)}%</span>}</div>
                <div className="fin-sumcard-val">{fv(lv)}</div>
                <div className="fin-sumcard-spark">{spark(arr)}<span className="fin-sumcard-yrs">{fin.is[0].y}–{fin.is[fin.is.length - 1].y}</span></div>
              </div>
            ); })}
          </div>
        );
      })()}
      {stmt !== "builder" && fmode === "table" && (() => {
        const COL = { soft: "color-mix(in srgb, var(--accent) 26%, transparent)", accent: "var(--accent)", pos: "var(--pos)", neg: "var(--neg)" };
        const SERIES = {
          is: { rows: fin.is, bars: [["rev", ko ? "매출액" : "Revenue", "soft"], ["op", ko ? "영업이익" : "Op. income", "accent"], ["net", ko ? "순이익" : "Net income", "pos"]], foot: r => ({ v: r.opm, lab: ko ? "영업이익률" : "Op. margin" }) },
          all: { rows: fin.is, bars: [["rev", ko ? "매출액" : "Revenue", "soft"], ["op", ko ? "영업이익" : "Op. income", "accent"], ["net", ko ? "순이익" : "Net income", "pos"]], foot: r => ({ v: r.net / r.rev * 100, lab: ko ? "순이익률" : "Net margin" }) },
          bs: { rows: fin.bs, bars: [["assets", ko ? "자산" : "Assets", "soft"], ["liab", ko ? "부채" : "Liab.", "neg"], ["equity", ko ? "자본" : "Equity", "accent"]], foot: r => ({ v: r.liab / r.equity * 100, lab: ko ? "부채비율" : "Debt ratio" }) },
          cf: { rows: fin.cf, bars: [["ocf", ko ? "영업CF" : "Operating", "accent"], ["icf", ko ? "투자CF" : "Investing", "neg"], ["fcf_fin", ko ? "재무CF" : "Financing", "soft"]], foot: r => ({ txt: fv(r.fcf), lab: ko ? "FCF" : "FCF", pos: r.fcf >= 0 }) },
        };
        const colOf = c => COL[c] || c;
        let cfg = SERIES[stmt];
        if (stmt === "focus") {
          const FLAB = { rev: ko ? "매출액" : "Revenue", gross: ko ? "매출총이익" : "Gross", op: ko ? "영업이익" : "Op.", net: ko ? "순이익" : "Net", assets: ko ? "자산" : "Assets", liab: ko ? "부채" : "Liab.", equity: ko ? "자본" : "Equity", ocf: ko ? "영업CF" : "OCF", fcf: "FCF", capex: ko ? "CAPEX" : "CapEx" };
          const FSRC = { rev: "is", gross: "is", op: "is", net: "is", assets: "bs", liab: "bs", equity: "bs", ocf: "cf", capex: "cf", fcf: "cf" };
          const FGET = { rev: r => r.rev, gross: r => r.gross, op: r => r.op, net: r => r.net, assets: r => r.assets, liab: r => r.liab, equity: r => r.equity, ocf: r => r.ocf, capex: r => Math.abs(r.capex), fcf: r => r.fcf };
          const flines = (fwHiliteLines || []).filter(k => FGET[k] && fin[FSRC[k]] && fin[FSRC[k]].length);
          const fcolors = ["var(--accent)", "#4CB782", "#F2994A", "#BB6BD9", "#E0A93E"];
          const frows = years.map((y, i) => { const o = { y }; flines.forEach(k => { const a = fin[FSRC[k]]; o[k] = (a && a[i]) ? FGET[k](a[i]) : null; }); return o; });
          cfg = { rows: frows, bars: flines.map((k, i) => [k, FLAB[k] || k, fcolors[i % fcolors.length]]), foot: null };
        }
        if (!cfg) return null;
        const maxV = Math.max(...cfg.rows.flatMap(r => cfg.bars.map(b => Math.abs(r[b[0]]))), 1);
        return (
          <div className="fin-chart">
            <div className="fin-legend">
              {cfg.bars.map(b => <span className="fin-leg" key={b[0]}><span className="fin-leg-sw" style={{ background: colOf(b[2]) }} />{b[1]}</span>)}
              {cfg.foot && <span className="fin-leg"><span className="fin-leg-sw fin-leg-line" />{cfg.foot(cfg.rows[0]).lab}</span>}
            </div>
            <div className="fin-bars">
              {cfg.rows.map((r, i) => {
                const ft = cfg.foot && cfg.foot(r);
                return (
                  <div className={"fin-barcol" + (barHov === i ? " hov" : "")} key={i} onMouseEnter={() => setBarHov(i)} onMouseLeave={() => setBarHov(h => h === i ? null : h)}>
                    <div className="fin-barwrap">
                      {cfg.bars.map(b => {
                        const val = r[b[0]];
                        return <div className="fin-bar" key={b[0]} style={{ height: Math.max(2, Math.abs(val) / maxV * 100) + "%", background: colOf(b[2]), width: 13 }} />;
                      })}
                    </div>
                    <div className="fin-barlab">{r.y}</div>
                    {ft && <div className={"fin-baropm " + ((ft.txt ? ft.pos : ft.v >= 0) ? "pos" : "neg")}>{ft.txt != null ? ft.txt : ft.v.toFixed(0) + "%"}</div>}
                    {barHov === i && (() => { const prev = i > 0 ? cfg.rows[i - 1] : null; const yoyOf = key => { if (!prev) return null; const c = r[key], p = prev[key]; if (p == null || p === 0) return null; return (c - p) / Math.abs(p) * 100; }; return (
                    <div className="fin-barpop">
                      <div className="fin-barpop-yr">{r.y}</div>
                      {cfg.bars.map(b => { const y = yoyOf(b[0]); return <div className="fin-barpop-row" key={b[0]}><span className="fin-barpop-dot" style={{ background: colOf(b[2]) }} /><span className="fin-barpop-lab">{b[1]}</span><span className="fin-barpop-val mono">{fv(r[b[0]])}</span><span className={"fin-barpop-yoy mono " + (y == null ? "" : y >= 0 ? "pos" : "neg")}>{y == null ? "—" : (y >= 0 ? "+" : "") + y.toFixed(0) + "%"}</span></div>; })}
                      {ft && (() => { const pf = (prev && cfg.foot) ? cfg.foot(prev) : null; const ppy = (ft.txt == null && pf && pf.v != null) ? (ft.v - pf.v) : null; return (
                        <div className="fin-barpop-row fin-barpop-foot"><span className="fin-barpop-dot fin-barpop-line" /><span className="fin-barpop-lab">{ft.lab}</span><span className="fin-barpop-val mono">{ft.txt != null ? ft.txt : (ft.v >= 0 ? "+" : "") + ft.v.toFixed(1) + "%"}</span><span className={"fin-barpop-yoy mono " + (ppy == null ? "" : ppy >= 0 ? "pos" : "neg")}>{ppy == null ? "—" : (ppy >= 0 ? "+" : "") + ppy.toFixed(1) + "%p"}</span></div>
                      ); })()}
                    </div>
                    ); })()}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      {stmt !== "builder" && fmode === "comp" && (() => {
        const COMP = {
          is: { rows: fin.is, parts: [["cogs", ko ? "매출원가" : "COGS", "var(--neg)", r => r.cogs], ["sga", ko ? "판관비" : "SG&A", "var(--r-base)", r => r.sga], ["net", ko ? "순이익" : "Net", "var(--pos)", r => Math.max(0, r.net)], ["other", ko ? "기타" : "Other", "var(--fg-4)", r => Math.max(0, r.rev - r.cogs - r.sga - Math.max(0, r.net))]], total: r => r.rev, totLab: ko ? "매출액" : "Revenue", cap: ko ? "매출 100% 구성" : "Revenue breakdown" },
          bs: { rows: fin.bs, parts: [["curLiab", ko ? "유동부채" : "Cur. liab", "var(--neg)", r => r.curLiab], ["nonCurLiab", ko ? "비유동부채" : "LT liab", "var(--r-base)", r => r.nonCurLiab], ["equity", ko ? "자본" : "Equity", "var(--accent)", r => r.equity]], total: r => r.assets, totLab: ko ? "자산총계" : "Total assets", cap: ko ? "자산 = 부채 + 자본 구성" : "Capital structure" },
          cf: { rows: fin.cf, parts: [["ocf", ko ? "영업CF" : "Operating", "var(--pos)", r => Math.abs(r.ocf)], ["icf", ko ? "투자CF" : "Investing", "var(--neg)", r => Math.abs(r.icf)], ["fcf_fin", ko ? "재무CF" : "Financing", "var(--r-base)", r => Math.abs(r.fcf_fin)]], total: r => Math.abs(r.ocf) + Math.abs(r.icf) + Math.abs(r.fcf_fin), totLab: ko ? "합계" : "Total", cap: ko ? "현금흐름 구성" : "Cash flow mix" } };
        const which = stmt === "all" ? ["is", "bs", "cf"] : [stmt];
        return <div className="fin-comp">{which.map(sk => { const c = COMP[sk]; return (
          <div className="fin-comp-block" key={sk}>
            <div className="fin-comp-cap">{c.cap}</div>
            <div className="fin-comp-rows">{c.rows.map((r, i) => { const tot = c.total(r) || 1; return (
              <div className="fin-comp-row" key={i}>
                <span className="fin-comp-yr">{r.y}</span>
                <div className="fin-comp-bar">{c.parts.map(p => { const v = p[3](r), w = v / tot * 100; if (w < 0.5) return null; return <span key={p[0]} className="fin-comp-seg" style={{ width: w + "%", background: p[2] }}>{w >= 9 ? Math.round(w) + "%" : ""}</span>; })}
                  <div className={"fin-comp-tip" + (i === 0 ? " fin-comp-tip--down" : "")}>
                    <div className="fin-comp-tip-yr">{r.y}</div>
                    {c.parts.map(p => { const v = p[3](r), w = v / tot * 100; return (
                      <div className="fin-comp-tip-row" key={p[0]}>
                        <span className="fin-comp-tip-dot" style={{ background: p[2] }} />
                        <span className="fin-comp-tip-lab">{p[1]}</span>
                        <span className="fin-comp-tip-pct">{w.toFixed(1)}%</span>
                        <span className="fin-comp-tip-val">{fv(v)}</span>
                      </div> ); })}
                    <div className="fin-comp-tip-row fin-comp-tip-tot">
                      <span />
                      <span className="fin-comp-tip-lab">{c.totLab}</span>
                      <span className="fin-comp-tip-pct">100%</span>
                      <span className="fin-comp-tip-val">{fv(c.total(r))}</span>
                    </div>
                  </div>
                </div>
              </div> ); })}</div>
            <div className="fin-comp-legend">{c.parts.map(p => <span className="gap-leg" key={p[0]}><span className="gap-leg-dot" style={{ background: p[2] }} />{p[1]}</span>)}</div>
          </div> ); })}</div>;
      })()}
      {stmt !== "builder" && fmode === "table" && <table className="fin-table">
        <thead><tr><th>{(() => { const std = plan.cur === "USD" ? "US-GAAP" : "K-IFRS"; return ko ? "단위: " + (dispCur === "USD" ? "$B" : "조원") + " · " + std + (plan.cur === "USD" ? "" : " 연결") : "Unit: " + (dispCur === "USD" ? "$B" : "tn KRW") + " · " + std; })()}</th>{years.map(y => <th key={y}>{y}</th>)}<th>YoY</th></tr></thead>
        <tbody>
          {(stmt === "all" || stmt === "focus" ? ["is", "bs", "cf"] : [stmt]).map(sk => {
            const arr = sk === "is" ? fin.is : sk === "bs" ? fin.bs : fin.cf;
            const secLab = { is: ko ? "손익계산서" : "Income statement", bs: ko ? "재무상태표" : "Balance sheet", cf: ko ? "현금흐름표" : "Cash flow" }[sk];
            const specsList = stmt === "focus" ? SPECS[sk].filter(sp => hiSet.has(sp.k)) : SPECS[sk];
            if (stmt === "focus" && !specsList.length) return null;
            return (
              <React.Fragment key={sk}>
                {(stmt === "all" || stmt === "focus") && (() => {
                  const meta = { is: { ic: "trending-up", c: "var(--accent)", d: ko ? "일정 기간의 매출·비용·이익이에요. 회사가 얼마나 벌었는지 보여줘요." : "Revenue, costs and profit over a period." }, bs: { ic: "layers", c: "#4C8DFF", d: ko ? "특정 시점의 자산·부채·자본이에요. 회사의 재무 상태(체력)를 보여줘요." : "Assets, liabilities and equity at a point in time." }, cf: { ic: "banknote", c: "var(--r-bull)", d: ko ? "실제로 들어오고 나간 현금이에요. 이익의 질과 현금 창출력을 보여줘요." : "Actual cash in and out — quality of earnings." } }[sk];
                  return <tr className="fin-section" style={{ "--secc": meta.c }}><td colSpan={years.length + 2}><span className="fin-sec-inner fin-term"><Lic name={meta.ic} size={14} cls="icon-sm" color={meta.c} /><span>{secLab}</span><span className="ind-q">?</span><span className="fin-tip"><b style={{ color: meta.c }}>{secLab}</b><span className="fin-tip-def">{meta.d}</span></span></span></td></tr>;
                })()}
                {specsList.map((sp, li) => {
                  const lv = sp.g(arr[arr.length - 1]), pv = sp.g(arr[arr.length - 2]);
                  const yoy = pv ? (lv - pv) / Math.abs(pv) * 100 : null;
                  return (
                    <tr key={sk + li} className={(sp.bold ? "fin-bold " : "") + (sp.sub ? "fin-sub " : "") + (hiSet.has(sp.k) ? "fin-hilite" : "")} style={hiSet.has(sp.k) ? { "--fw-c": fwColor } : null}>
                      <td className="fin-rowlab">{(() => { const d = FIN_DEF[sp.k]; return d ? <span className="fin-term">{sp.label}<span className="ind-q">?</span><span className="fin-tip"><b>{sp.label}</b><span className="fin-tip-def">{d.def}{d.dir && <span className="fin-tip-dir"> {d.dir}</span>}</span>{d.f && <span className="fin-tip-f">{d.f}</span>}</span></span> : sp.label; })()}{hiSet.has(sp.k) && fwObj.name && <span className="fin-fwtag fin-term" style={{ color: fwColor }}><span className="fin-fwtag-dot" style={{ background: fwColor }} />{fwObj.name[lang]}<span className="fin-tip"><b style={{ color: fwColor }}>{fwObj.name[lang]}</b><span className="fin-tip-def">{lang === "ko" ? `${fwObj.name.ko} 프레임워크가 이 항목을 핵심 지표로 주목합니다. ${(fwObj.desc ? fwObj.desc.ko : "")}` : `Key line for the ${fwObj.name.en} framework. ${(fwObj.desc ? fwObj.desc.en : "")}`}</span></span></span>}</td>
                      {arr.map((r, ci) => <td key={ci} className={"mono" + (sp.accent ? " fin-accent" : "")}>{fv(sp.g(r))}</td>)}
                      <td className={"mono " + (yoy == null ? "" : yoy >= 0 ? "pos" : "neg")}>{yoy == null ? "—" : (yoy >= 0 ? "+" : "") + yoy.toFixed(0) + "%"}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>}
    </div>
  );
}

/* ---- 투자지표 탭 — 분류별 카드 + 등급 ---- */
function IndicatorsTab({ plan, t, lang, onPatchPlan }) {
  const finRaw = plan.fin;
  const [imode, setImode] = React.useState("card");
  const [trend, setTrend] = React.useState(true);
  const [indCat, setIndCat] = React.useState("all");
  const [miniHov, setMiniHov] = React.useState(null);
  const [pinned, setPinned] = React.useState({});
  const [chartSel, setChartSel] = React.useState(null);
  const [chartBasis, setChartBasis] = React.useState("index");
  const [chartHov, setChartHov] = React.useState(null);
  const [fwSel, setFwSel] = React.useState(null);
  const fwId = fwSel === "none" ? null : (fwSel || plan.strategyId);
  const _fwObj = STRATEGIES.find(s => s.id === fwId) || {};
  const _mkt = plan.cur === "USD" ? "US" : "KR";
  const _mktTh = (_fwObj.marketTh && _fwObj.marketTh[_mkt]) || {};
  const _commonTh = _fwObj.thresholds || {};
  const _fwTh = {};
  Object.keys(_commonTh).forEach(k => { _fwTh[k] = _commonTh[k]; });
  Object.keys(_mktTh).forEach(k => { _fwTh[k] = { ..._commonTh[k], ..._mktTh[k] }; });
  const _gradeWith = (th, v) => { if (!th || v == null || !isFinite(v)) return "neutral"; const g = parseFloat(th.good), w = parseFloat(th.warn); if (isNaN(g) || isNaN(w)) return "neutral"; if (th.dir === "low") return v <= g ? "good" : v >= w ? "bad" : "mid"; return v >= g ? "good" : v <= w ? "bad" : "mid"; };
  const fin = (finRaw && finRaw.indicators) ? { ...finRaw, indicators: finRaw.indicators.map(m => _fwTh[m.key] ? { ...m, tone: _gradeWith(_fwTh[m.key], m.v) } : m) } : finRaw;
  const fwModel = (STRATEGIES.find(s => s.id === fwId) || {}).model;
  const MODEL_LENS = { PER: "quality", DCF: "growth", PBR: "value", DDM: "dividend", EV: "quality", PSR: "growth" };
  const lens = MODEL_LENS[fwModel] || null;
  React.useEffect(() => { setChartSel(null); setChartHov(null); setIndCat(c => (c === "focus" && !fwKeys.length) ? "all" : c); }, [fwId]);
  React.useEffect(() => { setChartSel(null); setChartHov(null); }, [indCat]);
  if (!fin) return <div className="empty-tab">{lang === "ko" ? "지표 데이터 없음" : "No indicators"}</div>;
  const ko = lang === "ko";
  // 이름 + 한 줄 정의 (No-AI 고정 사전)
  const DICT = (typeof KS_METRIC_DICT !== "undefined") ? KS_METRIC_DICT(ko) : {};
  const FORMULA = (typeof KS_METRIC_FORMULA !== "undefined") ? KS_METRIC_FORMULA : {};
  const GLAB = { good: ko ? "우수" : "Good", mid: ko ? "보통" : "Fair", bad: ko ? "주의" : "Watch", neutral: "—" };
  const dirTxt = m => { const th = (typeof IND_THRESH !== "undefined") ? IND_THRESH[m.key] : null; if (!th) return ""; return th.dir === "high" ? (ko ? " 높을수록 좋아요." : " Higher is better.") : (ko ? " 낮을수록 좋아요." : " Lower is better."); };
  const lvlTxt = m => { const th = (typeof IND_THRESH !== "undefined") ? IND_THRESH[m.key] : null; if (!th || m.v == null || !isFinite(m.v)) return ""; const hi = th.dir === "high"; if (m.tone === "mid") return ko ? "보통 수준이에요" : "average"; const isHighVal = m.tone === (hi ? "good" : "bad"); return isHighVal ? (ko ? "높은 편이에요" : "high") : (ko ? "낮은 편이에요" : "low"); };
  const CATS = [["value", ko ? "밸류에이션" : "Valuation"], ["profit", ko ? "수익성" : "Profitability"], ["growth", ko ? "성장성" : "Growth"], ["stability", ko ? "안정성" : "Stability"], ["dividend", ko ? "배당" : "Dividend"]];
  const CAT_DESC = ko ? { value: "주가가 이익·자산·매출에 비해 비싼지 싼지 봐요. 저평가·고평가를 판단하는 지표 묶음이에요.", profit: "매출과 자본으로 얼마나 효율적으로 이익을 내는지 봐요. 돈 버는 힘을 보여줘요.", growth: "매출·이익이 작년보다 얼마나 빠르게 늘고 있는지 봐요.", stability: "빚 부담과 단기 지급 능력을 봐요. 재무가 얼마나 안전한지 보여줘요.", dividend: "배당을 얼마나, 또 얼마나 꾸준히 주는지 봐요." } : { value: "Is the price cheap or rich vs earnings/assets/sales", profit: "How efficiently the firm turns sales & capital into profit", growth: "How fast sales and profit grow vs last year", stability: "Debt burden and short-term solvency (financial safety)", dividend: "How much and how steadily it pays dividends" };
  const catLabel = (cat, label) => <span className="fin-term">{label}<span className="ind-q">?</span><span className="fin-tip"><b>{label}</b><span className="fin-tip-def">{CAT_DESC[cat] || ""}</span></span></span>;
  const fmt = m => m.v == null || !isFinite(m.v) ? "—" : m.fmt === "x" ? m.v.toFixed(1) + (ko ? "배" : "×") : m.v.toFixed(1) + "%";
  // why-this-grade: the threshold band that produced the tone badge (data-driven from IND_THRESH; works for every metric)
  const gradeBand = m => {
    const th = (typeof IND_THRESH !== "undefined") ? IND_THRESH[m.key] : null;
    if (!th || m.v == null || !isFinite(m.v)) return null;
    const unit = m.fmt === "x" ? (ko ? "배" : "×") : "%";
    const goodTxt = (th.dir === "low" ? "≤" : "≥") + th.good + unit;
    const warnTxt = (th.dir === "low" ? "≥" : "≤") + th.warn + unit;
    const col = m.tone === "good" ? "var(--pos)" : m.tone === "bad" ? "var(--neg)" : "var(--r-base)";
    const zone = m.tone === "good" ? (ko ? "우수 구간" : "Good zone") : m.tone === "bad" ? (ko ? "주의 구간" : "Watch zone") : (ko ? "보통 구간" : "Fair zone");
    return <span className="fin-tip-grade"><span className="fin-tip-grade-now">{ko ? "현재 " : ""}<b>{fmt(m)}</b> · <b style={{ color: col }}>{zone}</b></span><span className="fin-tip-grade-sc"><span className="ftg-good">{ko ? "우수" : "Good"} {goodTxt}</span><span className="ftg-sep">·</span><span className="ftg-bad">{ko ? "주의" : "Watch"} {warnTxt}</span></span></span>;
  };
  // 투자 스타일 렌즈 — 누르면 그 관점 지표가 위로
  const LENSES = [["value", ko ? "가치" : "Value", ["PER", "PBR", "PSR", "PCR"]], ["growth", ko ? "성장" : "Growth", ["REVG", "OPG", "NPG", "PEG"]], ["dividend", ko ? "배당" : "Dividend", ["DIVY", "PAYOUT", "DIVG"]], ["quality", ko ? "퀄리티" : "Quality", ["ROE", "ROA", "OPM", "GPM"]]];
  const activeLens = LENSES.find(l => l[0] === lens);
  const lensItems = activeLens ? activeLens[2].map(k => fin.indicators.find(m => m.key === k)).filter(Boolean) : [];
  const card = (m, scope) => {
    const d = DICT[m.key] || [m.key, ""];
    const spark = trend ? metricSpark(m.key, scope, true) : null;
    const hk = (scope || "") + ":" + m.key, curRaw = (fin.is || []).length - 1;
    let pi = pinned[hk]; if (pi != null && pi === curRaw) pi = null;
    let dv = m.v, dt = m.tone, pinYear = null;
    if (pi != null) { const pv = indMetricAt(m.key, pi); if (pv != null && isFinite(pv)) { dv = pv; dt = (typeof gradeOf !== "undefined") ? gradeOf(m.key, pv) : m.tone; pinYear = (fin.is[pi] || {}).y; } }
    return (
      <div className="ind-card" key={m.key}>
        <div className="ind-card-top"><span className="ind-name fin-term">{d[0]}<span className="ind-q">?</span><span className="fin-tip"><b>{d[0]}</b><span className="fin-tip-def">{d[1]}<span className="fin-tip-dir">{dirTxt(m)}</span></span>{FORMULA[m.key] && <span className="fin-tip-f">{FORMULA[m.key]}</span>}{gradeBand(m)}{trendNote(m.key)}</span></span><span className="ind-card-tr">{pinYear != null && <span className="ind-pin" onClick={() => setPinned(pp => ({ ...pp, [hk]: undefined }))}>{pinYear}<span className="ind-pin-x">✕</span></span>}<span className={"ind-grade ind-" + dt}><span className="ind-dot" />{GLAB[dt]}</span></span></div>
        <div className={"ind-val ind-v-" + dt}>{fmt({ v: dv, fmt: m.fmt })}</div>
        {spark && <div className="ind-spark">{spark}</div>}
      </div>
    );
  };
  // 게이지: 값을 우수↔주의 구간 위 위치로
  const gauge = (m, scope) => {
    const d = DICT[m.key] || [m.key, ""];
    const th = (typeof IND_THRESH !== "undefined") ? IND_THRESH[m.key] : null;
    let pct = 50;
    if (th && m.v != null && isFinite(m.v)) {
      const lo = Math.min(th.good, th.warn), hi = Math.max(th.good, th.warn), span = (hi - lo) || 1;
      let p = (m.v - lo) / span; p = Math.max(-0.25, Math.min(1.25, p));
      pct = th.dir === "low" ? (1 - (p + 0.25) / 1.5) * 100 : ((p + 0.25) / 1.5) * 100;
      pct = Math.max(3, Math.min(97, pct));
    }
    const col = m.tone === "good" ? "var(--pos)" : m.tone === "bad" ? "var(--neg)" : "var(--r-base)";
    const spark = trend ? metricSpark(m.key, scope) : null;
    const unit = m.fmt === "x" ? (ko ? "배" : "×") : "%";
    let interp = "";
    if (th) {
      const goodTxt = (th.dir === "low" ? "≤" : "≥") + th.good + unit, warnTxt = (th.dir === "low" ? "≥" : "≤") + th.warn + unit;
      const gword = m.tone === "good" ? (ko ? "우수 구간" : "good zone") : m.tone === "bad" ? (ko ? "주의 구간" : "watch zone") : (ko ? "보통 구간" : "fair zone");
      interp = ko ? `현재 ${fmt(m)} — ${gword}. 우수 ${goodTxt} · 주의 ${warnTxt} 기준.` : `${fmt(m)} — ${gword}. Good ${goodTxt} · Watch ${warnTxt}.`;
    }
    return (
      <div className="ind-gauge" key={m.key}>
        <div className="ind-g-top"><span className="ind-name fin-term">{d[0]}<span className="ind-q">?</span><span className="fin-tip"><b>{d[0]}</b><span className="fin-tip-def">{d[1]}<span className="fin-tip-dir">{dirTxt(m)}</span></span>{FORMULA[m.key] && <span className="fin-tip-f">{FORMULA[m.key]}</span>}{gradeBand(m)}{trendNote(m.key)}</span></span><span className={"ind-grade ind-" + m.tone} style={{ marginLeft: "auto" }}><span className="ind-dot" />{GLAB[m.tone]}</span><span className="ind-g-val" style={{ marginLeft: 8 }}>{fmt(m)}</span></div>
        <div className="ind-g-track ind-g-hov"><div className="ind-g-mark" style={{ left: pct + "%", background: col }} />{interp && <span className="fin-tip" style={{ left: pct + "%", transform: "translateX(-50%)" }}><b style={{ color: col }}>{d[0]} · {GLAB[m.tone]}</b><span className="fin-tip-def">{interp}</span><span className="fin-tip-def" style={{ color: "var(--fg-4)" }}>{d[1]}</span></span>}</div>
        <div className="ind-g-scale"><span>{ko ? "주의" : "Watch"}</span><span>{ko ? "우수" : "Good"}</span></div>
        {spark && <div className="ind-spark">{spark}</div>}
      </div>
    );
  };
  // 히트맵 셀
  const heat = m => {
    const d = DICT[m.key] || [m.key, ""];
    const col = m.tone === "good" ? "var(--pos)" : m.tone === "bad" ? "var(--neg)" : m.tone === "mid" ? "var(--r-base)" : "var(--fg-4)";
    return (
      <div className="ind-heat fin-term" key={m.key} style={{ background: "color-mix(in srgb, " + col + " 18%, transparent)", borderColor: "color-mix(in srgb, " + col + " 40%, transparent)" }}>
        <div className="ind-heat-top"><span className="ind-heat-k">{d[0]}</span><span className="ind-heat-g" style={{ color: col }}><span className="ind-dot" />{GLAB[m.tone]}</span></div><span className="ind-heat-v">{fmt(m)}</span>
        <span className="fin-tip"><b>{d[0]}</b><span className="fin-tip-def">{d[1]}<span className="fin-tip-dir">{dirTxt(m)}</span></span>{FORMULA[m.key] && <span className="fin-tip-f">{FORMULA[m.key]}</span>}{gradeBand(m)}{trendNote(m.key)}</span>
      </div>
    );
  };
  const renderItems = (items, scope) => imode === "gauge" ? <div className="ind-gauge-grid">{items.map(m => gauge(m, scope))}</div> : imode === "heat" ? <div className="ind-heat-grid">{items.map(heat)}</div> : <div className="ind-grid">{items.map(m => card(m, scope))}</div>;
  // 미니 막대 (5년 추세) — 지표 색 + 최근값 강조 + 막대 호버(연도·값)
  function metricSpark(key, scope, pinnable) {
    const pts = (fin.is || []).map((r, i) => ({ y: r.y, v: indMetricAt(key, i), i })).filter(p => p.v != null && isFinite(p.v));
    if (pts.length < 2) return null;
    const series = pts.map(p => p.v);
    const max = Math.max(...series), min = Math.min(...series), span = (max - min) || 1;
    const W = 64, H = 22, n = series.length, gap = 2, bw = (W - gap * (n - 1)) / n;
    const mm = fin.indicators.find(x => x.key === key) || {};
    const col = mm.tone === "good" ? "var(--pos)" : mm.tone === "bad" ? "var(--neg)" : mm.tone === "mid" ? "var(--r-base)" : "var(--accent)";
    const gcol = v => { const t = (typeof gradeOf !== "undefined") ? gradeOf(key, v) : "neutral"; return t === "good" ? "var(--pos)" : t === "bad" ? "var(--neg)" : t === "mid" ? "var(--r-base)" : "var(--fg-4)"; };
    const th2 = (typeof IND_THRESH !== "undefined") ? IND_THRESH[key] : null;
    const dirHint = th2 ? (th2.dir === "low" ? (ko ? "낮을수록 좋아요" : "Lower is better") : (ko ? "높을수록 좋아요" : "Higher is better")) : null;
    const unit = mm.fmt === "x" ? (ko ? "\ubc30" : "\u00d7") : "%";
    const hk = (scope || "") + ":" + key, hov = miniHov && miniHov.k === hk ? miniHov.i : null;
    const pinI = (pinnable && pinned[hk] != null && pinned[hk] !== ((fin.is || []).length - 1)) ? pinned[hk] : null;
    const activeF = pinI != null ? pts.findIndex(p => p.i === pinI) : (n - 1);
    const dname = (DICT[key] || [key])[0];
    let tipEl = null;
    if (hov != null && pts[hov]) {
      const p = pts[hov], gtone = (typeof gradeOf !== "undefined") ? gradeOf(key, p.v) : "neutral";
      const prev = hov > 0 ? pts[hov - 1].v : null, yoy = (prev != null && prev !== 0) ? (p.v - prev) / Math.abs(prev) * 100 : null;
      let bd = null;
      if (["PER", "PBR", "PSR", "PCR"].indexOf(key) >= 0) {
        const fis = fin.is[p.i], fbs = (fin.bs || [])[p.i], fcf = (fin.cf || [])[p.i];
        if (fis) {
          const sh = (plan.sharesOut || 1) * 1e6, ph = plan.priceHistory || [];
          const pxv = ph.length ? ((ph[Math.min(p.i, ph.length - 1)] || {}).v || plan.currentPrice) : plan.currentPrice;
          let den = null, dl = "";
          if (key === "PER") { den = fis.net / sh; dl = "EPS"; }
          else if (key === "PBR") { den = fbs ? fbs.equity / sh : null; dl = "BPS"; }
          else if (key === "PSR") { den = fis.rev / sh; dl = "SPS"; }
          else { den = fcf ? fcf.ocf / sh : null; dl = "CFPS"; }
          if (den != null && isFinite(den)) bd = { pxv: pxv, dl: dl, den: den };
        }
      }
      tipEl = (
        <div className="ind-spark-tip">
          <div className="ist-yr">{p.y}</div>
          <div className="ist-main"><span className="ist-name">{dname}</span><span className="ist-val" style={{ color: gcol(p.v) }}>{p.v.toFixed(1)}{unit}</span></div>
          <div className="ist-rows">
            {yoy != null && <div className="ist-row"><span className="ist-lab">{ko ? "전년대비" : "YoY"}</span><span className="ist-chg">{(yoy >= 0 ? "▲ +" : "▼ ") + yoy.toFixed(0)}%</span></div>}
            {bd && <div className="ist-row"><span className="ist-lab">{ko ? "주가" : "Price"}</span><span className="ist-num">{fmtMoney(bd.pxv, plan.cur)}</span></div>}
            {bd && <div className="ist-row"><span className="ist-lab">{bd.dl}</span><span className="ist-num">{fmtMoney(bd.den, plan.cur)}</span></div>}
            <div className="ist-row"><span className="ist-lab">{ko ? "등급" : "Grade"}</span><span className={"ist-grade ind-" + gtone}><span className="ind-dot" />{GLAB[gtone]}</span></div>
            {dirHint && <div className="ist-row"><span className="ist-lab">{ko ? "방향" : "Goal"}</span><span style={{ font: "var(--fw-medium) 11px var(--font-sans)", color: "var(--fg-3)" }}>{dirHint}</span></div>}
          </div>
        </div>
      );
    }
    return (
      <div className="ind-spark-wrap">
        <svg width={W} height={H} style={{ display: "block" }}>
          {series.map((v, i) => { const h = 3 + (v - min) / span * (H - 4); const act = i === activeF; return <rect key={i} x={(i * (bw + gap)).toFixed(1)} y={(H - h).toFixed(1)} width={bw.toFixed(1)} height={h.toFixed(1)} rx="1" fill={gcol(v)} opacity={hov == null ? (act ? 1 : 0.5) : (hov === i ? 1 : 0.25)} stroke={pinI != null && act ? "var(--fg)" : "none"} strokeWidth={pinI != null && act ? 1.4 : 0} />; })}
          {pts.map((p, i) => <rect key={"h" + i} x={(i * (bw + gap) - gap / 2).toFixed(1)} y="0" width={(bw + gap).toFixed(1)} height={H} fill="transparent" style={{ pointerEvents: "all", cursor: pinnable ? "pointer" : "default" }} onMouseEnter={() => setMiniHov({ k: hk, i })} onMouseLeave={() => setMiniHov(h => h && h.k === hk && h.i === i ? null : h)} onClick={pinnable ? (() => setPinned(pp => ({ ...pp, [hk]: pp[hk] === p.i ? undefined : p.i }))) : undefined} />)}
        </svg>
        {tipEl}
      </div>
    );
  }
  function indMetricAt(key, i) {
    const is = fin.is[i], bs = fin.bs[i], cf = fin.cf[i]; if (!is) return null;
    const shares = (plan.sharesOut || 1) * 1e6;
    const ph = plan.priceHistory || [];
    const px = ph.length ? (ph[Math.min(i, ph.length - 1)] || {}).v || plan.currentPrice : plan.currentPrice;
    const eps = is.net / shares, bps = bs ? bs.equity / shares : null, sps = is.rev / shares, cfps = cf ? cf.ocf / shares : null;
    switch (key) {
      case "OPM": return is.opm; case "NPM": return is.net / is.rev * 100; case "GPM": return is.gross / is.rev * 100;
      case "ROE": return bs && bs.equity ? is.net / bs.equity * 100 : null;
      case "ROA": return bs && bs.assets ? is.net / bs.assets * 100 : null;
      case "DEBT": return bs && bs.equity ? bs.liab / bs.equity * 100 : null;
      case "CURR": return bs && bs.curLiab ? bs.curAssets / bs.curLiab * 100 : null;
      case "PER": return eps > 0 ? px / eps : null;
      case "PBR": return bps > 0 ? px / bps : null;
      case "PSR": return sps > 0 ? px / sps : null;
      case "PCR": return cfps > 0 ? px / cfps : null;
      case "EVEB": { const ebitda = is.op * 1.18; return ebitda > 0 ? (px * shares + (bs ? bs.liab * 0.4 : 0)) / ebitda : null; }
      case "PEG": { if (!(eps > 0)) return null; const g = indMetricAt("REVG", i); return (g != null && g > 0) ? (px / eps) / g : null; }
      case "REVG": return i > 0 && fin.is[i - 1].rev ? (is.rev - fin.is[i - 1].rev) / fin.is[i - 1].rev * 100 : null;
      case "OPG": return i > 0 && fin.is[i - 1].op ? (is.op - fin.is[i - 1].op) / Math.abs(fin.is[i - 1].op) * 100 : null;
      case "NPG": return i > 0 && fin.is[i - 1].net ? (is.net - fin.is[i - 1].net) / Math.abs(fin.is[i - 1].net) * 100 : null;
      default: return null;
    }
  }
  // 공통 툴팁 + 5년 시계열
  const tip = (m, d) => <span className="fin-tip"><b>{d[0]}</b><span className="fin-tip-def">{d[1]}<span className="fin-tip-dir">{dirTxt(m)}</span></span>{FORMULA[m.key] && <span className="fin-tip-f">{FORMULA[m.key]}</span>}{gradeBand(m)}{trendNote(m.key)}</span>;
  const indSeries = (key) => (fin.is || []).map((r, i) => ({ y: r.y, v: indMetricAt(key, i) })).filter(p => p.v != null && isFinite(p.v));
  // 추세 해석: 최근 5년 방향(증가/감소/유지) + 변화폭 + 방향이 유리한지
  const trendNote = (key) => {
    const ps = (fin.is || []).map((r, i) => indMetricAt(key, i)).filter(v => v != null && isFinite(v));
    if (ps.length < 2) return null;
    const first = ps[0], last = ps[ps.length - 1], chg = last - first;
    const pct = first !== 0 ? chg / Math.abs(first) * 100 : (chg > 0 ? 100 : chg < 0 ? -100 : 0);
    let up = 0, dn = 0; for (let i = 1; i < ps.length; i++) { const dd = ps[i] - ps[i - 1]; if (dd > 1e-9) up++; else if (dd < -1e-9) dn++; }
    const steps = ps.length - 1, steady = up === steps || dn === steps, absPct = Math.abs(pct);
    const dir = absPct < 4 ? 0 : (chg > 0 ? 1 : -1);
    const th = (typeof IND_THRESH !== "undefined") ? IND_THRESH[key] : null, lowBetter = th && th.dir === "low";
    let word;
    if (dir === 0) word = ko ? "\ucd5c\uadfc 5\ub144 \uac70\uc758 \ubcc0\ub3d9 \uc5c6\uc774 \ube44\uc2b7\ud55c \uc218\uc900" : "broadly flat over the last 5y";
    else { const udw = dir > 0 ? (ko ? "\ub298\uc5b4\ub098\ub294" : "rising") : (ko ? "\uc904\uc5b4\ub4dc\ub294" : "falling"); const pace = steady ? (ko ? "\uafb8\uc900\ud788 " : "steadily ") : (ko ? "\uc804\ubc18\uc801\uc73c\ub85c " : ""); word = ko ? ("\ucd5c\uadfc 5\ub144 " + pace + udw + " \ucd94\uc138") : (pace + udw + " over 5y"); }
    let fav = ""; if (dir !== 0 && th) { const good = (dir > 0 && !lowBetter) || (dir < 0 && lowBetter); fav = ko ? (good ? " \u00b7 \ubc29\ud5a5\uc740 \uae0d\uc815\uc801" : " \u00b7 \ubc29\ud5a5\uc740 \ubd80\ub2f4") : (good ? " \u00b7 favorable" : " \u00b7 a headwind"); }
    const pctTxt = dir === 0 ? "" : (" (" + (pct > 0 ? "+" : "") + pct.toFixed(0) + "%)");
    return <span className="fin-tip-trend">{word}{pctTxt}{fav}</span>;
  };
  const grouped = CATS.map(([cat, label]) => ({ cat, label, items: fin.indicators.filter(m => m.cat === cat) })).filter(g => g.items.length);
  // 현재 프레임워크 + 핵심 지표 (gradeFocus → 실제 지표 키)
  const fwObj = STRATEGIES.find(s => s.id === fwId) || {};
  const fwColor = fwObj.color || "var(--accent)";
  const fwKeys = (fwObj.gradeFocus || []).filter(k => DICT[k] && fin.indicators.some(m => m.key === k));
  const PALETTE = ["var(--accent)", "#4CB782", "#F2994A", "#BB6BD9", "#E0A93E", "#2BB3A3", "#EB5757", "#4C8DFF"];
  // ---- 프레임워크 핵심 지표 카드 (모든 뷰 상단) ----
  const keyCards = () => {
    if (!fwKeys.length) return null;
    return (
      <div className="fin-keycards" style={{ "--fw-c": fwColor }}>
        <div className="fin-keycards-cap"><Lic name="star" size={13} cls="icon-sm" color={fwColor} />{fwObj.name ? (ko ? `${fwObj.name.ko} 핵심 지표` : `${fwObj.name.en} key metrics`) : (ko ? "핵심 지표" : "Key metrics")}</div>
        <div className="fin-keycard-grid">
          {fwKeys.map(k => { const m = fin.indicators.find(x => x.key === k); const d = DICT[k] || [k, ""]; const s = indSeries(k); const lv = s.length ? s[s.length - 1].v : null, pv = s.length > 1 ? s[s.length - 2].v : null; const chg = (lv != null && pv != null) ? lv - pv : null; const unit = m.fmt === "x" ? (ko ? "배" : "×") : "%p"; return (
            <div className="fin-keycard" key={k}>
              <div className="fin-keycard-top"><span className="fin-keycard-lab fin-term">{d[0]}<span className="ind-q">?</span>{tip(m, d)}</span><span className={"ind-grade ind-" + m.tone}><span className="ind-dot" />{GLAB[m.tone]}</span></div>
              <div className="fin-keycard-val">{fmt(m)}</div>
              {chg != null && <div className={"fin-keycard-yoy " + (chg >= 0 ? "pos" : "neg")}>{(chg >= 0 ? "+" : "") + chg.toFixed(1) + unit + " " + (ko ? "전년" : "YoY")}</div>}
            </div>
          ); })}
        </div>
      </div>
    );
  };
  // ---- 1C: 슬림 렌즈 스트립 — 카테고리 scope에서 관점 핵심지표를 한 줄로 (전체엔 keyCards 히어로) ----
  const lensStrip = () => {
    if (!fwKeys.length) return null;
    return (
      <div className="lens-strip" style={{ "--fw-c": fwColor }}>
        <span className="ls-title"><Lic name="scan-search" size={13} cls="icon-sm" color={fwColor} />{fwObj.name ? fwObj.name[lang] : (ko ? "관점" : "Lens")}</span>
        <span className="ls-sep" />
        {fwKeys.map(k => { const m = fin.indicators.find(x => x.key === k); if (!m) return null; const d = DICT[k] || [k, ""]; return (
          <span className="ls-item fin-term" key={k}>{d[0]} <b>{fmt(m)}</b> <span className={"ind-grade ind-" + m.tone}><span className="ind-dot" />{GLAB[m.tone]}</span>{tip(m, d)}</span>
        ); })}
      </div>
    );
  };
  // ---- 다계열 시계열 차트 (지수 rebase 또는 실제값) — 단일 선택 시 등급 구간 음영 ----
  const renderIndChart = (selKeys, opts) => {
    opts = opts || {}; const compact = !!opts.compact, interactive = !compact;
    const single = selKeys.length === 1;
    const W = 760, H = compact ? 152 : 256, padL = 46, padR = 14, padT = 14, padB = 26;
    const iw = W - padL - padR, ih = H - padT - padB;
    const years = (fin.is || []).map(r => r.y), n = years.length;
    const ser = selKeys.map((k, si) => { const m = fin.indicators.find(x => x.key === k) || {}; return { k, lab: (DICT[k] || [k])[0], color: PALETTE[si % PALETTE.length], raw: (fin.is || []).map((r, i) => indMetricAt(k, i)), fmtx: m.fmt, tone: m.tone }; });
    const units = new Set(ser.map(s => s.fmtx === "x" ? "x" : "pct"));
    const useIndex = !single && (chartBasis === "index" || units.size > 1);
    ser.forEach(s => { const fv0 = s.raw.find(v => v != null && isFinite(v)); const base = (fv0 != null && fv0 !== 0) ? fv0 : 1; s.vals = s.raw.map(v => v == null || !isFinite(v) ? null : useIndex ? v / base * 100 : v); });
    const all = ser.flatMap(s => s.vals).filter(v => v != null);
    const th = single ? ((typeof IND_THRESH !== "undefined") ? IND_THRESH[selKeys[0]] : null) : null;
    // 다지표일 때 이상치(폭증/폭락 지표)가 축을 망가뜨리지 않게 5~95 퍼센타일로 범위 산출
    const sortedAll = all.slice().sort((a, b) => a - b);
    const pctl = q => { if (!sortedAll.length) return 0; const idx = (sortedAll.length - 1) * q; const l = Math.floor(idx), h2 = Math.ceil(idx); return sortedAll[l] + (sortedAll[h2] - sortedAll[l]) * (idx - l); };
    const robust = !single && ser.length > 3;
    let lo = all.length ? (robust ? pctl(0.05) : Math.min(...all)) : 0, hi = all.length ? (robust ? pctl(0.95) : Math.max(...all)) : 1;
    if (th) { lo = Math.min(lo, th.good, th.warn); hi = Math.max(hi, th.good, th.warn); }
    if (useIndex) { lo = Math.min(lo, 100); hi = Math.max(hi, 100); }
    if (hi - lo < 1e-6) { hi += 1; lo -= 1; }
    const padv = (hi - lo) * 0.14 || Math.abs(hi) * 0.14 || 1; lo -= padv; hi += padv;
    const span = (hi - lo) || 1;
    const X = i => padL + (n <= 1 ? iw / 2 : i / (n - 1) * iw);
    const Y = v => padT + (1 - (v - lo) / span) * ih;
    const Yc = v => Math.max(padT, Math.min(padT + ih, Y(v)));  // 축 밖 이상치는 가장자리로 클램프(선·점은 계속 보이게)
    const outOfRange = v => v != null && (Y(v) < padT - 0.5 || Y(v) > padT + ih + 0.5);
    let zones = [];
    if (th) { const yg = Math.max(padT, Math.min(padT + ih, Y(th.good))), yw = Math.max(padT, Math.min(padT + ih, Y(th.warn))); if (th.dir === "high") zones = [{ y: padT, h: yg - padT, c: "var(--pos)" }, { y: yw, h: padT + ih - yw, c: "var(--neg)" }]; else zones = [{ y: yg, h: padT + ih - yg, c: "var(--pos)" }, { y: padT, h: yw - padT, c: "var(--neg)" }]; zones = zones.filter(z => z.h > 0.5); }
    const grid = [0, 0.5, 1].map(f => ({ v: lo + (hi - lo) * (1 - f), y: padT + f * ih }));
    const axFmt = v => useIndex ? v.toFixed(0) : (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));
    return (
      <div className="ind-chart-svgwrap">
        <svg className="ind-chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: H }}>
          {zones.map((z, i) => <rect key={"z" + i} x={padL} y={z.y} width={iw} height={z.h} fill={z.c} opacity="0.07" />)}
          {grid.map((g, i) => <g key={"g" + i}>
            <line x1={padL} x2={W - padR} y1={g.y} y2={g.y} stroke="var(--border)" strokeWidth="1" />
            <text x={padL - 7} y={g.y + 3.5} textAnchor="end" fill="var(--fg-4)" style={{ font: "var(--fw-medium) 9.5px var(--font-mono)" }}>{axFmt(g.v)}</text>
          </g>)}
          {useIndex && Y(100) > padT && Y(100) < padT + ih && <line x1={padL} x2={W - padR} y1={Y(100)} y2={Y(100)} stroke="var(--border-strong)" strokeDasharray="3 3" />}
          {ser.map(s => <g key={s.k}>
            <path d={s.vals.map((v, i) => v == null ? null : `${s.vals.slice(0, i).every(x => x == null) ? "M" : "L"}${X(i).toFixed(1)} ${Yc(v).toFixed(1)}`).filter(Boolean).join(" ")} fill="none" stroke={s.color} strokeWidth={single ? 2.2 : 2} strokeLinejoin="round" strokeLinecap="round" opacity={robust ? 0.92 : 1} />
            {s.vals.map((v, i) => v == null ? null : <circle key={i} cx={X(i)} cy={Yc(v)} r={(interactive && chartHov === i) ? 3.8 : (ser.length > 8 ? 2 : 2.6)} fill={outOfRange(v) ? "var(--bg-app)" : s.color} stroke={s.color} strokeWidth={outOfRange(v) ? 1.4 : 0} />)}
          </g>)}
          {years.map((yr, i) => <text key={"x" + i} x={X(i)} y={H - 8} textAnchor="middle" fill="var(--fg-4)" style={{ font: "var(--fw-medium) 9.5px var(--font-mono)" }}>{("" + yr).slice(-2)}</text>)}
          {interactive && chartHov != null && <line x1={X(chartHov)} x2={X(chartHov)} y1={padT} y2={padT + ih} stroke="var(--border-strong)" strokeDasharray="3 3" />}
          {interactive && years.map((yr, i) => <rect key={"hz" + i} x={X(i) - iw / (2 * (n - 1 || 1))} y={padT} width={iw / (n - 1 || 1)} height={ih} fill="transparent" style={{ pointerEvents: "all" }} onMouseEnter={() => setChartHov(i)} onMouseLeave={() => setChartHov(h => h === i ? null : h)} />)}
        </svg>
        {interactive && chartHov != null && (() => { const frac = (n <= 1 ? 0.5 : chartHov / (n - 1)); const tx = frac < 0.18 ? "-8%" : frac > 0.82 ? "-92%" : "-50%"; const cols = ser.length > 14 ? 3 : ser.length > 7 ? 2 : 1; return (
        <div className={"fcb-tip cols" + cols} style={{ left: (X(chartHov) / W * 100) + "%", transform: "translateX(" + tx + ")" }}>
          <div className="fcb-tip-yr">{years[chartHov]}</div>
          <div className="fcb-tip-rows">{ser.map(s => <div className="fcb-tip-row" key={s.k}><span className="fcb-tip-dot" style={{ background: s.color }} /><span className="fcb-tip-lab">{s.lab}</span><span className="fcb-tip-val mono">{s.vals[chartHov] == null ? "—" : useIndex ? s.vals[chartHov].toFixed(0) : s.vals[chartHov].toFixed(1) + (s.fmtx === "x" ? (ko ? "배" : "×") : "%")}</span></div>)}</div>
        </div>
        ); })()}
      </div>
    );
  };
  // 같은 단위 영역: 연도별 묶음 막대 (실제값, 0 기준) + 연도 호버 툴팁
  const renderIndBars = (selKeys, opts) => {
    opts = opts || {}; const idx = !!opts.index;
    const W = 760, H = 178, padL = 44, padR = 12, padT = 14, padB = 24;
    const iw = W - padL - padR, ih = H - padT - padB;
    const years = (fin.is || []).map(r => r.y), n = years.length || 1;
    const ser = selKeys.map((k, si) => { const m = fin.indicators.find(x => x.key === k) || {}; const real = (fin.is || []).map((r, i) => indMetricAt(k, i)); const base = real.find(v => v != null && isFinite(v) && v !== 0); const raw = (idx && base) ? real.map(v => (v == null || !isFinite(v)) ? null : v / base * 100) : real; return { k, lab: (DICT[k] || [k])[0], color: PALETTE[si % PALETTE.length], raw, real, x: m.fmt === "x" }; });
    const all = ser.flatMap(s => s.raw).filter(v => v != null && isFinite(v));
    let hi = all.length ? Math.max(...all, 0) : 1, lo = all.length ? Math.min(...all, 0) : 0;
    if (hi - lo < 1e-6) hi += 1;
    hi += (hi - lo) * 0.12;
    const span = (hi - lo) || 1;
    const Y = v => padT + (1 - (v - lo) / span) * ih, y0 = Y(0);
    const gw = iw / n, ip = gw * 0.16, bw = (gw - ip * 2) / ser.length;
    const grid = [0, 0.5, 1].map(f => ({ v: lo + (hi - lo) * (1 - f), y: padT + f * ih }));
    const ax = v => Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1);
    const unit = s => s.x ? (ko ? "\ubc30" : "\u00d7") : "%";
    return (
      <div className="ind-chart-svgwrap">
        <svg className="ind-chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: H }}>
          {grid.map((g, i) => <g key={"g" + i}><line x1={padL} x2={W - padR} y1={g.y} y2={g.y} stroke="var(--border)" strokeWidth="1" /><text x={padL - 6} y={g.y + 3.5} textAnchor="end" fill="var(--fg-4)" style={{ font: "var(--fw-medium) 9.5px var(--font-mono)" }}>{ax(g.v)}</text></g>)}
          {lo < 0 && <line x1={padL} x2={W - padR} y1={y0} y2={y0} stroke="var(--border-strong)" />}
          {years.map((yr, gi) => { const gx = padL + gi * gw + ip; return <g key={gi}>{ser.map((s, si) => { const v = s.raw[gi]; if (v == null || !isFinite(v)) return null; const yv = Y(v), top = Math.min(yv, y0), hgt = Math.max(0.8, Math.abs(yv - y0)); return <rect key={s.k} x={(gx + si * bw + 0.8).toFixed(1)} y={top.toFixed(1)} width={Math.max(1, bw - 1.6).toFixed(1)} height={hgt.toFixed(1)} rx="1.5" fill={s.color} opacity={chartHov == null || chartHov === gi ? 1 : 0.32} />; })}</g>; })}
          {years.map((yr, i) => <text key={"x" + i} x={padL + i * gw + gw / 2} y={H - 7} textAnchor="middle" fill="var(--fg-4)" style={{ font: "var(--fw-medium) 9.5px var(--font-mono)" }}>{("" + yr).slice(-2)}</text>)}
          {years.map((yr, i) => <rect key={"hz" + i} x={padL + i * gw} y={padT} width={gw} height={ih} fill="transparent" style={{ pointerEvents: "all" }} onMouseEnter={() => setChartHov(i)} onMouseLeave={() => setChartHov(h => h === i ? null : h)} />)}
        </svg>
        {chartHov != null && (() => { const frac = (n <= 1 ? 0.5 : chartHov / (n - 1)); const tx = frac < 0.2 ? "-6%" : frac > 0.8 ? "-94%" : "-50%"; const cx = padL + chartHov * gw + gw / 2; const cols = ser.length > 6 ? 2 : 1; return (
          <div className={"fcb-tip cols" + cols} style={{ left: (cx / W * 100) + "%", transform: "translateX(" + tx + ")" }}>
            <div className="fcb-tip-yr">{years[chartHov]}</div>
            <div className="fcb-tip-rows">{ser.map(s => { const v = s.real[chartHov]; return <div className="fcb-tip-row" key={s.k}><span className="fcb-tip-dot" style={{ background: s.color }} /><span className="fcb-tip-lab">{s.lab}</span><span className="fcb-tip-val mono">{v == null || !isFinite(v) ? "\u2014" : v.toFixed(1) + unit(s)}</span></div>; })}</div>
          </div>
        ); })()}
      </div>
    );
  };
  // 혼합 단위 영역: 지표별 미니 막대 (각자 축) + 막대 호버 툴팁
  const renderIndPanel = (key) => {
    const m = fin.indicators.find(x => x.key === key) || {};
    const d = DICT[key] || [key, ""];
    const series = (fin.is || []).map((r, i) => ({ y: r.y, v: indMetricAt(key, i) }));
    const vals = series.map(s => s.v).filter(v => v != null && isFinite(v));
    if (vals.length < 2) return null;
    const col = m.tone === "good" ? "var(--pos)" : m.tone === "bad" ? "var(--neg)" : m.tone === "mid" ? "var(--r-base)" : "var(--accent)";
    const unit = m.fmt === "x" ? (ko ? "\ubc30" : "\u00d7") : "%";
    const W = 150, H = 60, padT = 8, padB = 14, ih = H - padT - padB, n = series.length;
    let hi = Math.max(...vals, 0), lo = Math.min(...vals, 0);
    if (hi - lo < 1e-6) hi += 1;
    hi += (hi - lo) * 0.14;
    const span = (hi - lo) || 1;
    const Y = v => padT + (1 - (v - lo) / span) * ih, y0 = Y(0);
    const gw = W / n, bw = gw * 0.56;
    const hov = miniHov && miniHov.k === key ? miniHov.i : null;
    return (
      <div className="ind-panel" key={key}>
        <div className="ind-panel-top"><span className="ind-panel-name">{d[0]}</span><span className="ind-panel-val" style={{ color: col }}>{fmt(m)}</span></div>
        <div className="ind-panel-chart">
          <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            {lo < 0 && <line x1="0" x2={W} y1={y0} y2={y0} stroke="var(--border)" />}
            {series.map((s, i) => { if (s.v == null || !isFinite(s.v)) return null; const yv = Y(s.v), top = Math.min(yv, y0), hgt = Math.max(1, Math.abs(yv - y0)); const x = i * gw + (gw - bw) / 2; return <rect key={i} x={x.toFixed(1)} y={top.toFixed(1)} width={bw.toFixed(1)} height={hgt.toFixed(1)} rx="1.5" fill={col} opacity={hov == null ? (i === n - 1 ? 1 : 0.4) : (hov === i ? 1 : 0.22)} />; })}
            {series.map((s, i) => <rect key={"h" + i} x={(i * gw).toFixed(1)} y="0" width={gw.toFixed(1)} height={H} fill="transparent" style={{ pointerEvents: "all" }} onMouseEnter={() => setMiniHov({ k: key, i })} onMouseLeave={() => setMiniHov(h => h && h.k === key && h.i === i ? null : h)} />)}
          </svg>
          {hov != null && series[hov].v != null && isFinite(series[hov].v) && <div className="ind-mini-tip" style={{ left: ((hov + 0.5) / n * 100) + "%" }}><b>{series[hov].y}</b>{series[hov].v.toFixed(1)}{unit}</div>}
        </div>
      </div>
    );
  };
  // 영역 묶음차트: 단위 같으면 묶음 막대, 섞이면 지표별 미니 막대
  const catKeysOf = (cat) => fin.indicators.filter(m => m.cat === cat).map(m => m.key).filter(k => indSeries(k).length >= 2);
  const sectionChart = (keys, capColor, capText) => {
    if (!keys || keys.length < 1) return null;
    const valid = keys.filter(k => indSeries(k).length >= 2);
    if (!valid.length) return null;
    const sameUnit = new Set(valid.map(k => ((fin.indicators.find(m => m.key === k) || {}).fmt === "x" ? "x" : "pct"))).size <= 1;
    const baseYr = (fin.is && fin.is[0]) ? fin.is[0].y : "";
    return (
      <div className="ind-tbl-chart ind-sec-chart">
        <div className="ind-tbl-chart-cap"><Lic name="trending-up" size={13} cls="icon-sm" color={capColor} />{capText}{!sameUnit && <span className="ind-tbl-chart-sub">{ko ? `\uc9c0\uc218 ${baseYr}=100 \u00b7 \ud638\ubc84 \uc2dc \uc2e4\uc81c\uac12` : `index ${baseYr}=100 \u00b7 hover = actual`}</span>}</div>
        <div className="fin-legend ind-tbl-legend">{valid.map((k, si) => <span className="fin-leg" key={k}><span className="fin-leg-sw" style={{ background: PALETTE[si % PALETTE.length] }} />{(DICT[k] || [k])[0]}</span>)}</div>
        {renderIndBars(valid, { index: !sameUnit })}
      </div>
    );
  };
  // ---- 표 뷰: 재무제표식 연도 컸럼 테이블 (지표 × 연도 + YoY), 등급은 셀 튼트 ----
  const tableView = () => {
    const years = fin.is.map(r => r.y);
    const lastI = years.length - 1;
    const FW = new Set(fwKeys);
    const META = { value: { ic: "gauge", c: "var(--accent)" }, profit: { ic: "trending-up", c: "var(--pos)" }, growth: { ic: "activity", c: "#BB6BD9" }, stability: { ic: "layers", c: "#4C8DFF" }, dividend: { ic: "banknote", c: "#E0A93E" } };
    const tintFor = tn => tn === "good" ? "var(--pos)" : tn === "bad" ? "var(--neg)" : null;
    const groups = indCat === "focus" ? [{ cat: "_focus", label: (fwObj.name ? (ko ? `${fwObj.name.ko} 핵심 지표` : `${fwObj.name.en} key metrics`) : (ko ? "핵심 지표" : "Key metrics")), items: fwKeys.map(k => fin.indicators.find(m => m.key === k)).filter(Boolean) }] : grouped.filter(g => indCat === "all" || g.cat === indCat);
    return (
      <div className="ind-table-wrap">
        {(() => {
          if (indCat === "all") return null;
          if (indCat === "focus") return null;
          const lab = (CATS.find(c => c[0] === indCat) || ["", ""])[1];
          return sectionChart(catKeysOf(indCat), "var(--accent)", lab + (ko ? " \ucd94\uc138" : " trend"));
        })()}
        <table className="fin-table ind-fintbl">
          <thead><tr><th>{ko ? "단위: 지표별 (배·%)" : "Unit: per metric"}</th>{years.map(y => <th key={y}>{y}</th>)}<th>YoY</th></tr></thead>
          <tbody>
            {groups.map(({ cat, label, items }) => { const meta = cat === "_focus" ? { ic: "star", c: fwColor } : (META[cat] || { ic: "activity", c: "var(--accent)" }); return (
              <React.Fragment key={cat}>
                <tr className="fin-section" style={{ "--secc": meta.c }}><td colSpan={years.length + 2}><span className="fin-sec-inner fin-term"><Lic name={meta.ic} size={14} cls="icon-sm" color={meta.c} /><span>{label}</span><span className="ind-q">?</span><span className="fin-tip"><b style={{ color: meta.c }}>{label}</b><span className="fin-tip-def">{CAT_DESC[cat] || ""}</span></span></span></td></tr>
                {items.map(m => { const d = DICT[m.key] || [m.key, ""]; const isFw = FW.has(m.key); const isPct = m.fmt !== "x"; const lv = indMetricAt(m.key, lastI), pv = indMetricAt(m.key, lastI - 1); let yoy = "—"; if (lv != null && isFinite(lv) && pv != null && isFinite(pv)) { const dd = lv - pv; yoy = (dd >= 0 ? "+" : "") + dd.toFixed(1) + (isPct ? "%p" : (ko ? "배" : "×")); } return (
                  <tr key={m.key} className={isFw ? "fin-bold fin-hilite" : ""} style={isFw ? { "--fw-c": fwColor } : null}>
                    <td className="fin-rowlab"><span className="fin-term">{d[0]}<span className="ind-q">?</span>{tip(m, d)}</span>{isFw && fwObj.name && <span className="fin-fwtag fin-term" style={{ color: fwColor }}><span className="fin-fwtag-dot" style={{ background: fwColor }} />{fwObj.name[lang]}<span className="fin-tip"><b style={{ color: fwColor }}>{fwObj.name[lang]}</b><span className="fin-tip-def">{ko ? `${fwObj.name.ko} 프레임워크가 이 지표를 핵심으로 봅니다.` : `Key metric for the ${fwObj.name.en} framework.`}</span></span></span>}</td>
                    {years.map((y, ci) => { const v = indMetricAt(m.key, ci); const tnt = (v != null && isFinite(v)) ? tintFor(gradeOf(m.key, v)) : null; return <td key={ci} className="mono" style={{ color: tnt || undefined, fontWeight: ci === lastI ? 600 : undefined }}>{fmt({ v: v, fmt: m.fmt })}</td>; })}
                    <td className="mono" style={{ color: "var(--fg-3)" }}>{yoy}</td>
                  </tr>
                ); })}
              </React.Fragment>
            ); })}
          </tbody>
        </table>
      </div>
    );
  };
  // ---- 차트 뷰: 다지표 동시 비교 빌더 (프레임워크 핵심 지표 기본 선택) ----
  const chartView = () => {
    const fallbackKeys = fwKeys.length ? fwKeys : [(fin.indicators[0] || {}).key].filter(Boolean);
    const catDefault = indCat !== "all" ? catKeysOf(indCat) : fallbackKeys;
    const sel = (chartSel && chartSel.length) ? chartSel : (catDefault.length ? catDefault : fallbackKeys);
    const single = sel.length === 1;
    const toggle = k => setChartSel(prev => { const cur = prev && prev.length ? prev : sel; return cur.includes(k) ? cur.filter(x => x !== k) : [...cur, k]; });
    const units = new Set(sel.map(k => (fin.indicators.find(m => m.key === k) || {}).fmt === "x" ? "x" : "pct"));
    const indexed = chartBasis === "index" || units.size > 1;
    return (
      <div className="ind-chart-card">
        <div className="fcb-bar">
          <span className="fcb-lab">{ko ? "지표" : "Metrics"}</span>
          {fin.indicators.map(it => { const on = sel.includes(it.key); const col = PALETTE[sel.indexOf(it.key) % PALETTE.length]; const dd = DICT[it.key] || [it.key, ""]; const gcol = it.tone === "good" ? "var(--pos)" : it.tone === "bad" ? "var(--neg)" : it.tone === "mid" ? "var(--r-base)" : "var(--fg-4)"; return (
            <span key={it.key} className={"fcb-chip" + (on ? " on" : "")} onClick={() => toggle(it.key)} style={on ? { borderColor: col, color: col } : null}><span className="fcb-dot" style={{ background: on ? col : gcol }} />{dd[0]}</span>
          ); })}
          <span className="fcb-spacer" />
          {!single && <React.Fragment><span className="fcb-lab">{ko ? "기준" : "Basis"}</span>
          <div className="seg-toggle">
            <div className={"st" + (indexed ? " active" : "")} onClick={() => setChartBasis("index")}>{ko ? "지수" : "Index"}</div>
            <div className={"st" + (!indexed ? " active" : "")} onClick={() => units.size <= 1 && setChartBasis("real")} style={units.size > 1 ? { opacity: 0.4, cursor: "not-allowed" } : null}>{ko ? "실제값" : "Real"}</div>
          </div></React.Fragment>}
        </div>
        {single && (() => { const m = fin.indicators.find(x => x.key === sel[0]) || {}; const d = DICT[sel[0]] || [sel[0], ""]; return (
          <div className="ind-chart-single">
            <div className="ind-chart-head"><span className="ind-chart-name">{d[0]}</span><span className="ind-chart-cur">{fmt(m)}</span><span className={"ind-grade ind-" + (m.tone || "neutral")}><span className="ind-dot" />{GLAB[m.tone || "neutral"]}</span></div>
            <div className="ind-chart-def">{d[1]}{dirTxt(m)}</div>
          </div>
        ); })()}
        {sel.length ? renderIndChart(sel, {}) : <div className="empty-tab">{ko ? "지표를 1개 이상 선택하세요" : "Pick at least one"}</div>}
        <div className="ind-chart-foot">
          {single ? <React.Fragment><span className="ind-chart-unit">{ko ? "단위" : "Unit"}: {(fin.indicators.find(x => x.key === sel[0]) || {}).fmt === "x" ? (ko ? "배" : "×") : "%"}</span>{FORMULA[sel[0]] && <span className="ind-chart-formula">{FORMULA[sel[0]]}</span>}</React.Fragment>
            : <span className="ind-chart-unit">{indexed ? (ko ? "지수 = 각 지표의 첫 해를 100으로 놓은 상대 추세 (단위 다른 지표 비교용)" : "Index — each metric rebased to 100 at its first year") + (sel.length > 3 ? (ko ? " · 범위를 크게 벗어난 값은 위/아래 끝에 빈 점으로 표시" : " · out-of-range points pinned to edges") : "") : (ko ? "실제값 (동일 단위)" : "Real values")}</span>}
        </div>
      </div>
    );
  };
  // scope×mode 격자 (재무제표 탭과 동일): 카테고리 seg(전체+분류) + 렌즈 드롭다운(관점=직교축, seg에 없음) + 모드토글. 렌즈가 전체 scope에서 핵심지표 헤더(keyCards) 구동.
  const lensDropdown = (
    <React.Fragment>
      <LensPicker value={fwObj && fwObj.id ? fwObj.id : "none"} onPick={(v) => setFwSel(v)} lang={lang} width={200} />
      {fwObj.name && <span className="fin-term" style={{ marginLeft: 6 }}><span className="ind-q">?</span><span className="fin-tip"><b style={{ color: fwColor }}>{fwObj.name[lang]}</b><span className="fin-tip-def">{fwObj.desc ? fwObj.desc[lang] : ""}</span><span className="fin-tip-def" style={{ color: "var(--fg-2)" }}>{({ PER: ko ? "이익의 크기와 질이 평가 근거라 수익성 지표를 봅니다." : "", DCF: ko ? "미래 현금흐름이 핵심이라 성장·현금 지표를 봅니다." : "", PBR: ko ? "순자산 대비 가치가 기준이라 자본효율 지표를 봅니다." : "", DDM: ko ? "배당 지속성이 핵심이라 배당·현금 지표를 봅니다." : "", EV: ko ? "자본구조 중립 평가라 마진·부채 지표를 봅니다." : "", PSR: ko ? "고성장 단계라 성장·마진 지표를 봅니다." : "" }[fwObj.model]) || ""}</span><span className="fin-tip-f" style={{ color: fwColor }}>{ko ? "핵심 지표" : "Key metrics"}: {(fwObj.gradeFocus || []).join(" · ")}</span></span></span>}
    </React.Fragment>
  );
  return (
    <div className="ind-wrap">
      <div className="fin-subbar ind-subbar">
        <div className="seg-toggle fin-subtabs ind-catseg">
          {[["all", ko ? "전체" : "All"]].concat(CATS.filter(([c]) => fin.indicators.some(m => m.cat === c))).map(([k, lab]) => <div key={k} className={"st" + (indCat === k ? " active" : "")} onClick={() => setIndCat(k)}>{({ value: ko ? "밸류" : "Value", profit: ko ? "수익" : "Profit", growth: ko ? "성장" : "Growth", stability: ko ? "안정" : "Stable", dividend: ko ? "배당" : "Div" })[k] || lab}</div>)}
        </div>
        {lensDropdown}
        <span className="fcb-spacer" />
        <div className="seg-toggle modes">
          {[["card", "layout-grid", ko ? "카드" : "Cards"], ["gauge", "gauge", ko ? "게이지" : "Gauge"], ["heat", "grid-3x3", ko ? "히트맵" : "Heatmap"], ["table", "table", ko ? "표" : "Table"], ["chart", "trending-up", ko ? "차트" : "Chart"]].map(([k, ic, lab]) => <div key={k} className={"st mode-st" + (imode === k ? " active" : "")} onClick={() => setImode(k)} title={lab}><Lic name={ic} size={15} cls="icon-sm" color="currentColor" />{imode === k && <span>{lab}</span>}</div>)}
        </div>
        {(imode === "card" || imode === "gauge") && <span className={"ind-trend-ico" + (trend ? " on" : "")} onClick={() => setTrend(v => !v)} title={ko ? "추세선 표시" : "Trend"}><Lic name="activity" size={15} cls="icon-sm" color="currentColor" /></span>}
      </div>
      {indCat === "all" ? keyCards() : lensStrip()}
      {imode === "table" ? tableView()
        : imode === "chart" ? chartView()
        : <React.Fragment>
            {CATS.map(([cat, label]) => {
              if (indCat !== "all" && cat !== indCat) return null;
              const items = fin.indicators.filter(m => m.cat === cat);
              if (!items.length) return null;
              return (
                <div key={cat} className="ind-group">
                  <div className="ind-cat">{catLabel(cat, label)}</div>
                  {renderItems(items, cat)}
                </div>
              );
            })}
          </React.Fragment>}
    </div>
  );
}

/* ---- 멀티플 밴드 차트 — 과거 PER/PBR/PSR/EV 밴드에 가격 오버레이 ---- */
function MultipleBandChart({ plan, lang, defaultBand }) {
  const fin = plan.fin, ko = lang === "ko";
  const [bandType, setBandType] = React.useState(defaultBand || "PER");
  const [src, setSrc] = React.useState("hist");      // hist | custom
  const [cm, setCm] = React.useState(null);          // 유저 입력 {low,mid,high}
  const [hov, setHov] = React.useState(null);
  React.useEffect(() => { setCm(null); setSrc("hist"); }, [bandType, plan.id]);
  const shares = (plan.sharesOut || 1) * 1e6;
  if (!fin) return <div className="empty-tab">{ko ? "재무 데이터 없음" : "No data"}</div>;
  // 연도별 주당 지표
  const divyNow = (fin.indicators.find(x => x.key === "DIVY") || {}).v || 0;
  const dpsNow = plan.currentPrice * divyNow / 100;
  const netLast = fin.is[fin.is.length - 1].net || 1;
  const payout = dpsNow * shares / netLast;          // 배당성향(현재 기준)
  const metricSeries = fin.is.map((r, i) => {
    if (bandType === "PBR") return fin.bs[i].equity / shares;
    if (bandType === "PSR") return r.rev / shares;
    if (bandType === "EV") return (r.op * 1.25) / shares;
    if (bandType === "DIVY") return Math.max(1e-9, (r.net * payout) / shares); // 주당배당 (P/D 밴드 = PER과 동일 수학)
    return r.net / shares; // PER
  });
  const isDivy = bandType === "DIVY";
  const years = fin.is.map(r => r.y);
  const n = years.length;
  // 연도별 주가(현재가 기준 priceHistory 5점 리샘플)
  const ph = plan.priceHistory || [];
  const pxYear = years.map((_, i) => { const idx = Math.min(ph.length - 1, Math.round(i / (n - 1) * (ph.length - 1))); return i === n - 1 ? plan.currentPrice : (ph[idx] ? ph[idx].v : plan.currentPrice); });
  // 과거 멀티플 → 밴드(저/평균/고)
  const mults = metricSeries.map((m, i) => m > 0 ? pxYear[i] / m : null).filter(v => v && isFinite(v));
  if (mults.length < 2) return <div className="empty-tab">{ko ? "이 지표는 밴드를 만들 수 없습니다" : "No band for this metric"}</div>;
  const sorted = mults.slice().sort((a, b) => a - b);
  // 퍼센타일 밴드 (min/max 이상치 왜곡 방지): 25/50/75
  const pct = q => { const idx = (sorted.length - 1) * q; const lo = Math.floor(idx), hi = Math.ceil(idx); return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo); };
  const histLow = pct(0.25), histHigh = pct(0.75), histMid = pct(0.5);
  const custom = src === "custom";
  const histLowYield = 100 / histHigh, histMidYield = 100 / histMid, histHighYield = 100 / histLow;
  const cmv = cm || (isDivy ? { low: +histLowYield.toFixed(2), mid: +histMidYield.toFixed(2), high: +histHighYield.toFixed(2) } : { low: +histLow.toFixed(1), mid: +histMid.toFixed(1), high: +histHigh.toFixed(1) });
  let low, mid, high;
  if (custom && isDivy) { low = 100 / Math.max(0.01, +cmv.high || 0.01); mid = 100 / Math.max(0.01, +cmv.mid || 0.01); high = 100 / Math.max(0.01, +cmv.low || 0.01); }
  else if (custom) { low = +cmv.low || 0; mid = +cmv.mid || 0; high = +cmv.high || 0; }
  else { low = histLow; mid = histMid; high = histHigh; }
  const metricNow = metricSeries[n - 1];
  const curMult = metricNow > 0 ? plan.currentPrice / metricNow : null;
  // 현재 배수가 과거 분포의 몇 % 지점인가
  const curPctile = curMult ? Math.round(sorted.filter(v => v <= curMult).length / sorted.length * 100) : null;
  const belowCount = curMult ? sorted.filter(v => v <= curMult).length : 0; // 현재 이하였던 연도 수
  const bandAt = (i, mlt) => metricSeries[i] * mlt;
  const all = [];
  metricSeries.forEach((m, i) => { all.push(bandAt(i, low), bandAt(i, high), pxYear[i]); });
  const max = Math.max(...all) * 1.05, min = Math.min(...all) * 0.95;
  const W = 760, H = 230, PX = 10, TOP = 22, BOT = 30;
  const x = i => PX + (W - 2 * PX) * i / (n - 1);
  const y = v => TOP + (H - TOP - BOT) * (1 - (v - min) / ((max - min) || 1));
  const linePath = mlt => metricSeries.map((m, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(bandAt(i, mlt)).toFixed(1)}`).join(" ");
  const pxPath = pxYear.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const backLow = metricSeries.map((m, i) => ({ X: x(i), Y: y(bandAt(i, low)) })).reverse().map(p => `L${p.X.toFixed(1)} ${p.Y.toFixed(1)}`).join(" ");
  const fairNow = metricNow * mid;
  const fairUp = (fairNow - plan.currentPrice) / plan.currentPrice * 100;
  const unit = isDivy ? "%" : "×";
  // DIVY는 P/D비율을 수익률(%)로 환산해 표시 (낮은 가격 = 높은 수익률)
  const dMult = m => isDivy ? (100 / m) : m;
  const curDisp = curMult ? dMult(curMult) : null;
  const loDisp = isDivy ? dMult(high) : low, hiDisp = isDivy ? dMult(low) : high;
  // 백분위는 항상 '실제 과거 분포' 기준 — 내 가정값이 아니라 과거 25/75 밴드를 표시해야 40%와 일관됨
  const histLoDisp = isDivy ? dMult(histHigh) : histLow, histHiDisp = isDivy ? dMult(histLow) : histHigh;
  const pctTone = curPctile == null ? "warn" : curPctile <= 35 ? "pos" : curPctile >= 65 ? "neg" : "warn";
  const pctColor = pctTone === "pos" ? "var(--pos)" : pctTone === "neg" ? "var(--neg)" : "var(--r-paused)";
  const pctWord = curPctile == null ? "—" : curPctile <= 35 ? (ko ? "과거보다 싼 편" : "Cheaper than usual") : curPctile >= 65 ? (ko ? "과거보다 비싼 편" : "Pricier than usual") : (ko ? "평소 수준" : "Around usual");
  const metricPsLab = bandType === "PBR" ? (ko ? "주당순자산(BPS)" : "book value/sh (BPS)") : bandType === "PSR" ? (ko ? "주당매출(SPS)" : "sales/sh (SPS)") : bandType === "EV" ? (ko ? "주당 EBITDA" : "EBITDA/sh") : (ko ? "주당순이익(EPS)" : "earnings/sh (EPS)");
  const metricPsSym = bandType === "PBR" ? "BPS" : bandType === "PSR" ? "SPS" : bandType === "EV" ? "EBITDA/sh" : "EPS";
  const midLab = custom ? (ko ? "내가 정한 평균" : "your mid") : (ko ? "과거 중앙값" : "historical median");
  const fairYr = years[n - 1];
  const BANDS = ["PER", "PBR", "PSR", "EV"];
  return (
    <div>
      <div className="band-srcrow">
        <div className="seg-toggle band-bandsel">
          {BANDS.map(b => <div key={b} className={"st" + (bandType === b ? " active" : "")} onClick={() => setBandType(b)}>{b === "EV" ? "EV/EBITDA" : b}</div>)}
        </div>
        <span className="fcb-spacer" />
        <div className="seg-toggle band-srctoggle">
          <div className={"st" + (!custom ? " active" : "")} onClick={() => setSrc("hist")}>{ko ? "과거" : "Historical"}</div>
          <div className={"st" + (custom ? " active" : "")} onClick={() => { if (!cm) setCm({ low: +histLow.toFixed(1), mid: +histMid.toFixed(1), high: +histHigh.toFixed(1) }); setSrc("custom"); }}>{ko ? "내 가정" : "My assumption"}</div>
        </div>
      </div>
      {custom && (
        <div className="band-inputs">
          {[["low", ko ? "저배수" : "Low"], ["mid", ko ? "평균" : "Mid"], ["high", ko ? "고배수" : "High"]].map(([k, lab]) => (
            <label key={k} className="band-inp"><span>{lab}</span>
              <input type="number" step="0.1" value={cmv[k]} onChange={(e) => setCm({ ...cmv, [k]: e.target.value })} />
              <span className="band-inp-unit">{unit}</span>
            </label>
          ))}
        </div>
      )}
      <div className="band-lead">
        <div className="band-lead-main">
          <span className="band-lead-pct" style={{ color: pctColor }}>{curPctile != null ? curPctile + (ko ? "%" : "th") : "—"}</span>
          <div className="band-lead-txt">
            <div className="band-lead-tag" style={{ color: pctColor }}>{pctWord}<span className="fin-term" style={{ marginLeft: 3 }}><span className="ind-q">?</span><span className="fin-tip" style={{ color: "var(--fg)" }}><b>{ko ? `백분위 ${curPctile}% — ${pctWord}` : `${curPctile}th percentile — ${pctWord}`}</b><span className="fin-tip-def">{ko ? `과거 5년 ${bandType} 배수 ${sorted.length}개 중 ${belowCount}개가 현재(${curDisp ? curDisp.toFixed(1) : "—"}×) 이하 → ${belowCount}/${sorted.length} = ${curPctile}%. 과거의 ${curPctile}% 기간이 지금보다 쌌고 ${100 - curPctile}%가 비쌌다는 뜻이에요. 35% 이하면 '과거보다 싼 편', 65% 이상이면 '비싼 편', 그 사이는 '평소 수준'입니다. (내 가정과 무관한 과거 실제 분포 기준)` : `${belowCount} of the last ${sorted.length} yearly multiples were at or below today's ${curDisp ? curDisp.toFixed(1) : "—"}× → ${belowCount}/${sorted.length} = ${curPctile}%. Under 35% = cheaper than usual, over 65% = pricier, in between = around usual. Based on actual history, not your assumptions.`}</span></span></span></div>
            <div className="band-lead-sub">{ko ? `현재 ${bandType} ${curDisp ? curDisp.toFixed(1) + unit : "—"} · 과거 5년 ${histLoDisp.toFixed(1)}~${histHiDisp.toFixed(1)}${unit} 분포의 백분위` : `${bandType} ${curDisp ? curDisp.toFixed(1) + unit : "—"} · percentile in its 5-yr range`}</div>
          </div>
        </div>
        <div className="band-lead-cells">
          <div className="band-ro-cell"><div className="gap-iv-lab">{ko ? "중앙값 적정가" : "Fair (median)"}<span className="fin-term" style={{ marginLeft: 3 }}><span className="ind-q">?</span><span className="fin-tip fin-tip-r"><b>{ko ? "중앙값 적정가란?" : "Fair value (median)"}</b><span className="fin-tip-def">{ko ? `최근 ${n}년(${years[0]}~${fairYr}) 거래된 ${bandType} 배수의 한가운데(중앙값)로 평가하면 나오는 1주 가격이에요. 최신 ${fairYr}년 ${metricPsLab}에 ${midLab} 배수를 곱해 구합니다.` : `The share price if it traded at the middle (median) of its ${bandType} multiples over the last ${n} years (${years[0]}–${fairYr}) — latest ${fairYr} ${metricPsLab} × the ${midLab} multiple.`}</span><span className="fin-tip-f">{`${metricPsSym} ${fmtMoney(metricNow, plan.cur)} × ${mid.toFixed(1)}${unit} = ${fmtMoney(fairNow, plan.cur)}`}</span></span></span></div><div className="gap-px-val mono">{fmtMoney(fairNow, plan.cur)}</div></div>
          <div className="band-ro-cell"><div className="gap-iv-lab">{ko ? "중앙값 대비" : "vs median"}</div><div className="gap-spread-val" style={{ color: fairUp >= 0 ? "var(--pos)" : "var(--neg)" }}>{fairUp >= 0 ? "+" : ""}{fairUp.toFixed(0)}%</div></div>
        </div>
      </div>
      <div style={{ position: "relative" }} onMouseLeave={() => setHov(null)} onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const rel = (e.clientX - r.left) / r.width * W; let i = Math.round((rel - PX) / ((W - 2 * PX) / (n - 1))); i = Math.max(0, Math.min(n - 1, i)); setHov({ i, left: x(i) / W * 100 }); }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", cursor: "crosshair" }}>
        {[0, 0.5, 1].map((f, i) => <line key={i} x1={PX} x2={W - PX} y1={TOP + (H - TOP - BOT) * f} y2={TOP + (H - TOP - BOT) * f} stroke="var(--border)" />)}
        <path d={`${linePath(high)} ${backLow} Z`} fill="color-mix(in srgb, var(--accent) 7%, transparent)" />
        <path d={linePath(high)} fill="none" stroke="var(--fg-4)" strokeWidth="1.4" strokeDasharray="4 3" opacity="0.7" />
        <path d={linePath(mid)} fill="none" stroke="var(--accent)" strokeWidth="2" />
        <path d={linePath(low)} fill="none" stroke="var(--fg-4)" strokeWidth="1.4" strokeDasharray="4 3" opacity="0.7" />
        <path d={pxPath} fill="none" stroke="var(--fg)" strokeWidth="2.5" strokeLinejoin="round" />
        {!hov && <circle cx={x(n - 1)} cy={y(bandAt(n - 1, high))} r="3" fill="var(--fg-4)" />}
        {!hov && <circle cx={x(n - 1)} cy={y(bandAt(n - 1, mid))} r="3.5" fill="var(--accent)" />}
        {!hov && <circle cx={x(n - 1)} cy={y(bandAt(n - 1, low))} r="3" fill="var(--fg-4)" />}
        {!hov && <circle cx={x(n - 1)} cy={y(plan.currentPrice)} r="4.5" fill={pctColor} stroke="var(--bg-app)" strokeWidth="1.5" />}
        {hov && <line x1={x(hov.i)} x2={x(hov.i)} y1={TOP} y2={H - BOT} stroke="var(--fg-4)" strokeWidth="1" strokeDasharray="3 3" />}
        {hov && <circle cx={x(hov.i)} cy={y(bandAt(hov.i, mid))} r="4" fill="var(--accent)" stroke="var(--bg-app)" strokeWidth="1.5" />}
        {hov && <circle cx={x(hov.i)} cy={y(pxYear[hov.i])} r="4" fill={pctColor} stroke="var(--bg-app)" strokeWidth="1.5" />}
        <text x={x(0) + 2} y={y(bandAt(0, high)) - 4} style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 9px var(--font-sans)" }}>{high.toFixed(0)}{unit}</text>
        <text x={x(0) + 2} y={y(bandAt(0, low)) + 11} style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 9px var(--font-sans)" }}>{low.toFixed(0)}{unit}</text>
        {years.map((q, i) => <text key={i} x={x(i)} y={H - 10} textAnchor="middle" style={{ fill: hov && hov.i === i ? "var(--fg-2)" : "var(--fg-4)", font: "var(--fw-medium) 10px var(--font-sans)" }}>{q}</text>)}
      </svg>
      {hov && (() => { const i = hov.i; const leftPct = Math.max(2, Math.min(78, hov.left)); const g = (bandAt(i, mid) - pxYear[i]) / pxYear[i] * 100; const ym = pxYear[i] > 0 && metricSeries[i] > 0 ? pxYear[i] / metricSeries[i] : null; return (
        <div className="gap-tip" style={{ left: leftPct + "%" }}>
          <div className="gap-tip-q">{years[i]}{ym != null ? ` · ${bandType} ${dMult(ym).toFixed(1)}${unit}` : ""}</div>
          <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--fg-4)" }} />{ko ? "상위 25% (비쌈)" : "75%ile"} <b>{fmtMoney(bandAt(i, high), plan.cur)}</b></div>
          <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--accent)" }} />{ko ? "중앙값 (적정)" : "Median"} <b>{fmtMoney(bandAt(i, mid), plan.cur)}</b></div>
          <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--fg-4)" }} />{ko ? "하위 25% (쌈)" : "25%ile"} <b>{fmtMoney(bandAt(i, low), plan.cur)}</b></div>
          <div className="gap-tip-row gap-tip-price"><span className="gap-tip-dot" style={{ background: "var(--fg)" }} />{ko ? "시장가" : "Price"} <b>{fmtMoney(pxYear[i], plan.cur)}</b></div>
          <div className="gap-tip-gap" style={{ color: g >= 0 ? "var(--pos)" : "var(--neg)" }}>{ko ? "중앙값 대비 " : "vs median "}{g >= 0 ? "+" : ""}{g.toFixed(0)}%</div>
        </div>
      ); })()}
      </div>
      <div className="gap-legend">
        <span className="gap-leg"><span className="gap-leg-dot" style={{ background: "var(--accent)" }} />{ko ? "중앙값 (적정 배수)" : "Median"}</span>
        <span className="gap-leg"><span className="gap-leg-dot" style={{ background: "var(--fg-4)" }} />{ko ? "상위·하위 25% (밴드)" : "25–75%ile band"}</span>
        <span className="gap-leg"><span className="gap-leg-dot" style={{ background: "var(--fg)" }} />{ko ? "시장 가격" : "Price"}</span>
      </div>
      <div className={"gap-verdict gv-" + (pctTone === "warn" ? "neutral" : pctTone)} style={{ marginTop: 14 }}>
        <Lic name="info" size={17} cls="icon-sm" color="currentColor" />
        <div><div className="gap-verdict-lab">{ko ? "참고용 · 과거 멀티플 분포 기준" : "Reference · historical multiples"}</div><div className="gap-verdict-msg">{custom ? (ko ? `내가 정한 ${bandType} ${low.toFixed(1)}~${high.toFixed(1)}${unit} 기준 적정가는 ${fmtMoney(fairNow, plan.cur)} — 현재가 대비 ${fairUp >= 0 ? "+" : ""}${fairUp.toFixed(0)}%.` : `My ${bandType} band implies ${fmtMoney(fairNow, plan.cur)} fair value.`) : (ko ? `현재 ${bandType} ${curDisp ? curDisp.toFixed(1) + unit : "—"}는 과거 5년 분포의 ${curPctile}% 지점 — ${pctWord}. 중앙값 배수로 환산한 적정가는 ${fmtMoney(fairNow, plan.cur)}입니다.` : `At the ${curPctile}th percentile of its 5-yr range; median-multiple fair value ${fmtMoney(fairNow, plan.cur)}.`)}</div></div>
      </div>
    </div>
  );
}

/* ---- 적정가 밴드(여러 방법) — PER·PBR·PSR·EV 각 방법이 매기는 적정가를 시계열 밴드로, 시장가 오버레이.
   MultipleBandChart(한 방법의 과거 25~75% 백분위 밴드)와 달리, 여러 '방법' 사이의 최저~최고 스프레드를 봄.
   각 방법 대표배수 = 과거 멀티플 중앙값(정상 수준). GapTab 트랙 차트와 같은 부드러운 밴드 시각언어 + gapPrefs 공유. ---- */
const VALBAND_DEFAULT = { band: true, avg: true, price: true, PER: false, PBR: false, PSR: false, EV: false, style: { PER: "solid", PBR: "solid", PSR: "solid", EV: "solid" } };
function valBandPrefsLoad() { try { const s = JSON.parse(localStorage.getItem("keystone-valband-prefs") || "{}"); return { ...VALBAND_DEFAULT, ...s, style: { ...VALBAND_DEFAULT.style, ...(s.style || {}) } }; } catch (e) { return { ...VALBAND_DEFAULT, style: { ...VALBAND_DEFAULT.style } }; } }
function ValFairBandChart({ plan, lang }) {
  const ko = lang === "ko";
  const fin = plan.fin;
  const [hov, setHov] = React.useState(null);
  const [disp, setDisp] = React.useState(false);
  const [vp, setVp] = React.useState(valBandPrefsLoad);
  const setVp1 = (patch) => setVp(p => { const nx = { ...p, ...patch, style: { ...p.style, ...(patch.style || {}) } }; try { localStorage.setItem("keystone-valband-prefs", JSON.stringify(nx)); } catch (e) {} return nx; });
  if (!fin || !fin.is || fin.is.length < 2) return null;
  const shares = (plan.sharesOut || 1) * 1e6;
  const years = fin.is.map(r => r.y);
  const n = years.length;
  const ph = plan.priceHistory || [];
  const pxYear = years.map((_, i) => { const idx = Math.min(ph.length - 1, Math.round(i / (n - 1) * (ph.length - 1))); return i === n - 1 ? plan.currentPrice : (ph[idx] ? ph[idx].v : plan.currentPrice); });
  // 방법별 주당 펀더멘털 시계열
  const psPER = fin.is.map(r => r.net > 0 ? r.net / shares : null);
  const psPBR = fin.is.map((r, i) => (fin.bs[i] && fin.bs[i].equity > 0) ? fin.bs[i].equity / shares : null);
  const psPSR = fin.is.map(r => r.rev > 0 ? r.rev / shares : null);
  const psEV = fin.is.map(r => r.op > 0 ? (r.op * 1.18) / shares : null);
  const ndPs = fin.is.map((r, i) => (fin.bs[i] ? fin.bs[i].liab * 0.4 : 0) / shares);
  // 방법별 대표배수 = 과거 멀티플의 중앙값(그 방법의 '정상 수준') — MultipleBandChart와 동일 산법
  const median = arr => { const s = arr.filter(v => v && isFinite(v) && v > 0).sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
  const medPER = median(psPER.map((psv, i) => psv > 0 ? pxYear[i] / psv : null));
  const medPBR = median(psPBR.map((psv, i) => psv > 0 ? pxYear[i] / psv : null));
  const medPSR = median(psPSR.map((psv, i) => psv > 0 ? pxYear[i] / psv : null));
  const medEV = median(psEV.map((psv, i) => psv > 0 ? (pxYear[i] * shares + (fin.bs[i] ? fin.bs[i].liab * 0.4 : 0)) / (psv * shares) : null));
  const methods = [
    { k: "PER", id: "PER", col: "#6A93D6", ps: psPER, mult: medPER, ev: false },
    { k: "PBR", id: "PBR", col: "#4FA08A", ps: psPBR, mult: medPBR, ev: false },
    { k: "PSR", id: "PSR", col: "#C2933F", ps: psPSR, mult: medPSR, ev: false },
    { k: "EV/EBITDA", id: "EV", col: "#9281C2", ps: psEV, mult: medEV, ev: true },
  ].filter(m => m.mult && m.mult > 0);
  const fairAt = (m, i) => { if (!(m.ps[i] > 0) || !(m.mult > 0)) return null; const v = m.ps[i] * m.mult; return m.ev ? Math.max(0, v - ndPs[i]) : v; };
  if (methods.length < 2) return <div className="empty-tab">{ko ? "밴드를 만들 방법이 부족합니다" : "Not enough methods for a band"}</div>;
  const bandY = years.map((_, i) => { const vs = methods.map(m => fairAt(m, i)).filter(v => v > 0 && isFinite(v)); if (!vs.length) return null; return { lo: Math.min(...vs), hi: Math.max(...vs), avg: vs.reduce((a, b) => a + b, 0) / vs.length }; });
  const allV = []; bandY.forEach((b, i) => { if (b) allV.push(b.lo, b.hi); allV.push(pxYear[i]); });
  const max = Math.max(...allV) * 1.05, min = Math.min(...allV) * 0.95;
  const W = 760, H = 230, PX = 10, TOP = 22, BOT = 30;
  const x = i => PX + (W - 2 * PX) * i / (n - 1);
  const y = v => TOP + (H - TOP - BOT) * (1 - (v - min) / ((max - min) || 1));
  const sxy = P => { if (P.length < 2) return P.length ? `M${P[0].X.toFixed(1)} ${P[0].Y.toFixed(1)}` : ""; let d = `M${P[0].X.toFixed(1)} ${P[0].Y.toFixed(1)}`; for (let i = 0; i < P.length - 1; i++) { const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)]; const c1x = p1.X + (p2.X - p0.X) / 6, c1y = p1.Y + (p2.Y - p0.Y) / 6, c2x = p2.X - (p3.X - p1.X) / 6, c2y = p2.Y - (p3.Y - p1.Y) / 6; d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.X.toFixed(1)} ${p2.Y.toFixed(1)}`; } return d; };
  const hiP = bandY.map((b, i) => b ? { X: x(i), Y: y(b.hi) } : null).filter(Boolean);
  const loP = bandY.map((b, i) => b ? { X: x(i), Y: y(b.lo) } : null).filter(Boolean);
  const bandPath = hiP.length >= 2 ? `${sxy(hiP)} L${sxy(loP.slice().reverse()).slice(1)} Z` : "";
  const midPath = sxy(bandY.map((b, i) => b ? { X: x(i), Y: y(b.avg) } : null).filter(Boolean));
  const hiLine = sxy(hiP), loLine = sxy(loP);
  const pxPath = sxy(pxYear.map((v, i) => ({ X: x(i), Y: y(v) })));
  const L = n - 1;
  const price = plan.currentPrice;
  const money = v => fmtMoney(plan.cur === "USD" ? Math.round(v * 100) / 100 : Math.round(v), plan.cur);
  const cur = bandY[L] || { lo: price, hi: price, avg: price };
  const fairNow = cur.avg;
  const upNow = price > 0 ? (fairNow - price) / price * 100 : 0;
  const word = upNow >= 15 ? (ko ? "평균 대비 저평가" : "Below fair") : upNow <= -15 ? (ko ? "평균 대비 고평가" : "Above fair") : (ko ? "평균 부근" : "Around fair");
  const tone = upNow >= 15 ? "var(--pos)" : upNow <= -15 ? "var(--neg)" : "var(--r-paused)";
  const tv = upNow >= 15 ? "pos" : upNow <= -15 ? "neg" : "neutral";
  const showBand = vp.band, showAvg = vp.avg, showPx = vp.price;
  const methodPath = (m) => sxy(years.map((_, i) => { const v = fairAt(m, i); return v > 0 ? { X: x(i), Y: y(v) } : null; }).filter(Boolean));
  const mLineAttrs = (id) => { const s = (vp.style && vp.style[id]) || "solid"; return { strokeDasharray: s === "dash" ? "4 3" : undefined, strokeWidth: s === "thick" ? 2.4 : 1.4 }; };
  const activeMethods = methods.filter(m => vp[m.id]);
  return (
    <div>
      <div className="band-lead">
        <div className="band-lead-main">
          <span className="band-lead-pct" style={{ color: tone }}>{(upNow >= 0 ? "+" : "") + upNow.toFixed(0) + "%"}</span>
          <div className="band-lead-txt">
            <div className="band-lead-tag" style={{ color: tone }}>{word}</div>
            <div className="band-lead-sub">{ko ? `평균 적정가 ${money(fairNow)} 대비 시장가` : `Price vs ${money(fairNow)} avg fair`}</div>
          </div>
        </div>
        <div className="band-lead-cells">
          <div className="band-ro-cell"><div className="gap-iv-lab">{ko ? "시장가" : "Price"}</div><div className="gap-px-val mono">{money(price)}</div></div>
          <div className="band-ro-cell"><div className="gap-iv-lab">{ko ? "방법 범위" : "Method range"}</div><div className="gap-px-val mono" style={{ fontSize: 12 }}>{money(cur.lo)}~{money(cur.hi)}</div></div>
        </div>
        <span style={{ position: "relative", flex: "none" }}>
          <button className={"iconbtn" + (disp ? " active" : "")} onClick={() => setDisp(v => !v)} title={ko ? "표시" : "Display"}><Lic name="sliders-horizontal" size={15} /></button>
          {disp && <React.Fragment>
            <div className="overlay" onClick={() => setDisp(false)} />
            <div className="panel" style={{ position: "absolute", top: 32, right: 0, width: 232, padding: 8, zIndex: 45 }}>
              <div className="side-cap" style={{ padding: "4px 8px", margin: 0 }}>{ko ? "표시 항목" : "Series"}</div>
              {[["band", ko ? "밴드 (범위)" : "Band"], ["avg", ko ? "평균" : "Average"], ["price", ko ? "시장가" : "Price"]].map(([k, l]) => (
                <div className="v-menu-item" key={k} onClick={() => setVp1({ [k]: !vp[k] })}>
                  <span>{l}</span>
                  <span className={"toggle" + (vp[k] ? " on" : "")} style={{ marginLeft: "auto" }} />
                </div>
              ))}
              <div className="v-menu-sep" style={{ margin: "6px 4px" }} />
              <div className="side-cap" style={{ padding: "4px 8px", margin: 0 }}>{ko ? "방법" : "Methods"}</div>
              {methods.map(m => (
                <React.Fragment key={m.id}>
                  <div className="v-menu-item" onClick={() => setVp1({ [m.id]: !vp[m.id] })}>
                    <span style={{ width: 11, height: 3, borderRadius: 2, background: m.col, flex: "none" }} />
                    <span>{m.k}</span>
                    <span className={"toggle" + (vp[m.id] ? " on" : "")} style={{ marginLeft: "auto" }} />
                  </div>
                  {vp[m.id] && (
                    <div className="disp-segrow" style={{ padding: "1px 8px 5px 27px" }}>
                      <span className="disp-segrow-lab" style={{ color: "var(--fg-4)" }}>{ko ? "선" : "Line"}</span>
                      <div className="rb-modebar" style={{ margin: 0 }}>
                        {[["solid", ko ? "실선" : "Solid"], ["dash", ko ? "점선" : "Dash"], ["thick", ko ? "굵게" : "Thick"]].map(([v, vl]) => <div key={v} className={"rb-mode" + (((vp.style && vp.style[m.id]) || "solid") === v ? " on" : "")} onClick={() => setVp1({ style: { [m.id]: v } })}>{vl}</div>)}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </React.Fragment>}
        </span>
      </div>
      <div style={{ position: "relative" }} onMouseLeave={() => setHov(null)} onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const rel = (e.clientX - r.left) / r.width * W; let i = Math.round((rel - PX) / ((W - 2 * PX) / (n - 1))); i = Math.max(0, Math.min(n - 1, i)); setHov({ i, left: x(i) / W * 100 }); }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", cursor: "crosshair" }}>
        <defs>
          <linearGradient id="valBandGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((f, i) => <line key={i} x1={PX} x2={W - PX} y1={TOP + (H - TOP - BOT) * f} y2={TOP + (H - TOP - BOT) * f} stroke="var(--border)" />)}
        {showBand && bandPath && <path d={bandPath} fill="url(#valBandGrad)" />}
        {showBand && <path d={hiLine} fill="none" stroke="var(--fg-4)" strokeWidth="1.4" strokeDasharray="4 3" opacity="0.7" />}
        {showBand && <path d={loLine} fill="none" stroke="var(--fg-4)" strokeWidth="1.4" strokeDasharray="4 3" opacity="0.7" />}
        {activeMethods.map(m => <path key={m.id} d={methodPath(m)} fill="none" stroke={m.col} {...mLineAttrs(m.id)} strokeLinejoin="round" opacity="0.82" />)}
        {activeMethods.map(m => { const v = fairAt(m, L); return v > 0 ? <circle key={m.id + "d"} cx={x(L)} cy={y(v)} r="2.8" fill={m.col} /> : null; })}
        {showAvg && <path d={midPath} fill="none" stroke="var(--accent)" strokeWidth="2" />}
        {showPx && <path d={pxPath} fill="none" stroke="var(--fg)" strokeWidth="2.5" strokeLinejoin="round" />}
        {!hov && showAvg && <circle cx={x(L)} cy={y(cur.avg)} r="3.5" fill="var(--accent)" />}
        {!hov && showPx && <circle cx={x(L)} cy={y(price)} r="4.5" fill={tone} stroke="var(--bg-app)" strokeWidth="1.5" />}
        {hov && <line x1={x(hov.i)} x2={x(hov.i)} y1={TOP} y2={H - BOT} stroke="var(--fg-4)" strokeWidth="1" strokeDasharray="3 3" />}
        {hov && activeMethods.map(m => { const v = fairAt(m, hov.i); return v > 0 ? <circle key={m.id + "h"} cx={x(hov.i)} cy={y(v)} r="3" fill={m.col} stroke="var(--bg-app)" strokeWidth="1.2" /> : null; })}
        {hov && showAvg && bandY[hov.i] && <circle cx={x(hov.i)} cy={y(bandY[hov.i].avg)} r="4" fill="var(--accent)" stroke="var(--bg-app)" strokeWidth="1.5" />}
        {hov && showPx && <circle cx={x(hov.i)} cy={y(pxYear[hov.i])} r="4" fill={tone} stroke="var(--bg-app)" strokeWidth="1.5" />}
        {years.map((q, i) => <text key={i} x={x(i)} y={H - 10} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} style={{ fill: hov && hov.i === i ? "var(--fg-2)" : "var(--fg-4)", font: "var(--fw-medium) 10px var(--font-sans)" }}>{q}</text>)}
      </svg>
      {hov && bandY[hov.i] && (() => { const i = hov.i; const b = bandY[i]; const leftPct = Math.max(2, Math.min(78, hov.left)); const g = (b.avg - pxYear[i]) / pxYear[i] * 100; return (
        <div className="gap-tip" style={{ left: leftPct + "%" }}>
          <div className="gap-tip-q">{years[i]}</div>
          <div className="gap-tip-cap">{ko ? "방법별 적정가" : "By method"}</div>
          {methods.map(m => { const fv = fairAt(m, i); return fv > 0 ? <div className="gap-tip-row" key={m.k}><span className="gap-tip-dot" style={{ background: m.col }} />{m.k} <b>{money(fv)}</b></div> : null; })}
          <div className="gap-tip-div" />
          <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--accent)" }} />{ko ? "평균" : "Avg"} <b>{money(b.avg)}</b></div>
          <div className="gap-tip-row gap-tip-price"><span className="gap-tip-dot" style={{ background: "var(--fg)" }} />{ko ? "시장가" : "Price"} <b>{money(pxYear[i])}</b></div>
          <div className="gap-tip-gap" style={{ color: g >= 0 ? "var(--pos)" : "var(--neg)" }}>{ko ? "평균 대비 " : "vs avg "}{g >= 0 ? "+" : ""}{g.toFixed(0)}%</div>
        </div>
      ); })()}
      </div>
      <div className="gap-legend">
        {showAvg && <span className="gap-leg"><span className="gap-leg-dot" style={{ background: "var(--accent)" }} />{ko ? "평균 적정가" : "Avg fair"}</span>}
        {showBand && <span className="gap-leg"><span className="gap-leg-dot" style={{ background: "var(--fg-4)" }} />{ko ? "방법 범위 (최저~최고)" : "Method range"}</span>}
        {showPx && <span className="gap-leg"><span className="gap-leg-dot" style={{ background: "var(--fg)" }} />{ko ? "시장가" : "Price"}</span>}
        {activeMethods.map(m => <span className="gap-leg" key={m.id}><span className="gap-leg-dot" style={{ background: m.col, width: 10, height: 3, borderRadius: 2 }} />{m.k}</span>)}
      </div>
      <div className="gap-bandcap"><Lic name="info" size={11} cls="icon-sm" color="var(--fg-4)" />{ko ? "띠 = 방법별 적정가 최저~최고 · 파란선 = 평균 · 흰선 = 시장가 · 대표배수는 각 방법 과거 중앙값" : "Band = min–max fair across methods · blue = average · white = price"}</div>
      <div className={"gap-verdict gv-" + tv} style={{ marginTop: 12 }}>
        <Lic name="info" size={17} cls="icon-sm" color="currentColor" />
        <div><div className="gap-verdict-lab">{ko ? "참고용 · 여러 방법 평균 기준" : "Reference · multi-method average"}</div><div className="gap-verdict-msg">{ko ? `현재 시장가 ${money(price)}는 방법 평균 적정가 ${money(fairNow)} 대비 ${upNow >= 0 ? "+" : ""}${upNow.toFixed(0)}% — ${word}. 방법별 적정가는 ${money(cur.lo)}~${money(cur.hi)}에 걸쳐 있어요.` : `Price ${money(price)} is ${upNow >= 0 ? "+" : ""}${upNow.toFixed(0)}% vs the ${money(fairNow)} multi-method average.`}</div></div>
      </div>
    </div>
  );
}

/* ---- 괴리(Gap) 탭 — 내재가치 vs 가격 시계열이 히어로 ---- */
const GAP_PREFS_DEFAULT = { show: { bull: true, base: true, bear: true, fair: true, price: true, fills: true, notes: true, rules: true }, style: { bull: "dash", base: "solid", bear: "dash" } };
function gapPrefsLoad() { try { const s = JSON.parse(localStorage.getItem("keystone-gapchart-prefs") || "{}"); return { show: { ...GAP_PREFS_DEFAULT.show, ...(s.show || {}), bull: true, base: true, bear: true, fair: true, price: true }, style: { ...GAP_PREFS_DEFAULT.style, ...(s.style || {}) } }; } catch (e) { return { show: { ...GAP_PREFS_DEFAULT.show }, style: { ...GAP_PREFS_DEFAULT.style } }; } }
function GapTab({ plan, t, lang, onPatchPlan, onUpdateScenario, part, onGotoValuation }) {
  const [hov, setHov] = React.useState(null);
  const [fillHov, setFillHov] = React.useState(null);
  const [evtHov, setEvtHov] = React.useState(null);
  const [mbHov, setMbHov] = React.useState(null);
  const [entryHov, setEntryHov] = React.useState(false);
  const [gapPrefs, setGapPrefs] = React.useState(gapPrefsLoad);
  const [gapDisp, setGapDisp] = React.useState(false);
  const setPref = (patch) => setGapPrefs(p => { const nx = { show: { ...p.show, ...(patch.show || {}) }, style: { ...p.style, ...(patch.style || {}) } }; try { localStorage.setItem("keystone-gapchart-prefs", JSON.stringify(nx)); } catch (e) {} return nx; });
  const lineAttrs = (kind) => { const s = gapPrefs.style[kind] || "solid"; return { strokeDasharray: s === "dash" ? "4 3" : undefined, strokeWidth: s === "thick" ? (kind === "base" ? 3.4 : 2.4) : (kind === "base" ? 2.5 : 1.5) }; };
  const mode = "gap";
  const [range, setRange] = React.useState("all");
  const [gapRef, setGapRef] = React.useState("base");
  const fwModel = (STRATEGIES.find(s => s.id === plan.strategyId) || {}).model || "PER";
  const FW_BAND = { PER: "PER", PBR: "PBR", PSR: "PSR", EV: "EV", DDM: "DIVY", DCF: "PER" };
  const [bandType, setBandType] = React.useState(FW_BAND[fwModel] || "PER");
  const px = plan.currentPrice;
  const sc = plan.scenarios || [];
  const tOf = (en, fb) => { const s = sc.find(x => x.label && x.label.en === en); return s ? s.target : fb; };
  const fallbackIV = plan.iv;
  const baseT = tOf("Base", fallbackIV), bullT = tOf("Bull", fallbackIV * 1.25), bearT = tOf("Bear", fallbackIV * 0.75);
  const iv = baseT;
  const baseIdx = sc.findIndex(x => x.label && x.label.en === "Base");
  const rBull = baseT ? bullT / baseT : 1.25, rBear = baseT ? bearT / baseT : 0.75;
  const NQ = (plan.priceHistory || [0, 1, 2, 3, 4, 5]).length || 6;
  // ── B: '내 기준'선 = 내가 정한 시나리오 목표가의 스냅샷(계단식). 마지막 점은 현재 라이브 목표가.
  const sh = (plan.scenarioHistory && plan.scenarioHistory.length) ? plan.scenarioHistory : [{ q: 0, base: iv, bull: bullT, bear: bearT }];
  const stepAt = (i, key) => { let v = sh[0][key]; for (const s of sh) { if (s.q <= i) v = s[key]; } return v; };
  const basePtsFull = Array.from({ length: NQ }, (_, i) => i === NQ - 1 ? baseT : stepAt(i, "base"));
  const bullPtsFull = Array.from({ length: NQ }, (_, i) => i === NQ - 1 ? bullT : stepAt(i, "bull"));
  const bearPtsFull = Array.from({ length: NQ }, (_, i) => i === NQ - 1 ? bearT : stepAt(i, "bear"));
  const pxPtsFull = (plan.priceHistory || []).map((d, i, a) => i === a.length - 1 ? px : d.v);
  const lastSnapQ = sh[sh.length - 1].q;
  const monthsSinceReview = (NQ - 1 - lastSnapQ) * 3;
  // ── A: 펀더멘털 추정 띠. 중앙선=분기 가치 추정 흐름(ivHistory), 띠 너비=과거 멀티플 분포(fin). fin 없으면 ±15%.
  const fairBandFull = (() => {
    const mid = (plan.ivHistory || []).map((d, i, a) => i === a.length - 1 ? iv : d.v * (fallbackIV ? iv / fallbackIV : 1));
    let wLo = 0.85, wHi = 1.15;
    const fwm = (STRATEGIES.find(s => s.id === plan.strategyId) || {}).model || "PER";
    const finD = plan.fin;
    if (finD && finD.is && finD.is.length >= 2) {
      const shares = (plan.sharesOut || 1) * 1e6;
      const fund = finD.is.map((r, i) => fwm === "PBR" ? ((finD.bs[i] && finD.bs[i].equity) || r.net * 5) / shares : fwm === "PSR" ? r.rev / shares : fwm === "EV" ? (r.op * 1.25) / shares : r.net / shares);
      const ph = plan.priceHistory || [];
      const pxY = finD.is.map((_, i, a) => { const idx = Math.min(ph.length - 1, Math.round(i / (a.length - 1) * (ph.length - 1))); return i === a.length - 1 ? px : (ph[idx] ? ph[idx].v : px); });
      const mults = fund.map((m, i) => m > 0 ? pxY[i] / m : null).filter(v => v && isFinite(v)).sort((a, b) => a - b);
      if (mults.length >= 2) {
        const pc = q => { const idx = (mults.length - 1) * q, lo = Math.floor(idx), hi = Math.ceil(idx); return mults[lo] + (mults[hi] - mults[lo]) * (idx - lo); };
        const mLo = pc(0.25), mMid = pc(0.5), mHi = pc(0.75);
        if (mMid > 0) { wLo = Math.max(0.6, Math.min(0.95, mLo / mMid)); wHi = Math.min(1.6, Math.max(1.05, mHi / mMid)); }
      }
    }
    return { mid, lo: mid.map(v => v * wLo), hi: mid.map(v => v * wHi) };
  })();
  // 기간 토글: 마지막 N분기만. 1Y=4, 18M=6(전체)
  const keepN = range === "6m" ? 2 : range === "1y" ? 4 : 99;
  const sliceTail = arr => arr.length > keepN ? arr.slice(arr.length - keepN) : arr;
  const basePts = sliceTail(basePtsFull), bullPts = sliceTail(bullPtsFull), bearPts = sliceTail(bearPtsFull), pxPts = sliceTail(pxPtsFull);
  const fairMid = sliceTail(fairBandFull.mid), fairLo = sliceTail(fairBandFull.lo), fairHi = sliceTail(fairBandFull.hi);
  const n = basePts.length || 1;
  const ivBull = bullT, ivBear = bearT;          // 가치 범위 = 시나리오 상/하단 목표가 그대로
  const under = px < iv;
  const mosVsBear = (ivBear - px) / px * 100;               // 보수가 대비 안전마진
  // 노이즈 vs 논제 훼손 판정: 펀더멘털(추정 가치) 추세 vs 가격 추세
  const ivAgo = fairMid[0], ivNow = fairMid[fairMid.length - 1], pxAgo = pxPts[0];
  const ivTrend = ivAgo ? (ivNow - ivAgo) / ivAgo * 100 : 0;   // 펀더멘털 가치 추세
  const pxTrend = pxAgo ? (px - pxAgo) / pxAgo * 100 : 0;   // 가격 추세
  // 내 기준(목표가)이 펀더멘털과 벌어졌나 — 오래 미수정 시 검토 넛지
  const myVsFund = ivNow ? (iv - ivNow) / ivNow * 100 : 0;
  const staleReview = monthsSinceReview >= 9 && Math.abs(ivTrend) >= 7;
  let diag;
  if (ivTrend < -5) diag = { type: "impair", lab: lang === "ko" ? "투자 논리 훼손" : "Thesis impaired", tone: "neg", icon: "alert-triangle", msg: lang === "ko" ? `펀더멘털 추정이 ${ivTrend.toFixed(0)}% 하락했습니다. 가격이 아니라 실적이 약해진 것 — 투자 논리를 재검토하세요.` : `The fundamental estimate fell ${ivTrend.toFixed(0)}%. Fundamentals — not just price — weakened. Re-examine the thesis.` };
  else if (under && pxTrend < -8 && ivTrend >= -5) diag = { type: "noise", lab: lang === "ko" ? "노이즈 · 기회" : "Noise · opportunity", tone: "pos", icon: "shield-check", msg: lang === "ko" ? `펀더멘털 추정은 ${ivTrend >= 0 ? "+" : ""}${ivTrend.toFixed(0)}%인데 가격만 ${pxTrend.toFixed(0)}% 빠졌습니다. 투자 논리가 유효하다면 저평가 매수 기회입니다.` : `Fundamentals held (${ivTrend >= 0 ? "+" : ""}${ivTrend.toFixed(0)}%) while price dropped ${pxTrend.toFixed(0)}%. If the thesis holds, this is an opportunity.` };
  else diag = { type: "track", lab: lang === "ko" ? "동행 중" : "On track", tone: "neutral", icon: "activity", msg: lang === "ko" ? `펀더멘털 추정(${ivTrend >= 0 ? "+" : ""}${ivTrend.toFixed(0)}%)과 가격(${pxTrend >= 0 ? "+" : ""}${pxTrend.toFixed(0)}%)이 함께 움직이고 있습니다.` : `Value and price are moving together.` };
  const all = bullPts.concat(bearPts, pxPts, fairHi, fairLo);
  const max = Math.max(...all) * 1.04, min = Math.min(...all) * 0.96;
  const W = 760, H = 285, PX = 10, TOP = 26, BOT = 30;
  const x = i => PX + (W - 2 * PX) * i / (n - 1);
  const y = v => TOP + (H - TOP - BOT) * (1 - (v - min) / ((max - min) || 1));
  const splineXY = P => { if (P.length < 2) return ""; let d = `M${P[0].X.toFixed(1)} ${P[0].Y.toFixed(1)}`; for (let i = 0; i < P.length - 1; i++) { const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)]; const c1x = p1.X + (p2.X - p0.X) / 6, c1y = p1.Y + (p2.Y - p0.Y) / 6, c2x = p2.X - (p3.X - p1.X) / 6, c2y = p2.Y - (p3.Y - p1.Y) / 6; d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.X.toFixed(1)} ${p2.Y.toFixed(1)}`; } return d; };
  const path = pts => splineXY(pts.map((v, i) => ({ X: x(i), Y: y(v) })));
  const stepPathFn = pts => { if (!pts.length) return ""; let d = `M${x(0).toFixed(1)} ${y(pts[0]).toFixed(1)}`; for (let i = 1; i < pts.length; i++) { d += ` L${x(i).toFixed(1)} ${y(pts[i - 1]).toFixed(1)} L${x(i).toFixed(1)} ${y(pts[i]).toFixed(1)}`; } return d; };
  const fairLoRev = fairLo.map((v, i) => ({ X: x(i), Y: y(v) })).reverse();
  const band = `${path(fairHi)} L${splineXY(fairLoRev).slice(1)} Z`;
  const qlab = (() => { const now = new Date(2026, 5, 1); const cy = now.getFullYear(), cm = now.getMonth(); const N = basePtsFull.length || 6; const out = []; for (let k = N - 1; k >= 0; k--) { const d = new Date(cy, cm - k * 3, 1); out.push(`${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}`); } return out; })();
  const gapColor = under ? "var(--pos)" : "var(--neg)";
  const pxRev = pxPts.map((v, i) => ({ X: x(i), Y: y(v) })).reverse();
  const gapArea = `${stepPathFn(basePts)} L${splineXY(pxRev).slice(1)} Z`;
  const bandLabel = (b) => (b === "EV" ? "EV/EBITDA" : b === "DIVY" ? (lang === "ko" ? "배당수익률" : "Div. yield") : b) + " " + (lang === "ko" ? "밴드" : "band");
  const gapNow = (px - iv) / iv * 100;
  // 내 매수(진입) 시점 → 차트 x좌표 (종목 타임라인 위에 표시)
  const entryDate = (() => { if (!plan.avgPrice) return null; const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 }; const buys = (plan.executions || []).filter(e => e.side === "buy").slice().reverse(); const L = (typeof computeLedger === "function") ? computeLedger(plan) : { rows: [] }; const hasCF = L.rows.length > 0 && L.rows[0].type === "open"; const es = buys.length ? (hasCF ? plan.createdAt : buys[0].date) : plan.createdAt; if (!es) return null; const m = es.match(/([A-Za-z]{3})\s*(\d+)/); if (!m || MON[m[1]] == null) return null; const ref = new Date(2026, 5, 10); let d = new Date(2026, MON[m[1]], +m[2]); if (d > ref) d = new Date(2025, MON[m[1]], +m[2]); return d; })();
  const nowDate = new Date(2026, 5, 1), firstDate = new Date(2026, 5 - (n - 1) * 3, 1);
  const entryFrac = entryDate ? (entryDate - firstDate) / ((nowDate - firstDate) || 1) : null;
  const xEntry = entryFrac != null ? PX + (W - 2 * PX) * Math.max(0, Math.min(1, entryFrac)) : null;
  const showEntry = entryFrac != null && entryFrac >= -0.05 && entryFrac <= 1.05;
  const entryLab = entryDate ? `${String(entryDate.getFullYear()).slice(2)}.${String(entryDate.getMonth() + 1).padStart(2, "0")}.${String(entryDate.getDate()).padStart(2, "0")}` : "";
  const entryInfo = (() => { const buys = (plan.executions || []).filter(e => e.side === "buy"); if (!buys.length || !(plan.avgPrice > 0)) return null; const first = buys.slice().reverse()[0]; const ret = (px - plan.avgPrice) / plan.avgPrice * 100; const upToVal = (iv - plan.avgPrice) / plan.avgPrice * 100; return { entryPx: first.price, rounds: buys.length, avg: plan.avgPrice, ret, upToVal }; })();
  // 개별 체결(내 매수·매도)을 가격선 위 다이아몬드로 — "내 행동을 차트에" (date→x는 entryDate과 동일 매핑)
  const fillMarks = (() => {
    const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
    const ref = new Date(2026, 5, 10), ko = lang === "ko";
    return (plan.executions || []).map(e => {
      if (!e.date || !(e.price > 0)) return null;
      const m = e.date.match(/([A-Za-z]{3})\s*(\d+)/); if (!m || MON[m[1]] == null) return null;
      let d = new Date(2026, MON[m[1]], +m[2]); if (d > ref) d = new Date(2025, MON[m[1]], +m[2]);
      const frac = (d - firstDate) / ((nowDate - firstDate) || 1);
      if (frac < -0.02 || frac > 1.04 || e.price < min || e.price > max) return null;
      const buy = e.side === "buy";
      const xp = PX + (W - 2 * PX) * Math.max(0, Math.min(1, frac));
      return { x: xp, cy: y(e.price), buy, price: e.price, qty: e.qty, leftPct: Math.max(2, Math.min(74, (xp / W) * 100)), dlab: `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`, title: (buy ? (ko ? "매수 " : "Buy ") : (ko ? "매도 " : "Sell ")) + e.qty + (ko ? "주 @ " : " @ ") + fmtMoney(e.price, plan.cur) + " · " + (MON[m[1]] + 1) + "/" + m[2] };
    }).filter(Boolean);
  })();
  // 논거 타임라인 이벤트 틱 — 일지 메모·룰 발동을 축 아래에 (date→x는 fillMarks와 동일)
  const eventTicks = (() => {
    const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
    const ref = new Date(2026, 5, 10), ko = lang === "ko";
    const parse = (s) => {
      if (!s) return null;
      if (/today|오늘/i.test(s)) return new Date(ref);
      const m = s.match(/([A-Za-z]{3})\s*(\d+)/); if (!m || MON[m[1]] == null) return null;
      let d = new Date(2026, MON[m[1]], +m[2]); if (d > ref) d = new Date(2025, MON[m[1]], +m[2]);
      return d;
    };
    const place = (d) => { const frac = (d - firstDate) / ((nowDate - firstDate) || 1); if (frac < -0.02 || frac > 1.04) return null; const xp = PX + (W - 2 * PX) * Math.max(0, Math.min(1, frac)); return { x: xp, leftPct: Math.max(2, Math.min(80, (xp / W) * 100)), dlab: (d.getMonth() + 1) + "/" + d.getDate() }; };
    const out = [];
    (plan.notes || []).forEach(nt => { const d = parse(nt.when && nt.when.en); if (!d) return; const p = place(d); if (!p) return; out.push({ kind: "note", ...p, label: ko ? "일지 메모" : "Journal note", text: nt.text }); });
    (plan.rules || []).filter(r => r.last && !/never|없음/i.test(r.last)).forEach(r => { const d = parse(r.last); if (!d) return; const p = place(d); if (!p) return; out.push({ kind: "rule", ...p, label: r.name[lang], text: r.when[lang] + " → " + r.then[lang] }); });
    return out;
  })();
  return (
    <div>
      {part !== "track" && <div className="gap-hero">
        <div className="gap-hero-head">
          <div className="gap-headline">
            {(() => { const ko = lang === "ko";
              const refOpts = [
                { value: "bull", target: bullT, name: ko ? "상단" : "bull", full: ko ? "상단 목표가" : "Bull target", color: "var(--r-bull)" },
                { value: "base", target: baseT, name: ko ? "중간" : "base", full: ko ? "중간 목표가" : "Base target", color: "var(--r-base)" },
                { value: "bear", target: bearT, name: ko ? "하단" : "bear", full: ko ? "하단 목표가" : "Bear target", color: "var(--r-bear)" },
              ];
              const RF = refOpts.find(o => o.value === gapRef) || refOpts[0];
              const refT = RF.target; const gp = (refT - px) / px * 100;
              let tone, tag;
              if (gapRef === "base") { tone = gp >= 2 ? "pos" : gp <= -2 ? "neg" : "warn"; tag = ko ? (gp >= 2 ? "저평가" : gp <= -2 ? "고평가" : "적정") : (gp >= 2 ? "Undervalued" : gp <= -2 ? "Overvalued" : "Fair"); }
              else if (gapRef === "bull") { tone = (gp >= 3) ? "pos" : (gp <= -2 ? "pos" : "warn"); tag = ko ? (gp <= -2 ? "상단 돌파" : gp < 3 ? "상단 근접" : "상단 여력") : (gp <= -2 ? "Breakout" : gp < 3 ? "Near bull" : "Upside to bull"); }
              else { tone = gp >= 2 ? "neg" : gp >= -3 ? "warn" : "pos"; tag = ko ? (gp >= 2 ? "하단 이탈" : gp >= -3 ? "하단 근접" : "하단 위") : (gp >= 2 ? "Breaking bear" : gp >= -3 ? "Near bear" : "Above bear"); }
              const refIdx = sc.findIndex(x => x.label && x.label.en === (gapRef === "base" ? "Base" : gapRef === "bull" ? "Bull" : "Bear"));
              const _above = px > refT, _absG = Math.abs(gp).toFixed(0), _near = Math.abs(gp) < 0.5;
              const gapPos = ko ? (_near ? ("현재가가 거의 " + RF.name + "에 닿아 있어요.") : ("현재가는 " + RF.name + "보다 " + _absG + "% " + (_above ? "위" : "아래") + "에 있어요. " + RF.name + "에 도달하려면 " + _absG + "% " + (_above ? "내려가야" : "올라가야") + " 합니다.")) : (_near ? ("Price is right at the " + RF.name + " line.") : ("Price is " + _absG + "% " + (_above ? "above" : "below") + " " + RF.name + ". It must move " + (_above ? "down" : "up") + " " + _absG + "% to reach it."));
              const gapMean = ko ? (gapRef === "bull" ? "상단은 가장 낙관적인 목표 가격입니다. 현재가가 상단보다 낮을수록 오를 여력이 큽니다." : gapRef === "base" ? "중간은 적정가 기준선입니다. 현재가가 중간보다 낮으면 저평가, 높으면 고평가입니다." : "하단은 가장 보수적인 바닥 가격입니다. 하단보다 위에 있을수록 안전합니다.") : (gapRef === "bull" ? "Bull is the most optimistic target. The further price sits below it, the more upside remains." : gapRef === "base" ? "Base is the fair-value line. Below it is undervalued, above it is overvalued." : "Bear is the conservative floor. The higher price sits above it, the safer.");
              return (
              <div className="gap-verdict-hero gap-stat">
                <div className="gap-iv-lab">{ko ? "괴리 · 현재가 vs " : "Gap · price vs "}
                  <MiniDropdown width={188} align="left"
                    trigger={<span className="gap-ref-pick"><span style={{ width: 7, height: 7, borderRadius: "50%", background: RF.color, display: "inline-block", flex: "none" }} />{RF.name}<Lic name="chevron-down" size={10} cls="icon-sm" /></span>}
                    items={refOpts.map(o => ({ value: o.value, label: o.full + " · " + fmtMoney(o.target, plan.cur), on: o.value === gapRef, icon: <span style={{ width: 8, height: 8, borderRadius: "50%", background: o.color, display: "inline-block", flex: "none" }} /> }))}
                    onPick={(v) => setGapRef(v)} />
                  <span className="ind-q">?</span>
                </div>
                <div className={"gap-vh-num " + tone}>{(gp >= 0 ? "+" : "") + gp.toFixed(0) + "%"}<span className="gap-vh-tag">{tag}</span></div>
                <div className="gap-vh-iv">{RF.full}<EditableNum value={refT} cur={plan.cur} cls="gap-vh-iv-num" quickBase={px} onCommit={(nv) => { if (refIdx >= 0 && onUpdateScenario) onUpdateScenario(plan.id, refIdx, { target: nv }); else if (gapRef === "base" && onPatchPlan) onPatchPlan(plan.id, { iv: nv }); }} /></div>
                <span className="fin-tip"><b>{ko ? "괴리 (현재가 vs " + RF.name + ")" : "Gap (price vs " + RF.name + ")"}</b><span className="fin-tip-def">{gapPos}</span><span className="fin-tip-def" style={{ color: "var(--fg-3)", marginTop: 2 }}>{gapMean}</span><span className="fin-tip-f" style={{ color: tone === "neg" ? "var(--neg)" : tone === "warn" ? "var(--r-paused)" : "var(--pos)" }}>{ko ? "현재가 " : "price "}{fmtMoney(px, plan.cur)}{" → "}{RF.name + " "}{fmtMoney(refT, plan.cur)}</span><span className="fin-tip-eg">{ko ? "비교선은 위에서 바꿀 수 있어요 — 하단·중간·상단." : "Switch the target above — bear / base / bull."}</span></span>
              </div>
              ); })()}
            <div className="gap-hl-div" />
            {(() => { const up = (bullT - px) / px * 100, dn = (ivBear - px) / px * 100, mine = plan.avgPrice > 0 ? (bullT - plan.avgPrice) / plan.avgPrice * 100 : null; return (
              <div className="gap-rr">
                <div className={"gap-rr-item gap-stat gap-rr-clk" + (gapRef === "bull" ? " linked linked-up" : "")} onClick={() => setGapRef("bull")} role="button" tabIndex={0}>
                  <div className="gap-rr-lab"><Lic name="arrow-up-right" size={11} cls="icon-sm" color="var(--pos)" />{lang === "ko" ? "상승여력" : "Upside"}<span className="ind-q">?</span></div>
                  <div className="gap-rr-val up">{(up >= 0 ? "+" : "") + up.toFixed(0)}%</div>
                  <span className="fin-tip"><b>{lang === "ko" ? "상승여력" : "Upside"}</b><span className="fin-tip-def">{lang === "ko" ? "지금 현재가에 매수해서 상단 목표가에 도달하면 기대되는 최대 상승 폭입니다." : "Max return if you buy now and price reaches the bull target."}</span><span className="fin-tip-f" style={{ color: "var(--pos)" }}>{lang === "ko" ? "현재가 " : "price "}{fmtMoney(px, plan.cur)}{" → "}{lang === "ko" ? "상단 " : "bull "}{fmtMoney(bullT, plan.cur)}</span></span>
                </div>
                <div className={"gap-rr-item gap-stat gap-rr-clk" + (gapRef === "bear" ? " linked linked-dn" : "")} onClick={() => setGapRef("bear")} role="button" tabIndex={0}>
                  <div className="gap-rr-lab"><Lic name="arrow-down-right" size={11} cls="icon-sm" color="var(--neg)" />{lang === "ko" ? "하방위험" : "Downside"}<span className="ind-q">?</span></div>
                  <div className="gap-rr-val dn">{dn.toFixed(0)}%</div>
                  <span className="fin-tip"><b>{lang === "ko" ? "하방위험" : "Downside"}</b><span className="fin-tip-def">{lang === "ko" ? "보수적인 하단 시나리오가 맞을 경우, 현재가에서 떨어질 수 있는 낙폭입니다." : "How far price could fall if the conservative bear scenario plays out."}</span><span className="fin-tip-f" style={{ color: "var(--neg)" }}>{lang === "ko" ? "현재가 " : "price "}{fmtMoney(px, plan.cur)}{" → "}{lang === "ko" ? "하단 " : "bear "}{fmtMoney(ivBear, plan.cur)}</span></span>
                </div>
                {mine != null && <div className="gap-rr-item gap-rr-mine gap-stat">
                  <div className="gap-rr-lab"><Lic name="user" size={11} cls="icon-sm" color="var(--fg-3)" />{lang === "ko" ? "내 평단 여력" : "My cost"}<span className="ind-q">?</span></div>
                  <div className={"gap-rr-val " + (mine >= 0 ? "up" : "dn")}>{(mine >= 0 ? "+" : "") + mine.toFixed(0)}%</div>
                  <span className="fin-tip"><b>{lang === "ko" ? "내 평단 여력" : "My cost headroom"}</b><span className="fin-tip-def">{lang === "ko" ? "내 평균 매수단가에서 상단 목표가까지 남은 여력입니다." : "Headroom from your average cost up to the bull target."}</span><span className="fin-tip-f" style={{ color: "var(--accent)" }}>{lang === "ko" ? "평단가 " : "avg "}{fmtMoney(plan.avgPrice, plan.cur)}{" → "}{lang === "ko" ? "상단 " : "bull "}{fmtMoney(bullT, plan.cur)}</span></span>
                </div>}
              </div>
            ); })()}
          </div>
          {plan.avgPrice && (() => {
            const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
            // 인사이트와 동일한 진입일 산정: 첫 매수 체결일(회차 이월 시 createdAt)
            const buys = (plan.executions || []).filter(e => e.side === "buy").slice().reverse();
            const L = (typeof computeLedger === "function") ? computeLedger(plan) : { rows: [] };
            const hasCF = L.rows.length > 0 && L.rows[0].type === "open";
            const entryStr = buys.length ? (hasCF ? plan.createdAt : buys[0].date) : plan.createdAt;
            if (!entryStr) return null;
            const m = entryStr.match(/([A-Za-z]{3})\s*(\d+)/);
            if (!m || MON[m[1]] == null) return null;
            const now = new Date(2026, 5, 10);
            let yr = 2026; let d0 = new Date(yr, MON[m[1]], +m[2]); if (d0 > now) { yr = 2025; d0 = new Date(yr, MON[m[1]], +m[2]); }
            const days = Math.max(0, Math.round((now - d0) / 86400000));
            const dateLab = `${String(yr).slice(2)}.${String(MON[m[1]] + 1).padStart(2, "0")}.${String(+m[2]).padStart(2, "0")}`;
            return <div className="gap-dwell">
              <Lic name="calendar" size={13} cls="icon-sm" color="var(--fg-4)" />
              <span>{lang === "ko" ? `${dateLab} 매수 · ${days}일째 보유` : `Bought ${dateLab} · ${days}d held`}</span>
            </div>;
          })()}
        </div>
        <PlanValueBar plan={plan} t={t} lang={lang} onUpdateScenario={onUpdateScenario} onPatchPlan={onPatchPlan} />
      </div>}
      {part !== "head" && <React.Fragment>
      <div className="gap-hero">
        <div className="band-modebar">
          <span className="fcb-lab">{lang === "ko" ? "기간" : "Range"}</span>
          <div className="seg-toggle"><div className={"st" + (range === "6m" ? " active" : "")} onClick={() => setRange("6m")}>6{lang === "ko" ? "개월" : "M"}</div><div className={"st" + (range === "1y" ? " active" : "")} onClick={() => setRange("1y")}>1{lang === "ko" ? "년" : "Y"}</div><div className={"st" + (range === "all" ? " active" : "")} onClick={() => setRange("all")}>{lang === "ko" ? "전체" : "All"}</div></div>
          {(() => { const pHi = Math.max(...pxPts), pLo = Math.min(...pxPts); if (!isFinite(pHi) || pHi <= pLo) return null; const hiIdx = pxPts.indexOf(pHi), loIdx = pxPts.indexOf(pLo); const ql = qlab.slice(qlab.length - n); const rangeLbl = range === "6m" ? (lang === "ko" ? "6개월" : "6M") : range === "1y" ? (lang === "ko" ? "52주" : "52W") : (lang === "ko" ? "전체" : "All"); const pos = Math.round((plan.currentPrice - pLo) / (pHi - pLo) * 100); const ddHi = (plan.currentPrice - pHi) / pHi * 100; const upLo = (plan.currentPrice - pLo) / pLo * 100; return <span className="band-range-stat fin-term">{lang === "ko" ? "최근 범위" : "Range"} <b className="mono">{fmtCompact(pLo, plan.cur)}</b><span className="brs-dash">–</span><b className="mono">{fmtCompact(pHi, plan.cur)}</b><span className="ind-q" style={{ marginLeft: 4 }}>?</span><span className="fin-tip"><span className="gap-tip-q">{lang === "ko" ? `${rangeLbl} 범위 · 시장가` : `${rangeLbl} range`}</span><span className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--fg-4)" }} />{lang === "ko" ? `${rangeLbl} 최고` : "High"} <b>{fmtMoney(pHi, plan.cur)}</b>{ql[hiIdx] && <span style={{ marginLeft: 6, color: "var(--fg-4)", fontWeight: 400 }}>{ql[hiIdx]}</span>}</span><span className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--fg-4)" }} />{lang === "ko" ? `${rangeLbl} 최저` : "Low"} <b>{fmtMoney(pLo, plan.cur)}</b>{ql[loIdx] && <span style={{ marginLeft: 6, color: "var(--fg-4)", fontWeight: 400 }}>{ql[loIdx]}</span>}</span><span className="gap-tip-row gap-tip-price"><span className="gap-tip-dot" style={{ background: "var(--fg)" }} />{lang === "ko" ? "현재가" : "Price"} <b>{fmtMoney(plan.currentPrice, plan.cur)}</b></span><span className="gap-tip-div" /><span className="gap-tip-row"><span className="gap-tip-dot" style={{ background: ddHi >= 0 ? "var(--pos)" : "var(--neg)" }} />{lang === "ko" ? "고점 대비" : "From high"} <b style={{ color: ddHi >= 0 ? "var(--pos)" : "var(--neg)" }}>{ddHi >= 0 ? "+" : ""}{ddHi.toFixed(1)}%</b></span><span className="gap-tip-row"><span className="gap-tip-dot" style={{ background: upLo >= 0 ? "var(--pos)" : "var(--neg)" }} />{lang === "ko" ? "저점 대비" : "From low"} <b style={{ color: upLo >= 0 ? "var(--pos)" : "var(--neg)" }}>{upLo >= 0 ? "+" : ""}{upLo.toFixed(1)}%</b></span></span></span>; })()}
          <span style={{ position: "relative", marginLeft: "auto" }}>
            <button className={"iconbtn" + (gapDisp ? " active" : "")} onClick={() => setGapDisp(v => !v)} title={lang === "ko" ? "표시" : "Display"}><Lic name="sliders-horizontal" size={15} /></button>
            {gapDisp && <React.Fragment>
              <div className="overlay" onClick={() => setGapDisp(false)} />
              <div className="panel" style={{ position: "absolute", top: 32, right: 0, width: 248, padding: 8, zIndex: 45 }}>
                <div className="side-cap" style={{ padding: "4px 8px", margin: 0 }}>{lang === "ko" ? "마커" : "Markers"}</div>
                {[["fills", lang === "ko" ? "체결" : "Fills"], ["notes", lang === "ko" ? "일지" : "Notes"], ["rules", lang === "ko" ? "룰" : "Rules"]].map(([k, l]) => (
                  <div className="v-menu-item" key={k} onClick={() => setPref({ show: { [k]: !gapPrefs.show[k] } })}>
                    <span>{l}</span>
                    <span className={"toggle" + (gapPrefs.show[k] ? " on" : "")} style={{ marginLeft: "auto" }} />
                  </div>
                ))}
                <div className="v-menu-sep" style={{ margin: "6px 4px" }} />
                <div className="side-cap" style={{ padding: "4px 8px", margin: 0 }}>{lang === "ko" ? "목표선" : "Target lines"}</div>
                {[["bull", lang === "ko" ? "상단 선" : "Bull", "var(--r-bull)"], ["base", lang === "ko" ? "중간 선" : "Base", "var(--r-base)"], ["bear", lang === "ko" ? "하단 선" : "Bear", "var(--r-bear)"]].map(([k, l, col]) => (
                  <div className="disp-segrow" key={k}><span className="disp-segrow-lab" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ width: 11, height: 3, borderRadius: 2, background: col, flex: "none" }} />{l}</span>
                    <div className="rb-modebar" style={{ margin: 0 }}>
                      {[["solid", lang === "ko" ? "실선" : "Solid"], ["dash", lang === "ko" ? "점선" : "Dash"], ["thick", lang === "ko" ? "굵게" : "Thick"]].map(([v, vl]) => <div key={v} className={"rb-mode" + (gapPrefs.style[k] === v ? " on" : "")} onClick={() => setPref({ style: { [k]: v } })}>{vl}</div>)}
                    </div>
                  </div>
                ))}
              </div>
            </React.Fragment>}
          </span>
        </div>
        {mode === "gap" && <React.Fragment>
        <div style={{ position: "relative" }} onMouseLeave={() => setHov(null)} onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const rel = (e.clientX - r.left) / r.width * W;
          let i = Math.round((rel - PX) / ((W - 2 * PX) / (n - 1)));
          i = Math.max(0, Math.min(n - 1, i));
          setHov({ i, left: (x(i) / W * 100) });
        }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", cursor: "crosshair" }}>
          <defs>
            <linearGradient id="gapBandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.24" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.03" />
            </linearGradient>
            <filter id="gapGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" /></filter>
          </defs>
          {[0, 0.5, 1].map((f, i) => <line key={i} x1={PX} x2={W - PX} y1={TOP + (H - TOP - BOT) * f} y2={TOP + (H - TOP - BOT) * f} stroke="var(--border)" />)}
          {[0, 0.5, 1].map((f, i) => <text key={"yl" + i} x={PX + 2} y={TOP + (H - TOP - BOT) * f - 4} style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 9.5px var(--font-mono)" }}>{fmtCompact(max - (max - min) * f, plan.cur)}</text>)}
          {gapPrefs.show.fair && <path d={band} fill="url(#gapBandGrad)" />}
          {gapPrefs.show.fair && <path d={band} fill="url(#gapBandGrad)" opacity="0.55" />}
          {gapPrefs.show.fair && <path d={path(fairMid)} fill="none" stroke="var(--fg-3)" strokeWidth="1.4" strokeDasharray="2 4" opacity="0.7" />}
          <path d={gapArea} fill={gapColor} opacity="0.13" />
          {showEntry && mode === "gap" && <g>
            <line x1={xEntry} x2={xEntry} y1={TOP} y2={H - BOT} stroke="var(--fg-3)" strokeWidth="1" strokeDasharray="2 3" opacity="0.65" />
            <rect x={xEntry - 17} y={TOP - 15} width="34" height="13" rx="3" fill="var(--bg-elevated-2)" stroke="var(--border-strong)" strokeWidth="0.75" />
            <text x={xEntry} y={TOP - 5.5} textAnchor="middle" style={{ fill: entryHov ? "var(--fg)" : "var(--fg-2)", font: "var(--fw-semi) 9px var(--font-sans)" }}>{lang === "ko" ? "내 매수" : "Bought"}</text>
            <rect x={xEntry - 15} y={TOP - 15} width="30" height={H - BOT - TOP + 15} fill="transparent" style={{ pointerEvents: "all", cursor: "help" }} onMouseEnter={() => setEntryHov(true)} onMouseLeave={() => setEntryHov(false)} />
          </g>}
          {gapPrefs.show.bull && <path d={stepPathFn(bullPts)} fill="none" stroke="var(--r-bull)" {...lineAttrs("bull")} opacity="0.85" />}
          {gapPrefs.show.bear && <path d={stepPathFn(bearPts)} fill="none" stroke="var(--r-bear)" {...lineAttrs("bear")} opacity="0.85" />}
          {gapPrefs.show.base && <path d={stepPathFn(basePts)} fill="none" stroke="var(--r-base)" strokeWidth="3" strokeLinejoin="round" opacity="0.35" filter="url(#gapGlow)" />}
          {gapPrefs.show.base && <path d={stepPathFn(basePts)} fill="none" stroke="var(--r-base)" {...lineAttrs("base")} strokeLinejoin="round" />}
          {mode === "gap" && [["bull", bullPts, "var(--r-bull)"], ["base", basePts, "var(--r-base)"], ["bear", bearPts, "var(--r-bear)"]].filter(([k]) => gapPrefs.show[k]).map(([k, pts, col]) => pts.map((v, i) => (i > 0 && Math.abs(v - pts[i - 1]) > 0.5) ? <g key={k + "k" + i}><circle cx={x(i)} cy={y(v)} r="3.2" fill="var(--bg-app)" stroke={col} strokeWidth="1.6" /><title>{lang === "ko" ? "목표가 수정 지점" : "Target edited"}</title></g> : null))}
          {gapPrefs.show.price && <path d={path(pxPts)} fill="none" stroke="var(--fg)" strokeWidth="2" strokeLinejoin="round" />}
          {mode === "gap" && gapPrefs.show.fills && fillMarks.map((fm, i) => { const on = fillHov === i; const col = fm.buy ? "var(--r-active)" : "var(--r-closing)"; return (
            <g key={"fm" + i}>
              <line x1={fm.x} x2={fm.x} y1={fm.cy} y2={H - BOT} stroke={col} strokeWidth="1" strokeDasharray="2 2" opacity={on ? 0.6 : 0.28} style={{ pointerEvents: "none" }} />
              <rect x={fm.x - (on ? 5 : 4.2)} y={fm.cy - (on ? 5 : 4.2)} width={on ? 10 : 8.4} height={on ? 10 : 8.4} rx="1.2" transform={`rotate(45 ${fm.x} ${fm.cy})`} fill={col} stroke="var(--bg-app)" strokeWidth="1.5" style={{ pointerEvents: "none" }} />
              <circle cx={fm.x} cy={fm.cy} r="11" fill="transparent" style={{ pointerEvents: "all", cursor: "help" }} onMouseEnter={() => setFillHov(i)} onMouseLeave={() => setFillHov(h => h === i ? null : h)} />
            </g>
          ); })}
          {mode === "gap" && eventTicks.filter(ev => gapPrefs.show[ev.kind === "rule" ? "rules" : "notes"]).map((ev, i) => { const on = evtHov === i; const col = ev.kind === "rule" ? "var(--accent)" : "var(--fg-3)"; return (
            <g key={"ev" + i}>
              <line x1={ev.x} x2={ev.x} y1={H - BOT} y2={H - BOT + 3} stroke={col} strokeWidth="1" opacity={on ? 0.9 : 0.45} style={{ pointerEvents: "none" }} />
              <foreignObject x={ev.x - 7} y={H - BOT + 3} width="14" height="14" style={{ overflow: "visible", pointerEvents: "none" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, opacity: on ? 1 : 0.8 }}>
                  <Lic name={ev.kind === "rule" ? "zap" : "pencil-line"} size={on ? 13 : 11} cls="icon-sm" color={col} />
                </div>
              </foreignObject>
              <rect x={ev.x - 9} y={H - BOT} width="18" height={BOT} fill="transparent" style={{ pointerEvents: "all", cursor: "help" }} onMouseEnter={() => setEvtHov(i)} onMouseLeave={() => setEvtHov(h => h === i ? null : h)} />
            </g>
          ); })}
          {showEntry && mode === "gap" && plan.avgPrice > 0 && plan.avgPrice >= min && plan.avgPrice <= max && <circle cx={xEntry} cy={y(plan.avgPrice)} r="3.5" fill="var(--bg-app)" stroke="var(--fg)" strokeWidth="1.5" />}
          {hov && !entryHov && <line x1={x(hov.i)} x2={x(hov.i)} y1={TOP} y2={H - BOT} stroke="var(--fg-4)" strokeWidth="1" strokeDasharray="3 3" />}
          {hov && !entryHov && <circle cx={x(hov.i)} cy={y(basePts[hov.i])} r="4" fill="var(--r-base)" stroke="var(--bg-app)" strokeWidth="1.5" />}
          {hov && !entryHov && <circle cx={x(hov.i)} cy={y(pxPts[hov.i])} r="4" fill="var(--fg)" stroke="var(--bg-app)" strokeWidth="1.5" />}
          {!hov && <circle className="gap-pulse" cx={x(n - 1)} cy={y(basePts[basePts.length - 1])} r="4" fill="var(--r-base)" />}
          {!hov && <circle cx={x(n - 1)} cy={y(pxPts[pxPts.length - 1])} r="4" fill="var(--fg)" />}
          {!hov && (() => { const xe = x(n - 1), yv = y(basePts[n - 1]), yp = y(pxPts[n - 1]); return <g><line x1={xe} x2={xe} y1={Math.min(yv, yp)} y2={Math.max(yv, yp)} stroke={gapColor} strokeWidth="1.5" strokeDasharray="2 2" opacity="0.75" /><text x={xe - 6} y={(yv + yp) / 2 + 3} textAnchor="end" style={{ fill: gapColor, font: "var(--fw-semi) 10.5px var(--font-mono)" }}>{(gapNow >= 0 ? "+" : "") + gapNow.toFixed(0) + "%"}</text></g>; })()}
          {qlab.slice(qlab.length - n).map((q, i) => <text key={i} x={x(i)} y={H - 10} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} style={{ fill: hov && hov.i === i ? "var(--fg-2)" : "var(--fg-4)", font: "var(--fw-medium) 10px var(--font-sans)" }}>{q}</text>)}
        </svg>
        {entryHov && entryInfo && (() => {
          const leftPct = Math.max(2, Math.min(74, (xEntry / W) * 100));
          return (
            <div className="gap-tip" style={{ left: leftPct + "%" }}>
              <div className="gap-tip-q">{lang === "ko" ? `내 매수 · ${entryLab} 진입` : `My entry · ${entryLab}`}</div>
              <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--fg-3)" }} />{lang === "ko" ? "진입가 (첫 매수)" : "Entry (first buy)"} <b>{fmtMoney(entryInfo.entryPx, plan.cur)}</b></div>
              <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--fg)" }} />{lang === "ko" ? "평단가" : "Avg cost"} <b>{fmtMoney(entryInfo.avg, plan.cur)}</b></div>
              <div className="gap-tip-sub">{lang === "ko" ? `${entryInfo.rounds}회 분할 · 평단까지 가치여력 ${entryInfo.upToVal >= 0 ? "+" : ""}${entryInfo.upToVal.toFixed(0)}%` : `${entryInfo.rounds} buys · ${entryInfo.upToVal >= 0 ? "+" : ""}${entryInfo.upToVal.toFixed(0)}% to value`}</div>
              <div className="gap-tip-gap" style={{ color: entryInfo.ret >= 0 ? "var(--pos)" : "var(--neg)" }}>{lang === "ko" ? "평가손익 " : "P/L "}{entryInfo.ret >= 0 ? "+" : ""}{entryInfo.ret.toFixed(1)}%</div>
            </div>
          );
        })()}
        {fillHov != null && fillMarks[fillHov] && (() => { const fm = fillMarks[fillHov]; const fko = lang === "ko"; const vsPx = (px - fm.price) / fm.price * 100; return (
          <div className="gap-tip" style={{ left: fm.leftPct + "%" }}>
            <div className="gap-tip-q">{(fm.buy ? (fko ? "매수" : "Buy") : (fko ? "매도" : "Sell")) + " · " + fm.dlab}</div>
            <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: fm.buy ? "var(--r-active)" : "var(--r-closing)" }} />{fko ? "체결가" : "Fill"} <b>{fmtMoney(fm.price, plan.cur)}</b></div>
            <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--fg-4)" }} />{fko ? "수량" : "Qty"} <b>{fm.qty}{fko ? "주" : ""}</b></div>
            <div className="gap-tip-gap" style={{ color: vsPx >= 0 ? "var(--pos)" : "var(--neg)" }}>{fko ? "현재가 대비 " : "vs now "}{vsPx >= 0 ? "+" : ""}{vsPx.toFixed(1)}%</div>
          </div>
        ); })()}
        {evtHov != null && eventTicks[evtHov] && (() => { const ev = eventTicks[evtHov]; return (
          <div className="gap-tip" style={{ left: ev.leftPct + "%", top: "auto", bottom: "20px" }}>
            <div className="gap-tip-q"><span className="gap-tip-dot" style={{ background: ev.kind === "rule" ? "var(--r-base)" : "var(--fg-3)" }} />{ev.label} · {ev.dlab}</div>
            <div className="gap-tip-sub" style={{ maxWidth: 220, whiteSpace: "normal", lineHeight: 1.45 }}>{ev.text}</div>
          </div>
        ); })()}
        {hov && !entryHov && fillHov == null && evtHov == null && (() => {
          const ko = lang === "ko";
          const g = (basePts[hov.i] - pxPts[hov.i]) / pxPts[hov.i] * 100;
          const fg = fairMid[hov.i] ? (fairMid[hov.i] - pxPts[hov.i]) / pxPts[hov.i] * 100 : null;
          const leftPct = Math.max(2, Math.min(78, hov.left));
          const pHi = Math.max(...pxPts), pLo = Math.min(...pxPts);
          const rlab = range === "6m" ? (ko ? "6개월" : "6M") : range === "1y" ? (ko ? "1년" : "1Y") : (ko ? "전체" : "All");
          return (
            <div className="gap-tip" style={{ left: leftPct + "%" }}>
              <div className="gap-tip-q">{qlab[hov.i]}</div>
              <div className="gap-tip-cap">{ko ? "내 목표가 · 내가 정함" : "My targets"}</div>
              <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--r-bull)" }} />{ko ? "상단" : "Bull"} <b>{fmtMoney(bullPts[hov.i], plan.cur)}</b></div>
              <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--r-base)" }} />{ko ? "중간" : "Base"} <b>{fmtMoney(basePts[hov.i], plan.cur)}</b></div>
              <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--r-bear)" }} />{ko ? "하단" : "Bear"} <b>{fmtMoney(bearPts[hov.i], plan.cur)}</b></div>
              <div className="gap-tip-div" />
              <div className="gap-tip-cap">{ko ? "펀더멘털 추정 · 앱 계산" : "Fundamental est."}</div>
              <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--fg-3)" }} />{ko ? "추정가" : "Est."} <b>{fairMid[hov.i] ? fmtMoney(fairMid[hov.i], plan.cur) : "—"}</b></div>
              <div className="gap-tip-row gap-tip-price"><span className="gap-tip-dot" style={{ background: "var(--fg)" }} />{ko ? "시장가" : "Price"} <b>{fmtMoney(pxPts[hov.i], plan.cur)}</b></div>
              <div className="gap-tip-gap" style={{ color: g >= 0 ? "var(--pos)" : "var(--neg)" }}>{ko ? "괴리 · 가격 vs 내 중간 " : "Gap "}{g >= 0 ? "+" : ""}{g.toFixed(0)}%</div>
            </div>
          );
        })()}
        </div>
        <div className="gap-legend">
          <span className="gap-leg"><span style={{ display: "inline-flex", gap: 2, marginRight: 5 }}><span className="gap-leg-dot" style={{ background: "var(--r-bull)", margin: 0 }} /><span className="gap-leg-dot" style={{ background: "var(--r-base)", margin: 0 }} /><span className="gap-leg-dot" style={{ background: "var(--r-bear)", margin: 0 }} /></span>{lang === "ko" ? "내 기준 (상·중·하단)" : "My targets"}<span className="fin-term"><span className="ind-q">?</span><span className="fin-tip"><b>{lang === "ko" ? "내 기준 · 내가 정함" : "My targets · you set them"}</b><span className="fin-tip-def">{lang === "ko" ? "시나리오 탭에서 정한 상단(초록)·중간(노랑)·하단(빨강) 목표가입니다. 계단이 진 곳은 목표가를 수정한 시점이에요." : "Bull / base / bear targets you set in Scenarios. Steps mark edits."}</span></span></span></span>
          <span className="gap-leg"><span className="gap-leg-dot" style={{ background: "var(--fg-3)" }} />{lang === "ko" ? "펀더멘털 추정" : "Fundamental est."}<span className="fin-term"><span className="ind-q">?</span><span className="fin-tip"><b>{lang === "ko" ? "펀더멘털 추정 · 앱이 계산" : "Fundamental est. · computed"}</b><span className="fin-tip-def">{lang === "ko" ? "실적(이익 등) × 과거 멀티플 분포로 계산한 참고용 가치입니다. 내 판단이 아니라 데이터가 말하는 값이에요." : "A reference value from fundamentals × historical multiples — data, not my opinion."}</span></span></span></span>
          <span className="gap-leg"><span className="gap-leg-dot" style={{ background: "var(--fg)" }} />{lang === "ko" ? "시장 가격" : "Market price"}<span className="fin-term"><span className="ind-q">?</span><span className="fin-tip"><b>{lang === "ko" ? "시장 가격" : "Market price"}</b><span className="fin-tip-def">{lang === "ko" ? "실제 거래되는 현재 주가입니다." : "The live traded price."}</span></span></span></span>
          {gapPrefs.show.fills && fillMarks.length > 0 && <span className="gap-leg fin-term"><span style={{ display: "inline-flex", marginRight: 5 }}><svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true"><rect x="2.2" y="2.2" width="6.6" height="6.6" rx="1.2" transform="rotate(45 5.5 5.5)" fill="var(--r-active)" stroke="var(--bg-app)" strokeWidth="1.2" /></svg></span>{lang === "ko" ? "내 체결" : "My fills"}<span className="ind-q" style={{ marginLeft: 3 }}>?</span><span className="fin-tip" style={{ left: "auto", right: 0 }}><b>{lang === "ko" ? "내 체결" : "My fills"}</b><span className="fin-tip-def">{lang === "ko" ? "내가 실제로 매수·매도한 지점. 가격선 위 다이아몬드(초록=매수·주황=매도). 점에 올리면 체결가·수량." : "Where you actually bought/sold — diamonds on the price line."}</span></span></span>}
          {gapPrefs.show.notes && eventTicks.some(e => e.kind === "note") && <span className="gap-leg fin-term"><span style={{ display: "inline-flex", marginRight: 5 }}><Lic name="pencil-line" size={11} cls="icon-sm" color="var(--fg-3)" /></span>{lang === "ko" ? "일지" : "Notes"}<span className="ind-q" style={{ marginLeft: 3 }}>?</span><span className="fin-tip" style={{ left: "auto", right: 0 }}><b>{lang === "ko" ? "일지" : "Notes"}</b><span className="fin-tip-def">{lang === "ko" ? "일지에 메모를 남긴 시점. 축 아래 연필 아이콘. 올리면 그날 메모 내용." : "When you logged a journal note — pencil marks below the axis."}</span></span></span>}
          {gapPrefs.show.rules && eventTicks.some(e => e.kind === "rule") && <span className="gap-leg fin-term"><span style={{ display: "inline-flex", marginRight: 5 }}><Lic name="zap" size={11} cls="icon-sm" color="var(--accent)" /></span>{lang === "ko" ? "룰" : "Rules"}<span className="ind-q" style={{ marginLeft: 3 }}>?</span><span className="fin-tip" style={{ left: "auto", right: 0 }}><b>{lang === "ko" ? "룰" : "Rules"}</b><span className="fin-tip-def">{lang === "ko" ? "설정한 규칙이 발동한 시점. 축 아래 번개 아이콘. 올리면 조건·동작." : "When a rule fired — lightning marks below the axis."}</span></span></span>}
        </div>
        <div className="gap-bandcap"><Lic name="info" size={11} cls="icon-sm" color="var(--fg-4)" />{lang === "ko" ? "계단선 = 내가 정한 목표가 · 옅은 띠 = 실적이 말하는 가치(참고) · 흰선 = 시장가" : "Stepped = my target · band = value from fundamentals (ref.) · white = price"}</div>
        {(() => {
          const ko = lang === "ko";
          if (staleReview) return <div className="gap-review gr-warn"><Lic name="bell" size={13} cls="icon-sm" color="currentColor" />{ko ? `기준을 ${monthsSinceReview}개월째 안 바꿨는데, 그 사이 펀더멘털 추정은 ${ivTrend >= 0 ? "+" : ""}${ivTrend.toFixed(0)}% 움직였어요. 목표가를 다시 볼 때일 수 있어요.` : `Base unchanged for ${monthsSinceReview}mo while the fundamental estimate moved ${ivTrend >= 0 ? "+" : ""}${ivTrend.toFixed(0)}%. Time to review targets?`}</div>;
          if (lastSnapQ === 0) return <div className="gap-review"><Lic name="check" size={13} cls="icon-sm" color="currentColor" />{ko ? `생성 이후 기준 변경 없음 — ${monthsSinceReview}개월째 같은 목표가를 유지 중입니다.` : `No change since creation — same target held for ${monthsSinceReview}mo.`}</div>;
          return <div className="gap-review"><Lic name="history" size={13} cls="icon-sm" color="currentColor" />{ko ? `최근 기준 수정: ${monthsSinceReview === 0 ? "이번 분기" : monthsSinceReview + "개월 전"}.` : `Last base edit: ${monthsSinceReview === 0 ? "this quarter" : monthsSinceReview + "mo ago"}.`}</div>;
        })()}
        <div className={"gap-verdict gv-" + diag.tone}>
          <Lic name={diag.icon} size={17} cls="icon-sm" color="currentColor" />
          <div><div className="gap-verdict-lab">{diag.lab}</div><div className="gap-verdict-msg">{diag.msg}</div></div>
        </div>
        </React.Fragment>}
        {(() => {
          const ko = lang === "ko";
          const MEMO_TYPES = [
            { key: "under", icon: "help-circle", color: "var(--fg-4)", label: { ko: "왜 저평가인가", en: "Why undervalued" }, ph: { ko: "시장이 왜 오해·무관심한지 적어두세요…", en: "Why is the market missing this…" } },
            { key: "catalyst", icon: "zap", color: "var(--r-bull)", label: { ko: "재평가 촉매", en: "Re-rating catalyst" }, ph: { ko: "무엇이 시장을 깨울지 적어두세요…", en: "What will wake the market…" } },
            { key: "over", icon: "alert-triangle", color: "var(--r-bear)", label: { ko: "왜 고평가인가", en: "Why overvalued" }, ph: { ko: "시장이 왜 과열됐는지 적어두세요…", en: "Why is the market overheating…" } },
            { key: "range", icon: "move-horizontal", color: "var(--fg-3)", label: { ko: "왜 황보중인가", en: "Why range-bound" }, ph: { ko: "왜 방향을 못 잡고 있는지·무엇을 기다리는지 적어두세요…", en: "Why it's stuck — what the market is waiting for…" } },
            { key: "exit", icon: "log-out", color: "var(--r-closing)", label: { ko: "차익실현 근거", en: "Exit rationale" }, ph: { ko: "언제·왜 차익을 실현할지 적어두세요…", en: "When and why you'll take profit…" } },
            { key: "risk", icon: "shield-alert", color: "var(--neg)", label: { ko: "핵심 리스크", en: "Key risks" }, ph: { ko: "이 논리를 깨뜨릴 위험을 적어두세요…", en: "What could break this thesis…" } },
            { key: "assume", icon: "list-checks", color: "var(--accent)", label: { ko: "가정·체크포인트", en: "Assumptions" }, ph: { ko: "전제와 점검 항목을 적어두세요…", en: "Key assumptions to check…" } },
          ];
          const byKey = k => MEMO_TYPES.find(mm => mm.key === k) || MEMO_TYPES[0];
          const LEFT = ["under", "over", "range"], RIGHT = ["catalyst", "exit", "risk", "assume"];
          const closing = plan.status === "closing";
          const slot = (tp, field, slotKey, groupKeys) => (
            <div className="gap-card">
              <div className="gap-card-h">
                <MiniDropdown width={184} trigger={<span className="gap-memo-pick"><Lic name={tp.icon} size={14} cls="icon-sm" color={tp.color} />{tp.label[lang]}<Lic name="chevron-down" size={12} cls="icon-sm" color="var(--fg-4)" /></span>}
                  items={groupKeys.map(byKey).map(mm => ({ value: mm.key, label: mm.label[lang], icon: <Lic name={mm.icon} size={14} cls="icon-sm" color={mm.color} />, on: tp.key === mm.key }))}
                  onPick={v => onPatchPlan && onPatchPlan(plan.id, { [slotKey]: v })} />
              </div>
              <div className="gap-card-b gap-edit" contentEditable suppressContentEditableWarning data-ph={tp.ph[lang]}
                onBlur={e => { const v = e.target.textContent.trim(); if (onPatchPlan) onPatchPlan(plan.id, { [field]: { en: v, ko: v } }); }}>{(plan[field] || {})[lang]}</div>
            </div>
          );
          return (
            <div className="gap-memos">
              <div className="gap-cards-cap"><Lic name="pencil-line" size={12} cls="icon-sm" color="var(--fg-4)" />{ko ? "내 논거 메모 — 왼쪽: 왜(진단) → 오른쪽: 그래서(전망)" : "My thesis — left: why → right: what next"}</div>
              <div className="gap-cards">
                {slot(byKey(plan.memo1Type || (closing ? "over" : "under")), "gapReason", "memo1Type", LEFT)}
                {slot(byKey(plan.memo2Type || (closing ? "exit" : "catalyst")), "catalyst", "memo2Type", RIGHT)}
              </div>
            </div>
          );
        })()}
      </div>
      </React.Fragment>}
    </div>
  );
}

function DetailView({ plan, t, lang, initialTab, onBack, onStatus, onToggleRule, onAddRule, onPatchRule, onRemoveRule, onUpdateScenario, onAddScenario, onRemoveScenario, onAddExec, onPatchPlan, onCreatePortfolio, onOpenSecurity, onOpenStrategy, rightCollapsed, onToggleRight }) {
  const [tab, setTab] = React.useState((initialTab === "gap" ? "scenarios" : initialTab) || "scenarios");
  React.useEffect(() => { if (initialTab) setTab(initialTab === "gap" ? "scenarios" : initialTab); }, [plan.id, initialTab]);
  const strat = STRATEGIES.find(s => s.id === plan.strategyId);
  const ret = planReturn(plan);
  const isClosed = plan.status === "closed";
  const co = isClosed ? closeoutSummary(plan) : null;
  const fillPct = plan.divisions ? Math.round(plan.round / plan.divisions * 100) : null;
  const tabs = [
    { key: "scenarios", label: t.scenarios, num: plan.scenarios.length,
      tip: { ko: ["전략과는 무관하게 하단·중간·상단의 가상 목표가 시나리오를 세우고, 각 시나리오와 현재가의 괴리(그리고 기대수익률·IRR)를 보여줍니다.", "그 금액을 매수·손절·익절선으로 보든, 펀더멘털 적정가로 보든 — 해석은 당신의 자유입니다."],
            en: ["Independently of your strategy, set hypothetical bear / base / bull target prices and see the gap (and expected IRR) between each scenario and the current price.", "Read those levels as buy / stop / take-profit lines or as fundamental fair value — the interpretation is entirely yours."] } },
    { key: "strategy", label: lang === "ko" ? "전략" : "Strategy",
      tip: { ko: ["이 플랜을 실제로 어떻게 사고팔지 — 매매 전략(무한매수법·정액분할 등)의 회차·규칙·다음 액션을 관리합니다.", "'얼마가 적정한가'(밸류에이션·시나리오)가 아니라 '어떻게 실행하나'를 다룹니다."],
            en: ["How you actually buy and sell this plan — manage the strategy's rounds, rules, and next action.", "About execution, not 'what it's worth' (that's Valuation / Scenarios)."] } },
    { key: "financials", label: lang === "ko" ? "재무제표" : "Financials",
      tip: { ko: ["손익계산서·재무상태표·현금흐름표 — 회사의 분기/연간 실적 원자료입니다.", "해석이 아니라 숫자 그 자체. 투자지표·밸류에이션 탭이 이 데이터를 가공해 판단을 만듭니다."],
            en: ["Income statement, balance sheet, cash flow — the company's raw quarterly/annual results.", "Just the numbers; the Metrics and Valuation tabs turn this into judgments."] } },
    { key: "indicators", label: lang === "ko" ? "투자지표" : "Metrics",
      tip: { ko: ["PER·ROE·부채비율 등 핵심 지표를 동종업체·과거와 비교해 비싼지/우량한지 가늠합니다.", "적정주가를 '계산'하는 밸류에이션과 달리, 여기선 지표로 '비교'만 합니다."],
            en: ["Compare key ratios (PER, ROE, debt) against peers and history to gauge cheap / quality.", "Unlike Valuation, which computes a fair price, this only compares."] } },
    { key: "valuation", label: t.val_tab,
      tip: { ko: ["DCF·PER 밴드 등 모델로 이 종목의 적정주가를 직접 산출하고, 그 값을 시나리오 목표가로 바로 적용할 수 있어요.", "지표(비교)와 달리 '얼마가 적정가인가'를 계산하는 곳입니다."],
            en: ["Compute a fair price with models (DCF, PER bands); apply the result straight to your scenario targets.", "Unlike Metrics (which compares), this calculates what's fair."] } },
    { key: "insights", label: t.insights,
      tip: { ko: ["가격과 기준 가치의 추세를 자동으로 진단합니다 — 동행 중 / 노이즈·기회 / 투자 논리 훼손 중 무엇인지 알려줘요.", "당신이 입력하는 게 아니라, 앱이 데이터를 읽고 만들어내는 해석입니다."],
            en: ["Auto-diagnoses the trend of price vs your base value — on track / noise·opportunity / thesis impaired.", "The app reads your data and interprets; you don't fill this in."] } },
    { key: "executions", label: t.executions, num: plan.executions.length,
      tip: { ko: ["실제 매수·매도 내역을 입력·관리하고, 평단가와 실현손익을 자동 계산합니다.", "전략의 회차·평단은 이 체결 기록에서 집계돼요 — 모든 수치의 출발점입니다."],
            en: ["Log your actual buy/sell fills; average cost and realized P/L are computed automatically.", "The strategy's rounds and avg cost roll up from here — the source of every number."] } },
    { key: "activity", label: t.activity,
      tip: { ko: ["체결·규칙 트리거·수정 등 이 플랜에서 일어난 모든 변경의 시간순 이력입니다.", "무엇이 언제 바뀌었는지 되짚는 로그 — 분석이 아니라 기록입니다."],
            en: ["A chronological log of everything in this plan — fills, rule triggers, edits.", "A record to look back on, not analysis."] } },
  ];
  return (
    <div className="detail-wrap">
      <div className="detail-main">
        <div className="detail-inner">
          <div className="dt-crumb">
            <span className="c-link" onClick={onBack}><Lic name="chevron-left" size={13} cls="icon-sm" color="inherit" /></span>
            <span className="c-link" onClick={onBack}>{t.plans}</span>
            <Lic name="chevron-right" size={12} cls="icon-sm" color="var(--fg-4)" />
            <span>{plan.id}</span>
            {onToggleRight && rightCollapsed && <button className="iconbtn rp-toggle" onClick={onToggleRight} title={t.showProps}><PanelIcon side="right" size={15} /></button>}
          </div>
          <div className="dt-headrow">
            <MiniDropdown trigger={<span className="dt-statuspick"><StatusIcon status={plan.status} size={14} />{t["s_" + plan.status]}<Lic name="chevron-down" size={13} cls="icon-sm" color="var(--fg-4)" /></span>}
              items={STATUS_ORDER.map(s => ({ value: s, label: t["s_" + s], icon: <StatusIcon status={s} size={14} />, on: plan.status === s }))} onPick={(v) => onStatus(plan.id, v)} />
            {onPatchPlan && (() => { const hpf = PORTFOLIOS.find(p => p.id === plan.portfolioId); return (
              <MiniDropdown width={200}
                trigger={<span className="strat-badge pick"><span className="pf-dot" style={{ background: hpf ? hpf.color : "var(--fg-4)" }} />{hpf ? hpf.name[lang] : t.portfolio}<Lic name="chevron-down" size={12} cls="icon-sm" color="var(--fg-4)" /></span>}
                items={[{ value: null, label: t.noPortfolio, icon: <span className="pf-dot" style={{ background: "var(--fg-4)" }} />, on: !plan.portfolioId }].concat(PORTFOLIOS.map(p => ({ value: p.id, label: p.name[lang], icon: <span className="pf-dot" style={{ background: p.color }} />, on: plan.portfolioId === p.id })))}
                onPick={(v) => onPatchPlan(plan.id, { portfolioId: v })}
                onCreate={onCreatePortfolio ? (name) => onCreatePortfolio(plan.id, name) : undefined} createLabel={t.newPortfolio} />
            ); })()}
            {onPatchPlan && (() => { const ex = (typeof EXEC_STRATEGIES !== "undefined") ? EXEC_STRATEGIES.find(s => s.id === plan.execId) : null; return (
              <MiniDropdown width={200}
                trigger={ex
                  ? <span className="strat-badge pick"><span className="strat-dot" style={{ background: ex.color }} />{ex.name[lang]}<Lic name="chevron-down" size={12} cls="icon-sm" color="var(--fg-4)" /></span>
                  : <span className="strat-badge pick empty"><Lic name="plus" size={12} cls="icon-sm" color="var(--fg-4)" />{t.strategy}<Lic name="chevron-down" size={12} cls="icon-sm" color="var(--fg-4)" /></span>}
                items={[{ value: null, label: t.noStrategy, icon: <span className="strat-dot" style={{ background: "var(--fg-4)" }} />, on: !ex }].concat(EXEC_STRATEGIES.map(s => ({ value: s.id, label: s.name[lang], icon: <span className="strat-dot" style={{ background: s.color }} />, on: plan.execId === s.id })))}
                onPick={(v) => onPatchPlan(plan.id, { execId: v })} />
            ); })()}
          </div>
          <div className="dt-tickerline" style={{ cursor: onOpenSecurity ? "pointer" : "default" }} onClick={() => onOpenSecurity && onOpenSecurity(plan.ticker)}><Flag market={plan.cur === "KRW" ? "KR" : "US"} size={14} /><b style={{ color: "var(--fg)", fontWeight: 600 }}>{plan.tickerName[lang]}</b> · <span className="mono">{plan.ticker}</span><Lic name="arrow-up-right" size={13} cls="icon-sm" color="var(--fg-4)" /></div>
          <h1 className="dt-title">{plan.name[lang]}</h1>

          <div className="metric-row">
            {isClosed ? <>
              <div className="metric" title={t.tip_exitPrice}><div className="metric-lab">{t.exitPrice}</div><div className="metric-val">{co.avgSell != null ? fmtMoney(co.avgSell, plan.cur) : "—"}</div></div>
              <div className="metric" title={t.tip_avgCost}><div className="metric-lab">{t.avg}</div><div className="metric-val sm">{fmtMoney(co.avgBuy, plan.cur)}</div></div>
              <div className="metric"><div className="metric-lab">{t.realizedPL}</div><div className={"metric-val " + (co.realized >= 0 ? "pos" : "neg")}>{(co.realized >= 0 ? "+" : "") + fmtCompact(co.realized, plan.cur)}</div></div>
              <div className="metric"><div className="metric-lab">{t.realizedRet}</div><div className={"metric-val sm " + (co.realizedPct == null ? "" : co.realizedPct >= 0 ? "pos" : "neg")}>{co.realizedPct == null ? "—" : (co.realizedPct >= 0 ? "+" : "") + co.realizedPct.toFixed(1) + "%"}</div></div>
              <div className="metric"><div className="metric-lab">{t.holdPeriod}</div><div className="metric-val sm">{co.holdDays != null ? co.holdDays + (lang === "ko" ? "일" : "d") : "—"}</div>{co.firstBuy && co.closedAt && <div className="metric-sub">{fmtDate(co.firstBuy, lang)} → {fmtDate(co.closedAt, lang)}</div>}</div>
            </> : <>
              <div className="metric" title={t.tip_current}><div className="metric-lab">{t.current}</div><div key={plan.tickN || 0} className={"metric-val" + (plan.tickDir ? " tick-" + plan.tickDir : "")}>{fmtMoney(plan.currentPrice, plan.cur)}</div></div>
              <div className="metric" title={t.tip_avgCost}><div className="metric-lab">{t.avg}</div><div className="metric-val sm">{fmtMoney(plan.avgPrice, plan.cur)}</div></div>
              <div className="metric" title={t.tip_retRate}><div className="metric-lab">{t.retRate}</div><div className={"metric-val " + (ret ? (ret.rate >= 0 ? "pos" : "neg") : "")}>{ret ? (ret.rate >= 0 ? "+" : "") + ret.rate.toFixed(1) + "%" : "—"}</div></div>
              <div className="metric metric--tip"><div className="metric-lab">{t.retAmt}</div><div className={"metric-val sm " + (ret ? (ret.amt >= 0 ? "pos" : "neg") : "")}>{ret ? fmtCompact(ret.amt, plan.cur) : (plan.realizedPL ? "+" + fmtCompact(plan.realizedPL, plan.cur) : "—")}</div>
                {ret && plan.avgPrice > 0 && <span className="metric-tip">
                  <span className="sc-tl-tip-h">{lang === "ko" ? "평가손익 계산" : "Unrealized P/L"}</span>
                  <span className="sc-tl-tip-row"><span>{lang === "ko" ? "보유 수량" : "Shares"}</span><b className="mono">{(plan.totalShares || 0).toLocaleString("en-US")}{lang === "ko" ? "주" : ""}</b></span>
                  <span className="sc-tl-tip-row"><span>{lang === "ko" ? "현재가 − 평단" : "Price − avg"}</span><b className="mono">{fmtMoney(plan.currentPrice, plan.cur)} − {fmtMoney(plan.avgPrice, plan.cur)}</b></span>
                  <span className="sc-tl-tip-row"><span>{lang === "ko" ? "주당 손익" : "Per share"}</span><b className={"mono " + (plan.currentPrice - plan.avgPrice >= 0 ? "pos" : "neg")}>{(plan.currentPrice - plan.avgPrice >= 0 ? "+" : "") + fmtMoney(plan.currentPrice - plan.avgPrice, plan.cur)}</b></span>
                  <span className="sc-tl-tip-row" style={{ borderTop: "1px solid var(--border)", paddingTop: "6px", marginTop: "1px" }}><span>{lang === "ko" ? "평가손익" : "Total P/L"}</span><b className={"mono " + (ret.amt >= 0 ? "pos" : "neg")}>{(ret.amt >= 0 ? "+" : "") + fmtCompact(ret.amt, plan.cur)} · {(ret.rate >= 0 ? "+" : "") + ret.rate.toFixed(1)}%</b></span>
                </span>}
              </div>
              <div className="metric" title={t.tip_progress}><div className="metric-lab">{t.progress}</div><div className="metric-val sm">{fillPct != null ? plan.round + "/" + plan.divisions : "—"}</div>{plan.totalInvested > 0 && <div className="metric-sub">{t.invested} {fmtCompact(plan.totalInvested, plan.cur)}</div>}</div>
            </>}
            <div className="metric-spark"><Sparkline plan={plan} w={96} h={34} /></div>
          </div>

          <div className="dt-tabs">
            {tabs.map(tb => (
              <div key={tb.key} className={"dt-tab" + (tab === tb.key ? " active" : "")} data-coach-tab={tb.key} onClick={() => setTab(tb.key)}>
                {tb.label}{tb.num != null && <span className="tab-num">{tb.num}</span>}
                {tb.tip && <span className="dt-tab-tip">
                  <b>{tb.label}</b>
                  <span className="dt-tab-tip-def">{tb.tip[lang][0]}</span>
                  <span className="dt-tab-tip-note">{tb.tip[lang][1]}</span>
                </span>}
              </div>
            ))}
          </div>

          {tab === "scenarios" && <ScenariosTab plan={plan} t={t} lang={lang} onUpdateScenario={onUpdateScenario} onAddScenario={onAddScenario} onRemoveScenario={onRemoveScenario} onPatchPlan={onPatchPlan} onGotoValuation={() => setTab("valuation")} />}
          {tab === "valuation" && <ValuationView plan={plan} t={t} lang={lang} onApplyTargets={(tg) => { if (onUpdateScenario) applyFairTargets(plan, tg, onUpdateScenario); if (onPatchPlan && tg && tg.base > 0) onPatchPlan(plan.id, { iv: tg.base }); }} />}
          {tab === "financials" && <FinancialsTab plan={plan} t={t} lang={lang} onPatchPlan={onPatchPlan} />}
          {tab === "indicators" && <IndicatorsTab plan={plan} t={t} lang={lang} onPatchPlan={onPatchPlan} />}
          {tab === "executions" && <ExecutionsTab plan={plan} t={t} lang={lang} onAddExec={onAddExec} />}
          {tab === "strategy" && <StrategyTab plan={plan} t={t} lang={lang} onToggle={(rid) => onToggleRule(plan.id, rid)} onAdd={onAddRule} onPatch={onPatchRule} onRemove={onRemoveRule} onPatchPlan={onPatchPlan} />}
          {tab === "insights" && <PlanInsights plan={plan} t={t} lang={lang} />}
          {tab === "activity" && <ActivityTab plan={plan} lang={lang} />}
        </div>
      </div>
      {!rightCollapsed && <PropsSidebar plan={plan} t={t} lang={lang} onStatus={onStatus} onPatchPlan={onPatchPlan} onCreatePortfolio={onCreatePortfolio} onOpenSecurity={onOpenSecurity} onToggleRight={onToggleRight} />}
    </div>
  );
}
function LensPicker({ value, onPick, lang, variant = "chip", width = 200 }) {
  const ko = lang === "ko";
  const fws = (typeof STRATEGIES !== "undefined" ? STRATEGIES : []).filter(s => s.model);
  const isNone = !value || value === "none";
  const cur = isNone ? null : fws.find(s => s.id === value);
  const noneLabel = ko ? "관점 없음" : "No lens";
  const items = [{ value: "none", label: noneLabel, icon: <Lic name="circle-off" size={13} cls="icon-sm" color="var(--fg-4)" />, on: isNone }].concat(fws.map(s => ({ value: s.id, label: s.name[lang], icon: <span className="strat-dot" style={{ background: s.color }} />, on: !isNone && value === s.id })));
  const trigger = variant === "toolbar"
    ? <span className={"scv-fw-pick" + (isNone ? " scv-fw-none" : "")}>{isNone ? <Lic name="circle-off" size={13} cls="icon-sm" color="var(--fg-4)" /> : <span className="strat-dot" style={{ background: cur.color }} />}{isNone ? noneLabel : cur.name[lang]}<Lic name="chevron-down" size={13} cls="icon-sm" color="var(--fg-4)" /></span>
    : (cur
      ? <span className="fin-lens-chip pick" style={{ color: cur.color, background: "color-mix(in srgb, " + cur.color + " 13%, transparent)" }}><span className="strat-dot" style={{ background: cur.color }} />{cur.name[lang]}<Lic name="chevron-down" size={11} cls="icon-sm" color={cur.color} /></span>
      : <span className="fin-lens-chip pick" style={{ color: "var(--fg-3)", background: "var(--bg-elevated-2)" }}><Lic name="circle-off" size={12} cls="icon-sm" color="var(--fg-4)" />{noneLabel}<Lic name="chevron-down" size={11} cls="icon-sm" color="var(--fg-4)" /></span>);
  return <MiniDropdown width={width} align="left" lang={lang} trigger={trigger} items={items} onPick={onPick} />;
}
Object.assign(window, { DetailView, Simulator, MiniDropdown, LensPicker });
