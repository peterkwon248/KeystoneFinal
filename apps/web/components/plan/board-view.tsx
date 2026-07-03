// source/BoardTimeline.jsx BoardView 이식본 — 상태 컬럼 칸반 (드래그로 상태 전이).
// 어댑테이션: onMove는 dbId 기준(supabase update), onQuickAdd는 후속 단계.
"use client";
import { useState } from "react";
import type { I18nDict, Lang } from "@keystone/core/types";
import { STATUS_ORDER, STRATEGIES } from "@keystone/core/reference";
import { planReturn } from "@keystone/core/analytics";
import { fmtCompact, fmtMoney, fmtRel } from "@keystone/core/format";
import { Flag, Lic, StatusIcon } from "@/components/icons";
import { ScenarioGauge } from "./scenario-gauge";
import { orderPlans, type Ordering } from "./group";
import type { UIPlan } from "@/lib/plan-mapper";

function BoardCard({ plan, t, lang, onOpen, onDragStart, dragging, onHover, onLeave, props }: {
  plan: UIPlan; t: I18nDict; lang: Lang; onOpen: (p: UIPlan) => void;
  onDragStart: (e: React.DragEvent, dbId: string) => void; dragging: boolean;
  onHover: (p: UIPlan, e: React.MouseEvent) => void; onLeave: () => void; props: string[];
}) {
  const strat = STRATEGIES.find((s) => s.id === plan.strategyId);
  const ret = planReturn(plan);
  const fill = plan.divisions ? Math.round(((plan.round ?? 0) / plan.divisions) * 100) : null;
  const base = plan.scenarios.find((s) => s.label.en === "Base") || plan.scenarios[0];
  const show = (k: string) => props.includes(k);
  return (
    <div className={"board-card" + (dragging ? " dragging" : "")} draggable onDragStart={(e) => onDragStart(e, plan.dbId)} onClick={() => onOpen(plan)}
      onMouseEnter={(e) => onHover(plan, e)} onMouseMove={(e) => onHover(plan, e)} onMouseLeave={onLeave}>
      <div className="bc-top">
        <span className="bc-id mono">{plan.id}</span>
        {strat && show("strategy") && <span className="bc-strat"><span className="strat-dot" style={{ background: strat.color }} />{strat.name[lang]}</span>}
      </div>
      <div className="bc-name">{plan.name[lang]}</div>
      <div className="bc-ticker"><Flag market={plan.cur === "KRW" ? "KR" : "US"} size={12} /> {plan.tickerName[lang]} · <span className="mono">{plan.ticker}</span></div>
      {base?.thesis && <div className="bc-thesis">{base.thesis[lang]}</div>}
      {show("gauge") && <div className="bc-gauge"><ScenarioGauge plan={plan} lang={lang} compact /></div>}
      <div className="bc-metrics">
        <div className="bc-metric"><span className="bc-metric-k">{t.current}</span><span className="bc-metric-v mono">{fmtCompact(plan.currentPrice, plan.cur)}</span></div>
        {show("return") && <div className="bc-metric"><span className="bc-metric-k">{t.retRate}</span><span className={"bc-metric-v mono " + (ret ? (ret.rate >= 0 ? "pos" : "neg") : "")}>{ret ? (ret.rate >= 0 ? "+" : "") + ret.rate.toFixed(1) + "%" : "—"}</span></div>}
        {show("fill") && fill != null && <div className="bc-metric"><span className="bc-metric-k">{t.progress}</span><span className="bc-metric-v mono">{plan.round}/{plan.divisions}</span></div>}
      </div>
      <div className="bc-foot">
        <span className="bc-foot-l">
          {(plan.executions || []).length > 0 && <span className="bc-chip"><Lic name="receipt" size={11} cls="icon-sm" color="var(--fg-4)" />{plan.executions.length}</span>}
          {(plan.rules || []).filter((r) => r.on).length > 0 && <span className="bc-chip"><Lic name="zap" size={11} cls="icon-sm" color="var(--fg-4)" />{plan.rules.filter((r) => r.on).length}</span>}
        </span>
        <span className="bc-upd">{fmtRel(plan.updatedAt, lang)}</span>
      </div>
    </div>
  );
}

