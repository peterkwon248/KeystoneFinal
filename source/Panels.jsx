// Panels.jsx — working Filter popover + Display popover, plus filter/group helpers

/* ---- strategy categories (3 built-in + any custom) ---- */
function strategyCats(t) {
  const ko = t && t.status === "상태";
  return (typeof EXEC_CATS !== "undefined" ? EXEC_CATS : []).map(c => [c.id, c.label[ko ? "ko" : "en"]]);
}
function catOfPlan(plan) {
  const s = EXEC_STRATEGIES.find(x => x.id === plan.execId);
  return s ? (s.cat || "accum") : "none";
}
function fwCatOfPlan(plan) {
  const s = (typeof STRATEGIES !== "undefined") ? STRATEGIES.find(x => x.id === plan.strategyId) : null;
  return (s && s.model) ? (s.cat || "multiple") : "none";
}
const FW_CATS = (ko) => [["multiple", ko ? "멀티플" : "Multiple"], ["intrinsic", ko ? "내재가치" : "Intrinsic"], ["asset", ko ? "자산" : "Asset"]];

/* ---- filter categories ---- */
function filterCats(t, lang) {
  return [
    { type: "status", label: t.status, options: STATUS_ORDER.map(s => ({ value: s, label: t["s_" + s], icon: <StatusIcon status={s} size={14} /> })) },
    { type: "portfolio", label: t.portfolio, options: PORTFOLIOS.map(p => ({ value: p.id, label: p.name[lang], icon: <span className="pf-dot" style={{ background: p.color }} /> })).concat([{ value: "none", label: t.noPortfolio, icon: <span className="pf-dot" style={{ background: "var(--fg-4)" }} /> }]) },
    { type: "strategy", label: t.strategy, headerType: "category",
      groups: strategyCats(t).map(([cv, clab]) => ({ value: cv, label: clab, icon: <Lic name={{ accum: "layers", rebalance: "scale", signal: "activity" }[cv] || "shapes"} size={13} cls="icon-sm" color="var(--fg-3)" />, items: EXEC_STRATEGIES.filter(s => (s.cat || "accum") === cv).map(s => ({ value: s.id, label: s.name[lang], icon: <span className="strat-dot" style={{ background: s.color }} /> })) })),
      head: [{ value: "none", label: t.noStrategy, icon: <span className="strat-dot" style={{ background: "var(--fg-4)" }} /> }] },
    { type: "scenario", label: t.scenStatus, options: ["approaching", "realized", "invalidated", "tracking"].map(v => ({ value: v, label: t["scn_st_" + v], icon: <Lic name={{ approaching: "target", realized: "circle-check", invalidated: "circle-x", tracking: "activity" }[v] || "circle-dot"} size={13} cls="icon-sm" color={{ approaching: "var(--r-base)", realized: "var(--pos)", invalidated: "var(--neg)", tracking: "var(--fg-3)" }[v] || "var(--fg-3)"} /> })) },
    { type: "return", label: t.returnCat, options: [
      { value: "profit", label: t.inProfit, icon: <Lic name="trending-up" size={13} cls="icon-sm" color="var(--pos)" /> },
      { value: "loss", label: t.inLoss, icon: <Lic name="trending-down" size={13} cls="icon-sm" color="var(--neg)" /> },
    ] },
  ];
}

