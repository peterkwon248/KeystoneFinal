// 일지 (screens/02-journal.png) — 반추 표면(마스터-디테일). 서버에서 plans(관계 포함, notes 디코드됨)
// + portfolios 를 읽어 UIPlan[] 로 매핑, 클라이언트 JournalScreen 에 전달. lang 은 클라이언트 usePrefs.
// notes 는 plan-mapper 가 custom_fields.notes 에서 디코드해 plan.notes 로 이미 채운다(PLAN_SELECT 에 custom_fields 포함).
import { supabaseServer } from "@/lib/supabase/server";
import { mapDbPlan, PLAN_SELECT, type DbPlanRow } from "@/lib/plan-mapper";
import { pfColor, type PfLite } from "@/lib/pf-palette";
import { JournalScreen } from "@/components/journal/journal-screen";

export default async function JournalPage() {
  const supabase = await supabaseServer();

  const [{ data: rows }, { data: pfRows }] = await Promise.all([
    supabase.from("plans").select(PLAN_SELECT).is("deleted_at", null).order("updated_at", { ascending: false }),
    supabase.from("portfolios").select("id, name, sort").order("sort"),
  ]);

  const now = new Date();
  const plans = ((rows ?? []) as unknown as DbPlanRow[]).map((r) => mapDbPlan(r, now));
  const portfolios: PfLite[] = (pfRows ?? []).map((p, i) => ({ id: p.id, name: p.name, color: pfColor(i) }));

  return <JournalScreen plans={plans} portfolios={portfolios} />;
}
