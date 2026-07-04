// 시나리오 모니터 (screens/10-scenarios-monitor.png) — 플랜을 가로지르는 시나리오 모니터 + adhoc(종목단독) 시나리오(S2).
// 서버에서 plans(관계 포함)를 UIPlan[]로, adhoc scenarios(plan_id null)를 securities 조인으로 AdhocScenario[]로 매핑.
// securities 목록은 작성 모달 SecurityPicker용. static 라우트라 [dest] placeholder를 override한다.
import { supabaseServer } from "@/lib/supabase/server";
import { mapDbPlan, PLAN_SELECT, type DbPlanRow } from "@/lib/plan-mapper";
import { fetchAllSecurities } from "@/lib/securities-list";
import { ScenariosScreen, type AdhocScenario } from "@/components/scenarios/scenarios-screen";
import type { L10n, ScenarioStatus } from "@keystone/core/types";

/** adhoc scenarios(plan_id null) select 결과 행 — securities 조인. */
interface DbAdhocRow {
  ticker: string | null;
  label: L10n | null;
  target: number;
  thesis: L10n | null;
  status: ScenarioStatus;
  color: string | null;
  securities: { name: L10n; currency: string; last_close: number | null } | null;
}

export default async function ScenariosPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: rows }, { data: adhocRows }, securities] = await Promise.all([
    supabase.from("plans").select(PLAN_SELECT)
      .is("deleted_at", null).is("archived_at", null)
      .order("updated_at", { ascending: false }),
    supabase.from("scenarios")
      .select("ticker, label, target, thesis, status, color, securities(name, currency, last_close)")
      .is("plan_id", null)
      .order("sort", { ascending: true }),
    fetchAllSecurities(supabase, user?.id ?? null),
  ]);

  const now = new Date();
  const plans = ((rows ?? []) as unknown as DbPlanRow[]).map((r) => mapDbPlan(r, now));

  // adhoc 행 → AdhocScenario. 가격/이름/통화는 조인한 securities에서. status pending→tracking(plan-mapper 일치).
  const securityScenarios: AdhocScenario[] = ((adhocRows ?? []) as unknown as DbAdhocRow[])
    .filter((a) => a.ticker && a.securities)
    .map((a) => {
      const sec = a.securities!;
      const cur = sec.currency === "KRW" ? "KRW" : "USD";
      return {
        ticker: a.ticker!,
        name: sec.name,
        cur,
        price: Number(sec.last_close ?? 0),
        label: a.label ?? { en: "Base", ko: "중간" },
        color: a.color || "var(--r-base)",
        target: Number(a.target),
        status: (a.status === "pending" ? "tracking" : a.status) as ScenarioStatus,
        thesis: a.thesis ?? undefined,
      };
    });

  return <ScenariosScreen plans={plans} securities={securities} securityScenarios={securityScenarios} />;
}
