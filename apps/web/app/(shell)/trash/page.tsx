// 휴지통 (source/P4Views.jsx:1083-1096 TrashView) — 소프트삭제된 플랜 리스트. research/page.tsx 미러.
// 일반 페이지는 .is("deleted_at", null)이지만 휴지통은 반대로 .not("deleted_at", "is", null).
// static 라우트라 [dest] placeholder를 override한다(research/watchlist와 동일 방식).
import { supabaseServer } from "@/lib/supabase/server";
import { mapDbPlan, PLAN_SELECT, type DbPlanRow } from "@/lib/plan-mapper";
import { TrashScreen } from "@/components/trash/trash-screen";

export default async function TrashPage() {
  const supabase = await supabaseServer();

  const { data: planRows } = await supabase
    .from("plans")
    .select(PLAN_SELECT)
    .not("deleted_at", "is", null)
    .order("updated_at", { ascending: false });

  const now = new Date();
  const plans = ((planRows ?? []) as unknown as DbPlanRow[]).map((r) => mapDbPlan(r, now));

  return <TrashScreen plans={plans} />;
}
