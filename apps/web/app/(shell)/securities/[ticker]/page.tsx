// 종목 상세 (screens/19·19b·21·22) — SecurityDetail 이식.
// 서버에서 securities 1건 + security_financials + watchlist(watched) + plans(관련 플랜)를 읽어
// UISecurity/secPlan/fin으로 매핑, 클라이언트 SecurityDetailScreen에 전달.
// fin은 plans/[id] page.tsx와 동일하게 buildPlanFin(DB 우선·시드 폴백)으로 계산해 재사용 탭에 넘긴다.
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { mapDbPlan, PLAN_SELECT, type DbPlanRow } from "@/lib/plan-mapper";
import { buildPlanFin, type DbFinRow } from "@/lib/fin-mapper";
import {
  mapSecurity, secPlanOf, SECURITY_SELECT, SECURITY_FIN_SELECT,
  type DbSecurityRow, type DbSecurityFinRow,
} from "@/lib/security-mapper";
import { SecurityDetailScreen } from "@/components/securities/security-detail";

export default async function SecurityDetailPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const supabase = await supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: secRow } = await supabase
    .from("securities").select(SECURITY_SELECT).eq("ticker", ticker).maybeSingle();
  if (!secRow) notFound();

  // 재무(security_financials) + 관심 여부 + 관련 플랜을 병렬로.
  const [{ data: finRows }, watchRes, { data: planRows }] = await Promise.all([
    supabase.from("security_financials").select(SECURITY_FIN_SELECT).eq("ticker", ticker).order("fiscal_year", { ascending: false }),
    user
      ? supabase.from("watchlist").select("id").eq("user_id", user.id).eq("ticker", ticker).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("plans").select(PLAN_SELECT).is("deleted_at", null).order("updated_at", { ascending: false }),
  ]);

  const watched = !!(watchRes as { data: unknown }).data;

  const now = new Date();
  const plans = ((planRows ?? []) as unknown as DbPlanRow[]).map((r) => mapDbPlan(r, now));

  // eps는 security_financials에 컬럼이 없어(마일스톤6) 같은 ticker 플랜에서 유도 — 현재 유일한 실 출처.
  // 여러 플랜이면 첫(최신 updated_at) 것. 플랜 없는 종목은 null 폴백(진짜 데이터 없음 — 문서화된 seam).
  const epsFromPlan = plans.find((p) => p.ticker === ticker && p.eps > 0)?.eps ?? null;

  const security = mapSecurity(
    secRow as unknown as DbSecurityRow,
    (finRows ?? []) as unknown as DbSecurityFinRow[],
    watched,
    epsFromPlan,
  );
  const secPlan = secPlanOf(security);

  // DB 우선·시드 폴백 — plans/[id] page.tsx와 동일 산식(lib/fin-mapper). eps는 플랜 유도값(없으면 0).
  const fin = buildPlanFin(
    security.ticker, security.cur, (finRows ?? []) as unknown as DbFinRow[],
    security.price, security.eps ?? 0, security.sharesOut,
  );

  return <SecurityDetailScreen security={security} secPlan={secPlan} fin={fin} plans={plans} />;
}
