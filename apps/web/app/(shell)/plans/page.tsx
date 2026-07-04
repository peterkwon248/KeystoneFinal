// 플랜 리스트 (screens/03-plans.png) — ListView/BoardView/TimelineView.
// 서버에서 plans+scenarios+executions+securities를 읽어 프로토타입 Plan 형태로 매핑한다.
import { supabaseServer } from "@/lib/supabase/server";
import { mapDbPlan, PLAN_SELECT, type DbPlanRow } from "@/lib/plan-mapper";
import { pfColor, type PfLite } from "@/lib/pf-palette";
import { PlansScreen } from "@/components/plan/plans-screen";

export default async function PlansPage({ searchParams }: {
  searchParams: Promise<{ pf?: string }>;
}) {
  const { pf } = await searchParams;
  const supabase = await supabaseServer();

  const [{ data: rows }, { data: pfRows }] = await Promise.all([
    supabase.from("plans").select(PLAN_SELECT).is("deleted_at", null).is("archived_at", null).order("created_at", { ascending: false }),
    supabase.from("portfolios").select("id, name, sort").order("sort"),
  ]);

  const now = new Date();
  const plans = ((rows ?? []) as unknown as DbPlanRow[]).map((r) => mapDbPlan(r, now));
  const portfolios: PfLite[] = (pfRows ?? []).map((p, i) => ({ id: p.id, name: p.name, color: pfColor(i) }));

  return <PlansScreen plans={plans} portfolios={portfolios} activePf={pf ?? null} />;
}
