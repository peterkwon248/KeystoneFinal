// App.jsx — Keystone composition + state + chrome

/* ---- Views (saved views = stored filter sets) ---- */
const DEFAULT_VIEWS = [
  { id: "v1", name: { en: "Deeply undervalued", ko: "저평가 깊은" }, icon: "trending-down", filters: { gap: ["deep"] } },
  { id: "v2", name: { en: "Long-waiting", ko: "오래 기다린" }, icon: "hourglass", filters: { dwell: ["long"] } },
  { id: "v3", name: { en: "Margin of safety", ko: "안전마진 확보" }, icon: "shield-check", filters: { gap: ["mos"] } },
  { id: "v4", name: { en: "Near fair value", ko: "목표가 근접" }, icon: "target", filters: { gap: ["near"] } },
];
const viewName = (v, lang) => typeof v.name === "string" ? v.name : v.name[lang];

function ViewsScreen({ t, lang, plans, views, onApply, onRename, onDelete }) {
  return (
    <div className="body-main">
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "16px 0" }}>
        {views.map((v) => (
          <div className="view-row-r" key={v.id} onClick={() => onApply(v)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
            <span className="st-badge" style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg-elevated-2)" }}><Lic name={v.icon || "layers"} size={16} color="var(--fg-3)" /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "var(--fw-medium) 14px var(--font-sans)", color: "var(--fg)" }}>{viewName(v, lang)}</div>
              <div style={{ font: "var(--fw-regular) 12px var(--font-sans)", color: "var(--fg-3)", marginTop: 2 }}>{(v.desc && v.desc.trim()) ? v.desc : describeFilters(v.filters, t, lang)}</div>
            </div>
            <span className="vr-actions" style={{ display: "flex", gap: 2 }}>
              <button className="iconbtn" style={{ width: 24, height: 24 }} title={t.renameView} onClick={(e) => { e.stopPropagation(); onRename(v.id); }}><Lic name="pencil" size={13} /></button>
              <button className="iconbtn" style={{ width: 24, height: 24 }} title={t.deleteView} onClick={(e) => { e.stopPropagation(); onDelete(v.id); }}><Lic name="trash-2" size={13} /></button>
            </span>
            <span className="grp-count">{plans.filter(p => matchesFilters(p, v.filters)).length}</span>
          </div>
        ))}
        <div style={{ padding: "16px 16px 0", font: "var(--fw-regular) 12px/1.6 var(--font-sans)", color: "var(--fg-4)", wordBreak: "keep-all" }}>{t.viewsHint}</div>
      </div>
    </div>
  );
}

/* ---- Command menu ---- */
function CommandMenu({ t, lang, onClose, onNav, onCompose, toggleTheme, toggleLang, openStrategy }) {
  const [q, setQ] = React.useState("");
  const [sel, setSel] = React.useState(0);
  const items = [
    { label: { en: "New plan", ko: "새 플랜" }, icon: "square-pen", run: onCompose, sc: "C", grp: { en: "Create", ko: "생성" } },
    { label: { en: "Inbox", ko: "인박스" }, icon: "inbox", run: () => onNav("inbox"), grp: { en: "Workspace", ko: "워크스페이스" } },
    { label: { en: "Journal", ko: "일지" }, icon: "notebook-pen", run: () => onNav("journal"), grp: { en: "Workspace", ko: "워크스페이스" } },
    { label: { en: "Plans", ko: "플랜" }, icon: "crosshair", run: () => onNav("plans"), grp: { en: "Workspace", ko: "워크스페이스" } },
    { label: { en: "Views", ko: "뷰" }, icon: "layers", run: () => onNav("views"), grp: { en: "Workspace", ko: "워크스페이스" } },
    { label: { en: "Watchlist", ko: "관심종목" }, icon: "star", run: () => onNav("watchlist"), grp: { en: "Tools", ko: "도구" } },
    { label: { en: "Research", ko: "종목 리서치" }, icon: "book-open", run: () => onNav("research"), grp: { en: "Tools", ko: "도구" } },
    { label: { en: "Screener", ko: "스크리너" }, icon: "filter", run: () => onNav("screener"), grp: { en: "Tools", ko: "도구" } },
    { label: { en: "Scenarios", ko: "시나리오" }, icon: "git-branch", run: () => onNav("scenarios"), grp: { en: "Tools", ko: "도구" } },
    { label: { en: "Insights", ko: "인사이트" }, icon: "chart-line", run: () => onNav("insights"), grp: { en: "Tools", ko: "도구" } },
    ...(typeof EXEC_STRATEGIES !== "undefined" ? EXEC_STRATEGIES : []).map(s => ({ label: s.name, icon: s.icon || "git-branch", run: () => openStrategy(s.id), grp: { en: "Strategies", ko: "전략" } })),
    ...(typeof STRATEGIES !== "undefined" ? STRATEGIES.filter(s => s.model) : []).map(s => ({ label: s.name, icon: s.icon || "gauge", run: () => openStrategy(s.id), grp: { en: "Frameworks", ko: "관점" } })),
    { label: { en: "Toggle theme", ko: "테마 전환" }, icon: "sun-moon", run: toggleTheme, grp: { en: "Settings", ko: "설정" } },
    { label: { en: "Switch language", ko: "언어 전환" }, icon: "languages", run: toggleLang, grp: { en: "Settings", ko: "설정" } },
  ];
  const filtered = items.filter(it => it.label[lang].toLowerCase().includes(q.toLowerCase()));
  const fire = (it) => { it.run(); onClose(); };
  return (
    <div className="scrim" onClick={onClose}>
      <div className="cmd" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-row">
          <Lic name="search" size={17} color="var(--fg-4)" />
          <input autoFocus className="cmd-input" placeholder={lang === "ko" ? "명령 또는 검색…" : "Type a command or search…"} value={q}
            onChange={e => { setQ(e.target.value); setSel(0); }}
            onKeyDown={e => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => Math.min(filtered.length - 1, s + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
              if (e.key === "Enter" && filtered[sel]) fire(filtered[sel]);
            }} />
          <span className="kbd">esc</span>
        </div>
        <div className="cmd-list">
          {filtered.map((it, i) => (
            <React.Fragment key={i}>
              {(i === 0 || (filtered[i - 1].grp && filtered[i - 1].grp.en) !== (it.grp && it.grp.en)) && it.grp && <div className="cmd-cap">{it.grp[lang]}</div>}
              <div className={"cmd-item" + (i === sel ? " active" : "")} onMouseEnter={() => setSel(i)} onClick={() => fire(it)}>
                <Lic name={it.icon} size={16} color="var(--fg-3)" /><span>{it.label[lang]}</span>{it.sc && <span className="shortcut kbd">{it.sc}</span>}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- Keystone prompt modal (replaces window.prompt) ---- */
function PromptModal({ title, label, initial, confirmLabel, t, onConfirm, onClose, descLabel, descInitial, descPlaceholder }) {
  const [val, setVal] = React.useState(initial || "");
  const [desc, setDesc] = React.useState(descInitial || "");
  const submit = () => { const v = val.trim(); if (!v) return; onConfirm(v, desc.trim()); onClose(); };
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal prompt-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-crumb">
            <span className="crumb-badge"><KeystoneLogo size={12} /></span>
            <span className="crumb-team">Keystone</span>
            <span className="crumb-sep"><Lic name="chevron-right" size={13} cls="icon-sm" /></span>
            <span className="crumb-new">{title}</span>
          </div>
          <div className="mh-actions"><button className="iconbtn" onClick={onClose}><Lic name="x" size={16} /></button></div>
        </div>
        <div className="modal-body">
          {label && <div className="prompt-label">{label}</div>}
          <input autoFocus className="title-input prompt-input" value={val} onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }} />
          {descLabel && <React.Fragment>
            <div className="prompt-label" style={{ marginTop: 14 }}>{descLabel}</div>
            <textarea className="prompt-input" rows="2" style={{ resize: "vertical", lineHeight: 1.5 }} value={desc} placeholder={descPlaceholder || ""} onChange={e => setDesc(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); if (e.key === "Escape") onClose(); }} />
          </React.Fragment>}
        </div>
        <div className="modal-foot">
          <button className="v-btn" onClick={onClose}>{t.cancel || "취소"}</button>
          <button className="v-btn v-btn--primary" onClick={submit} disabled={!val.trim()}>{confirmLabel || t.save || "저장"}</button>
        </div>
      </div>
    </div>
  );
}

/* ---- New plan modal ---- */
function ComposeModal({ t, lang, onClose, onCreate, preset, defaultPfId, onCreatePortfolio }) {
  const ps = preset || {};
  const [name, setName] = React.useState("");
  const [ticker, setTicker] = React.useState("");
  const [memo, setMemo] = React.useState("");
  const [st, setSt] = React.useState(ps.status || "research");
  const [pfId, setPfId] = React.useState("portfolioId" in ps ? ps.portfolioId : (defaultPfId || "pf1"));
  const [stratId, setStratId] = React.useState(ps.strategyId || null);
  const [more, setMore] = React.useState(false);
  const pf = PORTFOLIOS.find(p => p.id === pfId);
  const strat = stratId ? STRATEGIES.find(s => s.id === stratId) : null;
  const matchedSec = ticker.trim() ? securityOf(ticker.trim().toUpperCase()) : null;
  const tq = ticker.trim(), tql = tq.toLowerCase();
  // same partial-match logic as SearchModal — suggestions while no exact match
  const sugs = tq && !matchedSec ? SECURITIES.filter(s => s.ticker.toLowerCase().includes(tql) || s.name.en.toLowerCase().includes(tql) || s.name.ko.includes(tq)).slice(0, 5) : [];
  const [tickFocus, setTickFocus] = React.useState(false);
  const planTks = new Set((typeof PLANS !== "undefined" ? PLANS : []).map(p => p.ticker));
  const defaultSugs = SECURITIES.slice().sort((a, b) => (planTks.has(b.ticker) ? 1 : 0) - (planTks.has(a.ticker) ? 1 : 0)).slice(0, 6);
  const sugList = tq ? sugs : defaultSugs;
  const showSug = tickFocus && !matchedSec && sugList.length > 0;
  const submit = () => {
    if (!name.trim()) return;
    onCreate(name, ticker, { status: st, portfolioId: pfId, strategyId: stratId, memo: memo.trim() });
    if (more) { setName(""); setTicker(""); setMemo(""); } else { onClose(); }
  };
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-crumb">
            <span className="crumb-badge"><KeystoneLogo size={12} /></span>
            <span className="crumb-team">Keystone</span>
            <span className="crumb-sep"><Lic name="chevron-right" size={13} cls="icon-sm" /></span>
            <span className="crumb-new">{t.newPlan}</span>
          </div>
          <div className="mh-actions">
            <button className="iconbtn" onClick={onClose}><Lic name="x" size={16} /></button>
          </div>
        </div>
        <div className="modal-body">
          <input autoFocus className="title-input" placeholder={t.planName} value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submit(); }} />
          <div className="compose-ticker-wrap">
            <Lic name="search" size={14} cls="icon-sm" color="var(--fg-4)" />
            <input className="compose-ticker" placeholder={lang === "ko" ? "종목 코드 또는 이름 검색 (예: 삼성, AAPL)" : "Search ticker or name (e.g. Samsung, AAPL)"} value={ticker} onChange={e => setTicker(e.target.value)}
              onFocus={() => setTickFocus(true)} onBlur={() => setTimeout(() => setTickFocus(false), 150)}
              onKeyDown={e => { if (e.key === "Enter") { if (sugList.length && !matchedSec) setTicker(sugList[0].ticker); else submit(); } }} />
          </div>
          {showSug && <div className="compose-sug">
            {!tq && <div className="compose-sug-cap">{lang === "ko" ? "내 종목" : "Your securities"}</div>}
            {sugList.map(sg => (
              <div className="compose-sug-row" key={sg.ticker} onMouseDown={() => { setTicker(sg.ticker); setTickFocus(false); }}>
                <Flag market={sg.market} size={14} /><span className="compose-sug-name">{sg.name[lang]}</span>
                <span className="mono compose-sug-tk">{sg.ticker}</span>
                <span className="mono compose-sug-px">{fmtMoney(sg.price, sg.cur)}</span>
              </div>
            ))}
          </div>}
          {matchedSec && <div className="compose-sec-hint"><Lic name="check" size={12} cls="icon-sm" color="var(--pos)" /><Flag market={matchedSec.market} size={12} /> {matchedSec.name[lang]} · <span className="mono">{fmtMoney(matchedSec.price, matchedSec.cur)}</span></div>}
          <textarea className="modal-desc-input" placeholder={t.memoPh} value={memo} onChange={e => setMemo(e.target.value)}></textarea>
        </div>
        <div className="modal-props">
          <MiniDropdown trigger={<span className="v-chip"><StatusIcon status={st} size={14} />{t["s_" + st]}</span>}
            items={STATUS_ORDER.map(k => ({ value: k, label: t["s_" + k], icon: <StatusIcon status={k} size={14} />, on: st === k }))} onPick={setSt} />
          <MiniDropdown width={200} trigger={<span className="v-chip"><span className="pf-dot" style={{ background: pf ? pf.color : "var(--fg-4)" }} />{pf ? pf.name[lang] : t.portfolio}</span>}
            items={PORTFOLIOS.map(p => ({ value: p.id, label: p.name[lang], icon: <span className="pf-dot" style={{ background: p.color }} />, on: pfId === p.id }))} onPick={setPfId}
            onCreate={onCreatePortfolio ? (nm) => { const nid = onCreatePortfolio(nm); if (nid) setPfId(nid); } : undefined} createLabel={t.newPortfolio} />
          <MiniDropdown width={200} trigger={strat
              ? <span className="v-chip"><span className="strat-dot" style={{ background: strat.color }} />{strat.name[lang]}</span>
              : <span className="v-chip"><span className="strat-dot" style={{ background: "var(--fg-4)" }} />{t.strategy}</span>}
            items={[{ value: null, label: t.noStrategy, icon: <span className="strat-dot" style={{ background: "var(--fg-4)" }} />, on: !stratId }].concat(STRATEGIES.map(s => ({ value: s.id, label: s.name[lang], icon: <span className="strat-dot" style={{ background: s.color }} />, on: stratId === s.id })))} onPick={setStratId} />
        </div>
        <div className="modal-foot">
          <div className="ff">
            <span className={"toggle-inline" + (more ? " on" : "")} onClick={() => setMore(m => !m)}><span className="switch"></span>{t.composeMore}</span>
            <button className="v-btn v-btn--primary" onClick={submit}>{t.createPlan}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ App ============ */
