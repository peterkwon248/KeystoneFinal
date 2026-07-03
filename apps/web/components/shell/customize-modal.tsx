// source/P4Views.jsx CustomizeModal 이식 — 사이드바 도구 표시/핀/순서 편집.
// 어댑테이션: localStorage 대신 SidebarConfigProvider(→ profiles.sidebar) 사용, reset은 DB 기본값 복원.
"use client";
import { useState } from "react";
import { I18N } from "@keystone/core/i18n";
import { Lic } from "@/components/icons";
import { OPTIONAL_DESTS, mergedKeys } from "@/lib/sidebar-config";
import { usePrefs } from "./prefs";
import { useSidebarConfig } from "./sidebar-config";

export function CustomizeModal({ onClose }: { onClose: () => void }) {
  const { lang } = usePrefs();
  const t = I18N[lang];
  const { cfg, order, pinned, setCfg, setOrder, setPinned, reset } = useSidebarConfig();
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const keys = mergedKeys(order);
  const reorder = (from: string, to: string) => {
    if (from === to) return;
    const arr = keys.slice();
    const fi = arr.indexOf(from), ti = arr.indexOf(to);
    arr.splice(fi, 1); arr.splice(ti, 0, from);
    setOrder(arr);
  };
  const isOn = (k: string) => !!cfg[k];
  const isPinned = (k: string) => pinned.includes(k);
  const toggleShow = (k: string) => {
    setCfg((p) => ({ ...p, [k]: !p[k] }));
    if (isPinned(k)) setPinned((p) => p.filter((x) => x !== k));
  };
  const togglePin = (k: string) => {
    if (!isOn(k)) return;
    setPinned((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 440 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <Lic name="panel-left" size={17} color="var(--fg-2)" />
          <span style={{ font: "var(--fw-semi) 15px var(--font-sans)", color: "var(--fg)" }}>{t.customizeSidebar}</span>
          <span style={{ marginLeft: "auto" }} className="iconbtn" onClick={onClose}><Lic name="x" size={16} /></span>
        </div>
        <div className="modal-body">
          <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
            <div className="side-cap" style={{ margin: 0 }}>{t.optionalDest}</div>
            <button
              onClick={() => { if (!window.confirm(lang === "ko" ? "사이드바를 기본값으로 되돌릴까요?" : "Reset sidebar to defaults?")) return; reset(); }}
              style={{ marginLeft: "auto", font: "var(--fw-semi) 11px var(--font-sans)", color: "var(--fg-2)", background: "var(--bg-elevated-2)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-pill)", cursor: "pointer", padding: "3px 11px" }}>
              {lang === "ko" ? "기본값으로" : "Reset"}
            </button>
          </div>
          <p style={{ font: "var(--fw-regular) 12px var(--font-sans)", color: "var(--fg-4)", margin: "0 0 12px" }}>
            {lang === "ko" ? "도구를 켜고 끌 수 있어요. 핀을 누르면 사이드바 상단(인박스·일지·플랜 옆)으로 올라가요. 드래그로 순서 변경." : "Turn tools on or off. Pin lifts one to the top, beside Inbox / Journal / Plans. Drag to reorder."}
          </p>
          {keys.map((k) => OPTIONAL_DESTS.find((d) => d.key === k)).filter((d): d is NonNullable<typeof d> => !!d).map((d) => (
            <div className={"set-row cz-row" + (over === d.key ? " dragover" : "") + (drag === d.key ? " dragging" : "")} key={d.key}
              draggable onDragStart={() => setDrag(d.key)} onDragEnd={() => { setDrag(null); setOver(null); }}
              onDragOver={(e) => { e.preventDefault(); setOver(d.key); }}
              onDrop={(e) => { e.preventDefault(); if (drag) reorder(drag, d.key); setDrag(null); setOver(null); }}>
              <span className="cz-grip" title={lang === "ko" ? "드래그하여 순서 변경" : "Drag to reorder"}><Lic name="grip-vertical" size={15} cls="icon-sm" color="var(--fg-4)" /></span>
              <span className="set-lab" style={{ display: "flex", alignItems: "center", gap: 9, flex: 1 }}><Lic name={d.icon} size={15} cls="icon-sm" color="var(--fg-3)" />{t[d.labelKey]}</span>
              <span className={"cz-pin" + (isPinned(d.key) ? " on" : "") + (isOn(d.key) ? "" : " cz-pin-off")} onClick={() => togglePin(d.key)} title={isPinned(d.key) ? (lang === "ko" ? "상단 고정 해제" : "Unpin from top") : (lang === "ko" ? "상단에 고정" : "Pin to top")}><Lic name="arrow-up-to-line" size={15} cls="icon-sm" color={isPinned(d.key) ? "var(--accent)" : "var(--fg-4)"} /></span>
              <span className={"toggle" + (isOn(d.key) ? " on" : "")} onClick={() => toggleShow(d.key)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