// does a plan pass the active filters?
function matchesFilters(plan, filters) {
  return Object.entries(filters).every(([type, vals]) => {
    if (!vals || !vals.length) return true;
    if (type === "status") return vals.includes(plan.status);
    if (type === "portfolio") return vals.includes(plan.portfolioId || "none");
    if (type === "strategy") return vals.includes(plan.execId || "none");
    if (type === "framework") return vals.includes(plan.strategyId || "none");
    if (type === "category") return vals.includes(catOfPlan(plan));
    if (type === "fwcategory") return vals.includes(fwCatOfPlan(plan));
    if (type === "scenario") return (plan.scenarios || []).some(s => vals.includes(s.status));
    if (type === "return") {
      const r = planReturn(plan);
      if (!r) return false;
      return (vals.includes("profit") && r.rate >= 0) || (vals.includes("loss") && r.rate < 0);
    }
    if (type === "gap") {
      if (plan.iv == null) return false;
      const g = (plan.iv - plan.currentPrice) / plan.currentPrice * 100;
      return (vals.includes("deep") && g >= 12) || (vals.includes("near") && plan.currentPrice >= plan.iv * 0.97) || (vals.includes("mos") && plan.currentPrice <= plan.iv * 0.9);
    }
    if (type === "dwell") return vals.includes("long") && (plan.gapMonths || 0) >= 9;
    return true;
  });
}

// label for a chip value
function filterValueLabel(type, value, t, lang) {
  if (type === "status") return t["s_" + value];
  if (type === "scenario") return t["scn_st_" + value] || value;
  if (type === "portfolio") return value === "none" ? t.noPortfolio : ((PORTFOLIOS.find(p => p.id === value) || {}).name?.[lang] || value);
  if (type === "strategy") return value === "none" ? t.noStrategy : ((EXEC_STRATEGIES.find(s => s.id === value) || {}).name?.[lang] || value);
  if (type === "framework") return value === "none" ? t.noFramework : ((STRATEGIES.find(s => s.id === value) || {}).name?.[lang] || value);
  if (type === "category") return (strategyCats(t).find(c => c[0] === value) || [, value])[1];
  if (type === "fwcategory") return (FW_CATS(lang === "ko").find(c => c[0] === value) || [, value])[1];
  if (type === "return") return value === "profit" ? t.inProfit : t.inLoss;
  if (type === "gap") return { deep: lang === "ko" ? "저평가 깊은" : "Deep", near: lang === "ko" ? "목표가 근접" : "Near", mos: lang === "ko" ? "안전마진" : "Mgn of safety" }[value] || value;
  if (type === "dwell") return lang === "ko" ? "오래 기다린" : "Long-waiting";
  return value;
}
const FILTER_TYPE_LABEL = (type, t, lang) => { const ko = lang ? lang === "ko" : t.lang === "ko"; return ({ status: t.status, portfolio: t.portfolio, category: (ko ? "전략 카테고리" : "Strategy category"), fwcategory: (ko ? "관점 카테고리" : "Framework category"), strategy: t.strategy, framework: t.framework, scenario: t.scenStatus, return: t.returnCat, gap: (ko ? "갭" : "Gap"), dwell: (ko ? "체류" : "Dwell") }[type] || type); };

// human-readable one-line description of a saved view's filters
function describeFilters(filters, t, lang) {
  return Object.entries(filters || {}).map(([type, vals]) =>
    FILTER_TYPE_LABEL(type, t, lang) + "=" + vals.map(v => filterValueLabel(type, v, t, lang)).join(", ")
  ).join(" · ");
}

