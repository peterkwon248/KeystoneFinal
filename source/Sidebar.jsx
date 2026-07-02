// Sidebar.jsx — Keystone left navigation rail
function Sidebar({ view, navTo, t, lang, plans, inboxUnread = 0, activePf, setPf, onCompose, onSearch, onCmd, onWsMenu, onCollapse, activeStrat, openStrategy, cfg = {}, order, pinned = [], onNewPf, onDelPf, onRenamePf, onNewStrat, onNewFramework, onDupStrat, onDelStrat, setFilter, views = [], activeViewId, onApplyView, onSaveView, onRenameView, onDelView }) {
  const counts = {
    active: plans.filter(p => p.status === "active").length,
    research: plans.filter(p => p.status === "research").length,
  };
  const navItem = (key, icon, label, opts = {}) => (
    <div className={"nav-item" + (opts.on ? " active" : "")} data-coach={key} onClick={opts.onClick}>
      <Lic name={icon} size={16} cls="icon" color="inherit" />
      <span>{label}</span>
      {opts.count != null && <span className={"count" + (opts.alert ? " unread" : "")} title={opts.alertTitle}>{opts.count}</span>}
    </div>
  );
  const [collapsed, setCollapsed] = React.useState(() => { try { return JSON.parse(localStorage.getItem("keystone-navcollapse-v1") || "{}"); } catch (e) { return {}; } });
  const toggleSec = (k) => setCollapsed(c => { const n = { ...c, [k]: !c[k] }; try { localStorage.setItem("keystone-navcollapse-v1", JSON.stringify(n)); } catch (e) {} return n; });
  const [menu, setMenu] = React.useState(null);
  const Cap = ({ k, label, onAdd, first }) => (
    <div className={"nav-caption nav-caption-btn" + (first ? " nav-caption--first" : "")} onClick={() => toggleSec(k)}>
      <span className="nav-cap-lab">{label}</span>
      <Lic name="chevron-right" size={12} cls={"nav-cap-chev" + (collapsed[k] ? "" : " open")} color="var(--fg-3)" />
      {onAdd && <button className="nav-cap-add" title={lang === "ko" ? "\ucd94\uac00" : "Add"} onClick={(e) => { e.stopPropagation(); onAdd(); }}><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 3.3V10.7M3.3 7H10.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg></button>}
    </div>
  );
  const ItemMenu = ({ id, items }) => (
    <div className="nav-item-more-wrap">
      <button className="nav-item-more" title={lang === "ko" ? "\ub354\ubcf4\uae30" : "More"} onClick={(e) => { e.stopPropagation(); setMenu(menu && menu.id === id ? null : { id }); }}><svg width="14" height="14" viewBox="0 0 16 16"><circle cx="3.6" cy="8" r="1.3" fill="currentColor" /><circle cx="8" cy="8" r="1.3" fill="currentColor" /><circle cx="12.4" cy="8" r="1.3" fill="currentColor" /></svg></button>
      {menu && menu.id === id && <>
        <div className="v-menu-scrim" onClick={(e) => { e.stopPropagation(); setMenu(null); }} />
        <div className="nav-ctx v-menu" onClick={(e) => e.stopPropagation()}>
          {items.map((it, i) => it.sep
            ? <div key={i} className="v-menu-sep" />
            : <div key={i} className={"v-menu-item" + (it.danger ? " danger" : "")} onClick={() => { setMenu(null); it.run(); }}><Lic name={it.icon} size={14} cls="icon-sm" color="currentColor" /><span>{it.label}</span></div>)}
        </div>
      </>}
    </div>
  );
  return (
    <div className="sidebar">
      <div className="ws-row">
        <div className="ws-switch" onClick={onWsMenu}>
          <KeystoneLogo size={22} />
          <span className="ws-name">Keystone</span>
          <Lic name="chevrons-up-down" size={14} cls="ws-chev" color="var(--fg-4)" />
        </div>
        <div className="ws-actions">
          <button className="iconbtn" onClick={onSearch} title={t.searchSec}><Lic name="search" size={16} /></button>
          {LIBRARY_LOCKED
            ? <button className="iconbtn" onClick={onCompose} title={lang === "ko" ? "새 플랜" : "New plan"}><Lic name="square-pen" size={16} /></button>
            : <MiniDropdown align="left" width={190} trigger={<button className="iconbtn" title={lang === "ko" ? "만들기" : "Create"}><Lic name="square-pen" size={16} /></button>}
            items={[
              { value: "plan", label: lang === "ko" ? "새 플랜" : "New plan", icon: <Lic name="square-pen" size={14} cls="icon-sm" color="var(--fg-3)" /> },
              { value: "strat", label: lang === "ko" ? "새 전략" : "New strategy", icon: <Lic name="git-branch" size={14} cls="icon-sm" color="var(--fg-3)" /> },
              { value: "fw", label: lang === "ko" ? "새 관점" : "New framework", icon: <Lic name="gauge" size={14} cls="icon-sm" color="var(--fg-3)" /> },
            ]}
            onPick={(v) => { if (v === "plan") onCompose(); else if (v === "strat") onNewStrat(); else if (onNewFramework) onNewFramework(); }} />}
          <button className="iconbtn" onClick={onCollapse} title={t.collapseSb}><PanelIcon side="left" size={16} /></button>
        </div>
      </div>

      <div className="nav">
        {navItem("inbox", "inbox", t.inbox, { on: view === "inbox", alert: inboxUnread > 0, count: inboxUnread > 0 ? inboxUnread : null, alertTitle: (lang === "ko" ? inboxUnread + "개의 새 알림" : inboxUnread + " new"), onClick: () => navTo("inbox") })}
        {navItem("journal", "notebook-pen", t.journal, { on: view === "journal", onClick: () => navTo("journal") })}
        {navItem("plans", "crosshair", t.home, { count: plans.length, on: view === "plans" && !activePf, onClick: () => { setPf(null); navTo("plans"); } })}
        {(typeof OPTIONAL_DESTS !== "undefined" ? OPTIONAL_DESTS : []).filter(d => cfg[d.key] && pinned.includes(d.key)).sort((a, b) => { const ord = order || []; return ord.indexOf(a.key) - ord.indexOf(b.key); }).map(d => <React.Fragment key={d.key}>{navItem(d.key, d.icon, t[d.labelKey], { on: view === d.key, onClick: () => navTo(d.key) })}</React.Fragment>)}

        <Cap k="pf" label={t.portfolios} onAdd={onNewPf} first />
        {!collapsed.pf && PORTFOLIOS.map(pf => {
          const n = plans.filter(p => p.portfolioId === pf.id).length;
          return (
            <div key={pf.id} className={"nav-item nav-sub nav-item-row" + (view === "plans" && activePf === pf.id ? " active" : "")} onClick={() => { setPf(pf.id); navTo("plans"); }}>
              <span className="pf-dot" style={{ background: pf.color }} />
              <span className="nav-item-lab">{pf.name[lang]}</span>
              <ItemMenu id={"pf:" + pf.id} items={[
                { icon: "filter", label: lang === "ko" ? "\uc774 \ud3ec\ud2b8\ud3f4\ub9ac\uc624\ub9cc \ubcf4\uae30" : "View only this", run: () => { setPf(pf.id); navTo("plans"); } },
                { icon: "pencil", label: lang === "ko" ? "\uc774\ub984 \ubcc0\uacbd" : "Rename", run: () => { const v = window.prompt(lang === "ko" ? "\ud3ec\ud2b8\ud3f4\ub9ac\uc624 \uc774\ub984" : "Portfolio name", pf.name[lang]); if (v) onRenamePf(pf.id, v); } },
                { sep: true },
                { icon: "trash-2", label: lang === "ko" ? "\uc0ad\uc81c" : "Delete", danger: true, run: () => onDelPf(pf.id) },
              ]} />
              <span className="count nav-item-count">{n}</span>
            </div>
          );
        })}

        <Cap k="strat" label={t.strategies} onAdd={LIBRARY_LOCKED ? null : onNewStrat} />
        {!collapsed.strat && EXEC_CATS.map(({ id: cat, label: catL }) => {
          const label = catL[lang];
          const sts = EXEC_STRATEGIES.filter(st => (st.cat || "accum") === cat);
          if (!sts.length) return null;
          return (
            <React.Fragment key={cat}>
              <div className="nav-subcap">{label}</div>
              {sts.map(st => (
                <div key={st.id} className={"nav-item nav-sub nav-item-row" + (view === "strategy" && activeStrat === st.id ? " active" : "")} onClick={() => openStrategy(st.id)}>
                  <Lic name={st.icon} size={15} cls="icon-sm" color={st.color} />
                  <span className="nav-item-lab">{st.name[lang]}</span>
                  <ItemMenu id={"st:" + st.id} items={[
                    { icon: "filter", label: lang === "ko" ? "\uc774 \uc804\ub7b5\uc73c\ub85c \ud544\ud130" : "Filter by this", run: () => setFilter && setFilter("strategy", st.id) },
                    { icon: "pencil", label: lang === "ko" ? "\ud3b8\uc9d1" : "Edit", run: () => openStrategy(st.id) },
                    { icon: "copy", label: lang === "ko" ? "복제" : "Duplicate", run: () => onDupStrat && onDupStrat(st.id) },
                    { icon: "trash-2", label: lang === "ko" ? "삭제" : "Delete", danger: true, run: () => onDelStrat && onDelStrat(st.id) },
                  ]} />
                </div>
              ))}
            </React.Fragment>
          );
        })}

        <Cap k="frameworks" label={lang === "ko" ? "관점" : "Frameworks"} onAdd={LIBRARY_LOCKED ? null : onNewFramework} />
        {!collapsed.frameworks && [["multiple", lang === "ko" ? "멀티플" : "Multiple"], ["intrinsic", lang === "ko" ? "내재가치" : "Intrinsic"], ["asset", lang === "ko" ? "자산" : "Asset"]].map(([cat, catL]) => {
          const fws = (typeof STRATEGIES !== "undefined" ? STRATEGIES.filter(s => s.model && (s.cat || "multiple") === cat) : []);
          if (!fws.length) return null;
          return (
            <React.Fragment key={cat}>
              <div className="nav-subcap">{catL}</div>
              {fws.map(fw => (
                <div key={fw.id} className={"nav-item nav-sub nav-item-row" + (view === "strategy" && activeStrat === fw.id ? " active" : "")} onClick={() => openStrategy(fw.id)}>
                  <Lic name={fw.icon || "gauge"} size={15} cls="icon-sm" color={fw.color} />
                  <span className="nav-item-lab">{fw.name[lang]}</span>
                  <ItemMenu id={"fw:" + fw.id} items={[
                    { icon: LIBRARY_LOCKED ? "eye" : "pencil", label: lang === "ko" ? (LIBRARY_LOCKED ? "열람" : "편집") : (LIBRARY_LOCKED ? "View" : "Edit"), run: () => openStrategy(fw.id) },
                    ...(LIBRARY_LOCKED ? [] : [
                    { icon: "copy", label: lang === "ko" ? "복제" : "Duplicate", run: () => onDupStrat && onDupStrat(fw.id) },
                    { icon: "trash-2", label: lang === "ko" ? "삭제" : "Delete", danger: true, run: () => onDelStrat && onDelStrat(fw.id) }]),
                  ]} />
                </div>
              ))}
            </React.Fragment>
          );
        })}

        <Cap k="views" label={t.views} />
        {!collapsed.views && views.map(v => (
          <div key={v.id} className={"nav-item nav-sub nav-item-row" + (view === "plans" && activeViewId === v.id ? " active" : "")} onClick={() => onApplyView(v)}>
            <Lic name={v.icon || "layers"} size={15} cls="icon-sm" color="var(--fg-3)" />
            <span className="nav-item-lab">{typeof v.name === "string" ? v.name : v.name[lang]}</span>
            <ItemMenu id={"vw:" + v.id} items={[
              { icon: "layers", label: lang === "ko" ? "\ubaa8\ub4e0 \ubdf0 \ubcf4\uae30" : "All views", run: () => navTo("views") },
              { icon: "pencil", label: t.renameView, run: () => onRenameView(v.id) },
              { sep: true },
              { icon: "trash-2", label: t.deleteView, danger: true, run: () => onDelView(v.id) },
            ]} />
          </div>
        ))}

        {(() => {
          const base = OPTIONAL_DESTS.map(d => d.key);
          const keyOrder = (() => { if (!order) return base; const merged = order.filter(k => base.includes(k)); base.forEach((k, i) => { if (!merged.includes(k)) merged.splice(Math.min(i, merged.length), 0, k); }); return merged; })();
          const ordered = keyOrder.map(k => OPTIONAL_DESTS.find(d => d.key === k)).filter(d => d && cfg[d.key] && !pinned.includes(d.key));
          if (!ordered.length) return null;
          return <>
            <Cap k="opt" label={t.optionalDest} />
            {!collapsed.opt && ordered.map(d => (
              <div className={"nav-item" + (view === d.key ? " active" : "")} key={d.key} onClick={() => navTo(d.key)}>
                <Lic name={d.icon} size={16} cls="icon" color="inherit" /><span>{t[d.labelKey]}</span>
              </div>
            ))}
          </>;
        })()}
      </div>
    </div>
  );
}
Object.assign(window, { Sidebar });
