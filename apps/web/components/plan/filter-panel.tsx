// source/Panels.jsx:84-149 FilterPanel 이식 — 필터 추가 팝오버(축 hover → 옵션 flyout, 검색).
// 공용: 시나리오 모니터/관심종목/스크리너/보관함이 각자의 cats를 넘겨 재사용. anchor 기반 위치.
// 어댑테이션: 전역 React 훅 → named hooks, Lic → @/components/icons. cats는 항상 주입(원본의 filterCats 폴백 제거).
"use client";
import type { ReactNode } from "react";
import { Fragment, useEffect, useState } from "react";
import type { Lang } from "@keystone/core/types";
import { Lic } from "@/components/icons";

export interface FilterOption { value: string; label: string; icon?: ReactNode; n?: number }
export interface FilterGroup { value: string; label: string; icon?: ReactNode; items: FilterOption[] }
export interface FilterCat {
  type: string;
  label: string;
  axis?: string;
  headerType?: string;
  options?: FilterOption[];
  groups?: FilterGroup[];
  head?: FilterOption[];
}
export interface FilterAnchor { left: number; top: number; flyout?: "left" | "right" }

const axisIcon: Record<string, string> = {
  status: "circle-dashed", portfolio: "folder", strategy: "git-branch",
  framework: "gauge", scenario: "circle-dot", return: "trending-up",
};

export function FilterPanel({ t, lang, filters, onToggle, onClose, anchor, cats }: {
  t: Record<string, string>;
  lang: Lang;
  filters: Record<string, string[]>;
  onToggle: (type: string, value: string) => void;
  onClose: () => void;
  anchor?: FilterAnchor | null;
  cats: FilterCat[];
}) {
  void t;
  const ko = lang === "ko";
  const [open, setOpen] = useState<string | null>(null); // axis type whose flyout is open (on hover)
  const [fq, setFq] = useState("");
  useEffect(() => { setFq(""); }, [open]);
  const active = (type: string) => (filters[type] || []).length;
  const axisCount = (cat: FilterCat) => active(cat.type) + (cat.headerType ? active(cat.headerType) : 0);
  return <>
    <div className="overlay" onClick={onClose} />
    <div className={"panel flt-menu" + (anchor ? " anchored" : "") + (anchor && anchor.flyout === "left" ? " fly-left" : "")} style={anchor ? { position: "fixed", left: anchor.left, top: anchor.top, width: 230, zIndex: 45 } : { top: 84, right: 52, width: 230, zIndex: 45 }} onMouseLeave={() => setOpen(null)}>
      <div className="flt-head">{ko ? "필터 추가…" : "Add filter…"}<span className="flt-kbd">F</span></div>
      {cats.map(cat => {
        const on = open === cat.type;
        const Item = ({ type, o }: { type: string; o: FilterOption }) => {
          const sel = (filters[type] || []).includes(o.value);
          return (
            <div className={"v-menu-item" + (o.n === 0 ? " flt-zero" : "")} onClick={(e) => { e.stopPropagation(); onToggle(type, o.value); }}>
              {o.icon}<span>{o.label}</span>
              {o.n != null && <span className="flt-optn">{o.n}</span>}
              {sel && <span className="check"><Lic name="check" size={14} cls="icon-sm" color="var(--accent)" /></span>}
            </div>
          );
        };
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
                  const match = (o: FilterOption) => !qq || (o.label || "").toLowerCase().includes(qq) || (o.value || "").toLowerCase().includes(qq);
                  const searchRow = showSearch ? <div className="flt-search" onClick={(e) => e.stopPropagation()}><Lic name="search" size={13} cls="icon-sm" color="var(--fg-4)" /><input autoFocus value={fq} onChange={(e) => setFq(e.target.value)} placeholder={ko ? "검색…" : "Search…"} /></div> : null;
                  if (cat.groups) {
                    const head = (cat.head || []).filter(match);
                    const grps = cat.groups.map(g => ({ ...g, items: g.items.filter(match) })).filter(g => g.items.length);
                    return <Fragment>
                      {searchRow}
                      {head.map(o => <Item key={o.value} type={cat.type} o={o} />)}
                      {head.length > 0 && <div className="flt-head-sep" />}
                      {grps.map(g => (
                        <div className="flt-group" key={g.value}>
                          <div className="flt-group-head" onClick={(e) => { e.stopPropagation(); if (cat.headerType) onToggle(cat.headerType, g.value); }}>
                            {<span>{g.label}</span>}
                            <span className="flt-group-hint">{ko ? "묶음" : "all"}</span>
                            {cat.headerType && (filters[cat.headerType] || []).includes(g.value) && <span className="check"><Lic name="check" size={14} cls="icon-sm" color="var(--accent)" /></span>}
                          </div>
                          {g.items.map(o => <Item key={o.value} type={cat.type} o={o} />)}
                        </div>
                      ))}
                    </Fragment>;
                  }
                  const opts = (cat.options || []).filter(match);
                  return <Fragment>{searchRow}{opts.length ? opts.map(o => <Item key={o.value} type={cat.type} o={o} />) : <div className="flt-empty">{ko ? "일치하는 항목 없음" : "No match"}</div>}</Fragment>;
                })()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </>;
}
