// source/ListView.jsx 이식본 — 동적 그룹핑/정렬/컬럼 표시의 플랜 리스트.
// 어댑테이션: onQuickAdd/onContext(컴포즈 모달·컨텍스트 메뉴)는 후속 단계에서 연결.
"use client";
import { useState } from "react";
import type { I18nDict, Lang } from "@keystone/core/types";
import { EXEC_STRATEGIES, PLAN_STATUS } from "@keystone/core/reference";
import { planReturn } from "@keystone/core/analytics";
import { fmtCompact, fmtRel } from "@keystone/core/format";
import { Flag, Lic, StatusIcon, StrategyBadge } from "@/components/icons";
import { ScenarioGauge } from "./scenario-gauge";
import { Sparkline } from "./sparkline";
import { groupConfig, orderPlans, type Grouping, type Ordering } from "./group";
import type { PfLite } from "@/lib/pf-palette";
import type { UIPlan } from "@/lib/plan-mapper";

function PlanRow({ plan, lang, onOpen, focused, props }: {
  plan: UIPlan; lang: Lang; onOpen: (p: UIPlan) => void; focused?: boolean; props: string[];
}) {
  const strat = EXEC_STRATEGIES.find((s) => s.id === plan.execId);
  const ret = planReturn(plan);
  const fill = plan.divisions ? Math.round(((plan.round ?? 0) / plan.divisions) * 100) : null;
  const stColor = (PLAN_STATUS[plan.status] || {}).color;
  const show = (k: string) => props.includes(k);
  return (
    <div className={"plan-row" + (focused ? " focused" : "")} onClick={() => onOpen(plan)}>
      <span className="pr-id mono">{plan.id}</span>
      <span className="pr-status"><StatusIcon status={plan.status} size={15} /></span>
      <span className="pr-tk">
        <span className="pr-name">{plan.name[lang]}</span>
        <span className="pr-ticker"><Flag market={plan.cur === "KRW" ? "KR" : "US"} size={13} /> {plan.tickerName[lang]} · <span className="mono">{plan.ticker}</span></span>
      </span>
      <span className="pr-spacer" />
      {show("spark") && <span className="pr-spark"><Sparkline plan={plan} closes={plan.priceCloses} /></span>}
      {show("gauge") && <span className="pr-gauge"><ScenarioGauge plan={plan} lang={lang} /></span>}
      {show("return") && <span className={"pr-return" + (ret ? (ret.rate >= 0 ? " tint-pos" : " tint-neg") : "")}>
        {ret ? <>
          <span className={"pr-ret-pct mono " + (ret.rate >= 0 ? "pos" : "neg")}>{ret.rate >= 0 ? "+" : ""}{ret.rate.toFixed(1)}%</span>
          <span className="pr-ret-amt mono">{ret.amt >= 0 ? "+" : "−"}{fmtCompact(Math.abs(ret.amt), plan.cur)}</span>
        </> : <span className="pr-ret-pct mono" style={{ color: "var(--fg-4)" }}>—</span>}
      </span>}
      {show("fill") && <span className="pr-prog">
        {fill != null ? <>
          <span className="pr-prog-track"><span className="pr-prog-fill" style={{ width: fill + "%", background: stColor }} /></span>
          <span className="pr-prog-num">{plan.round}/{plan.divisions}</span>
        </> : <span className="pr-prog-num" style={{ marginLeft: "auto" }}>—</span>}
      </span>}
      {show("strategy") && <span className="pr-strat"><StrategyBadge strategy={strat} lang={lang} /></span>}
      <span className="pr-upd">{fmtRel(plan.updatedAt, lang)}</span>
    </div>
  );
}

export function ListView({ plans, t, lang, onOpen, focusId, grouping = "status", ordering = "updated", showEmpty = false, props = ["gauge", "return", "fill", "strategy"], portfolios }: {
  plans: UIPlan[]; t: I18nDict; lang: Lang; onOpen: (p: UIPlan) => void; focusId?: string | null;
  grouping?: Grouping; ordering?: Ordering; showEmpty?: boolean; props?: string[]; portfolios: PfLite[];
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const cfg = groupConfig(grouping, t, lang, portfolios);
  let groups = cfg.keys.map((k) => ({ key: k, items: orderPlans(plans.filter((p) => cfg.keyOf(p) === k), ordering, lang) }));
  if (!showEmpty) groups = groups.filter((g) => g.items.length);
  return (
    <div className="body-main">
      {groups.map((g) => {
        const h = cfg.head(g.key);
        return (
          <div key={g.key}>
            <div className="grp-head" onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))}>
              <span className={"grp-chev" + (collapsed[g.key] ? " collapsed" : "")}><Lic name="chevron-down" size={14} cls="icon-sm" color="var(--fg-4)" /></span>
              {h.icon}
              <span className="grp-title">{h.label}</span>
              <span className="grp-count">{g.items.length}</span>
            </div>
            {!collapsed[g.key] && g.items.map((p) => (
              <PlanRow key={p.dbId} plan={p} lang={lang} onOpen={onOpen} focused={focusId === p.id} props={props} />
            ))}
          </div>
        );
      })}
      {!groups.some((g) => g.items.length) && <div className="empty-state"><Lic name="crosshair" size={28} color="var(--fg-4)" /><div className="es-title">{lang === "ko" ? "조건에 맞는 플랜이 없습니다" : "No plans match"}</div></div>}
    </div>
  );
}
