// 종목 리서치 (source/P4Views.jsx:874-912 ResearchBrowser) — 검색/최근본종목/관심종목 → 종목상세.
// 서버에서 securities 전체(watched 플래그 포함) + plans를 병렬로 읽어 UISecurity[]/UIPlan[]로
// 매핑, 클라이언트 ResearchScreen에 전달. lang은 클라이언트 usePrefs.
// static 라우트라 [dest] placeholder를 override한다(watchlist/page.tsx와 동일 방식).
import { supabaseServer } from "@/lib/supabase/server";
import { mapDbPlan, PLAN_SELECT, type DbPlanRow } from "@/lib/plan-mapper";
import { fetchAllSecurities } from "@/lib/securities-list";
import { ResearchScreen } from "@/components/research/research-screen";

export default async function ResearchPage() {
  const supabase = await supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();

  const [securities, { data: planRows }] = await Promise.all([
    fetchAllSecurities(supabase, user?.id ?? null),
    supabase.from("plans").select(PLAN_SELECT).is("deleted_at", null).order("updated_at", { ascending: false }),
  ]);

  const now = new Date();
  const plans = ((planRows ?? []) as unknown as DbPlanRow[]).map((r) => mapDbPlan(r, now));

  return <ResearchScreen securities={securities} plans={plans} />;
}
