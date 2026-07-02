// Chrome.jsx — workspace menu, help menu (+ What's new), context menu, settings modal

const CHANGELOG = [
  { date: "Jun 8", tag: { en: "New", ko: "신규" }, color: "var(--accent)", title: { en: "Securities + KR/US search", ko: "종목 1급 엔티티 + 한/미 검색" } },
  { date: "Jun 6", tag: { en: "New", ko: "신규" }, color: "var(--r-bull)", title: { en: "Scenario simulator", ko: "시나리오 시뮬레이터" } },
  { date: "Jun 2", tag: { en: "Preset", ko: "프리셋" }, color: "var(--label-purple)", title: { en: "Infinite Buying strategy", ko: "무한매수법 전략 프리셋" } },
];

function WorkspaceMenu({ t, lang, theme, onClose, onSettings, onCustomize, toggleTheme, toggleLang, fire, onLogout }) {
  const item = (icon, label, onClick, right) => (
    <div className="v-menu-item" onClick={() => { onClick && onClick(); }}>
      {typeof icon === "string" ? <Lic name={icon} size={15} cls="icon-sm" color="var(--fg-3)" /> : icon}<span>{label}</span>{right && <span className="shortcut" style={{ marginLeft: "auto", color: "var(--fg-4)", fontSize: 12 }}>{right}</span>}
    </div>
  );
  return <>
    <div className="overlay" onClick={onClose} />
    <div className="v-menu" style={{ position: "fixed", top: 42, left: 10, width: 232, zIndex: 60 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 9px 8px" }}>
        <KeystoneLogo size={26} />
        <div style={{ minWidth: 0 }}><div style={{ font: "var(--fw-semi) 13px var(--font-sans)", color: "var(--fg)" }}>Keystone</div><div style={{ font: "var(--fw-medium) 11px var(--font-sans)", color: "var(--fg-4)" }}>{lang === "ko" ? "밸류에이션 커버리지" : "valuation coverage"}</div></div>
      </div>
      <div className="menu-sep" />
      {item("settings-2", t.settings, () => { onClose(); onSettings(); }, "G S")}
      {item("panel-left", t.customizeSidebar, () => { onClose(); onCustomize(); })}
      <div className="menu-sep" />
      {item(theme === "dark" ? "sun" : "moon", theme === "dark" ? t.light : t.dark, () => { toggleTheme(); }, null)}
      {item("globe", t.lang, () => { toggleLang(); })}
      <div className="menu-sep" />
      {item("log-out", t.logout, () => { onClose(); if (onLogout) onLogout(); else fire(lang === "ko" ? "데모 모드입니다" : "Demo mode"); })}
    </div>
  </>;
}

function HelpMenu({ t, lang, onClose, onShortcuts, fire }) {
  const item = (icon, label, onClick, right) => (
    <div className="v-menu-item" onClick={onClick}>
      <Lic name={icon} size={15} cls="icon-sm" color="var(--fg-3)" /><span>{label}</span>{right && <span className="shortcut" style={{ marginLeft: "auto", color: "var(--fg-4)", fontSize: 11 }}>{right}</span>}
    </div>
  );
  return <>
    <div className="overlay" onClick={onClose} />
    <div className="v-menu" style={{ position: "fixed", bottom: 44, left: 10, width: 248, zIndex: 60 }}>
      {item("search", t.help, () => { onClose(); fire(lang === "ko" ? "도움말 검색 (데모)" : "Help search (demo)"); })}
      {item("book-open", t.docs, () => { onClose(); fire("Docs (demo)"); })}
      {item("message-circle", t.contact, () => { onClose(); fire(lang === "ko" ? "문의 (데모)" : "Contact (demo)"); })}
      {item("keyboard", t.keyboardShortcuts, () => { onClose(); onShortcuts(); }, "?")}
      <div className="menu-sep" />
      <div className="cmd-cap" style={{ padding: "6px 10px 2px" }}>{t.whatsNew}</div>
      {CHANGELOG.map((c, i) => (
        <div className="v-menu-item" key={i} style={{ height: "auto", padding: "7px 9px", alignItems: "flex-start" }} onClick={() => { onClose(); fire(c.title[lang]); }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.color, marginTop: 5, flex: "none" }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ font: "var(--fw-medium) 12px var(--font-sans)", color: "var(--fg)", whiteSpace: "normal" }}>{c.title[lang]}</div>
            <div style={{ font: "var(--fw-medium) 10px var(--font-sans)", color: "var(--fg-4)", marginTop: 2 }}>{c.tag[lang]} · {c.date}</div>
          </div>
        </div>
      ))}
    </div>
  </>;
}