/* ---- Filter popover ---- */
function FilterPanel({ t, lang, filters, onToggle, onClose, anchor, cats: catsProp }) {
  const cats = catsProp || filterCats(t, lang);
  const ko = lang === "ko";
  const [open, setOpen] = React.useState(null); // axis type whose flyout is open (on hover)
  const [fq, setFq] = React.useState("");
  React.useEffect(() => { setFq(""); }, [open]);
  const active = (type) => (filters[type] || []).length;
  const axisIcon = { status: "circle-dashed", portfolio: "folder", strategy: "git-branch", framework: "gauge", scenario: "circle-dot", return: "trending-up" };
  const axisCount = (cat) => active(cat.type) + (cat.headerType ? active(cat.headerType) : 0);
  return <>
    <div className="overlay" onClick={onClose} />
    <div className={"panel flt-menu" + (anchor ? " anchored" : "") + (anchor && anchor.flyout === "left" ? " fly-left" : "")} style={anchor ? { position: "fixed", left: anchor.left, top: anchor.top, width: 230, zIndex: 45 } : { top: 84, right: 52, width: 230, zIndex: 45 }} onMouseLeave={() => setOpen(null)}>
      <div className="flt-head">{ko ? "필터 추가…" : "Add filter…"}<span className="flt-kbd">F</span></div>
      {cats.map(cat => {
        const on = open === cat.type;
        const Item = ({ type, o }) => { const sel = (filters[type] || []).includes(o.value); return (
          <div className={"v-menu-item" + (o.n === 0 ? " flt-zero" : "")} onClick={(e) => { e.stopPropagation(); onToggle(type, o.value); }}>
            {o.icon}<span>{o.label}</span>
            {o.n != null && <span className="flt-optn">{o.n}</span>}
            {sel && <span className="check"><Lic name="check" size={14} cls="icon-sm" color="var(--accent)" /></span>}
          </div>
        ); };
        return (
          <div className={"v-menu-item flt-axis" + (on ? " hot" : "")} key={cat.type} onMouseEnter={() => setOpen(cat.type)}>
            <Lic name={axisIcon[cat.type] || cat.axis || "circle"} size={14} cls="icon-sm" color="var(--fg-3)" />
            <span>{cat.label}</span>
            {axisCount(cat) > 0 && <span className="flt-count">{axisCount(cat)}</span>}
            <Lic name="chevron-right" size={14} cls="icon-sm" color="var(--fg-4)" />
            {on && (
              <div className="flt-flyout" onMouseEnter={() => setOpen(cat.type)}>
                {(() => {
                  const total = cat.groups ? cat.groups.reduce((a, g) => a + g.items.length, 0) + (cat.head || []).length : (cat.options || []).length;
                  const showSearch = total >= 8;
                  const qq = showSearch ? fq.trim().toLowerCase() : "";
                  const match = o => !qq || (o.label || "").toLowerCase().includes(qq) || (o.value || "").toLowerCase().includes(qq);
                  const searchRow = showSearch ? <div className="flt-search" onClick={(e) => e.stopPropagation()}><Lic name="search" size={13} cls="icon-sm" color="var(--fg-4)" /><input autoFocus value={fq} onChange={(e) => setFq(e.target.value)} placeholder={ko ? "검색…" : "Search…"} /></div> : null;
                  if (cat.groups) {
                    const head = (cat.head || []).filter(match);
                    const grps = cat.groups.map(g => ({ ...g, items: g.items.filter(match) })).filter(g => g.items.length);
                    return <React.Fragment>
                      {searchRow}
                      {head.map(o => <Item key={o.value} type={cat.type} o={o} />)}
                      {head.length > 0 && <div className="flt-head-sep" />}
                      {grps.map(g => (
                        <div className="flt-group" key={g.value}>
                          <div className="flt-group-head" onClick={(e) => { e.stopPropagation(); onToggle(cat.headerType, g.value); }}>
                            {<span>{g.label}</span>}
                            <span className="flt-group-hint">{ko ? "묶음" : "all"}</span>
                            {(filters[cat.headerType] || []).includes(g.value) && <span className="check"><Lic name="check" size={14} cls="icon-sm" color="var(--accent)" /></span>}
                          </div>
                          {g.items.map(o => <Item key={o.value} type={cat.type} o={o} />)}
                        </div>
                      ))}
                    </React.Fragment>;
                  }
                  const opts = (cat.options || []).filter(match);
                  return <React.Fragment>{searchRow}{opts.length ? opts.map(o => <Item key={o.value} type={cat.type} o={o} />) : <div className="flt-empty">{ko ? "일치하는 항목 없음" : "No match"}</div>}</React.Fragment>;
                })()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </>;
}

/* ---- Display popover ---- */
function DisplayPanel({ t, lang, mode, setMode, grouping, setGrouping, ordering, setOrdering, showEmpty, setShowEmpty, props, toggleProp, tlMode, setTlMode, tlOverlays, setTlOverlays, tlYMode, setTlYMode, onClose }) {
  const seg = (cur, set, opts) => (
    <div className="rb-modebar" style={{ margin: 0 }}>
      {opts.map(([v, lab]) => <div key={v} className={"rb-mode" + (cur === v ? " on" : "")} onClick={() => set(v)}>{lab}</div>)}
    </div>
  );
  const segWide = (cur, set, opts) => (
    <div className="rb-modebar rb-modebar-wide">
      {opts.map(([v, lab]) => <div key={v} className={"rb-mode" + (cur === v ? " on" : "")} onClick={() => set(v)}>{lab}</div>)}
    </div>
  );
  const SegRow = ({ label, value, set, opts }) => (
    <div className="disp-segrow">
      <span className="disp-segrow-lab">{label}</span>
      {seg(value, set, opts)}
    </div>
  );
  const Row = ({ label, children }) => <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "7px 8px" }}>
    <span style={{ font: "var(--fw-medium) 12px var(--font-sans)", color: "var(--fg-3)" }}>{label}</span>{children}
  </div>;
  const propRows = [["gauge", t.c_gauge], ["spark", t.c_spark], ["return", t.c_return], ["fill", t.c_fill], ["strategy", t.c_strategy]];
  const Properties = () => <>
    <div style={{ height: 1, background: "var(--border)", margin: "6px 4px" }} />
    <div className="side-cap" style={{ padding: "4px 8px", margin: 0 }}>{t.properties}</div>
    {propRows.map(([k, lab]) => (
      <div className="v-menu-item" key={k} onClick={() => toggleProp(k)}>
        <span>{lab}</span>
        <span className={"toggle" + (props.includes(k) ? " on" : "")} style={{ marginLeft: "auto" }} />
      </div>
    ))}
  </>;
  return <>
    <div className="overlay" onClick={onClose} />
    <div className="panel" style={{ top: 84, right: 52, width: 316, zIndex: 45, padding: 8 }}>
      <SegRow label={t.view} value={mode} set={setMode} opts={[["list", t.list], ["board", t.board], ["timeline", t.timeline], ["dashboard", t.dash_tab]]} />
      {mode === "list" && <>
        <SegRow label={t.group} value={grouping} set={setGrouping} opts={[["status", t.status], ["portfolio", t.portfolio], ["strategy", t.strategy], ["none", t.none]]} />
        <SegRow label={t.order} value={ordering} set={setOrdering} opts={[["updated", t.o_updated], ["return", t.o_return], ["name", t.o_name]]} />
        <Row label={t.showEmpty}>
          <span className={"toggle" + (showEmpty ? " on" : "")} onClick={() => setShowEmpty(!showEmpty)} />
        </Row>
        <Properties />
      </>}
      {mode === "board" && <>
        <SegRow label={t.order} value={ordering} set={setOrdering} opts={[["updated", t.o_updated], ["return", t.o_return], ["name", t.o_name]]} />
        <Properties />
      </>}
      {mode === "timeline" && <>
        <SegRow label={lang === "ko" ? "타임라인" : "Timeline"} value={tlMode} set={setTlMode} opts={[["performance", lang === "ko" ? "성과" : "Perf."], ["journey", lang === "ko" ? "여정" : "Journey"]]} />
        <SegRow label={lang === "ko" ? "Y축" : "Y-axis"} value={tlYMode} set={setTlYMode} opts={[["price", lang === "ko" ? "가격" : "Price"], ["pct", lang === "ko" ? "%수익률" : "% return"]]} />
        <SegRow label={t.order} value={ordering} set={setOrdering} opts={[["updated", t.o_updated], ["return", t.o_return], ["name", t.o_name]]} />
        <SegRow label={t.group} value={grouping} set={setGrouping} opts={[["none", t.none], ["portfolio", t.portfolio], ["status", t.status], ["strategy", t.strategy]]} />
        <div style={{ height: 1, background: "var(--border)", margin: "6px 4px" }} />
        <div className="side-cap" style={{ padding: "4px 8px", margin: 0 }}>{t.tl_overlays}</div>
        {[["avg", t.tl_ov_avg], ["band", t.tl_ov_band], ["execs", t.tl_ov_execs], ["transitions", t.tl_ov_trans]].map(([k, lab]) => (
          <div className="v-menu-item" key={k} onClick={() => setTlOverlays({ ...tlOverlays, [k]: !tlOverlays[k] })}>
            <span>{lab}</span>
            <span className={"toggle" + (tlOverlays[k] ? " on" : "")} style={{ marginLeft: "auto" }} />
          </div>
        ))}
      </>}
      {mode === "dashboard" && <>
        <SegRow label={t.order} value={ordering} set={setOrdering} opts={[["updated", t.o_updated], ["return", t.o_return], ["name", t.o_name]]} />
        <SegRow label={t.group} value={grouping} set={setGrouping} opts={[["portfolio", t.portfolio], ["status", t.status], ["strategy", t.strategy], ["none", t.none]]} />
      </>}
    </div>
  </>;
}

/* ---- grouping config for the list ---- */
function groupConfig(grouping, t, lang) {
  if (grouping === "portfolio") return {
    keys: PORTFOLIOS.map(p => p.id).concat(["none"]),
    keyOf: (p) => p.portfolioId || "none",
    head: (k) => { if (k === "none") return { icon: <span className="pf-dot" style={{ background: "var(--fg-4)", width: 11, height: 11 }} />, label: t.noPortfolio }; const pf = PORTFOLIOS.find(x => x.id === k); return { icon: <span className="pf-dot" style={{ background: pf.color, width: 11, height: 11 }} />, label: pf.name[lang] }; },
  };
  if (grouping === "strategy") return {
    keys: EXEC_STRATEGIES.map(s => s.id).concat(["none"]),
    keyOf: (p) => p.execId || "none",
    head: (k) => { if (k === "none") return { icon: <span className="strat-dot" style={{ background: "var(--fg-4)" }} />, label: t.noStrategy }; const s = EXEC_STRATEGIES.find(x => x.id === k); return { icon: <span className="strat-dot" style={{ background: s ? s.color : "var(--fg-4)" }} />, label: s ? s.name[lang] : k }; },
  };
  if (grouping === "category") return {
    keys: strategyCats(t).map(c => c[0]).concat(["none"]),
    keyOf: (p) => catOfPlan(p),
    head: (k) => { if (k === "none") return { icon: <span className="strat-dot" style={{ background: "var(--fg-4)" }} />, label: t.noStrategy }; const lab = (strategyCats(t).find(c => c[0] === k) || [, k])[1]; return { icon: <Lic name="shapes" size={14} cls="icon-sm" color="var(--fg-3)" />, label: lab }; },
  };
  if (grouping === "none") return {
    keys: ["all"], keyOf: () => "all", head: () => ({ icon: <Lic name="crosshair" size={14} cls="icon-sm" color="var(--fg-3)" />, label: t.plans }),
  };
  // status (default)
  return {
    keys: STATUS_ORDER, keyOf: (p) => p.status,
    head: (k) => ({ icon: <StatusIcon status={k} size={15} />, label: t["s_" + k] }),
  };
}
function orderPlans(items, ordering, lang) {
  const arr = items.slice();
  if (ordering === "return") arr.sort((a, b) => { const ra = planReturn(a), rb = planReturn(b); return (rb ? rb.rate : -999) - (ra ? ra.rate : -999); });
  else if (ordering === "name") arr.sort((a, b) => a.tickerName[lang].localeCompare(b.tickerName[lang]));
  return arr;
}

Object.assign(window, { FilterPanel, DisplayPanel, matchesFilters, filterValueLabel, FILTER_TYPE_LABEL, groupConfig, orderPlans });
