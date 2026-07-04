// source/Panels.jsx:8-15,35-73 순수 필터 헬퍼 이식 — 웹 인라인(core 승격 안 함, 골든 미변경).
// 형제 뷰(watchlist)가 필터 술어를 뷰 레이어에 인라인으로 두는 것과 일치시킨 설계 결정.
import type { Lang } from "@keystone/core/types";
import { planReturn } from "@keystone/core/analytics";
import { EXEC_STRATEGIES, STRATEGIES, PORTFOLIOS, EXEC_CATS } from "@keystone/core/reference";
import type { UIPlan } from "@/lib/plan-mapper";

/** Panels.jsx:8-11 catOfPlan — 플랜의 실행 전략 카테고리(accum/rebal/signal), 미배정이면 "none". */
export function catOfPlan(plan: UIPlan): string {
  const s = EXEC_STRATEGIES.find((x) => x.id === plan.execId);
  return s ? s.cat || "accum" : "none";
}

/** Panels.jsx:12-15 fwCatOfPlan — 플랜의 밸류에이션 프레임워크 카테고리(multiple/intrinsic/asset), 미배정이면 "none". */
export function fwCatOfPlan(plan: UIPlan): string {
  const s = STRATEGIES.find((x) => x.id === plan.strategyId);
  return s && s.model ? s.cat || "multiple" : "none";
}

/** Panels.jsx:35-58 matchesFilters — 활성 필터를 모두 통과하는지. gap/dwell/framework/category/fwcategory
 *  케이스도 원본대로 완전 이식(웹 표시 cats는 5종만 노출하나 함수 자체는 완전성 유지). */
export function matchesFilters(plan: UIPlan, filters: Record<string, string[]>): boolean {
  return Object.entries(filters).every(([type, vals]) => {
    if (!vals || !vals.length) return true;
    if (type === "status") return vals.includes(plan.status);
    if (type === "portfolio") return vals.includes(plan.portfolioId || "none");
    if (type === "strategy") return vals.includes(plan.execId || "none");
    if (type === "framework") return vals.includes(plan.strategyId || "none");
    if (type === "category") return vals.includes(catOfPlan(plan));
    if (type === "fwcategory") return vals.includes(fwCatOfPlan(plan));
    if (type === "scenario") return (plan.scenarios || []).some((s) => vals.includes(s.status));
    if (type === "return") {
      const r = planReturn(plan);
      if (!r) return false;
      return (vals.includes("profit") && r.rate >= 0) || (vals.includes("loss") && r.rate < 0);
    }
    if (type === "gap") {
      if (plan.iv == null) return false;
      const g = ((plan.iv - plan.currentPrice) / plan.currentPrice) * 100;
      return (
        (vals.includes("deep") && g >= 12) ||
        (vals.includes("near") && plan.currentPrice >= plan.iv * 0.97) ||
        (vals.includes("mos") && plan.currentPrice <= plan.iv * 0.9)
      );
    }
    if (type === "dwell") return vals.includes("long") && (plan.gapMonths || 0) >= 9;
    return true;
  });
}

const FW_CATS: Record<Lang, [string, string][]> = {
  en: [
    ["multiple", "Multiple"],
    ["intrinsic", "Intrinsic"],
    ["asset", "Asset"],
  ],
  ko: [
    ["multiple", "멀티플"],
    ["intrinsic", "내재가치"],
    ["asset", "자산"],
  ],
};

/** Panels.jsx:61-73 filterValueLabel — 필터 칩에 쓸 값 라벨(gap/dwell 라벨 포함). */
export function filterValueLabel(type: string, value: string, t: Record<string, string>, lang: Lang): string {
  if (type === "status") return t["s_" + value];
  if (type === "scenario") return t["scn_st_" + value] || value;
  if (type === "portfolio") return value === "none" ? t.noPortfolio : PORTFOLIOS.find((p) => p.id === value)?.name?.[lang] ?? value;
  if (type === "strategy") return value === "none" ? t.noStrategy : EXEC_STRATEGIES.find((s) => s.id === value)?.name?.[lang] ?? value;
  if (type === "framework") return value === "none" ? t.noFramework : STRATEGIES.find((s) => s.id === value)?.name?.[lang] ?? value;
  if (type === "category") return EXEC_CATS.find((c) => c.id === value)?.label?.[lang] ?? value;
  if (type === "fwcategory") return (FW_CATS[lang].find((c) => c[0] === value) || [value, value])[1];
  if (type === "return") return value === "profit" ? t.inProfit : t.inLoss;
  if (type === "gap")
    return (
      ({ deep: lang === "ko" ? "저평가 깊은" : "Deep", near: lang === "ko" ? "목표가 근접" : "Near", mos: lang === "ko" ? "안전마진" : "Mgn of safety" } as Record<string, string>)[value] || value
    );
  if (type === "dwell") return lang === "ko" ? "오래 기다린" : "Long-waiting";
  return value;
}