function ContextMenu({ x, y, plan, t, lang, onClose, onStatus, onPatchPlan, onDuplicate, onArchive, onTrash }) {
  const X = Math.min(x, window.innerWidth - 230), Y = Math.min(y, window.innerHeight - 420);
  const curStrat = STRATEGIES.find(s => s.id === plan.strategyId);
  return <>
    <div className="overlay" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
    <div className="v-menu" style={{ position: "fixed", top: Y, left: X, width: 212, zIndex: 60, maxHeight: "82vh", overflowY: "auto" }}>
      <div className="cmd-cap" style={{ padding: "4px 9px 4px" }}>{t.changeStatus}</div>
      <div style={{ display: "flex", gap: 3, padding: "2px 8px 6px", flexWrap: "wrap" }}>
        {STATUS_ORDER.map(s => (
          <span key={s} title={t["s_" + s]} onClick={() => { onStatus(plan.id, s); onClose(); }} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--r-sm)", cursor: "pointer", background: plan.status === s ? "var(--bg-active)" : "transparent" }}><StatusIcon status={s} size={15} /></span>
        ))}
      </div>
      {onPatchPlan && <>
        <div className="menu-sep" />
        <div className="cmd-cap" style={{ padding: "4px 9px 4px" }}>{t.strategy}</div>
        <div className="ctx-pick" onClick={() => { onPatchPlan(plan.id, { strategyId: null }); onClose(); }}><span className="strat-dot" style={{ background: "var(--fg-4)" }} /><span>{t.noStrategy}</span>{!curStrat && <span className="ctx-check"><Lic name="check" size={13} color="var(--accent)" /></span>}</div>
        {STRATEGIES.map(s => (
          <div className="ctx-pick" key={s.id} onClick={() => { onPatchPlan(plan.id, { strategyId: s.id }); onClose(); }}><span className="strat-dot" style={{ background: s.color }} /><span>{s.name[lang]}</span>{plan.strategyId === s.id && <span className="ctx-check"><Lic name="check" size={13} color="var(--accent)" /></span>}</div>
        ))}
        <div className="menu-sep" />
        <div className="cmd-cap" style={{ padding: "4px 9px 4px" }}>{t.portfolio}</div>
        {PORTFOLIOS.map(p => (
          <div className="ctx-pick" key={p.id} onClick={() => { onPatchPlan(plan.id, { portfolioId: p.id }); onClose(); }}><span className="pf-dot" style={{ background: p.color }} /><span>{p.name[lang]}</span>{plan.portfolioId === p.id && <span className="ctx-check"><Lic name="check" size={13} color="var(--accent)" /></span>}</div>
        ))}
      </>}
      <div className="menu-sep" />
      <div className="v-menu-item" onClick={() => { onDuplicate(plan.id); onClose(); }}><Lic name="copy" size={15} cls="icon-sm" color="var(--fg-3)" /><span>{t.duplicate}</span></div>
      <div className="v-menu-item" onClick={() => { onArchive(plan.id); onClose(); }}><Lic name="archive" size={15} cls="icon-sm" color="var(--fg-3)" /><span>{t.archive}</span></div>
      <div className="v-menu-item" onClick={() => { onTrash(plan.id); onClose(); }} style={{ color: "var(--neg)" }}><Lic name="trash-2" size={15} cls="icon-sm" color="var(--neg)" /><span>{t.moveToTrash}</span></div>
    </div>
  </>;
}

