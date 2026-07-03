// source/DetailView.jsx 셸 이식 — 단일 플랜: 크럼 + 헤더 픽커 + 티커라인 + 타이틀 + 메트릭행 + 탭바.
// 1차 증분: 탭 본문은 플레이스홀더(후속 증분에서 시나리오/전략/재무 등 이식).
// 순수 로직은 @keystone/core, 데이터는 UIPlan(plan-mapper), 픽커 영속은 patchPlanAction.
"use client";
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Fin, I18nDict, Lang, PlanStatus } from "@keystone/core/types";
import { EXEC_STRATEGIES, STATUS_ORDER } from "@keystone/core/reference";
import { planReturn } from "@keystone/core/analytics";
import { fmtMoney, fmtCompact } from "@keystone/core/format";
import { I18N } from "@keystone/core/i18n";
import { Flag, Lic, PanelIcon, StatusIcon } from "@/components/icons";
import { usePrefs } from "@/components/shell/prefs";
import { Sparkline } from "./sparkline";
import { MiniDropdown, type MdItem } from "./mini-dropdown";
import { ScenariosTab } from "./scenarios-tab";
import { StrategyTab } from "./strategy-tab";
import { ActivityTab } from "./activity-tab";
import { ExecutionsTab } from "./executions-tab";
import { FinancialsTab } from "./financials-tab";
import { IndicatorsTab } from "./indicators-tab";
import { ValuationTab } from "./valuation-tab";
import { InsightsTab } from "./insights-tab";
import { PropsSidebar } from "./props-sidebar";
import type { UINote, UIPlan } from "@/lib/plan-mapper";
import type { PfLite } from "@/lib/pf-palette";
import { applyValuationTargetsAction, patchNotesAction, patchPlanAction, setGoalAction, toggleRuleAction, type PlanGoal } from "@/app/(shell)/plans/[id]/actions";

interface TabDef { key: string; label: string; num?: number; tip?: { ko: string[]; en: string[] } }

