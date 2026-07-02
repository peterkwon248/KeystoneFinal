// ListView.jsx — Plan list with dynamic grouping / ordering / column visibility
function PlanRow({ plan, t, lang, onOpen, focused, props, onContext }) {
  const strat = (typeof EXEC_STRATEGIES !== "undefined" ? EXEC_STRATEGIES.find(s => s.id === plan.execId) : null);
  const ret = planReturn(plan);
  const fill = plan.divisions ? Math.round(plan.round / plan.divisions * 100) : null;
  const stColor = (PLAN_STATUS[plan.status] || {}).color;
  const show = (k) => props.includes(k);
  return (
    <div className={"plan-row" + (focused ? " focused" : "")} onClick={() => onOpen(plan)}
      onContextMenu={(e) => onContext && onContext(e, plan)}
      onMouseEnter={() => { window.__rHover = plan.id; }}>
      <span className="pr-id mono">{plan.id}</span>
      <span className="pr-status"><StatusIcon status={plan.status} size={15} /></span>
      <span className="pr-tk">
        <span className="pr-name">{plan.name[lang]}</span>
        <span className="pr-ticker"><Flag market={plan.cur === "KRW" ? "KR" : "US"} size={13} /> {plan.tickerName[lang]} · <span className="mono">{plan.ticker}</span></span>
      </span>
      <span className="pr-spacer" />
      {show("spark") && <span className="pr-spark"><Sparkline plan={plan} /></span>}
      {show("gauge") && <span className="pr-gauge"><ScenarioGauge plan={plan} lang={lang} /></span>}
      {show("return") && <span className={"pr-return" + (ret ? (ret.rate >= 0 ? " tint-pos" : " tint-neg") : "")}>
        {ret ? <>
          <span key={plan.tickN || 0} className={"pr-ret-pct mono " + (ret.rate >= 0 ? "pos" : "neg") + (plan.tickDir ? " tick-" + plan.tickDir : "")}>{ret.rate >= 0 ? "+" : ""}{ret.rate.toFixed(1)}%</span>
          <span className="pr-ret-amt mono">{ret.amt >= 0 ? "+" : "−"}{fmtCompact(Math.abs(ret.amt), plan.cur)}</span>
        </> : <span className="pr-ret-pct mono" style={{ color: "var(--fg-4)" }}>—</span>}
      </span>}
      {show("fill") && <span className="pr-prog">
        {fill != null ? <>
          <span className="pr-prog-track"><span className="pr-prog-fill" style={{ width: fill + "%", background: stColor }} /></span>
          <span className="pr-prog-num">{plan.round}/{plan.divisions}</span>
        </> : <span className="pr-prog-num" style={{ marginLeft: "auto" }}>—</span>}
      </span>}
      {show("strategy") && <span className="pr-strat"><StrategyBadge strategy={strat} t={{ __lang: lang }} /></span>}
      <span className="pr-upd">{fmtRel(plan.updatedAt, lang)}</span>
    </div>
  );
}

// group key → new-plan preset (status / portfolio / strategy). Returns null when a
// contextual create doesn't map cleanly (category grouping) — then no + is shown.
function presetFromGroup(grouping, key) {
  if (grouping === "status") return { status: key };
  if (grouping === "portfolio") return { portfolioId: key };
  if (grouping === "strategy") return key === "none" ? { execId: null } : { execId: key };
  if (grouping === "none") return {};
  return null; // category
}

function ListView({ plans, t, lang, onOpen, focusId, grouping = "status", ordering = "updated", showEmpty = false, props = ["gauge", "return", "fill", "strategy"], onContext, onQuickAdd }) {
  const [collapsed, setCollapsed] = React.useState({});
  const cfg = groupConfig(grouping, t, lang);
  let groups = cfg.keys.map(k => ({ key: k, items: orderPlans(plans.filter(p => cfg.keyOf(p) === k), ordering, lang) }));
  if (!showEmpty) groups = groups.filter(g => g.items.length);
  return (
    <div className="body-main">
      {groups.map(g => {
        const h = cfg.head(g.key);
        return (
          <div key={g.key}>
            <div className="grp-head" onClick={() => setCollapsed(c => ({ ...c, [g.key]: !c[g.key] }))}>
              <span className={"grp-chev" + (collapsed[g.key] ? " collapsed" : "")}><Lic name="chevron-down" size={14} cls="icon-sm" color="var(--fg-4)" /></span>
              {h.icon}
              <span className="grp-title">{h.label}</span>
              <span className="grp-count">{g.items.length}</span>
              {onQuickAdd && presetFromGroup(grouping, g.key) && (
                <span className="grp-add" title={t.newPlan} onClick={(e) => { e.stopPropagation(); onQuickAdd(presetFromGroup(grouping, g.key)); }}><Lic name="plus" size={14} cls="icon-sm" color="currentColor" /></span>
              )}
            </div>
            {!collapsed[g.key] && g.items.map(p => (
              <PlanRow key={p.id} plan={p} t={t} lang={lang} onOpen={onOpen} focused={focusId === p.id} props={props} onContext={onContext} />
            ))}
          </div>
        );
      })}
      {!groups.some(g => g.items.length) && <div className="empty-state"><Lic name="crosshair" size={28} color="var(--fg-4)" /><div className="es-title">{lang === "ko" ? "조건에 맞는 플랜이 없습니다" : "No plans match"}</div></div>}
    </div>
  );
}
Object.assign(window, { ListView, PlanRow });
