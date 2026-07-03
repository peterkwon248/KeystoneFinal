// source/Chrome.jsx 이식 — WorkspaceMenu + SettingsModal (로그아웃은 실제 signOut).
"use client";
import { I18N } from "@keystone/core/i18n";
import { Lic, KeystoneLogo } from "@/components/icons";
import { usePrefs } from "./prefs";

export function WorkspaceMenu({ onClose, onSettings, onCustomize, onLogout }: {
  onClose: () => void; onSettings: () => void; onCustomize: () => void; onLogout: () => void;
}) {
  const { lang, theme, toggleTheme, toggleLang } = usePrefs();
  const t = I18N[lang];
  const item = (icon: string, label: string, onClick?: () => void, right?: string | null) => (
    <div className="v-menu-item" onClick={() => onClick?.()}>
      <Lic name={icon} size={15} cls="icon-sm" color="var(--fg-3)" /><span>{label}</span>
      {right && <span className="shortcut" style={{ marginLeft: "auto", color: "var(--fg-4)", fontSize: 12 }}>{right}</span>}
    </div>
  );
  return <>
    <div className="overlay" onClick={onClose} />
    <div className="v-menu" style={{ position: "fixed", top: 42, left: 10, width: 232, zIndex: 60 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 9px 8px" }}>
        <KeystoneLogo size={26} />
        <div style={{ minWidth: 0 }}>
          <div style={{ font: "var(--fw-semi) 13px var(--font-sans)", color: "var(--fg)" }}>Keystone</div>
          <div style={{ font: "var(--fw-medium) 11px var(--font-sans)", color: "var(--fg-4)" }}>{lang === "ko" ? "밸류에이션 커버리지" : "valuation coverage"}</div>
        </div>
      </div>
      <div className="menu-sep" />
      {item("settings-2", t.settings, () => { onClose(); onSettings(); }, "G S")}
      {item("panel-left", t.customizeSidebar, () => { onClose(); onCustomize(); })}
      <div className="menu-sep" />
      {item(theme === "dark" ? "sun" : "moon", theme === "dark" ? t.light : t.dark, () => toggleTheme(), null)}
      {item("globe", t.lang, () => toggleLang())}
      <div className="menu-sep" />
      {item("log-out", t.logout, () => { onClose(); onLogout(); })}
    </div>
  </>;
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { lang, theme, toggleTheme, setLang } = usePrefs();
  const t = I18N[lang];
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 480 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <Lic name="settings-2" size={17} color="var(--fg-2)" />
          <span style={{ font: "var(--fw-semi) 15px var(--font-sans)", color: "var(--fg)" }}>{t.settings}</span>
          <span style={{ marginLeft: "auto" }} className="iconbtn" onClick={onClose}><Lic name="x" size={16} /></span>
        </div>
        <div className="modal-body">
          <div className="side-cap" style={{ marginBottom: 10 }}>{t.appearance}</div>
          <div className="set-row"><span className="set-lab">{t.themeL}</span>
            <div className="market-toggle">
              {([["dark", t.dark], ["light", t.light]] as const).map(([k, lab]) => (
                <div key={k} className={"mt-seg" + (theme === k ? " on" : "")} onClick={() => { if (theme !== k) toggleTheme(); }}>{lab}</div>
              ))}
            </div>
          </div>
          <div className="set-row"><span className="set-lab">{t.langL}</span>
            <div className="market-toggle">
              {([["ko", "한국어"], ["en", "English"]] as const).map(([k, lab]) => (
                <div key={k} className={"mt-seg" + (lang === k ? " on" : "")} onClick={() => setLang(k)}>{lab}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
