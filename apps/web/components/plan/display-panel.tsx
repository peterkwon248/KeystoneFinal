// source/Panels.jsx DisplayPanel 이식본 — 뷰/그룹/정렬/컬럼 표시 팝오버.
// 어댑테이션: dashboard 모드 행은 뷰 이식 전이라 목록에서만 선택 가능하게 유지.
"use client";
import type { I18nDict, Lang } from "@keystone/core/types";
import type { Grouping, Ordering } from "./group";
import type { TlMode, TlOverlays, TlYMode } from "./timeline-view";

export type ViewMode = "list" | "board" | "timeline" | "dashboard";

export function DisplayPanel({ t, lang, mode, setMode, grouping, setGrouping, ordering, setOrdering, showEmpty, setShowEmpty, props, toggleProp, tlMode, setTlMode, tlOverlays, setTlOverlays, tlYMode, setTlYMode, onClose }: {
  t: I18nDict; lang: Lang;
  mode: ViewMode; setMode: (m: ViewMode) => void;
  grouping: Grouping; setGrouping: (g: Grouping) => void;
  ordering: Ordering; setOrdering: (o: Ordering) => void;
  showEmpty: boolean; setShowEmpty: (v: boolean) => void;
  props: string[]; toggleProp: (k: string) => void;
  tlMode: TlMode; setTlMode: (m: TlMode) => void;
  tlOverlays: TlOverlays; setTlOverlays: (o: TlOverlays) => void;
  tlYMode: TlYMode; setTlYMode: (m: TlYMode) => void;
  onClose: () => void;
}) {
  const seg = <V extends string>(cur: V, set: (v: V) => void, opts: [V, string][]) => (
    <div className="rb-modebar" style={{ margin: 0 }}>
      {opts.map(([v, lab]) => <div key={v} className={"rb-mode" + (cur === v ? " on" : "")} onClick={() => set(v)}>{lab}</div>)}
    </div>
  );
  const SegRow = <V extends string>({ label, value, set, opts }: { label: string; value: V; set: (v: V) => void; opts: [V, string][] }) => (
    <div className="disp-segrow">
      <span className="disp-segrow-lab">{label}</span>
      {seg(value, set, opts)}
    </div>
  );
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "7px 8px" }}>
      <span style={{ font: "var(--fw-medium) 12px var(--font-sans)", color: "var(--fg-3)" }}>{label}</span>{children}
    </div>
  );
  const propRows: [string, string][] = [["gauge", t.c_gauge], ["spark", t.c_spark], ["return", t.c_return], ["fill", t.c_fill], ["strategy", t.c_strategy]];
  const properties = <>
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
        {properties}
      </>}
      {mode === "board" && <>
        <SegRow label={t.order} value={ordering} set={setOrdering} opts={[["updated", t.o_updated], ["return", t.o_return], ["name", t.o_name]]} />
        {properties}
      </>}
      {mode === "timeline" && <>
        <SegRow label={lang === "ko" ? "타임라인" : "Timeline"} value={tlMode} set={setTlMode} opts={[["performance", lang === "ko" ? "성과" : "Perf."], ["journey", lang === "ko" ? "여정" : "Journey"]]} />
        <SegRow label={lang === "ko" ? "Y축" : "Y-axis"} value={tlYMode} set={setTlYMode} opts={[["price", lang === "ko" ? "가격" : "Price"], ["pct", lang === "ko" ? "%수익률" : "% return"]]} />
        <SegRow label={t.order} value={ordering} set={setOrdering} opts={[["updated", t.o_updated], ["return", t.o_return], ["name", t.o_name]]} />
        <SegRow label={t.group} value={grouping} set={setGrouping} opts={[["none", t.none], ["portfolio", t.portfolio], ["status", t.status], ["strategy", t.strategy]]} />
        <div style={{ height: 1, background: "var(--border)", margin: "6px 4px" }} />
        <div className="side-cap" style={{ padding: "4px 8px", margin: 0 }}>{t.tl_overlays}</div>
        {([["avg", t.tl_ov_avg], ["band", t.tl_ov_band], ["execs", t.tl_ov_execs], ["transitions", t.tl_ov_trans]] as [keyof TlOverlays, string][]).map(([k, lab]) => (
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
