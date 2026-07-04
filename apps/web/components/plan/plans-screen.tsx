// 플랜 화면 본체 — source/App.jsx의 plans 뷰(뷰헤더 + wf탭 + 모드 전환 + 필터바 + 리스트/보드/타임라인) 이식.
// 어댑테이션: 새 플랜 컴포즈·필터 패널·대시보드 뷰는 후속 단계, conn은 폴링 시세라 connected 고정(마일스톤 6에서 WS 바인딩).
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanStatus } from "@keystone/core/types";
import { WF_TYPE, EXEC_STRATEGIES, EXEC_CATS, STATUS_ORDER } from "@keystone/core/reference";
import { I18N } from "@keystone/core/i18n";
import { supabaseBrowser } from "@/lib/supabase/client";
import { KeystoneLogo, Lic, StatusIcon } from "@/components/icons";
import { usePrefs } from "@/components/shell/prefs";
import type { PfLite } from "@/lib/pf-palette";
import type { UIPlan } from "@/lib/plan-mapper";
import { FilterPanel, type FilterCat, type FilterAnchor } from "./filter-panel";
import { matchesFilters, filterValueLabel } from "@/lib/plan-filters";
import { ListView } from "./list-view";
import { BoardView } from "./board-view";
import { TimelineView, type TlMode, type TlOverlays, type TlYMode } from "./timeline-view";
import { DashboardView } from "./dashboard-view";
import { DisplayPanel, type ViewMode } from "./display-panel";
import { ComposeModal } from "./compose-modal";
import type { Grouping, Ordering } from "./group";

const FILTER_TYPE_LABEL_KEY: Record<string, string> = {
  status: "status", portfolio: "portfolio", strategy: "strategy", scenario: "scenStatus", return: "returnCat",
};
const STRAT_CAT_ICON: Record<string, string> = { accum: "layers", rebal: "scale", signal: "activity" };
const SC_ICON: Record<string, string> = { approaching: "target", realized: "circle-check", invalidated: "circle-x", tracking: "activity" };
const SC_COLOR: Record<string, string> = { approaching: "var(--r-base)", realized: "var(--pos)", invalidated: "var(--neg)", tracking: "var(--fg-3)" };

