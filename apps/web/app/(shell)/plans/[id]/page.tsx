// 플랜 상세 (screens/04-plan-detail.png) — 셸 이식(1차 증분). 탭 본문은 후속.
// 서버에서 plan(관계 포함) + portfolios를 읽어 UIPlan으로 매핑, 클라이언트 PlanDetail에 전달.
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { mapDbPlan, PLAN_SELECT, type DbPlanRow } from "@/lib/plan-mapper";
import { buildPlanFin, type DbFinRow } from "@/lib/fin-mapper";
import { loadPriceCloses } from "@/lib/price-history-map";
import { pfColor, type PfLite } from "@/lib/pf-palette";
import { PlanDetail } from "@/components/plan/detail-view";

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const { data: row } = await supabase
    .from("plans").select(PLAN_SELECT).eq("id", id).is("deleted_at", null).maybeSingle();

  if (!row) notFound();

  const plan = mapDbPlan(row as unknown as DbPlanRow);

  // 포트폴리오 + 재무(security_financials) + 실 종가: ticker를 알아야 fetch하므로 plan 매핑 뒤 병렬로.
  const [{ data: pfRows }, { data: finRows }, closesMap] = await Promise.all([
    supabase.from("portfolios").select("id, name, sort").order("sort"),
    supabase.from("security_financials").select("*").eq("ticker", plan.ticker).order("fiscal_year"),
    loadPriceCloses([plan.ticker]),
  ]);
  plan.priceCloses = closesMap[plan.ticker]; // 있으면 PerfBand가 실 시세 경로, 없으면 mock 폴백

  const portfolios: PfLite[] = (pfRows ?? []).map((p, i) => ({ id: p.id, name: p.name, color: pfColor(i) }));
  // DB 우선·시드 폴백 — DART sync 시 자동 실데이터화 (lib/fin-mapper).
  const fin = buildPlanFin(
    plan.ticker, plan.cur, (finRows ?? []) as unknown as DbFinRow[],
    plan.currentPrice, plan.eps, plan.sharesOut,
  );

  return <PlanDetail plan={plan} portfolios={portfolios} fin={fin} />;
}