export function PlanDetail({ plan, portfolios, fin }: {
  plan: UIPlan; portfolios: PfLite[]; fin: Fin | null;
}) {
  const { lang } = usePrefs();
  const t: I18nDict = I18N[lang];
  const router = useRouter();
  const [tab, setTab] = useState("scenarios");
  // 우측 디테일바 — screens/04 기준(우측바 안 보임)이므로 접힘 기본.
  const [rightCollapsed, setRightCollapsed] = useState(true);
  const [, startTransition] = useTransition();
  const onBack = () => router.push("/plans");

  const patch = (p: { status?: PlanStatus; portfolioId?: string | null; execId?: string | null }) =>
    startTransition(() => { void patchPlanAction(plan.dbId, p); });

  // 전략 탭 실연결 콜백 — supabase-js 빌더는 lazy thenable이라 서버 액션 내부에서 await됨.
  const onToggleRule = (ruleId: string, enabled: boolean) =>
    startTransition(() => { void toggleRuleAction(plan.dbId, ruleId, enabled); });
  const onSetGoal = (goal: PlanGoal | null) =>
    startTransition(() => { void setGoalAction(plan.dbId, goal); });
  // 밸류에이션 탭 "시나리오에 적용" — 슬롯 적정가(bull/base/bear)를 scenarios.target 에 기록.
  // base target 갱신 → plan-mapper 가 iv 를 파생하므로 iv 는 자동 반영(별도 필드 없음).
  const onApplyTargets = (targets: { bull: number; base: number; bear: number }) =>
    startTransition(() => { void applyValuationTargetsAction(plan.dbId, targets); });
  // 사이드바 메모 영속 — onSetGoal 과 동일 패턴(서버 액션이 revalidatePath 하므로 refresh 불필요).
  const onPatchNotes = (notes: UINote[]) =>
    startTransition(() => { void patchNotesAction(plan.dbId, notes); });

  const ret = planReturn(plan);
  const isClosed = plan.status === "closed";
  const fillPct = plan.divisions ? Math.round(((plan.round ?? 0) / plan.divisions) * 100) : null;

  const tabs: TabDef[] = [
    { key: "scenarios", label: t.scenarios, num: plan.scenarios.length },
    { key: "strategy", label: lang === "ko" ? "전략" : "Strategy" },
    { key: "financials", label: lang === "ko" ? "재무제표" : "Financials" },
    { key: "indicators", label: lang === "ko" ? "투자지표" : "Metrics" },
    { key: "valuation", label: t.val_tab },
    { key: "insights", label: t.insights },
    { key: "executions", label: t.executions, num: plan.executions.length },
    { key: "activity", label: t.activity },
  ];

  const hpf = portfolios.find((p) => p.id === plan.portfolioId);
  const ex = EXEC_STRATEGIES.find((s) => s.id === plan.execId);

  return (
    <div className="detail-wrap">
      <div className="detail-main">
        <div className="detail-inner">
          <div className="dt-crumb">
            <span className="c-link" onClick={onBack}><Lic name="chevron-left" size={13} cls="icon-sm" color="inherit" /></span>
            <span className="c-link" onClick={onBack}>{t.plans}</span>
            <Lic name="chevron-right" size={12} cls="icon-sm" color="var(--fg-4)" />
            <span>{plan.id}</span>
            {rightCollapsed && <button className="iconbtn rp-toggle" onClick={() => setRightCollapsed((v) => !v)} title={t.showProps}><PanelIcon side="right" size={15} /></button>}
          </div>

          <div className="dt-headrow">
            <MiniDropdown
              trigger={<span className="dt-statuspick"><StatusIcon status={plan.status} size={14} />{t["s_" + plan.status]}<Lic name="chevron-down" size={13} cls="icon-sm" color="var(--fg-4)" /></span>}
              items={STATUS_ORDER.map((s): MdItem => ({ value: s, label: t["s_" + s], icon: <StatusIcon status={s} size={14} />, on: plan.status === s }))}
              onPick={(v) => v && patch({ status: v as PlanStatus })} />
            <MiniDropdown width={200}
              trigger={<span className="strat-badge pick"><span className="pf-dot" style={{ background: hpf ? hpf.color : "var(--fg-4)" }} />{hpf ? hpf.name : t.portfolio}<Lic name="chevron-down" size={12} cls="icon-sm" color="var(--fg-4)" /></span>}
              items={[
                { value: null, label: t.noPortfolio, icon: <span className="pf-dot" style={{ background: "var(--fg-4)" }} />, on: !plan.portfolioId },
                ...portfolios.map((p): MdItem => ({ value: p.id, label: p.name, icon: <span className="pf-dot" style={{ background: p.color }} />, on: plan.portfolioId === p.id })),
              ]}
              onPick={(v) => patch({ portfolioId: v ?? null })} />
            <MiniDropdown width={200}
              trigger={ex
                ? <span className="strat-badge pick"><span className="strat-dot" style={{ background: ex.color }} />{ex.name[lang]}<Lic name="chevron-down" size={12} cls="icon-sm" color="var(--fg-4)" /></span>
                : <span className="strat-badge pick empty"><Lic name="plus" size={12} cls="icon-sm" color="var(--fg-4)" />{t.strategy}<Lic name="chevron-down" size={12} cls="icon-sm" color="var(--fg-4)" /></span>}
              items={[
                { value: null, label: t.noStrategy, icon: <span className="strat-dot" style={{ background: "var(--fg-4)" }} />, on: !ex },
                ...EXEC_STRATEGIES.map((s): MdItem => ({ value: s.id, label: s.name[lang], icon: <span className="strat-dot" style={{ background: s.color }} />, on: plan.execId === s.id })),
              ]}
              onPick={(v) => patch({ execId: v ?? null })} />
          </div>

          <div className="dt-tickerline"><Flag market={plan.cur === "KRW" ? "KR" : "US"} size={14} /><b style={{ color: "var(--fg)", fontWeight: 600 }}>{plan.tickerName[lang]}</b> · <span className="mono">{plan.ticker}</span><Lic name="arrow-up-right" size={13} cls="icon-sm" color="var(--fg-4)" /></div>
          <h1 className="dt-title">{plan.name[lang]}</h1>

          <div className="metric-row">
            {isClosed ? <>
              <div className="metric"><div className="metric-lab">{t.realizedPL}</div><div className={"metric-val " + ((plan.realizedPL ?? 0) >= 0 ? "pos" : "neg")}>{((plan.realizedPL ?? 0) >= 0 ? "+" : "") + fmtCompact(plan.realizedPL ?? 0, plan.cur)}</div></div>
              <div className="metric"><div className="metric-lab">{t.avg}</div><div className="metric-val sm">{plan.avgPrice != null ? fmtMoney(plan.avgPrice, plan.cur) : "—"}</div></div>
            </> : <>
              <div className="metric" title={t.tip_current}><div className="metric-lab">{t.current}</div><div className="metric-val">{fmtMoney(plan.currentPrice, plan.cur)}</div></div>
              <div className="metric" title={t.tip_avgCost}><div className="metric-lab">{t.avg}</div><div className="metric-val sm">{plan.avgPrice != null ? fmtMoney(plan.avgPrice, plan.cur) : "—"}</div></div>
              <div className="metric" title={t.tip_retRate}><div className="metric-lab">{t.retRate}</div><div className={"metric-val " + (ret ? (ret.rate >= 0 ? "pos" : "neg") : "")}>{ret ? (ret.rate >= 0 ? "+" : "") + ret.rate.toFixed(1) + "%" : "—"}</div></div>
              <div className="metric metric--tip"><div className="metric-lab">{t.retAmt}</div><div className={"metric-val sm " + (ret ? (ret.amt >= 0 ? "pos" : "neg") : "")}>{ret ? fmtCompact(ret.amt, plan.cur) : (plan.realizedPL ? "+" + fmtCompact(plan.realizedPL, plan.cur) : "—")}</div>
                {ret && plan.avgPrice != null && plan.avgPrice > 0 && <span className="metric-tip">
                  <span className="sc-tl-tip-h">{lang === "ko" ? "평가손익 계산" : "Unrealized P/L"}</span>
                  <span className="sc-tl-tip-row"><span>{lang === "ko" ? "보유 수량" : "Shares"}</span><b className="mono">{(plan.totalShares || 0).toLocaleString("en-US")}{lang === "ko" ? "주" : ""}</b></span>
                  <span className="sc-tl-tip-row"><span>{lang === "ko" ? "현재가 − 평단" : "Price − avg"}</span><b className="mono">{fmtMoney(plan.currentPrice, plan.cur)} − {fmtMoney(plan.avgPrice, plan.cur)}</b></span>
                  <span className="sc-tl-tip-row"><span>{lang === "ko" ? "주당 손익" : "Per share"}</span><b className={"mono " + (plan.currentPrice - plan.avgPrice >= 0 ? "pos" : "neg")}>{(plan.currentPrice - plan.avgPrice >= 0 ? "+" : "") + fmtMoney(plan.currentPrice - plan.avgPrice, plan.cur)}</b></span>
                  <span className="sc-tl-tip-row" style={{ borderTop: "1px solid var(--border)", paddingTop: "6px", marginTop: "1px" }}><span>{lang === "ko" ? "평가손익" : "Total P/L"}</span><b className={"mono " + (ret.amt >= 0 ? "pos" : "neg")}>{(ret.amt >= 0 ? "+" : "") + fmtCompact(ret.amt, plan.cur)} · {(ret.rate >= 0 ? "+" : "") + ret.rate.toFixed(1)}%</b></span>
                </span>}
              </div>
              <div className="metric" title={t.tip_progress}><div className="metric-lab">{t.progress}</div><div className="metric-val sm">{fillPct != null ? plan.round + "/" + plan.divisions : "—"}</div>{plan.totalInvested > 0 && <div className="metric-sub">{t.invested} {fmtCompact(plan.totalInvested, plan.cur)}</div>}</div>
            </>}
            <div className="metric-spark"><Sparkline plan={plan} w={96} h={34} /></div>
          </div>

          <div className="dt-tabs">
            {tabs.map((tb) => (
              <div key={tb.key} className={"dt-tab" + (tab === tb.key ? " active" : "")} onClick={() => setTab(tb.key)}>
                {tb.label}{tb.num != null && <span className="tab-num">{tb.num}</span>}
              </div>
            ))}
          </div>

          {tab === "scenarios" ? <ScenariosTab plan={plan} t={t} lang={lang} />
            : tab === "strategy" ? <StrategyTab plan={plan} t={t} lang={lang} onToggleRule={onToggleRule} onSetGoal={onSetGoal} />
            : tab === "financials" ? <FinancialsTab plan={plan} fin={fin} t={t} lang={lang} />
            : tab === "indicators" ? <IndicatorsTab plan={plan} fin={fin} t={t} lang={lang} />
            : tab === "valuation" ? <ValuationTab plan={plan} fin={fin} t={t} lang={lang} onApplyTargets={onApplyTargets} />
            : tab === "insights" ? <InsightsTab plan={plan} t={t} lang={lang} />
            : tab === "executions" ? <ExecutionsTab plan={plan} t={t} lang={lang} />
            : tab === "activity" ? <ActivityTab plan={plan} lang={lang} />
            : <TabPlaceholder tab={tab} tabs={tabs} lang={lang} />}
        </div>
      </div>
      {!rightCollapsed && (
        <PropsSidebar
          plan={plan}
          t={t}
          lang={lang}
          onToggleRight={() => setRightCollapsed((v) => !v)}
          onPatchNotes={onPatchNotes}
        />
      )}
    </div>
  );
}

// 1차 증분 플레이스홀더 — 후속 증분에서 각 탭 본문 이식.
function TabPlaceholder({ tab, tabs, lang }: { tab: string; tabs: TabDef[]; lang: Lang }): ReactNode {
  const label = tabs.find((x) => x.key === tab)?.label ?? tab;
  return (
    <div style={{ padding: "48px 8px", color: "var(--fg-4)", font: "var(--fw-regular) 13px var(--font-sans)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <PanelIcon side="right" size={16} />
        <b style={{ color: "var(--fg-3)" }}>{label}</b>
      </div>
      <div style={{ marginTop: 10 }}>{lang === "ko" ? "이 탭은 이식 준비 중입니다 (마일스톤 7 후속 증분)." : "This tab is being ported (milestone 7, upcoming increment)."}</div>
    </div>
  );
}
