// 스크리너 (screens/11-screener.png, list 레이아웃) — 프레임워크 렌즈로 종목 유니버스 스크리닝.
// 서버에서 securities 전체(watched 플래그 포함) + plans를 병렬로 읽어 UISecurity[]/UIPlan[]로 매핑,
// 클라이언트 ScreenerScreen에 전달. 지표/밸류에이션 eps·perLo·perHi는 SEC_SEED(마일스톤6 실데이터 seam).
// static 라우트라 [dest] placeholder를 override한다(research/watchlist와 동일 방식).
import { supabaseServer } from "@/lib/supabase/server";
import { mapDbPlan, PLAN_SELECT, type DbPlanRow } from "@/lib/plan-mapper";
import { fetchAllSecurities } from "@/lib/securities-list";
import { ScreenerScreen } from "@/components/screener/screener-screen";

export default async function ScreenerPage() {
  const supabase = await supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();

  const [securities, { data: planRows }] = await Promise.all([
    fetchAllSecurities(supabase, user?.id ?? null),
    supabase.from("plans").select(PLAN_SELECT).is("deleted_at", null).order("updated_at", { ascending: false }),
  ]);

  const now = new Date();
  const plans = ((planRows ?? []) as unknown as DbPlanRow[]).map((r) => mapDbPlan(r, now));

  return <ScreenerScreen securities={securities} plans={plans} />;
}
