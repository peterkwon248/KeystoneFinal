// 보관함 (screens/17-archive.png) — archived_at 있는 플랜(상태 무관) 리스트. static 라우트라 [dest] override.
// 일반 페이지는 .is("archived_at", null)이지만 보관함은 반대로 .not("archived_at","is",null).
// portfolios 는 필터 칩 라벨 해석용(core PORTFOLIOS엔 DB UUID 없음 → 실 portfolios prop).
import { supabaseServer } from "@/lib/supabase/server";
import { mapDbPlan, PLAN_SELECT, type DbPlanRow } from "@/lib/plan-mapper";
import { pfColor, type PfLite } from "@/lib/pf-palette";
import { ArchiveScreen } from "@/components/archive/archive-screen";

export default async function ArchivePage() {
  const supabase = await supabaseServer();

  const [{ data: planRows }, { data: pfRows }] = await Promise.all([
    supabase.from("plans").select(PLAN_SELECT)
      .not("archived_at", "is", null).is("deleted_at", null)
      .order("updated_at", { ascending: false }),
    supabase.from("portfolios").select("id, name, sort").order("sort"),
  ]);

  const now = new Date();
  const plans = ((planRows ?? []) as unknown as DbPlanRow[]).map((r) => mapDbPlan(r, now));
  const portfolios: PfLite[] = (pfRows ?? []).map((p, i) => ({ id: p.id, name: p.name, color: pfColor(i) }));

  return <ArchiveScreen plans={plans} portfolios={portfolios} />;
}
