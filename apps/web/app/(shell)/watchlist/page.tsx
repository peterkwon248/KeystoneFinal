// 관심종목 (screens/14-watchlist.png) — watched 종목 리스트.
// 서버에서 watchlist join securities(watched만) + plans(관계 포함)를 병렬로 읽어
// UISecurity[]/UIPlan[]로 매핑, 클라이언트 WatchlistScreen에 전달. lang은 클라이언트 usePrefs.
// static 라우트라 [dest] placeholder를 override한다.
import { supabaseServer } from "@/lib/supabase/server";
import { mapDbPlan, PLAN_SELECT, type DbPlanRow } from "@/lib/plan-mapper";
import { fetchWatchedSecurities } from "@/lib/securities-list";
import { WatchlistScreen } from "@/components/watchlist/watchlist-screen";

export default async function WatchlistPage() {
  const supabase = await supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();

  const [securities, { data: planRows }] = await Promise.all([
    user ? fetchWatchedSecurities(supabase, user.id) : Promise.resolve([]),
    supabase.from("plans").select(PLAN_SELECT).is("deleted_at", null).order("updated_at", { ascending: false }),
  ]);

  const now = new Date();
  const plans = ((planRows ?? []) as unknown as DbPlanRow[]).map((r) => mapDbPlan(r, now));

  return <WatchlistScreen securities={securities} plans={plans} />;
}
