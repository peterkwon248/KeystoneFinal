// 궤적/성과밴드용 실 종가 로더 (마일스톤 6 — trajectory mock seam 교체).
// security_price_history에서 궤적 창(Sep 전년~Jun) 이후 종가를 티커별로 모아 반환.
// planTrajectory(plan, closes)에 넘기면 seededWalk mock 대신 실 시세 경로를 그린다.
import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { PriceClose } from "@/lib/trajectory";

// 궤적 창 시작 앵커 — planTrajectory의 REF_YEAR(2026) 프레임과 동일(Sep 2025~Jun 2026).
// 날짜 앵커 실제화(→ now())는 별도 태스크. 시작 이전 여유분(백필 forward-fill용)로 넉넉히 잡음.
const WINDOW_START = "2025-08-01";

/** 티커 배열 → {ticker: 오름차순 종가[]}. 배치 IN 쿼리 + max_rows 페이지네이션. */
export async function loadPriceCloses(tickers: string[]): Promise<Record<string, PriceClose[]>> {
  const out: Record<string, PriceClose[]> = {};
  const uniq = [...new Set(tickers.filter(Boolean))];
  if (!uniq.length) return out;

  const supabase = await supabaseServer();
  const PAGE = 1000;
  const rows: { ticker: string; date: string; close: number }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("security_price_history")
      .select("ticker, date, close")
      .in("ticker", uniq)
      .gte("date", WINDOW_START)
      .order("date", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const page = (data ?? []) as { ticker: string; date: string; close: number }[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  // 전역 오름차순 → 티커별 그룹핑도 오름차순 유지(closeAt 이진탐색 전제).
  for (const r of rows) (out[r.ticker] ??= []).push({ date: r.date, close: Number(r.close) });
  return out;
}

/** 플랜 배열의 ticker들을 배치 조회해 각 플랜에 priceCloses를 부착(제자리). 리스트 페이지용. */
export async function attachPriceCloses<T extends { ticker: string; priceCloses?: PriceClose[] }>(plans: T[]): Promise<T[]> {
  if (!plans.length) return plans;
  const map = await loadPriceCloses(plans.map((p) => p.ticker));
  for (const p of plans) p.priceCloses = map[p.ticker];
  return plans;
}