export function PlansScreen({ plans, portfolios, activePf }: {
  plans: UIPlan[]; portfolios: PfLite[]; activePf: string | null;
}) {
  const router = useRouter();
  const { lang } = usePrefs();
  const t = I18N[lang];

  // 프로토타입 App.jsx state 대응 (뷰 로컬 상태)
  const [compose, setCompose] = useState(false);
  const [mode, setMode] = useState<ViewMode>("list");
  const [wfTab, setWfTab] = useState<"all" | "pre" | "open" | "closed">("all");
  const [grouping, setGrouping] = useState<Grouping>("status");
  const [ordering, setOrdering] = useState<Ordering>("updated");
  const [showEmpty, setShowEmpty] = useState(false);
  const [listProps, setListProps] = useState<string[]>(["gauge", "spark", "return", "fill", "strategy"]);
  const [panel, setPanel] = useState<"filter" | "display" | null>(null);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [filterAnchor, setFilterAnchor] = useState<FilterAnchor | null>(null);
  const [tlMode, setTlMode] = useState<TlMode>("performance");
  const [tlYMode, setTlYMode] = useState<TlYMode>("price");
  const [tlOverlays, setTlOverlays] = useState<TlOverlays>({ avg: true, band: true, execs: true, transitions: true });

  const toggleProp = (k: string) =>
    setListProps((ps) => (ps.includes(k) ? ps.filter((x) => x !== k) : [...ps, k]));

  // App.jsx:354-361 toggleFilter/removeFilterType 미러 (watchlist wToggle과 동형).
  const toggleFilter = (type: string, value: string) =>
    setFilters((prev) => {
      const cur = prev[type] || [];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      const out = { ...prev };
      if (next.length) out[type] = next; else delete out[type];
      return out;
    });
  const removeFilterType = (type: string) =>
    setFilters((prev) => { const o = { ...prev }; delete o[type]; return o; });
  // App.jsx:353 openFilterAt — 버튼 위치 기준 좌/우 flyout 앵커.
  const openFilterAt = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const rightSide = r.left > window.innerWidth / 2;
    setFilterAnchor(
      rightSide
        ? { left: Math.max(8, r.right - 230), top: r.bottom + 6, flyout: "left" }
        : { left: Math.max(8, Math.min(r.left, window.innerWidth - 470)), top: r.bottom + 6, flyout: "right" }
    );
    setPanel("filter");
  };
  const activeFilterCount = Object.values(filters).reduce((n, v) => n + v.length, 0);

  // filtering (프로토타입 App.jsx 그대로: pf → wfTab → filters)
  let visible = plans;
  if (activePf) visible = plans.filter((p) => p.portfolioId === activePf);
  if (wfTab !== "all") visible = visible.filter((p) => WF_TYPE[p.status] === wfTab);
  if (activeFilterCount > 0) visible = visible.filter((p) => matchesFilters(p, filters));

  // 표시 필터 cats(5종: status/portfolio/strategy/scenario/return) — Panels.jsx:19-32 미러.
  // portfolio는 core PORTFOLIOS 대신 실 DB portfolios prop 사용(id가 plan.portfolioId와 매칭).
  const cats: FilterCat[] = [
    { type: "status", label: t.status, options: STATUS_ORDER.map((s) => ({ value: s, label: t["s_" + s], icon: <StatusIcon status={s} size={14} /> })) },
    { type: "portfolio", label: t.portfolio, options: portfolios.map((p) => ({ value: p.id, label: p.name, icon: <span className="pf-dot" style={{ background: p.color }} /> })).concat([{ value: "none", label: t.noPortfolio, icon: <span className="pf-dot" style={{ background: "var(--fg-4)" }} /> }]) },
    {
      type: "strategy", label: t.strategy, headerType: "category",
      head: [{ value: "none", label: t.noStrategy, icon: <span className="strat-dot" style={{ background: "var(--fg-4)" }} /> }],
      groups: EXEC_CATS.map((c) => ({
        value: c.id, label: c.label[lang], icon: <Lic name={STRAT_CAT_ICON[c.id] || "shapes"} size={13} cls="icon-sm" color="var(--fg-3)" />,
        items: EXEC_STRATEGIES.filter((s) => (s.cat || "accum") === c.id).map((s) => ({ value: s.id, label: s.name[lang], icon: <span className="strat-dot" style={{ background: s.color }} /> })),
      })),
    },
    { type: "scenario", label: t.scenStatus, options: ["approaching", "realized", "invalidated", "tracking"].map((v) => ({ value: v, label: t["scn_st_" + v], icon: <Lic name={SC_ICON[v] || "circle-dot"} size={13} cls="icon-sm" color={SC_COLOR[v] || "var(--fg-3)"} /> })) },
    { type: "return", label: t.returnCat, options: [
      { value: "profit", label: t.inProfit, icon: <Lic name="trending-up" size={13} cls="icon-sm" color="var(--pos)" /> },
      { value: "loss", label: t.inLoss, icon: <Lic name="trending-down" size={13} cls="icon-sm" color="var(--neg)" /> },
    ] },
  ];

  const pf = activePf ? portfolios.find((p) => p.id === activePf) : null;

  // 칩 값 라벨 — portfolio는 실 DB portfolios(prop)로 해석(core PORTFOLIOS엔 DB UUID가 없음), 나머지는 filterValueLabel.
  const chipValLabel = (type: string, v: string): string =>
    type === "portfolio" && v !== "none"
      ? (portfolios.find((p) => p.id === v)?.name ?? filterValueLabel(type, v, t, lang))
      : filterValueLabel(type, v, t, lang);

  const openPlan = (p: UIPlan, tab?: string) => router.push(`/plans/${p.dbId}${tab ? `?tab=${tab}` : ""}`);
  const onMove = async (dbId: string, status: string) => {
    await supabaseBrowser().from("plans").update({ status: status as PlanStatus }).eq("id", dbId);
    router.refresh();
  };

  return (
    <div className="main" style={{ height: "100%" }}>
      <div className="viewheader">
        <div className="viewtitle">
          <span className="vt-crumb"><KeystoneLogo size={18} /><span className="vt-crumb-name">Keystone</span></span>
          <Lic name="chevron-right" size={13} cls="icon-sm" color="var(--fg-4)" />
          {pf ? <span className="pf-dot" style={{ background: pf.color, width: 11, height: 11 }} /> : <Lic name="crosshair" size={16} color="var(--fg-2)" />}
          <h1 className="vt-title">{pf ? pf.name : t.plans}</h1>
        </div>
        <div className="segmented wf-tabs">
          {([["all", t.tab_all], ["pre", t.tab_pre], ["open", t.tab_open], ["closed", t.tab_closed]] as const).map(([k, lab]) => (
            <div key={k} className={"seg" + (wfTab === k ? " active" : "")} onClick={() => setWfTab(k)}>{lab}</div>
          ))}
        </div>
        <span className="spacer" />
        <div className="segmented">
          {([["list", "list", t.list], ["board", "layout-grid", t.board], ["timeline", "calendar-range", t.timeline], ["dashboard", "layout-dashboard", t.dash_tab]] as const).map(([m, ic, lab]) => (
            <div key={m} className={"seg" + (mode === m ? " active" : "")} onClick={() => setMode(m)} title={lab}><Lic name={ic} size={15} cls="icon-sm" color="inherit" /></div>
          ))}
        </div>
        <div className="toolbar-icons" style={{ marginLeft: 8 }}>
          {/* PROD: WS 연결 상태 바인딩(마일스톤 6) — 지금은 sync:quotes 폴링 시세라 connected 고정 */}
          <button className="live-pill conn-connected" title={lang === "ko" ? "실시간 시세 연동됨" : "Live quotes connected"}>
            <span className="live-dot" />{lang === "ko" ? "실시간" : "Live"}
          </button>
          <button className={"iconbtn" + (panel === "filter" ? " active" : "")} onClick={(e) => { if (panel === "filter") setPanel(null); else openFilterAt(e); }} title={t.filter}><Lic name="list-filter" size={16} /></button>
          <button className={"iconbtn" + (panel === "display" ? " active" : "")} onClick={() => setPanel(panel === "display" ? null : "display")} title={t.display}><Lic name="sliders-horizontal" size={16} /></button>
          <button className="iconbtn" onClick={() => router.push("/inbox")} title={t.inbox}><Lic name="bell" size={16} /></button>
        </div>
        <button className="v-btn v-btn--primary newplan-btn" title={t.newPlan + " · C"} onClick={() => setCompose(true)}>
          <Lic name="plus" size={15} cls="icon-sm" color="var(--fg-on-accent)" />{t.newPlan}
        </button>
      </div>

      {((activePf && pf) || activeFilterCount > 0) && <div className="filterbar">
        {activePf && pf && <div className="filter-chip">
          <span className="fc-seg fc-key">{t.portfolio}</span>
          <span className="fc-seg"><span className="pf-dot" style={{ background: pf.color }} />{pf.name}</span>
          <span className="fc-x" onClick={() => router.push("/plans")}><Lic name="x" size={12} cls="icon-sm" color="inherit" /></span>
        </div>}
        {Object.entries(filters).map(([type, vals]) => (
          <div className="filter-chip" key={type}>
            <span className="fc-seg fc-key">{t[FILTER_TYPE_LABEL_KEY[type]] || type}</span>
            <span className="fc-seg">{vals.map((v) => chipValLabel(type, v)).join(", ")}</span>
            <span className="fc-x" onClick={() => removeFilterType(type)}><Lic name="x" size={12} cls="icon-sm" color="inherit" /></span>
          </div>
        ))}
        <div className="right" style={{ display: "flex", gap: 14 }}>
          <span style={{ font: "var(--fw-medium) 12px var(--font-sans)", color: "var(--fg-4)" }}>{visible.length}</span>
          {activePf && <span className="linklike" onClick={() => router.push("/plans")}>{t.clear}</span>}
          {activeFilterCount > 0 && <span className="linklike" onClick={() => setFilters({})}>{t.clear}</span>}
        </div>
      </div>}

      <div className="body-row">
        {mode === "board" ? <BoardView plans={visible} t={t} lang={lang} onOpen={openPlan} onMove={onMove} props={listProps} ordering={ordering} />
          : mode === "timeline" ? <TimelineView plans={visible} t={t} lang={lang} onOpen={openPlan} mode={tlMode} setMode={setTlMode} ordering={ordering} grouping={grouping} overlays={tlOverlays} yMode={tlYMode} portfolios={portfolios} />
          : mode === "dashboard" ? <DashboardView plans={visible} t={t} lang={lang} onOpen={openPlan} grouping={grouping} ordering={ordering} />
          : <ListView plans={visible} t={t} lang={lang} onOpen={openPlan} grouping={grouping} ordering={ordering} showEmpty={showEmpty} props={listProps} portfolios={portfolios} />}
      </div>

      {panel === "display" && <DisplayPanel
        t={t} lang={lang}
        mode={mode} setMode={setMode}
        grouping={grouping} setGrouping={setGrouping}
        ordering={ordering} setOrdering={setOrdering}
        showEmpty={showEmpty} setShowEmpty={setShowEmpty}
        props={listProps} toggleProp={toggleProp}
        tlMode={tlMode} setTlMode={setTlMode}
        tlOverlays={tlOverlays} setTlOverlays={setTlOverlays}
        tlYMode={tlYMode} setTlYMode={setTlYMode}
        onClose={() => setPanel(null)}
      />}

      {panel === "filter" && <FilterPanel
        t={t} lang={lang} filters={filters} onToggle={toggleFilter} onClose={() => setPanel(null)} anchor={filterAnchor} cats={cats}
      />}
      {compose && <ComposeModal initialPfId={activePf} onClose={() => setCompose(false)} />}
    </div>
  );
}
