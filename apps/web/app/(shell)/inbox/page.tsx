// 인박스 (screens/01-inbox.png) — 트리아지 표면. 서버에서 plans(관계 포함)+portfolios 를 읽어
// UIPlan[] 로 매핑, 클라이언트 InboxScreen 에 전달. 알림 파생/트리아지 상태는 클라이언트에서.
import { supabaseServer } from "@/lib/supabase/server";
import { mapDbPlan, PLAN_SELECT, type DbPlanRow } from "@/lib/plan-mapper";
import { pfColor, type PfLite } from "@/lib/pf-palette";
import { InboxScreen } from "@/components/inbox/inbox-screen";

export default async function InboxPage() {
  const supabase = await supabaseServer();

  const [{ data: rows }, { data: pfRows }] = await Promise.all([
    supabase.from("plans").select(PLAN_SELECT).is("deleted_at", null).order("updated_at", { ascending: false }),
    supabase.from("portfolios").select("id, name, sort").order("sort"),
  ]);

  const now = new Date();
  const plans = ((rows ?? []) as unknown as DbPlanRow[]).map((r) => mapDbPlan(r, now));
  const portfolios: PfLite[] = (pfRows ?? []).map((p, i) => ({ id: p.id, name: p.name, color: pfColor(i) }));

  return <InboxScreen plans={plans} portfolios={portfolios} />;
}
