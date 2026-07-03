// 전략/관점 열람 (screens/05-strategy-editor.png) — StrategyEditor 이식본.
// LIBRARY_LOCKED 읽기전용 카탈로그 뷰어. 프리셋 메타는 @keystone/core/reference.
// id → [...STRATEGIES, ...EXEC_STRATEGIES].find → 없으면 notFound. plans 쿼리는 preview 탭의
// "적용 대상"(active 플랜) 목록용 — 사이드바 관점/전략 클릭이 /strategy/[id] 로 진입.
import { notFound } from "next/navigation";
import { STRATEGIES, EXEC_STRATEGIES } from "@keystone/core/reference";
import { supabaseServer } from "@/lib/supabase/server";
import { mapDbPlan, PLAN_SELECT, type DbPlanRow } from "@/lib/plan-mapper";
import { StrategyEditor } from "@/components/strategy/strategy-editor";

export default async function StrategyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = [...STRATEGIES, ...EXEC_STRATEGIES].find((s) => s.id === id);
  if (!item) notFound();

  const supabase = await supabaseServer();
  const { data: rows } = await supabase
    .from("plans")
    .select(PLAN_SELECT)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const now = new Date();
  const plans = ((rows ?? []) as unknown as DbPlanRow[]).map((r) => mapDbPlan(r, now));

  return <StrategyEditor strategy={item} plans={plans} />;
}
