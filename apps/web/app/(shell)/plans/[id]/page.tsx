// 플랜 상세 (screens/04-plan-detail.png) — 셸 이식(1차 증분). 탭 본문은 후속.
// 서버에서 plan(관계 포함) + portfolios를 읽어 UIPlan으로 매핑, 클라이언트 PlanDetail에 전달.
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { mapDbPlan, PLAN_SELECT, type DbPlanRow } from "@/lib/plan-mapper";
import { pfColor, type PfLite } from "@/lib/pf-palette";
import { PlanDetail } from "@/components/plan/detail-view";

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const [{ data: row }, { data: pfRows }] = await Promise.all([
    supabase.from("plans").select(PLAN_SELECT).eq("id", id).is("deleted_at", null).maybeSingle(),
    supabase.from("portfolios").select("id, name, sort").order("sort"),
  ]);

  if (!row) notFound();

  const plan = mapDbPlan(row as unknown as DbPlanRow);
  const portfolios: PfLite[] = (pfRows ?? []).map((p, i) => ({ id: p.id, name: p.name, color: pfColor(i) }));

  return <PlanDetail plan={plan} portfolios={portfolios} />;
}
