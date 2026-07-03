// source/DetailView.jsx MiniDropdown 이식 — position:fixed 앵커 드롭다운(검색/생성 옵션).
// 상세 헤더의 상태·포트폴리오·전략 픽커가 사용. 오버플로 조상에 클리핑되지 않도록 fixed 배치.
"use client";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Lang } from "@keystone/core/types";
import { Lic } from "@/components/icons";

export interface MdItem {
  value?: string | null;
  label?: ReactNode;
  icon?: ReactNode;
  on?: boolean;
  right?: ReactNode;
  sub?: ReactNode;
  cap?: ReactNode; // 캡션 행(선택 불가)
  sep?: boolean; // 구분선
  search?: string; // 검색 매칭용 문자열
}

export function MiniDropdown({
  trigger, items, onPick, width = 190, align = "left",
  onCreate, createLabel, searchable, lang, maxRows = 50,
}: {
  trigger: ReactNode;
  items: MdItem[];
  onPick: (value: string | null | undefined) => void;
  width?: number;
  align?: "left" | "right";
  onCreate?: (name: string) => void;
  createLabel?: string;
  searchable?: boolean | string;
  lang?: Lang;
  maxRows?: number;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [nv, setNv] = useState("");
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open && searchable && searchRef.current) searchRef.current.focus({ preventScroll: true }); }, [open, searchable]);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const place = () => {
    const el = triggerRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const left = align === "right" ? r.right - width : Math.min(r.left, window.innerWidth - width - 8);
    setCoords({ top: Math.round(r.bottom + 4), left: Math.round(Math.max(8, left)) });
  };
  useLayoutEffect(() => {
    if (!open) { setCoords(null); return; }
    place();
    const onScroll = (e: Event) => { if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) return; place(); };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", place);
    return () => { window.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", place); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const close = () => { setOpen(false); setCreating(false); setNv(""); setQ(""); };
  const submit = () => { const v = nv.trim(); if (v && onCreate) onCreate(v); close(); };
  const ql = q.trim().toLowerCase();
  const fItems = !searchable || !ql ? items : items.filter((it) => (it.cap || it.sep ? false : String(it.search || it.label || "").toLowerCase().includes(ql)));
  let pickCount = 0, truncated = 0;
  const cItems: MdItem[] = [];
  for (const it of fItems) {
    if (it.cap || it.sep) { cItems.push(it); continue; }
    if (pickCount < maxRows) { cItems.push(it); pickCount++; }
    else truncated++;
  }
  while (cItems.length && cItems[cItems.length - 1].cap) cItems.pop();
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <span ref={triggerRef} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} style={{ cursor: "pointer", display: "inline-flex" }}>{trigger}</span>
      {open && <>
        <div className="overlay" style={{ position: "fixed", inset: 0, zIndex: 48 }} onClick={(e) => { e.stopPropagation(); close(); }} />
        {coords && <div className="panel" ref={panelRef} style={{ position: "fixed", top: coords.top, left: coords.left, width, zIndex: 49 }}>
          {searchable && <div className="md-search"><Lic name="search" size={14} cls="icon-sm" color="var(--fg-4)" /><input className="md-search-in" ref={searchRef} value={q} placeholder={searchable === true ? "Search…" : String(searchable)} onChange={(e) => setQ(e.target.value)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Escape") close(); }} /></div>}
          <div className={searchable ? "md-scroll" : undefined}>
            {cItems.map((it, i) => (
              it.sep ? <div className="md-sep" key={i} />
                : it.cap ? <div className="md-cap" key={i}>{it.cap}</div>
                  : <div className={"v-menu-item md-item" + (it.on ? " on" : "")} key={i} onClick={(e) => { e.stopPropagation(); onPick(it.value); close(); }}>
                    {it.icon && <span className="md-ico">{it.icon}</span>}<span className="md-lab">{it.label}{it.sub && <span className="md-sub">{it.sub}</span>}</span>{!it.on && it.right != null && <span className="md-right">{it.right}</span>}{it.on && <span className="check"><Lic name="check" size={14} cls="icon-sm" color="var(--accent)" /></span>}
                  </div>
            ))}
            {truncated > 0 && <div className="md-more">{lang === "ko" ? `+${truncated}개 더 · 검색해 좁히기` : `+${truncated} more · type to narrow`}</div>}
            {searchable && ql && fItems.length === 0 && <div className="md-empty">{lang === "ko" ? "결과 없음" : "No results"}</div>}
          </div>
          {onCreate && <>
            <div className="menu-sep" />
            {creating
              ? <div className="md-create" onClick={(e) => e.stopPropagation()}>
                <input className="md-create-in" autoFocus value={nv} placeholder={createLabel} onChange={(e) => setNv(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setCreating(false); setNv(""); } }} />
                <button className="md-create-go" onClick={submit} disabled={!nv.trim()}><Lic name="corner-down-left" size={13} color="currentColor" /></button>
              </div>
              : <div className="v-menu-item md-create-row" onClick={(e) => { e.stopPropagation(); setCreating(true); }}><Lic name="plus" size={14} cls="icon-sm" color="var(--fg-4)" /><span>{createLabel}</span></div>}
          </>}
        </div>}
      </>}
    </span>
  );
}
