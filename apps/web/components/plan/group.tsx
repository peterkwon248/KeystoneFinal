// source/Panels.jsx의 groupConfig/orderPlans 이식본.
// 어댑테이션: PORTFOLIOS 전역(프리셋) → DB 포트폴리오 파라미터, category 그룹핑은 미노출(프로토타입 리스트 패널과 동일).
import type { ReactNode } from "react";
import type { I18nDict, Lang, Plan } from "@keystone/core/types";
import { EXEC_STRATEGIES, STATUS_ORDER } from "@keystone/core/reference";
import { planReturn } from "@keystone/core/analytics";
import { Lic, StatusIcon } from "@/components/icons";
import type { PfLite } from "@/lib/pf-palette";

export type Grouping = "none" | "portfolio" | "status" | "strategy";
export type Ordering = "updated" | "return" | "name";

export interface GroupCfg {
  keys: string[];
  keyOf: (p: Plan) => string;
  head: (k: string) => { icon: ReactNode; label: string };
}

export function groupConfig(grouping: Grouping, t: I18nDict, lang: Lang, portfolios: PfLite[]): GroupCfg {
  if (grouping === "portfolio") return {
    keys: portfolios.map((p) => p.id).concat(["none"]),
    keyOf: (p) => p.portfolioId || "none",
    head: (k) => {
      if (k === "none") return { icon: <span className="pf-dot" style={{ background: "var(--fg-4)", width: 11, height: 11 }} />, label: t.noPortfolio };
      const pf = portfolios.find((x) => x.id === k)!;
      return { icon: <span className="pf-dot" style={{ background: pf.color, width: 11, height: 11 }} />, label: pf.name };
    },
  };
  if (grouping === "strategy") return {
    keys: EXEC_STRATEGIES.map((s) => s.id).concat(["none"]),
    keyOf: (p) => p.execId || "none",
    head: (k) => {
      if (k === "none") return { icon: <span className="strat-dot" style={{ background: "var(--fg-4)" }} />, label: t.noStrategy };
      const s = EXEC_STRATEGIES.find((x) => x.id === k);
      return { icon: <span className="strat-dot" style={{ background: s ? s.color : "var(--fg-4)" }} />, label: s ? s.name[lang] : k };
    },
  };
  if (grouping === "none") return {
    keys: ["all"], keyOf: () => "all",
    head: () => ({ icon: <Lic name="crosshair" size={14} cls="icon-sm" color="var(--fg-3)" />, label: t.plans }),
  };
  // status (default)
  return {
    keys: STATUS_ORDER, keyOf: (p) => p.status,
    head: (k) => ({ icon: <StatusIcon status={k as Plan["status"]} size={15} />, label: t["s_" + k] }),
  };
}

export function orderPlans<T extends Plan>(items: T[], ordering: Ordering, lang: Lang): T[] {
  const arr = items.slice();
  if (ordering === "return") arr.sort((a, b) => { const ra = planReturn(a), rb = planReturn(b); return (rb ? rb.rate : -999) - (ra ? ra.rate : -999); });
  else if (ordering === "name") arr.sort((a, b) => a.tickerName[lang].localeCompare(b.tickerName[lang]));
  return arr;
}
