// 궤적/성과밴드용 실 종가 로더 (마일스톤 6 — trajectory mock seam 교체) — server-only 편의 래퍼.
// 실제 쿼리는 price-closes-query(클라이언트-세이프)에 있고, 여기선 요청 컨텍스트의 supabaseServer로 감싼다.
// 클라이언트에서 도달 가능한 모듈(securities-list 등)은 price-closes-query.fetchClosesWith를 직접 써야 한다.
import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { fetchClosesWith } from "@/lib/price-closes-query";
import type { PriceClose } from "@/lib/trajectory";

/** 티커 배열 → {ticker: 오름차순 종가[]}. 서버 클라이언트로 조회(server component/action 전용). */
export async function loadPriceCloses(tickers: string[]): Promise<Record<string, PriceClose[]>> {
  const uniq = [...new Set(tickers.filter(Boolean))];
  if (!uniq.length) return {};
  const supabase = await supabaseServer();
  return fetchClosesWith(supabase, uniq);
}

/** 플랜 배열의 ticker들을 배치 조회해 각 플랜에 priceCloses를 부착(제자리). 리스트 페이지용. */
export async function attachPriceCloses<T extends { ticker: string; priceCloses?: PriceClose[] }>(plans: T[]): Promise<T[]> {
  if (!plans.length) return plans;
  const map = await loadPriceCloses(plans.map((p) => p.ticker));
  for (const p of plans) p.priceCloses = map[p.ticker];
  return plans;
}