export function BoardView({ plans, t, lang, onOpen, onMove, props = ["gauge", "return", "fill", "strategy"], ordering = "updated" }: {
  plans: UIPlan[]; t: I18nDict; lang: Lang; onOpen: (p: UIPlan) => void;
  onMove: (dbId: string, status: string) => void; props?: string[]; ordering?: Ordering;
}) {
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [tip, setTip] = useState<{ plan: UIPlan; ret: { rate: number; amt: number } | null; x: number; y: number } | null>(null);
  const onDragStart = (e: React.DragEvent, dbId: string) => { setDrag(dbId); e.dataTransfer.effectAllowed = "move"; };
  const onHover = (plan: UIPlan, e: React.MouseEvent) => { if (drag) return; const ret = planReturn(plan); setTip({ plan, ret, x: e.clientX, y: e.clientY }); };
  return (
    <div className="board" onMouseLeave={() => setTip(null)}>
      {STATUS_ORDER.map((st) => {
        const items = orderPlans(plans.filter((p) => p.status === st), ordering, lang);
        return (
          <div key={st} className={"board-col" + (over === st ? " dragover" : "")}
            onDragOver={(e) => { e.preventDefault(); setOver(st); }}
            onDragLeave={() => setOver((o) => (o === st ? null : o))}
            onDrop={(e) => { e.preventDefault(); if (drag) onMove(drag, st); setDrag(null); setOver(null); }}>
            <div className="board-col-head">
              <StatusIcon status={st} size={15} />
              <span className="board-col-title">{t["s_" + st]}</span>
              <span className="board-col-count">{items.length}</span>
            </div>
            <div className="board-col-body">
              {items.map((p) => <BoardCard key={p.dbId} plan={p} t={t} lang={lang} onOpen={onOpen} onDragStart={onDragStart} dragging={drag === p.dbId} onHover={onHover} onLeave={() => setTip(null)} props={props} />)}
            </div>
          </div>
        );
      })}
      {tip && <div className="bc-tip" style={{ left: Math.min(tip.x + 14, window.innerWidth - 200), top: Math.min(tip.y + 14, window.innerHeight - 160) }}>
        <div className="bc-tip-head"><Flag market={tip.plan.cur === "KRW" ? "KR" : "US"} size={12} /> {tip.plan.tickerName[lang]} · <span className="mono">{tip.plan.ticker}</span></div>
        <div className="tl-tip-row"><span>{t.current}</span><span className="mono">{fmtMoney(tip.plan.currentPrice, tip.plan.cur)}</span></div>
        {tip.plan.avgPrice != null && <div className="tl-tip-row"><span>{t.avg}</span><span className="mono">{fmtMoney(tip.plan.avgPrice, tip.plan.cur)}</span></div>}
        <div className="tl-tip-row"><span>{t.retRate}</span><span className={"mono " + (tip.ret ? (tip.ret.rate >= 0 ? "pos" : "neg") : "")}>{tip.ret ? (tip.ret.rate >= 0 ? "+" : "") + tip.ret.rate.toFixed(1) + "%" : "—"}</span></div>
        {tip.plan.scenarios.map((s, i) => { const gap = (s.target / tip.plan.currentPrice - 1) * 100; return <div className="tl-tip-row" key={i}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="scsum-dot" style={{ background: s.color }} />{s.label[lang]}</span><span className="mono">{fmtCompact(s.target, tip.plan.cur)} <span style={{ color: gap >= 0 ? "var(--pos)" : "var(--neg)" }}>{gap >= 0 ? "+" : ""}{gap.toFixed(0)}%</span></span></div>; })}
      </div>}
    </div>
  );
}
