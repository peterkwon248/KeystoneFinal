// 스크리너 (screens/11-screener.png, list 레이아웃) — 프레임워크 렌즈로 종목 유니버스 스크리닝.
// 서버에서 securities 전체(watched 플래그 포함) + plans를 병렬로 읽어 UISecurity[]/UIPlan[]로 매핑,
// 클라이언트 ScreenerScreen에 전달.
// eps·perLo·perHi seam(마일스톤6 실데이터 교체): security_financials(실 재무) + 연간 종가를 배치 로드해
//   finByTicker(buildPlanFin) + closesByTicker(fetchAnnualClosesBatch)로 buildScored에 주입한다.
//   실 데이터 없는 종목은 buildScored 내부에서 SEC_SEED 폴백.
// static 라우트라 [dest] placeholder를 override한다(research/watchlist와 동일 방식).
import type { Fin } from "@keystone/core/types";
import { supabaseServer } from "@/lib/supabase/server";
import { mapDbPlan, PLAN_SELECT, type DbPlanRow } from "@/lib/plan-mapper";
import { fetchAllSecurities } from "@/lib/securities-list";
import { buildPlanFin, type DbFinRow } from "@/lib/fin-mapper";
import { fetchAnnualClosesBatch } from "@/lib/price-closes-query";
import { REF_YEAR } from "@/lib/clock";
import { SECURITY_FIN_SELECT } from "@/lib/security-mapper";
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

  // 실 재무(security_financials) + 실 연간 종가 배치 로드 — eps/PER 밴드 실측 소스(마일스톤6 seam).
  const tickers = securities.map((s) => s.ticker);
  const [{ data: finRows }, closesByTicker] = await Promise.all([
    supabase.from("security_financials").select(SECURITY_FIN_SELECT).in("ticker", tickers).order("fiscal_year"),
    fetchAnnualClosesBatch(supabase, tickers, REF_YEAR - 6),
  ]);

  // ticker → 재무 행 배열로 그룹핑 (SECURITY_FIN_SELECT에 ticker 포함 필요).
  const finByTickerRows: Record<string, DbFinRow[]> = {};
  for (const row of ((finRows ?? []) as unknown as (DbFinRow & { ticker: string })[])) {
    (finByTickerRows[row.ticker] ??= []).push(row);
  }

  // ticker → 실 Fin (buildPlanFin: DB 완전하면 실측, 아니면 합성 폴백). eps/px/sharesOut은 UISecurity에서.
  const finByTicker: Record<string, Fin | null> = {};
  for (const s of securities) {
    const rows = finByTickerRows[s.ticker] ?? [];
    finByTicker[s.ticker] = buildPlanFin(
      s.ticker, s.cur, rows, s.price, s.eps ?? 0, s.sharesOut,
    );
  }

  return <ScreenerScreen securities={securities} plans={plans} finByTicker={finByTicker} closesByTicker={closesByTicker} />;
}
