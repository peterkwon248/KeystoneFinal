// 플랜 화면 본체 — source/App.jsx의 plans 뷰(뷰헤더 + wf탭 + 모드 전환 + 필터바 + 리스트/보드/타임라인) 이식.
// 어댑테이션: 새 플랜 컴포즈·필터 패널·대시보드 뷰는 후속 단계, conn은 폴링 시세라 connected 고정(마일스톤 6에서 WS 바인딩).
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanStatus } from "@keystone/core/types";
import { WF_TYPE } from "@keystone/core/reference";
import { I18N } from "@keystone/core/i18n";
import { supabaseBrowser } from "@/lib/supabase/client";
import { KeystoneLogo, Lic } from "@/components/icons";
import { usePrefs } from "@/components/shell/prefs";
import type { PfLite } from "@/lib/pf-palette";
import type { UIPlan } from "@/lib/plan-mapper";
import { ListView } from "./list-view";
import { BoardView } from "./board-view";
import { TimelineView, type TlMode, type TlOverlays, type TlYMode } from "./timeline-view";
import { DashboardView } from "./dashboard-view";
import { DisplayPanel, type ViewMode } from "./display-panel";
import type { Grouping, Ordering } from "./group";

export function PlansScreen({ plans, portfolios, activePf }: {
  plans: UIPlan[]; portfolios: PfLite[]; activePf: string | null;
}) {
  const router = useRouter();
  const { lang } = usePrefs();
  const t = I18N[lang];

  // 프로토타입 App.jsx state 대응 (뷰 로컬 상태)
  const [mode, setMode] = useState<ViewMode>("list");
  const [wfTab, setWfTab] = useState<"all" | "pre" | "open" | "closed">("all");
  const [grouping, setGrouping] = useState<Grouping>("status");
  const [ordering, setOrdering] = useState<Ordering>("updated");
  const [showEmpty, setShowEmpty] = useState(false);
  const [listProps, setListProps] = useState<string[]>(["gauge", "spark", "return", "fill", "strategy"]);
  const [panel, setPanel] = useState<"display" | null>(null);
  const [tlMode, setTlMode] = useState<TlMode>("performance");
  const [tlYMode, setTlYMode] = useState<TlYMode>("price");
  const [tlOverlays, setTlOverlays] = useState<TlOverlays>({ avg: true, band: true, execs: true, transitions: true });

  const toggleProp = (k: string) =>
    setListProps((ps) => (ps.includes(k) ? ps.filter((x) => x !== k) : [...ps, k]));

  // filtering (프로토타입 App.jsx 그대로: pf → wfTab)
  let visible = plans;
  if (activePf) visible = plans.filter((p) => p.portfolioId === activePf);
  if (wfTab !== "all") visible = visible.filter((p) => WF_TYPE[p.status] === wfTab);

  const pf = activePf ? portfolios.find((p) => p.id === activePf) : null;

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
          <button className={"iconbtn" + (panel === "display" ? " active" : "")} onClick={() => setPanel(panel === "display" ? null : "display")} title={t.display}><Lic name="sliders-horizontal" size={16} /></button>
          <button className="iconbtn" onClick={() => router.push("/inbox")} title={t.inbox}><Lic name="bell" size={16} /></button>
        </div>
        {/* 컴포즈 모달은 후속 단계 — 버튼 자리만 유지 */}
        <button className="v-btn v-btn--primary newplan-btn" title={t.newPlan + " · C"}>
          <Lic name="plus" size={15} cls="icon-sm" color="var(--fg-on-accent)" />{t.newPlan}
        </button>
      </div>

      {activePf && pf && <div className="filterbar">
        <div className="filter-chip">
          <span className="fc-seg fc-key">{t.portfolio}</span>
          <span className="fc-seg"><span className="pf-dot" style={{ background: pf.color }} />{pf.name}</span>
          <span className="fc-x" onClick={() => router.push("/plans")}><Lic name="x" size={12} cls="icon-sm" color="inherit" /></span>
        </div>
        <div className="right" style={{ display: "flex", gap: 14 }}>
          <span className="linklike" onClick={() => router.push("/plans")}>{t.clear}</span>
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
    </div>
  );
}