function SettingsModal({ t, lang, theme, toggleTheme, setLang, onClose }) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 480 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <Lic name="settings-2" size={17} color="var(--fg-2)" /><span style={{ font: "var(--fw-semi) 15px var(--font-sans)", color: "var(--fg)" }}>{t.settings}</span>
          <span style={{ marginLeft: "auto" }} className="iconbtn" onClick={onClose}><Lic name="x" size={16} /></span>
        </div>
        <div className="modal-body">
          <div className="side-cap" style={{ marginBottom: 10 }}>{t.appearance}</div>
          <div className="set-row"><span className="set-lab">{t.themeL}</span>
            <div className="market-toggle">
              {[["dark", t.dark], ["light", t.light]].map(([k, lab]) => <div key={k} className={"mt-seg" + (theme === k ? " on" : "")} onClick={() => { if (theme !== k) toggleTheme(); }}>{lab}</div>)}
            </div>
          </div>
          <div className="set-row"><span className="set-lab">{t.langL}</span>
            <div className="market-toggle">
              {[["ko", "한국어"], ["en", "English"]].map(([k, lab]) => <div key={k} className={"mt-seg" + (lang === k ? " on" : "")} onClick={() => setLang(k)}>{lab}</div>)}
            </div>
          </div>
          <div className="side-cap" style={{ margin: "20px 0 10px" }}>{t.notifications}</div>
          <div className="set-row"><span className="set-lab">{lang === "ko" ? "규칙 트리거 알림" : "Rule trigger alerts"}</span><span className="toggle on" /></div>
          <div className="set-row"><span className="set-lab">{lang === "ko" ? "시나리오 근접 알림" : "Scenario approaching alerts"}</span><span className="toggle on" /></div>
          <div className="side-cap" style={{ margin: "20px 0 10px" }}>{lang === "ko" ? "데이터" : "Data"}</div>
          <div className="set-row">
            <span className="set-lab">{lang === "ko" ? "둘러보기 다시 보기" : "Replay tour"}<span style={{ display: "block", font: "var(--fw-regular) 11px var(--font-sans)", color: "var(--fg-4)", marginTop: 2 }}>{lang === "ko" ? "첫 실행 가이드와 플랜 한 사이클 둘러보기를 다시 띄웁니다" : "Show the first-run guide and plan-cycle walkthrough again"}</span></span>
            <button onClick={() => { try { localStorage.removeItem("keystone-coach-done-v1"); } catch (e) {} location.reload(); }} style={{ flex: "none", font: "var(--fw-semi) 12px var(--font-sans)", color: "var(--fg-2)", background: "var(--bg-elevated-2)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "6px 14px", cursor: "pointer" }}>{lang === "ko" ? "다시 보기" : "Replay"}</button>
          </div>
          <div className="set-row">
            <span className="set-lab">{lang === "ko" ? "앱 전체 초기화" : "Reset app"}<span style={{ display: "block", font: "var(--fw-regular) 11px var(--font-sans)", color: "var(--fg-4)", marginTop: 2 }}>{lang === "ko" ? "모든 설정·저장 상태를 첫 실행으로 되돌립니다" : "Restore all settings & saved state to first-run"}</span></span>
            <button onClick={() => {
              if (!window.confirm(lang === "ko" ? "모든 설정과 저장 상태가 첫 실행 상태로 초기화됩니다. 계속할까요?" : "All settings and saved state will reset to first-run. Continue?")) return;
              try { Object.keys(localStorage).filter(k => k.indexOf("keystone-") === 0).forEach(k => localStorage.removeItem(k)); Object.keys(sessionStorage).filter(k => k.indexOf("keystone-") === 0).forEach(k => sessionStorage.removeItem(k)); } catch (e) {}
              location.reload();
            }} style={{ flex: "none", font: "var(--fw-semi) 12px var(--font-sans)", color: "var(--neg)", background: "color-mix(in srgb, var(--neg) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--neg) 32%, transparent)", borderRadius: "var(--r-sm)", padding: "6px 14px", cursor: "pointer" }}>{lang === "ko" ? "초기화" : "Reset"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WorkspaceMenu, HelpMenu, ContextMenu, SettingsModal, CHANGELOG });
