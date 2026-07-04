// 시나리오 모니터 (screens/10-scenarios-monitor.png) — 플랜을 가로지르는 시나리오 모니터.
// 서버에서 plans(관계 포함)를 읽어 UIPlan[]로 매핑, 클라이언트 ScenariosScreen에 전달. lang은 클라이언트 usePrefs.
// static 라우트라 [dest] placeholder를 override한다.
import { supabaseServer } from "@/lib/supabase/server";
import { mapDbPlan, PLAN_SELECT, type DbPlanRow } from "@/lib/plan-mapper";
import { ScenariosScreen } from "@/components/scenarios/scenarios-screen";

export default async function ScenariosPage() {
  const supabase = await supabaseServer();

  const { data: rows } = await supabase
    .from("plans")
    .select(PLAN_SELECT)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  const now = new Date();
  const plans = ((rows ?? []) as unknown as DbPlanRow[]).map((r) => mapDbPlan(r, now));

  return <ScenariosScreen plans={plans} />;
}