function CurrencyPicker({ dispCur, setDispCur, t }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener("pointerdown", h);
    return () => window.removeEventListener("pointerdown", h);
  }, [open]);
  const opts = [["native", t.curAuto, "₩/$"], ["KRW", t.curKRW, "₩"], ["USD", t.curUSD, "$"]];
  const cur = opts.find(o => o[0] === dispCur) || opts[0];
  return (
    <span className="cur-pick" ref={ref}>
      <button className="tabbar-cur cur-seg" onClick={() => setOpen(o => !o)} title={t.dispCurTitle}>
        {dispCur === "native"
          ? <span className="cur-seg-pair"><span className="cur-seg-i on">₩</span><span className="cur-seg-i on">$</span></span>
          : <span className="cur-seg-pair"><span className={"cur-seg-i" + (dispCur === "KRW" ? " on" : "")}>₩</span><span className={"cur-seg-i" + (dispCur === "USD" ? " on" : "")}>$</span></span>}
        <Lic name="chevron-down" size={11} color="var(--fg-4)" cls="cur-caret" />
      </button>
      {open && <span className="v-menu cur-menu">
        <span className="cur-menu-cap">{t.dispCurTitle}</span>
        {opts.map(([k, label, sym]) => (
          <button key={k} className={"v-menu-item cur-opt" + (k === dispCur ? " on" : "")} onClick={() => { setDispCur(k); setOpen(false); }}>
            <span className="cur-opt-sym mono">{sym}</span><span className="cur-opt-lab">{label}</span>
            {k === dispCur && <Lic name="check" size={13} color="var(--accent)" cls="cur-opt-check" />}
          </button>
        ))}
      </span>}
    </span>
  );
}
// LangPicker — twin of CurrencyPicker (globe + caret → 한국어/English menu). Matches the adjacent currency control.
function LangPicker({ lang, setLang }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener("pointerdown", h);
    return () => window.removeEventListener("pointerdown", h);
  }, [open]);
  const opts = [["ko", "한국어", "가"], ["en", "English", "A"]];
  return (
    <span className="cur-pick" ref={ref}>
      <button className="tabbar-cur lang-pick-btn" onClick={() => setOpen(o => !o)} title={lang === "ko" ? "언어" : "Language"} aria-label="language">
        <Lic name="globe" size={14} cls="icon-sm" color="currentColor" />
        <span className="lang-pick-code">{lang === "ko" ? "한국어" : "English"}</span>
        <Lic name="chevron-down" size={11} color="var(--fg-4)" cls="cur-caret" />
      </button>
      {open && <span className="v-menu cur-menu">
        <span className="cur-menu-cap">{lang === "ko" ? "언어" : "Language"}</span>
        {opts.map(([k, label, glyph]) => (
          <button key={k} className={"v-menu-item cur-opt" + (k === lang ? " on" : "")} onClick={() => { setLang(k); setOpen(false); }}>
            <span className="cur-opt-sym">{glyph}</span><span className="cur-opt-lab">{label}</span>
            {k === lang && <Lic name="check" size={13} color="var(--accent)" cls="cur-opt-check" />}
          </button>
        ))}
      </span>}
    </span>
  );
}
/* ---- Tab switcher dropdown (filter-style nested flyouts) ---- */
function TabSwitcherView({ pos, secs, curView, ko, run, onClose, navTo }) {
  const [open, setOpen] = React.useState(null);
  return <>
    <div className="overlay" onClick={onClose} />
    <div className="panel flt-menu tabdd" style={{ position: "fixed", left: pos.x, top: pos.y, width: 234, zIndex: 80 }} onMouseLeave={() => setOpen(null)}>
      <div className="flt-head">{pos.newTab ? (ko ? "새 탭에서 열기…" : "Open in new tab…") : (ko ? "이동…" : "Go to…")}<span className="flt-kbd">esc</span></div>
      {secs.map((s, i) => {
        if (s.divider) return <div key={"d" + i} style={{ height: 1, background: "var(--border)", margin: "5px 6px" }} />;
        const hot = open === s.v;
        const hasItems = s.items && s.items.length;
        return (
          <div key={s.v} className={"v-menu-item flt-axis" + (hot ? " hot" : "") + (curView === s.v ? " tabdd-cur" : "")}
            onMouseEnter={() => setOpen(hasItems ? s.v : null)}
            onClick={(e) => { e.stopPropagation(); run(() => navTo(s.v)); }}>
            <Lic name={s.icon} size={14} cls="icon-sm" color="var(--fg-3)" />
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
            {hasItems ? <><span className="flt-count">{s.items.length}</span><Lic name="chevron-right" size={14} cls="icon-sm" color="var(--fg-4)" /></> : null}
            {hot && hasItems && (
              <div className="flt-flyout tabdd-flyout" onMouseEnter={() => setOpen(s.v)} onClick={(e) => e.stopPropagation()}>
                {s.items.map(it => (
                  <div className="v-menu-item" key={it.key} onClick={(e) => { e.stopPropagation(); run(it.go); }}>
                    {it.ic}<span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</span>
                    {it.sub && <span className="tabdd-sub">{it.sub}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </>;
}
function App() {
  const [lang, setLang] = React.useState(() => localStorage.getItem("keystone-lang-v1") || "ko");
  const [theme, setTheme] = React.useState(() => localStorage.getItem("keystone-theme-v1") || "dark");
  const [dispCur, setDispCur] = React.useState(() => localStorage.getItem("keystone-cur-v1") || "native");
  // auth gate: the app mounts only after login + onboarding (see Auth.jsx). PROD: back with real auth.
  const [session, setSession] = React.useState(() => (typeof loadAuth === "function" ? loadAuth() : { onboarded: true }));
  const authed = !!(session && session.onboarded);
  const [verifyDismissed, setVerifyDismissed] = React.useState(false);
  const [showCoach, setShowCoach] = React.useState(false);
  const logout = () => { if (typeof clearAuth === "function") clearAuth(); setSession(null); setVerifyDismissed(false); };
  const [view, setView] = React.useState("plans");
  const [mode, setMode] = React.useState("list");
  const [wfTab, setWfTab] = React.useState("all");
  const [activePf, setActivePf] = React.useState(null);
  const [activeStrat, setActiveStrat] = React.useState(null);
  const [selected, setSelected] = React.useState(null);
  const [openTabs, setOpenTabs] = React.useState([{ id: "t1" }]);
  const [activeTabId, setActiveTabId] = React.useState("t1");
  const [tabMenu, setTabMenu] = React.useState(null);
  const tabSeq = React.useRef(2);
  const [pendingTab, setPendingTab] = React.useState(null);
  const [plans, setPlans] = React.useState(() => JSON.parse(JSON.stringify(PLANS)));
  const [showCmd, setShowCmd] = React.useState(false);
  const [tabDD, setTabDD] = React.useState(null);
  const [showCompose, setShowCompose] = React.useState(false);
  const [composePreset, setComposePreset] = React.useState(null);
  const quickAdd = (preset) => { setComposePreset(preset || null); setShowCompose(true); };
  const [toast, setToast] = React.useState(null);
  const [conn, setConn] = React.useState("connected"); // connected | connecting | offline
  const reconnect = () => { if (conn === "connecting") return; setConn("connecting"); setTimeout(() => setConn("connected"), 1300); };
  // inbox read state — owned here so the sidebar unread badge stays in sync with the inbox screen
  const [inboxRead, setInboxRead] = React.useState(() => (typeof ibxReadSet === "function" ? ibxReadSet() : new Set()));
  const persistRead = (set) => { try { localStorage.setItem(IBX_READ_KEY, JSON.stringify([...set])); } catch (e) {} };
  const inboxMarkRead = (ids) => setInboxRead(prev => { const n = new Set(prev); ids.forEach(i => n.add(i)); persistRead(n); return n; });
  const inboxMarkAll = () => { const all = buildInboxNotes(plans && plans.length ? plans : PLANS, lang).map(n => n.id); setInboxRead(prev => { const n = new Set(prev); all.forEach(i => n.add(i)); persistRead(n); return n; }); };
  const inboxUnread = React.useMemo(() => buildInboxNotes(plans && plans.length ? plans : PLANS, lang).filter(n => !inboxRead.has(n.id)).length, [plans, lang, inboxRead]);
  const [focusId, setFocusId] = React.useState(null);
  const [filters, setFilters] = React.useState({});
  const [savedViews, setSavedViews] = React.useState(() => { try { const s = localStorage.getItem("keystone-views-v2"); if (s) return JSON.parse(s); } catch (e) {} return DEFAULT_VIEWS; });
  const [activeViewId, setActiveViewId] = React.useState(null);
  React.useEffect(() => { try { localStorage.setItem("keystone-views-v2", JSON.stringify(savedViews)); } catch (e) {} }, [savedViews]);
  const [grouping, setGrouping] = React.useState("status");
  const [ordering, setOrdering] = React.useState("updated");
  const [showEmpty, setShowEmpty] = React.useState(false);
  const [listProps, setListProps] = React.useState(["gauge", "spark", "return", "fill", "strategy"]);
  const [tlMode, setTlMode] = React.useState("performance");
  const [tlOverlays, setTlOverlays] = React.useState({ avg: true, band: true, execs: true, transitions: true });
  const [tlYMode, setTlYMode] = React.useState("price");
  const [panel, setPanel] = React.useState(null);
  const [filterAnchor, setFilterAnchor] = React.useState(null);
  const openFilterAt = (e) => { const r = e.currentTarget.getBoundingClientRect(); const rightSide = r.left > window.innerWidth / 2; setFilterAnchor(rightSide ? { left: Math.max(8, r.right - 230), top: r.bottom + 6, flyout: "left" } : { left: Math.max(8, Math.min(r.left, window.innerWidth - 470)), top: r.bottom + 6, flyout: "right" }); setPanel("filter"); };
  const toggleFilter = (type, value) => { setActiveViewId(null); setFilters(prev => {
    const cur = prev[type] || [];
    const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
    const out = { ...prev, [type]: next };
    if (!next.length) delete out[type];
    return out;
  }); };
  const removeFilterType = (type) => { setActiveViewId(null); setFilters(prev => { const o = { ...prev }; delete o[type]; return o; }); };
  const applyView = (v) => {
    setFilters(JSON.parse(JSON.stringify(v.filters || {})));
    setActivePf(null); setView("plans"); setSelected(null); setActiveViewId(v.id);
  };
  const saveCurrentView = () => {
    if (!Object.keys(filters).length) { fire(lang === "ko" ? "먼저 필터를 걸어주세요" : "Set some filters first"); return; }
    setPromptModal({ title: t.saveView, label: lang === "ko" ? "뷰 이름" : "View name", initial: describeFilters(filters, t, lang), confirmLabel: t.saveView,
      descLabel: lang === "ko" ? "설명 (선택)" : "Description (optional)", descPlaceholder: lang === "ko" ? "이 뷰를 만든 이유…" : "Why this view…",
      onConfirm: (name, desc) => {
      const v = { id: "v" + Date.now().toString(36), name: name, desc: desc || "", icon: "layers", filters: JSON.parse(JSON.stringify(filters)) };
      setSavedViews(prev => [...prev, v]); setActiveViewId(v.id);
      fire(t.viewSaved);
    } });
  };
  const renameView = (id) => {
    const v = savedViews.find(x => x.id === id); if (!v) return;
    setPromptModal({ title: t.renameView, label: lang === "ko" ? "뷰 이름" : "View name", initial: viewName(v, lang), confirmLabel: t.renameView,
      descLabel: lang === "ko" ? "설명 (선택)" : "Description (optional)", descPlaceholder: lang === "ko" ? "이 뷰를 만든 이유…" : "Why this view…", descInitial: v.desc || "",
      onConfirm: (name, desc) => {
      setSavedViews(prev => prev.map(x => x.id === id ? { ...x, name: name, desc: desc || "" } : x));
    } });
  };
  const deleteView = (id) => { setSavedViews(prev => prev.filter(x => x.id !== id)); if (activeViewId === id) setActiveViewId(null); fire(lang === "ko" ? "뷰 삭제됨" : "View deleted"); };
  const toggleProp = (k) => setListProps(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  const t = I18N[lang];
  // global display currency: feed the formatters BEFORE children render. "native" = each plan in its own currency.
  setDisplayCurrency(dispCur === "native" ? null : dispCur);
  React.useEffect(() => { localStorage.setItem("keystone-cur-v1", dispCur); }, [dispCur]);
  const activeFilterCount = Object.values(filters).reduce((n, v) => n + v.length, 0);

  React.useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem("keystone-theme-v1", theme); }, [theme]);
  React.useEffect(() => { localStorage.setItem("keystone-lang-v1", lang); document.documentElement.lang = lang; }, [lang]);
  React.useEffect(() => { if (toast) { const x = setTimeout(() => setToast(null), 1800); return () => clearTimeout(x); } }, [toast]);
  // first-run coach marks: once, after the app is reachable
  React.useEffect(() => {
    if (!authed) return;
    try { if (!localStorage.getItem(COACH_KEY)) { const id = setTimeout(() => setShowCoach(true), 600); return () => clearTimeout(id); } } catch (e) {}
  }, [authed]);
  const dismissCoach = () => { setShowCoach(false); try { localStorage.setItem(COACH_KEY, "1"); } catch (e) {} };
  // ---- live market feed: connect a real quote API here. While connected, push price updates into setPlans for changed symbols only.
  React.useEffect(() => {
    // Demo: no synthetic price walk. A real build would open a quote socket while `conn === "connected"`
    // and call setPlans(...) for changed symbols only — no global re-render loop.
    return undefined;
  }, [conn, lang]);
  // keep window.PLANS reference in sync for editor's applied-count etc.
  React.useEffect(() => { window.PLANS = plans; }, [plans]);
  const [selectedSec, setSelectedSec] = React.useState(null);
  const [peekSec, setPeekSec] = React.useState(null);
  const [showSecSearch, setShowSecSearch] = React.useState(false);
  const [, forceWatch] = React.useReducer(x => x + 1, 0);
  const [showWs, setShowWs] = React.useState(false);
  const [promptModal, setPromptModal] = React.useState(null);
  const [showHelp, setShowHelp] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [ctxMenu, setCtxMenu] = React.useState(null);
  const [emptyCtx, setEmptyCtx] = React.useState(null);
  const [sbCollapsed, setSbCollapsed] = React.useState(false);
  const [rightCollapsed, setRightCollapsed] = React.useState(false);
  const [showCustomize, setShowCustomize] = React.useState(false);
  const SB_CFG0 = { watchlist: true, insights: true, research: true, scenarios: true, screener: true, archive: true, trash: true };
  const SB_ORDER0 = ["watchlist", "insights", "research", "scenarios", "screener", "archive", "trash"];
  const _sbSaved = (() => { try { return JSON.parse(localStorage.getItem("keystone-sidebar-v2") || "{}"); } catch (e) { return {}; } })();
  const [sidebarCfg, setSidebarCfg] = React.useState(_sbSaved.cfg || SB_CFG0);
  const [optOrder, setOptOrder] = React.useState(_sbSaved.order || SB_ORDER0);
  const [sidebarPin, setSidebarPin] = React.useState(_sbSaved.pinned || []);
  React.useEffect(() => { try { localStorage.setItem("keystone-sidebar-v2", JSON.stringify({ cfg: sidebarCfg, order: optOrder, pinned: sidebarPin })); } catch (e) {} }, [sidebarCfg, optOrder, sidebarPin]);
  const [trash, setTrash] = React.useState([]);
  const [scAuthor, setScAuthor] = React.useState(null); // {ticker} or {} for new
  const [, forceScn] = React.useReducer(x => x + 1, 0);

  const toggleTheme = () => setTheme(x => x === "dark" ? "light" : "dark");
  const toggleLang = () => setLang(x => x === "ko" ? "en" : "ko");
  const fire = (msg) => setToast(msg);

  // session-start notification: surface the newest unread inbox alert once per session as a toast
  React.useEffect(() => {
    try {
      if (sessionStorage.getItem("keystone-inbox-toast-v1")) return;
      const notes = buildInboxNotes(plans && plans.length ? plans : PLANS, lang);
      const newest = notes.find(n => !inboxRead.has(n.id));
      if (newest) {
        const title = newest.rule ? newest.rule.name[lang] : newest.title;
        setToast((lang === "ko" ? "새 알림 · " : "New · ") + title + " (" + newest.plan.ticker + ")");
        sessionStorage.setItem("keystone-inbox-toast-v1", "1");
      }
    } catch (e) {}
  }, []);

  React.useEffect(() => {
    const h = (e) => {
      const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName || "");
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setShowCmd(v => !v); return; }
      if (e.key === "Escape") { setShowCmd(false); setTabDD(null); setShowCompose(false); setShowSecSearch(false); if (peekSec) { setPeekSec(null); return; } if (selectedSec) { setSelectedSec(null); return; } if (selected) setSelected(null); return; }
      if (typing) return;
      if (e.key === "c" || e.key === "C") { e.preventDefault(); setShowCompose(true); }
      if (e.key === "[") { e.preventDefault(); setSbCollapsed(c => !c); }
      if (e.key === "/") { e.preventDefault(); setShowSecSearch(true); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [selected, selectedSec, peekSec]);

  const navTo = (v) => { setView(v); setSelected(null); setActiveStrat(null); setSelectedSec(null); setPeekSec(null); };
  const openPlan = (p, tab) => { setSelected(p.id); setPendingTab(tab || null); setSelectedSec(null); setPeekSec(null); };
  // coach act-2: open the sample plan at a given tab, walking one full cycle
  const coachNav = (tab) => { const p = plans.find(x => x.id === "PLN-001") || plans[0]; if (p) openPlan(p, tab); };
  const openStrategy = (id) => { setActiveStrat(id); setView("strategy"); setSelected(null); setSelectedSec(null); setPeekSec(null); };
  const openSecurity = (ticker) => { pushSecRecent(ticker); setPeekSec(ticker); setShowSecSearch(false); };
  const openSecurityFull = (ticker) => { pushSecRecent(ticker); setSelectedSec(ticker); setPeekSec(null); setSelected(null); setActiveStrat(null); setShowSecSearch(false); };
  // ---- multi-tab: active tab mirrors the current route ----
  React.useEffect(() => { setOpenTabs(prev => prev.map(tb => tb.id === activeTabId ? { ...tb, view, selected, selectedSec, activeStrat, activePf } : tb)); }, [view, selected, selectedSec, activeStrat, activePf, activeTabId]);
  const addTab = () => { const id = "t" + (tabSeq.current++); setOpenTabs(prev => [...prev, { id, view: "plans", selected: null, selectedSec: null, activeStrat: null, activePf: null }]); setActiveTabId(id); setView("plans"); setSelected(null); setSelectedSec(null); setActiveStrat(null); setActivePf(null); setPeekSec(null); };
  const activateTab = (id) => { const tb = openTabs.find(x => x.id === id); if (!tb) return; setActiveTabId(id); setView(tb.view ?? "plans"); setSelected(tb.selected ?? null); setSelectedSec(tb.selectedSec ?? null); setActiveStrat(tb.activeStrat ?? null); setActivePf(tb.activePf ?? null); setPeekSec(null); };
  const duplicateTab = (id) => { const tb = openTabs.find(x => x.id === id); if (!tb) return; const nid = "t" + (tabSeq.current++); setOpenTabs(prev => { const idx = prev.findIndex(x => x.id === id); const copy = { ...tb, id: nid }; const out = prev.slice(); out.splice(idx + 1, 0, copy); return out; }); setActiveTabId(nid); const t2 = tb; setView(t2.view ?? "plans"); setSelected(t2.selected ?? null); setSelectedSec(t2.selectedSec ?? null); setActiveStrat(t2.activeStrat ?? null); setActivePf(t2.activePf ?? null); setPeekSec(null); };
  const closeTab = (id) => { setOpenTabs(prev => { if (prev.length <= 1) return prev; const idx = prev.findIndex(x => x.id === id); const next = prev.filter(x => x.id !== id); if (id === activeTabId) { const n = next[Math.max(0, idx - 1)]; if (n) setTimeout(() => activateTab(n.id), 0); } return next; }); };
  const closeOtherTabs = (id) => { setOpenTabs(prev => prev.filter(x => x.id === id)); setActiveTabId(id); };
  const toggleWatch = (ticker) => { const s = securityOf(ticker); if (s) s.watched = !s.watched; forceWatch(); };
  // Auto-generated default scenarios. Basis: the security's mock 5yr trailing PER band
  // (perLo–perHi) × current EPS — Bull = high band, Base = mid band, Bear = low band.
  // Falls back to price multipliers when no band exists. Every generated scenario
  // carries auto:true ("자동" badge) until the user edits target/thesis/label.
  const scenFromSec = (s) => {
    const cu = s.cur === "USD" ? 1e3 : 1e6;
    const rnd = (v) => s.cur === "USD" ? Math.round(v) : Math.round(v / 100) * 100;
    const hasBand = s.perLo > 0 && s.perHi > s.perLo && s.eps > 0;
    const tFor = (kind) => {
      if (!hasBand) return rnd(s.price * (kind === "bull" ? 1.3 : kind === "base" ? 1.1 : 0.75));
      const per = kind === "bull" ? s.perHi : kind === "bear" ? s.perLo : (s.perHi + s.perLo) / 2;
      return rnd(s.eps * per);
    };
    const mk = (kind, color, status, label, koLabel, en, ko) => { const tgt = tFor(kind); return { label: { en: label, ko: koLabel }, color, target: tgt, status, per: +(tgt / s.eps).toFixed(1), cap: +(tgt * s.sharesOut / cu).toFixed(1), thesis: { en, ko }, auto: true }; };
    const bandNote = hasBand ? { en: ` (5y PER band × EPS)`, ko: ` (5년 PER 밴드 × EPS)` } : { en: "", ko: "" };
    return [
      mk("bull", "var(--r-bull)", "tracking", "Bull", "상단", "Upside case" + bandNote.en + ".", "\uc0c1\uc2b9 \uc2dc\ub098\ub9ac\uc624" + bandNote.ko + "."),
      mk("base", "var(--r-base)", "approaching", "Base", "중간", "Base case" + bandNote.en + ".", "\uae30\ubcf8 \uc2dc\ub098\ub9ac\uc624" + bandNote.ko + "."),
      mk("bear", "var(--r-bear)", "tracking", "Bear", "하단", "Downside case" + bandNote.en + ".", "\ud558\ub77d \uc2dc\ub098\ub9ac\uc624" + bandNote.ko + "."),
    ];
  };
  const createPlanFromSec = (s) => {
    const id = "PLN-" + String(Math.max(0, ...plans.map(p => parseInt(p.id.split("-")[1]) || 0)) + 1).padStart(3, "0");
    const np = { id, ticker: s.ticker, tickerName: s.name, flag: s.flag, cur: s.cur, name: { en: s.name.en + " plan", ko: s.name.ko + " \ud50c\ub79c" }, status: "research", portfolioId: s.market === "KR" ? "pf1" : "pf2", strategyId: null, currentPrice: s.price, avgPrice: null, totalShares: 0, totalInvested: 0, createdAt: "Jun 8", updatedAt: "now", eps: s.eps, sharesOut: s.sharesOut, scenarios: scenFromSec(s), executions: [], rules: [] };
    setPlans(prev => [np, ...prev]); setSelectedSec(null); setPeekSec(null); setSelected(id);
    fire(lang === "ko" ? "\ud50c\ub79c\uc774 \uc0dd\uc131\ub418\uc5c8\uc2b5\ub2c8\ub2e4" : "Plan created");
  };
  const setStatus = (id, status) => { setPlans(prev => prev.map(p => p.id === id ? { ...p, status } : p)); };
  const [, forceTick] = React.useReducer(x => x + 1, 0);
  const newPortfolio = () => {
    const palette = ["#4C8DFF", "#BB6BD9", "#4CB782", "#F2994A", "#2D9CDB", "#EB5757", "#9B6BD9"];
    const id = "pf_" + Date.now().toString(36).slice(-4);
    PORTFOLIOS.push({ id, name: { en: "New portfolio", ko: "새 포트폴리오" }, color: palette[PORTFOLIOS.length % palette.length], icon: "folder" });
    forceTick(); setActivePf(id); setView("plans"); setSelected(null);
    fire(lang === "ko" ? "포트폴리오 추가됨" : "Portfolio added");
  };
  const deletePortfolio = (id) => {
    const i = PORTFOLIOS.findIndex(p => p.id === id); if (i >= 0) PORTFOLIOS.splice(i, 1);
    if (activePf === id) setActivePf(null);
    forceTick(); fire(lang === "ko" ? "포트폴리오 삭제됨" : "Portfolio deleted");
  };
  const renamePortfolio = (id, name) => { const p = PORTFOLIOS.find(x => x.id === id); if (p && name.trim()) { p.name = { en: name.trim(), ko: name.trim() }; forceTick(); } };
  // create a portfolio inline AND assign the given plan to it (used by the portfolio pickers)
  const createPortfolioForPlan = (planId, name) => {
    const nm = (name || "").trim(); if (!nm) return;
    const id = createPortfolioNamed(nm);
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, portfolioId: id, updatedAt: "now" } : p));
  };
  // create a portfolio by name and return its id (used by ComposeModal, where the plan doesn't exist yet)
  const createPortfolioNamed = (name) => {
    const nm = (name || "").trim(); if (!nm) return null;
    const palette = ["#4C8DFF", "#BB6BD9", "#4CB782", "#F2994A", "#2D9CDB", "#EB5757", "#9B6BD9"];
    const id = "pf_" + Date.now().toString(36).slice(-4);
    PORTFOLIOS.push({ id, name: { en: nm, ko: nm }, color: palette[PORTFOLIOS.length % palette.length], icon: "folder" });
    forceTick(); fire(lang === "ko" ? "포트폴리오 추가됨" : "Portfolio added");
    return id;
  };
  const newStrategy = () => {
    const id = "ex_" + Date.now().toString(36).slice(-4);
    if (typeof EXEC_STRATEGIES !== "undefined") EXEC_STRATEGIES.push({ id, name: { en: "New strategy", ko: "새 전략" }, color: "#8A8F98", icon: "git-branch", cat: "accum", isPreset: false, desc: { en: "", ko: "" }, fields: [] });
    forceTick(); openStrategy(id);
    fire(lang === "ko" ? "전략 추가됨" : "Strategy added");
  };
  const newFramework = () => {
    const id = "st_" + Date.now().toString(36).slice(-4);
    STRATEGIES.push({ id, name: { en: "New framework", ko: "새 관점" }, color: "#8A8F98", icon: "gauge", cat: "multiple", model: "PER", gradeFocus: [], isPreset: false, desc: { en: "", ko: "" }, fields: [] });
    forceTick(); openStrategy(id);
    fire(lang === "ko" ? "관점 추가됨" : "Framework added");
  };
  const duplicateStrategy = (id) => {
    const s = STRATEGIES.find(x => x.id === id); if (!s) return;
    const nid = "st_" + Date.now().toString(36).slice(-4);
    const copy = JSON.parse(JSON.stringify(s)); copy.id = nid; copy.isPreset = false;
    copy.name = { en: s.name.en + " copy", ko: s.name.ko + " 사본" };
    STRATEGIES.push(copy); forceTick(); openStrategy(nid);
    fire(lang === "ko" ? "전략 복제됨" : "Strategy duplicated");
  };
  const deleteStrategy = (id) => {
    const i = STRATEGIES.findIndex(s => s.id === id); if (i >= 0) STRATEGIES.splice(i, 1);
    if (activeStrat === id) { setActiveStrat(null); setView("plans"); }
    forceTick(); fire(lang === "ko" ? "전략 삭제됨" : "Strategy deleted");
  };
  const toggleRule = (planId, ruleId) => setPlans(prev => prev.map(p => p.id === planId ? { ...p, rules: p.rules.map(r => r.id === ruleId ? { ...r, on: !r.on } : r) } : p));
  const addRule = (planId) => setPlans(prev => prev.map(p => p.id === planId ? { ...p, rules: [...p.rules, { id: "r" + Date.now().toString(36), custom: true, name: { en: "New rule", ko: "\uc0c8 \uaddc\uce59" }, on: true, last: "Never", trig: "ret_ge", trigVal: "10", act: "notify" }] } : p));
  const patchRule = (planId, ruleId, patch) => setPlans(prev => prev.map(p => p.id === planId ? { ...p, rules: p.rules.map(r => r.id === ruleId ? { ...r, ...patch, ...(r.custom ? {} : { edited: true }) } : r) } : p));
  const removeRule = (planId, ruleId) => setPlans(prev => prev.map(p => p.id === planId ? { ...p, rules: p.rules.filter(r => r.id !== ruleId) } : p));
  const patchPlan = (id, patch) => setPlans(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  const updateScenario = (planId, idx, patch) => setPlans(prev => prev.map(p => {
    if (p.id !== planId) return p;
    const scenarios = p.scenarios.map((s, i) => {
      if (i !== idx) return s;
      const ns = { ...s, ...patch };
      // any substantive edit (target/thesis/label) makes it the user's own thesis — drop the auto badge
      if (patch.target != null || patch.thesis != null || patch.label != null) ns.auto = false;
      if (patch.target != null && patch.target > 0) {
        ns.per = p.eps > 0 ? Math.round((patch.target / p.eps) * 10) / 10 : s.per;
        const capUnit = p.cur === "USD" ? 1e3 : 1e6;
        ns.cap = Math.round(patch.target * p.sharesOut / capUnit);
      }
      return ns;
    });
    return { ...p, scenarios };
  }));
  const CORE_SC = ["Bull", "Base", "Bear"];
  const addScenario = (planId) => setPlans(prev => prev.map(p => {
    if (p.id !== planId) return p;
    const n = p.scenarios.filter(s => !CORE_SC.includes(s.label.en)).length + 1;
    const target = p.cur === "USD" ? Math.round(p.currentPrice * 1.05 * 100) / 100 : Math.round(p.currentPrice * 1.05 / 100) * 100;
    const capUnit = p.cur === "USD" ? 1e3 : 1e6;
    const ns = {
      label: { en: "Scenario " + n, ko: "시나리오 " + n },
      status: "tracking",
      thesis: { en: "New scenario — click to edit the thesis and target.", ko: "새 시나리오 — 논거와 목표가를 클릭해 수정하세요." },
      target,
      per: p.eps > 0 ? Math.round((target / p.eps) * 10) / 10 : 0,
      cap: Math.round(target * p.sharesOut / capUnit),
      color: "var(--accent)",
    };
    return { ...p, scenarios: [...p.scenarios, ns] };
  }));
  const removeScenario = (planId, idx) => setPlans(prev => prev.map(p =>
    p.id === planId ? { ...p, scenarios: p.scenarios.filter((s, i) => i !== idx) } : p));
  // add a fill (execution) and recompute avg cost / shares / invested / round / status
  const addExecution = (planId, ex) => { const before = plans.find(p => p.id === planId); setPlans(prev => prev.map(p => {
    if (p.id !== planId) return p;
    const qty = Math.max(0, Number(ex.qty) || 0), price = Math.max(0, Number(ex.price) || 0);
    if (!qty || !price) return p;
    let totalShares = p.totalShares || 0, totalInvested = p.totalInvested || 0, round = p.round || 0, avgPrice = p.avgPrice;
    let newRound = null;
    if (ex.side === "buy") {
      totalInvested += price * qty; totalShares += qty;
      avgPrice = totalShares > 0 ? totalInvested / totalShares : null;
      round += 1; newRound = round;
    } else {
      const sq = Math.min(qty, totalShares);
      totalShares -= sq;
      if (totalShares <= 0) { totalShares = 0; totalInvested = 0; avgPrice = null; }
      else if (avgPrice != null) totalInvested = avgPrice * totalShares;
    }
    const newEx = { round: newRound, side: ex.side, price, qty, date: ex.date || "now" };
    const status = (ex.side === "buy" && (p.status === "research" || p.status === "planning")) ? "active"
      : (ex.side === "sell" && totalShares === 0 && (p.totalShares || 0) > 0 && (p.status === "active" || p.status === "paused")) ? "closing"
      : p.status;
    return { ...p, executions: [newEx, ...(p.executions || [])], totalShares, totalInvested, avgPrice, round, status, updatedAt: "now" };
  }));
    // auto-transition toasts — facts move status, and the user should see it happen
    if (before) {
      const q = Math.max(0, Number(ex.qty) || 0), pr = Math.max(0, Number(ex.price) || 0);
      if (q && pr) {
        if (ex.side === "buy" && (before.status === "research" || before.status === "planning"))
          fire(lang === "ko" ? "첫 체결 기록 — 실행중으로 전환됨" : "First fill recorded — moved to Active");
        else if (ex.side === "sell" && (before.status === "active" || before.status === "paused") && (before.totalShares || 0) > 0 && before.totalShares - Math.min(q, before.totalShares) <= 0)
          fire(lang === "ko" ? "전량 매도 — 청산중으로 전환됨" : "Position fully sold — moved to Closing");
      }
    }
  };
  const nextPlanId = () => "PLN-" + String(Math.max(0, ...plans.map(p => parseInt(p.id.split("-")[1]) || 0)) + 1).padStart(3, "0");
  const duplicatePlan = (id) => { const p = plans.find(x => x.id === id); if (!p) return; const nid = nextPlanId(); setPlans(prev => [{ ...JSON.parse(JSON.stringify(p)), id: nid, updatedAt: "now" }, ...prev]); fire(lang === "ko" ? "\ud50c\ub79c\uc774 \ubcf5\uc81c\ub418\uc5c8\uc2b5\ub2c8\ub2e4" : "Plan duplicated"); };
  const archivePlan = (id) => { setPlans(prev => prev.map(p => p.id === id ? { ...p, status: "closed" } : p)); fire(lang === "ko" ? "\ubcf4\uad00\ub428" : "Archived"); };
  const trashPlan = (id) => { const p = plans.find(x => x.id === id); setPlans(prev => prev.filter(x => x.id !== id)); if (p) setTrash(prev => [p, ...prev]); if (selected === id) setSelected(null); fire(lang === "ko" ? "\ud734\uc9c0\ud1b5\uc73c\ub85c \uc774\ub3d9\ub428" : "Moved to trash"); };
  const restoreFromTrash = (id) => { const p = trash.find(x => x.id === id); if (!p) return; setTrash(prev => prev.filter(x => x.id !== id)); setPlans(prev => [p, ...prev]); fire(lang === "ko" ? "\ubcf5\uad6c\ub428" : "Restored"); };
  const deleteForever = (id) => { setTrash(prev => prev.filter(x => x.id !== id)); fire(lang === "ko" ? "\uc601\uad6c \uc0ad\uc81c\ub428" : "Deleted"); };
  const restoreFromArchive = (id) => { setStatus(id, "active"); fire(lang === "ko" ? "\ubcf5\uad6c\ub428" : "Restored"); };
  const createPlan = (name, ticker, presetArg) => {
    const preset = presetArg || composePreset || {};
    const id = "PLN-" + String(Math.max(...plans.map(p => parseInt(p.id.split("-")[1]) || 0)) + 1).padStart(3, "0");
    const tk = (ticker || "").trim().toUpperCase();
    const sec = tk ? securityOf(tk) : null;
    // known security → real registry data (price/eps/cur/flag/name) + price-derived scenarios;
    // unknown ticker → mock defaults (real data wires in later)
    const np = sec ? {
      id, ticker: sec.ticker, tickerName: sec.name, flag: sec.flag, cur: sec.cur,
      name: { en: name, ko: name }, status: "research", portfolioId: activePf || "pf1", strategyId: null,
      currentPrice: sec.price, avgPrice: null, totalShares: 0, totalInvested: 0, createdAt: "Jun 8", updatedAt: "now",
      eps: sec.eps, sharesOut: sec.sharesOut, scenarios: scenFromSec(sec),
      executions: [], rules: [],
    } : {
      id, ticker: tk || "—", tickerName: { en: name, ko: name }, flag: "🇰🇷", cur: "KRW",
      name: { en: name, ko: name }, status: "research", portfolioId: activePf || "pf1", strategyId: null,
      currentPrice: 50000, avgPrice: null, totalShares: 0, totalInvested: 0, createdAt: "Jun 8", updatedAt: "now",
      eps: 3000, sharesOut: 100,
      scenarios: [
        { label: { en: "Bull", ko: "상단" }, color: "var(--r-bull)", target: 65000, status: "tracking", per: 21.7, cap: 6.5, thesis: { en: "Upside case.", ko: "상승 시나리오." }, auto: true },
        { label: { en: "Base", ko: "중간" }, color: "var(--r-base)", target: 55000, status: "approaching", per: 18.3, cap: 5.5, thesis: { en: "Base case.", ko: "기본 시나리오." }, auto: true },
        { label: { en: "Bear", ko: "하단" }, color: "var(--r-bear)", target: 40000, status: "tracking", per: 13.3, cap: 4.0, thesis: { en: "Downside case.", ko: "하락 시나리오." }, auto: true },
      ],
      executions: [], rules: [],
    };
    if (preset.status) np.status = preset.status;
    if ("portfolioId" in preset) np.portfolioId = preset.portfolioId;
    if ("strategyId" in preset) np.strategyId = preset.strategyId;
    if (preset.memo) { const b = np.scenarios.find(s => s.label.en === "Base"); if (b) b.thesis = { en: preset.memo, ko: preset.memo }; }
    setPlans(prev => [np, ...prev]);
    setComposePreset(null);
    fire(lang === "ko" ? "플랜이 생성되었습니다" : "Plan created");
  };

  // filtering
  let visible = plans;
  if (activePf) visible = plans.filter(p => p.portfolioId === activePf);
  if (wfTab !== "all") visible = visible.filter(p => WF_TYPE[p.status] === wfTab);
  visible = visible.filter(p => matchesFilters(p, filters));

  const selPlan = selected ? plans.find(p => p.id === selected) : null;
  const selSec = selectedSec ? securityOf(selectedSec) : null;
  const strat = activeStrat ? (STRATEGIES.find(s => s.id === activeStrat) || (typeof EXEC_STRATEGIES !== "undefined" ? EXEC_STRATEGIES.find(s => s.id === activeStrat) : null)) : null;
  const pf = activePf ? PORTFOLIOS.find(p => p.id === activePf) : null;

  // header title
  let titleIcon = "crosshair", titleText = t.plans;
  if (view === "inbox") { titleIcon = "inbox"; titleText = t.inbox; }
  else if (view === "journal") { titleIcon = "notebook-pen"; titleText = t.journal; }
  else if (view === "views") { titleIcon = "layers"; titleText = t.views; }
  else if (view === "strategy" && strat) { titleIcon = strat.icon; titleText = strat.name[lang]; }
  else if (view === "watchlist") { titleIcon = "star"; titleText = t.watchlist; }
  else if (view === "research") { titleIcon = "book-open"; titleText = t.research; }
  else if (view === "screener") { titleIcon = "filter"; titleText = t.screenerNav; }
  else if (view === "insights") { titleIcon = "chart-line"; titleText = t.insights; }
  else if (view === "scenarios") { titleIcon = "target"; titleText = t.scenariosMon; }
  else if (view === "archive") { titleIcon = "archive"; titleText = t.archiveNav; }
  else if (view === "trash") { titleIcon = "trash-2"; titleText = t.trash; }
  else if (pf) { titleIcon = "crosshair"; titleText = pf.name[lang]; }

  const tabIcon = (view === "strategy" && strat ? strat.icon : titleIcon);
  const tabLabel = selPlan ? selPlan.id : selSec ? selSec.ticker : titleText;
  const tabMeta = (tb) => {
    if (tb.selected) { const p = plans.find(x => x.id === tb.selected); return p ? { kind: "plan", label: p.id, status: p.status } : { kind: "view", label: "—", icon: "circle" }; }
    if (tb.selectedSec) { const s = securityOf(tb.selectedSec); return { kind: "sec", label: tb.selectedSec, market: s ? s.market : "US" }; }
    if (tb.view === "strategy" && tb.activeStrat) { const st = STRATEGIES.find(s => s.id === tb.activeStrat) || (typeof EXEC_STRATEGIES !== "undefined" ? EXEC_STRATEGIES.find(s => s.id === tb.activeStrat) : null); return { kind: "view", label: st ? st.name[lang] : "—", icon: st ? st.icon : "layers" }; }
    if (tb.activePf) { const p = PORTFOLIOS.find(x => x.id === tb.activePf); return { kind: "view", label: p ? p.name[lang] : "—", icon: "crosshair" }; }
    const V = { plans: { i: "crosshair", l: t.plans || (lang === "ko" ? "플랜" : "Plans") }, inbox: { i: "inbox", l: t.inbox }, journal: { i: "notebook-pen", l: t.journal }, watchlist: { i: "star", l: lang === "ko" ? "관심종목" : "Watchlist" }, research: { i: "book-open", l: t.research }, statements: { i: "file-text", l: lang === "ko" ? "재무제표" : "Statements" }, screener: { i: "filter", l: t.screenerNav }, views: { i: "layers", l: t.views }, financials: { i: "file-text", l: lang === "ko" ? "재무제표" : "Financials" }, dashboard: { i: "layout-dashboard", l: lang === "ko" ? "대시보드" : "Dashboard" }, simulator: { i: "calculator", l: t.simulator }, scenarios: { i: "target", l: t.scenariosMon }, insights: { i: "chart-line", l: t.insights }, archive: { i: "archive", l: t.archiveNav }, trash: { i: "trash-2", l: t.trash } };
    const m = V[tb.view] || { i: "circle", l: tb.view || "—" };
    return { kind: "view", label: m.l, icon: m.i };
  };

  if (!authed) {
    return <AuthFlow lang={lang} theme={theme} toggleTheme={toggleTheme} toggleLang={toggleLang} onReady={(s) => setSession(s)} />;
  }
  return (
    <div className="app">
      {session && session.needsVerify && !verifyDismissed && typeof VerifyBanner !== "undefined" &&
        <VerifyBanner lang={lang} email={session.email} onResend={() => fire(lang === "ko" ? "인증 메일을 다시 보냈어요" : "Verification email resent")} onDismiss={() => setVerifyDismissed(true)} />}
      <div className="app-row">
      {!sbCollapsed && <Sidebar view={selPlan ? "plans" : view} navTo={navTo} t={t} lang={lang} plans={plans} inboxUnread={inboxUnread} activePf={activePf} setPf={setActivePf}
        onCompose={() => setShowCompose(true)} onSearch={() => setShowSecSearch(true)} onCmd={() => setShowWs(true)} onWsMenu={() => setShowWs(true)} onCollapse={() => setSbCollapsed(true)} activeStrat={activeStrat} openStrategy={openStrategy} cfg={sidebarCfg} order={optOrder} pinned={sidebarPin}
        onNewPf={newPortfolio} onDelPf={deletePortfolio} onRenamePf={renamePortfolio} onNewStrat={newStrategy} onNewFramework={newFramework} onDupStrat={duplicateStrategy} onDelStrat={deleteStrategy} setFilter={(type, value) => { setFilters({ [type]: [value] }); setView("plans"); setSelected(null); }}
        views={savedViews} activeViewId={activeViewId} onApplyView={applyView} onSaveView={saveCurrentView} onRenameView={renameView} onDelView={deleteView} />}

      <div className="main">
        <div className="tabbar">
          {sbCollapsed && <button className="iconbtn" onClick={() => setSbCollapsed(false)} title={t.expandSb} style={{ marginRight: 2 }}><PanelIcon side="left" size={16} /></button>}
          <div className="navbtns">
            <button className="iconbtn" onClick={() => { if (selPlan) setSelected(null); else if (selSec) setSelectedSec(null); else if (view === "strategy") { setActiveStrat(null); setView("plans"); } }} style={{ opacity: (selPlan || selSec || view === "strategy") ? 1 : .35 }}><Lic name="chevron-left" size={16} /></button>
            <button className="iconbtn" style={{ opacity: .35 }}><Lic name="chevron-right" size={16} /></button>
          </div>
          <div className="tab-strip">
            {openTabs.map(tb => { const m = tabMeta(tb); const on = tb.id === activeTabId; return (
              <div key={tb.id} className={"tab" + (on ? " active" : "")} onClick={(e) => { if (on) { const r = e.currentTarget.getBoundingClientRect(); setTabDD({ x: Math.max(8, r.left), y: r.bottom + 5 }); } else activateTab(tb.id); }}
                onContextMenu={(e) => { e.preventDefault(); setTabMenu({ id: tb.id, x: Math.min(e.clientX, window.innerWidth - 180), y: e.clientY }); }}>
                {m.kind === "plan" ? <StatusIcon status={m.status} size={13} /> : m.kind === "sec" ? <Flag market={m.market} size={13} /> : <Lic name={m.icon} size={13} cls="icon-sm" color="var(--fg-3)" />}
                <span className="tab-name">{m.label}</span>
                {on && <Lic name="chevron-down" size={11} cls="icon-sm tab-caret" color="var(--fg-4)" />}
                {openTabs.length > 1 && <button className="tab-x" onClick={(e) => { e.stopPropagation(); closeTab(tb.id); }}><Lic name="x" size={11} /></button>}
              </div>
            ); })}
            <button className="tab-add" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setTabDD({ x: Math.max(8, r.left), y: r.bottom + 5, newTab: true }); }} title={lang === "ko" ? "새 탭" : "New tab"}><Lic name="plus" size={14} /></button>
          </div>
          <span className="spacer" />
          <LangPicker lang={lang} setLang={setLang} />
          <button className="tabbar-theme" onClick={toggleTheme} title={t.theme} aria-label={t.theme}>
            <Lic name={theme === "dark" ? "sun" : "moon"} size={14} cls="icon-sm" color="currentColor" />
          </button>
          <CurrencyPicker dispCur={dispCur} setDispCur={setDispCur} t={t} />
        </div>

        {!selPlan && !selSec && view !== "strategy" && <div className="viewheader">
          <div className="viewtitle">
            <span className="vt-crumb" onClick={() => setShowWs(true)}><KeystoneLogo size={18} /><span className="vt-crumb-name">Keystone</span></span>
            <Lic name="chevron-right" size={13} cls="icon-sm" color="var(--fg-4)" />
            {pf ? <span className="pf-dot" style={{ background: pf.color, width: 11, height: 11 }} /> : <Lic name={titleIcon} size={16} color="var(--fg-2)" />}
            <h1 className="vt-title">{titleText}</h1>
          </div>
          {view === "plans" && <div className="segmented wf-tabs">
            {[["all", t.tab_all], ["pre", t.tab_pre], ["open", t.tab_open], ["closed", t.tab_closed]].map(([k, lab]) => (
              <div key={k} className={"seg" + (wfTab === k ? " active" : "")} onClick={() => setWfTab(k)}>{lab}</div>
            ))}
          </div>}
          <span className="spacer" />
          {view === "plans" && <div className="segmented">
            {[["list", "list", t.list], ["board", "layout-grid", t.board], ["timeline", "calendar-range", t.timeline], ["dashboard", "layout-dashboard", t.dash_tab]].map(([m, ic, lab]) => (
              <div key={m} className={"seg" + (mode === m ? " active" : "")} onClick={() => setMode(m)} title={lab}><Lic name={ic} size={15} cls="icon-sm" color="inherit" /></div>
            ))}
          </div>}
          <div className="toolbar-icons" style={{ marginLeft: 8 }}>
            <button className={"live-pill conn-" + conn} onClick={() => { if (conn === "offline") reconnect(); }} title={lang === "ko" ? (conn === "connected" ? "실시간 시세 연동됨" : conn === "connecting" ? "연결 중…" : "연결 끊김 — 클릭해 재연결") : (conn === "connected" ? "Live quotes connected" : conn === "connecting" ? "Connecting…" : "Disconnected — click to reconnect")}>
              <span className="live-dot" />{lang === "ko" ? (conn === "connected" ? "실시간" : conn === "connecting" ? "연결 중" : "재연결") : (conn === "connected" ? "Live" : conn === "connecting" ? "Connecting" : "Reconnect")}
            </button>
            {((view === "plans" && !selPlan && !selSec) || view === "screener" || view === "scenarios" || view === "watchlist" || view === "archive") && <button className={"iconbtn" + (panel === "filter" ? " active" : "")} onClick={(e) => { if (panel === "filter") setPanel(null); else openFilterAt(e); }} title={t.filter}><Lic name="list-filter" size={16} /></button>}
            {((view === "plans" && !selPlan && !selSec) || view === "screener" || view === "scenarios" || view === "watchlist" || view === "archive") && <button className={"iconbtn" + (panel === "display" ? " active" : "")} onClick={() => setPanel(panel === "display" ? null : "display")} title={t.display}><Lic name="sliders-horizontal" size={16} /></button>}
            <button className="iconbtn" onClick={() => navTo("inbox")} title={t.inbox}><Lic name="bell" size={16} /></button>
          </div>
          {view === "plans" && !selPlan && !selSec && (LIBRARY_LOCKED ? <button className="v-btn v-btn--primary newplan-btn" onClick={() => setShowCompose(true)} title={t.newPlan + " · C"}><Lic name="plus" size={15} cls="icon-sm" color="var(--fg-on-accent)" />{t.newPlan}</button> : <div className="create-split">
            <button className="v-btn v-btn--primary newplan-btn" onClick={() => setShowCompose(true)} title={t.newPlan + " · C"}>
              <Lic name="plus" size={15} cls="icon-sm" color="var(--fg-on-accent)" />{t.newPlan}
            </button>
            <MiniDropdown align="right" width={190} trigger={<button className="v-btn v-btn--primary create-caret" title={lang === "ko" ? "더 만들기" : "Create…"}><Lic name="chevron-down" size={14} cls="icon-sm" color="var(--fg-on-accent)" /></button>}
              items={[
                { value: "plan", label: lang === "ko" ? "새 플랜" : "New plan", icon: <Lic name="square-pen" size={14} cls="icon-sm" color="var(--fg-3)" /> },
                { value: "strat", label: lang === "ko" ? "새 전략" : "New strategy", icon: <Lic name="git-branch" size={14} cls="icon-sm" color="var(--fg-3)" /> },
                { value: "fw", label: lang === "ko" ? "새 관점" : "New framework", icon: <Lic name="gauge" size={14} cls="icon-sm" color="var(--fg-3)" /> },
              ]}
              onPick={(v) => { if (v === "plan") setShowCompose(true); else if (v === "strat") newStrategy(); else newFramework(); }} />
          </div>)}
        </div>}

        {!selPlan && view === "plans" && (activePf || activeFilterCount > 0) && <div className="filterbar">
          {activePf && <div className="filter-chip">
            <span className="fc-seg fc-key">{t.portfolio}</span>
            <span className="fc-seg"><span className="pf-dot" style={{ background: pf.color }} />{pf.name[lang]}</span>
            <span className="fc-x" onClick={() => setActivePf(null)}><Lic name="x" size={12} cls="icon-sm" color="inherit" /></span>
          </div>}
          {Object.entries(filters).map(([type, vals]) => (
            <div className="filter-chip" key={type}>
              <span className="fc-seg fc-key">{FILTER_TYPE_LABEL(type, t, lang)}</span>
              {lang === "en" && <span className="fc-seg" style={{ color: "var(--fg-3)" }}>is</span>}
              <span className="fc-seg">{vals.map(v => filterValueLabel(type, v, t, lang)).join(", ")}</span>
              <span className="fc-x" onClick={() => removeFilterType(type)}><Lic name="x" size={12} cls="icon-sm" color="inherit" /></span>
            </div>
          ))}
          <button className="iconbtn" style={{ width: 24, height: 24 }} onClick={openFilterAt} title={t.addFilter}><Lic name="plus" size={14} /></button>
          <div className="right" style={{ display: "flex", gap: 14 }}>
            {activeFilterCount > 0 && <span className="linklike" onClick={saveCurrentView}><Lic name="layers" size={12} cls="icon-sm" color="currentColor" /> {t.saveView}</span>}
            <span className="linklike" onClick={() => { setActivePf(null); setFilters({}); setActiveViewId(null); }}>{t.clear}</span>
          </div>
        </div>}

        <div className="body-row" onContextMenu={(e) => { if (e.defaultPrevented) return; if (!(view === "plans" && !selPlan && !selSec)) return; e.preventDefault(); setEmptyCtx({ x: e.clientX, y: e.clientY }); }}>
          {selSec ? <SecurityDetail security={selSec} plans={plans} t={t} lang={lang} onBack={() => setSelectedSec(null)} onOpenList={() => { setSelectedSec(null); navTo("watchlist"); }} onOpenPlan={openPlan} onToggleWatch={toggleWatch} onCreatePlan={createPlanFromSec} onAddScenario={(tk) => setScAuthor({ ticker: tk })} />
            : selPlan ? <DetailView plan={selPlan} t={t} lang={lang} initialTab={pendingTab} onBack={() => setSelected(null)} onStatus={setStatus} onToggleRule={toggleRule} onAddRule={addRule} onPatchRule={patchRule} onRemoveRule={removeRule} onUpdateScenario={updateScenario} onAddScenario={addScenario} onRemoveScenario={removeScenario} onAddExec={addExecution} onPatchPlan={patchPlan} onCreatePortfolio={createPortfolioForPlan} onOpenSecurity={openSecurity} onOpenStrategy={openStrategy} rightCollapsed={rightCollapsed} onToggleRight={() => setRightCollapsed(c => !c)} />
            : view === "strategy" && strat ? <StrategyEditor strategy={strat} t={t} lang={lang} plans={plans} onOpenPlan={openPlan} />
            : view === "inbox" ? <InboxScreen t={t} lang={lang} plans={plans} onOpen={openPlan} addExecution={addExecution} setStatus={setStatus} fire={fire} onPatchPlan={patchPlan} read={inboxRead} onMarkRead={inboxMarkRead} onMarkAll={inboxMarkAll} />
            : view === "journal" ? <JournalScreen t={t} lang={lang} plans={plans} onOpen={openPlan} onPatchPlan={patchPlan} onOpenSecurity={openSecurityFull} />
            : view === "watchlist" ? <WatchlistView t={t} lang={lang} plans={plans} onOpenSecurity={openSecurity} panel={panel} setPanel={setPanel} filterAnchor={filterAnchor} />
            : view === "research" ? <ResearchBrowser t={t} lang={lang} plans={plans} onOpenSecurity={openSecurityFull} />
            : view === "screener" ? <ScreenerView t={t} lang={lang} plans={plans} onOpenSecurity={openSecurity} panel={panel} setPanel={setPanel} filterAnchor={filterAnchor} setFilterAnchor={setFilterAnchor} />
            : view === "insights" ? <InsightsView plans={plans} t={t} lang={lang} onOpenPlan={openPlan} />
            : view === "scenarios" ? <ScenariosMonitor t={t} lang={lang} plans={plans} onOpenPlan={openPlan} onNewScenario={(ticker) => setScAuthor({ ticker: typeof ticker === "string" ? ticker : null })} panel={panel} setPanel={setPanel} filterAnchor={filterAnchor} />
            : view === "archive" ? <ArchiveView t={t} lang={lang} plans={plans} onOpenPlan={openPlan} onRestore={restoreFromArchive} panel={panel} setPanel={setPanel} filterAnchor={filterAnchor} />
            : view === "trash" ? <TrashView t={t} lang={lang} trash={trash} onRestore={restoreFromTrash} onDeleteForever={deleteForever} />
            : view === "views" ? <ViewsScreen t={t} lang={lang} plans={plans} views={savedViews} onApply={applyView} onRename={renameView} onDelete={deleteView} />
            : mode === "board" ? <BoardView plans={visible} t={t} lang={lang} onOpen={openPlan} onMove={setStatus} props={listProps} ordering={ordering} onQuickAdd={quickAdd} />
            : mode === "timeline" ? <TimelineView plans={visible} t={t} lang={lang} onOpen={openPlan} mode={tlMode} setMode={setTlMode} ordering={ordering} grouping={grouping} overlays={tlOverlays} yMode={tlYMode} />
            : mode === "dashboard" ? <DashboardView plans={visible} t={t} lang={lang} onOpen={openPlan} grouping={grouping} ordering={ordering} />
            : <ListView plans={visible} t={t} lang={lang} onOpen={openPlan} focusId={focusId} grouping={grouping} ordering={ordering} showEmpty={showEmpty} props={listProps} onQuickAdd={quickAdd} onContext={(e, p) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, plan: p }); }} />}
        </div>
      </div>
      </div>

      {showCmd && <CommandMenu t={t} lang={lang} onClose={() => setShowCmd(false)} onNav={navTo} onCompose={() => setShowCompose(true)} toggleTheme={toggleTheme} toggleLang={toggleLang} openStrategy={openStrategy} />}
      {tabDD && (() => {
        const watched = (typeof SECURITIES !== "undefined" ? SECURITIES : []).filter(s => s.watched);
        const secs = [
          { v: "inbox", icon: "inbox", label: t.inbox },
          { v: "journal", icon: "notebook-pen", label: t.journal },
          { v: "plans", icon: "crosshair", label: t.plans, items: plans.map(p => ({ key: p.id, ic: <StatusIcon status={p.status} size={13} />, label: p.tickerName[lang], sub: p.id, go: () => openPlan(p) })) },
          { v: "views", icon: "layers", label: t.views, items: (savedViews || []).map(sv => ({ key: sv.id, ic: <Lic name="layers" size={13} cls="icon-sm" color="var(--fg-3)" />, label: viewName(sv, lang), go: () => applyView(sv) })) },
          { divider: true },
          { v: "watchlist", icon: "star", label: t.watchlist, items: watched.map(s => ({ key: s.ticker, ic: <Flag market={s.market} size={13} />, label: s.name[lang], sub: s.ticker, go: () => openSecurityFull(s.ticker) })) },
          { v: "research", icon: "book-open", label: t.research },
          { v: "scenarios", icon: "target", label: t.scenariosMon },
          { v: "screener", icon: "filter", label: t.screenerNav },
          { v: "insights", icon: "chart-line", label: t.insights },
          { divider: true },
          { v: "archive", icon: "archive", label: t.archiveNav },
          { v: "trash", icon: "trash-2", label: t.trash },
        ];
        const curView = (!selPlan && !selSec && view !== "strategy") ? view : null;
        const run = (fn) => { if (tabDD.newTab) addTab(); fn(); setTabDD(null); };
        return <TabSwitcherView pos={tabDD} secs={secs} curView={curView} ko={lang === "ko"} run={run} onClose={() => setTabDD(null)} navTo={navTo} />;
      })()}
      {tabMenu && <>
        <div className="overlay" onClick={() => setTabMenu(null)} onContextMenu={(e) => { e.preventDefault(); setTabMenu(null); }} />
        <div className="v-menu" style={{ position: "fixed", top: tabMenu.y, left: tabMenu.x, width: 168, zIndex: 80 }}>
          <div className="v-menu-item" onClick={() => { duplicateTab(tabMenu.id); setTabMenu(null); }}><Lic name="copy" size={15} cls="icon-sm" color="var(--fg-3)" /><span>{lang === "ko" ? "탭 복제" : "Duplicate tab"}</span></div>
          {openTabs.length > 1 && <div className="v-menu-item" onClick={() => { closeTab(tabMenu.id); setTabMenu(null); }}><Lic name="x" size={15} cls="icon-sm" color="var(--fg-3)" /><span>{lang === "ko" ? "탭 닫기" : "Close tab"}</span></div>}
          {openTabs.length > 1 && <div className="v-menu-item" onClick={() => { closeOtherTabs(tabMenu.id); setTabMenu(null); }}><Lic name="list-x" size={15} cls="icon-sm" color="var(--fg-3)" /><span>{lang === "ko" ? "다른 탭 닫기" : "Close others"}</span></div>}
        </div>
      </>}
      {panel === "filter" && view !== "screener" && view !== "scenarios" && view !== "watchlist" && view !== "archive" && <FilterPanel t={t} lang={lang} filters={filters} onToggle={toggleFilter} onClose={() => setPanel(null)} anchor={filterAnchor} />}
      {panel === "display" && view !== "screener" && view !== "scenarios" && view !== "watchlist" && view !== "archive" && <DisplayPanel t={t} lang={lang} mode={mode} setMode={setMode} grouping={grouping} setGrouping={setGrouping} ordering={ordering} setOrdering={setOrdering} showEmpty={showEmpty} setShowEmpty={setShowEmpty} props={listProps} toggleProp={toggleProp} tlMode={tlMode} setTlMode={setTlMode} tlOverlays={tlOverlays} setTlOverlays={setTlOverlays} tlYMode={tlYMode} setTlYMode={setTlYMode} onClose={() => setPanel(null)} />}
      {showCompose && <ComposeModal t={t} lang={lang} preset={composePreset} defaultPfId={activePf || "pf1"} onCreatePortfolio={createPortfolioNamed} onClose={() => { setShowCompose(false); setComposePreset(null); }} onCreate={createPlan} />}
      {showSecSearch && <SearchModal t={t} lang={lang} plans={plans} onClose={() => setShowSecSearch(false)} onOpenPlan={openPlan} onOpenSecurity={openSecurity} onOpenStrategy={openStrategy} />}
      {promptModal && <PromptModal t={t} title={promptModal.title} label={promptModal.label} initial={promptModal.initial} confirmLabel={promptModal.confirmLabel} onConfirm={promptModal.onConfirm} onClose={() => setPromptModal(null)} />}
      {showWs && <WorkspaceMenu t={t} lang={lang} theme={theme} onClose={() => setShowWs(false)} onSettings={() => setShowSettings(true)} onCustomize={() => setShowCustomize(true)} toggleTheme={toggleTheme} toggleLang={toggleLang} fire={fire} onLogout={logout} />}
      {showHelp && <HelpMenu t={t} lang={lang} onClose={() => setShowHelp(false)} onShortcuts={() => fire(lang === "ko" ? "\u2318K \ub294 \uba85\ub839, / \ub294 \uac80\uc0c9" : "\u2318K commands, / search")} fire={fire} />}
      {showSettings && <SettingsModal t={t} lang={lang} theme={theme} toggleTheme={toggleTheme} setLang={setLang} onClose={() => setShowSettings(false)} />}
      {showCustomize && <CustomizeModal t={t} lang={lang} cfg={sidebarCfg} setCfg={setSidebarCfg} order={optOrder} setOrder={setOptOrder} pinned={sidebarPin} setPinned={setSidebarPin} onClose={() => setShowCustomize(false)} />}
      {peekSec && <SecurityPeek security={securityOf(peekSec)} plans={plans} t={t} lang={lang} onClose={() => setPeekSec(null)} onExpand={() => openSecurityFull(peekSec)} onOpenPlan={openPlan} onToggleWatch={toggleWatch} onCreatePlan={createPlanFromSec} onAddScenario={(tk) => setScAuthor({ ticker: tk })} />}
      {scAuthor && <ScenarioAuthor t={t} lang={lang} initialTicker={scAuthor.ticker} onClose={() => setScAuthor(null)} onSaved={() => { forceScn(); fire(lang === "ko" ? "시나리오가 저장되었습니다" : "Scenario saved"); }} />}
      {emptyCtx && <>
        <div className="overlay" onClick={() => setEmptyCtx(null)} onContextMenu={(e) => { e.preventDefault(); setEmptyCtx(null); }} />
        <div className="v-menu" style={{ position: "fixed", top: Math.min(emptyCtx.y, window.innerHeight - 150), left: Math.min(emptyCtx.x, window.innerWidth - 200), width: 188, zIndex: 80 }}>
          <div className="cmd-cap" style={{ padding: "5px 11px 4px" }}>{lang === "ko" ? "새로 만들기" : "Create"}</div>
          <div className="v-menu-item" onClick={() => { setEmptyCtx(null); quickAdd(); }}><Lic name="square-pen" size={15} cls="icon-sm" color="var(--fg-3)" /><span>{lang === "ko" ? "새 플랜" : "New plan"}</span></div>
          {!LIBRARY_LOCKED && <div className="v-menu-item" onClick={() => { setEmptyCtx(null); newStrategy(); }}><Lic name="git-branch" size={15} cls="icon-sm" color="var(--fg-3)" /><span>{lang === "ko" ? "새 전략" : "New strategy"}</span></div>}
          {!LIBRARY_LOCKED && <div className="v-menu-item" onClick={() => { setEmptyCtx(null); newFramework(); }}><Lic name="gauge" size={15} cls="icon-sm" color="var(--fg-3)" /><span>{lang === "ko" ? "새 관점" : "New framework"}</span></div>}
        </div>
      </>}
      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} plan={ctxMenu.plan} t={t} lang={lang} onClose={() => setCtxMenu(null)} onStatus={setStatus} onPatchPlan={patchPlan} onDuplicate={duplicatePlan} onArchive={archivePlan} onTrash={trashPlan} />}
      <div className="help-btn" onClick={() => setShowHelp(true)} title={t.help}>?</div>
      {toast && <div className="toast"><Lic name="check-circle" size={15} cls="icon-sm" color="var(--r-bull)" />{toast}</div>}
      {showCoach && typeof CoachMarks !== "undefined" && <CoachMarks lang={lang} onDone={dismissCoach} onNav={coachNav} />}
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
