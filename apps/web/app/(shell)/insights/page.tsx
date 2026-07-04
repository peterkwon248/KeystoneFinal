// 인사이트 (screens/16-insights.png) — 여러 플랜을 가로지르는 분석 뷰(대시보드와 동일 성격).
// 서버에서 plans(관계 포함, scenarios/executions/rules/notes 디코드됨)를 UIPlan[]로 매핑,
// 클라이언트 InsightsScreen 에 전달. lang/t 는 클라이언트 usePrefs + I18N[lang].
// 새 DB 테이블 없이 기존 plans 파생 → portfolios 는 필요 없어 plans 만 fetch.
import { supabaseServer } from "@/lib/supabase/server";
import { mapDbPlan, PLAN_SELECT, type DbPlanRow } from "@/lib/plan-mapper";
import { InsightsScreen } from "@/components/insights/insights-screen";

export default async function InsightsPage() {
  const supabase = await supabaseServer();

  const { data: rows } = await supabase
    .from("plans")
    .select(PLAN_SELECT)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  const now = new Date();
  const plans = ((rows ?? []) as unknown as DbPlanRow[]).map((r) => mapDbPlan(r, now));

  return <InsightsScreen plans={plans} />;
}
