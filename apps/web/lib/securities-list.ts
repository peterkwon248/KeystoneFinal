// securities 리스트 페치 도우미 — 관심종목/리서치/스크리너가 공용으로 쓰는 종목 목록 이음새.
// watchlist(user_id) join securities → mapSecurity(row, [], watched=true)로 UISecurity[] 산출.
// 관심종목은 eps/재무를 안 쓰므로 financials는 빈 배열(mapSecurity가 eps=null 폴백).
// ARCHITECTURE §7: 뷰/계산은 그대로 — 데이터 소스만 교체하는 이음새.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@keystone/core/types";
import {
  mapSecurity, SECURITY_SELECT,
  type DbSecurityRow, type UISecurity,
} from "@/lib/security-mapper";
import { fetchClosesWith } from "@/lib/price-closes-query";

/**
 * securities 전체 + 유저 watchlist로 watched 플래그 세팅 (리서치 화면용).
 * financials 없이(빈 배열) 매핑 — 리서치 리스트도 eps 미사용. ticker asc 정렬.
 */
export async function fetchAllSecurities(
  supabase: SupabaseClient<Database>,
  userId: string | null,
): Promise<UISecurity[]> {
  const [secRes, watchRes] = await Promise.all([
    supabase.from("securities").select(SECURITY_SELECT).order("ticker", { ascending: true }),
    userId ? supabase.from("watchlist").select("ticker").eq("user_id", userId) : Promise.resolve({ data: [] as { ticker: string }[] }),
  ]);
  const watched = new Set(((watchRes.data ?? []) as { ticker: string }[]).map((r) => r.ticker));
  const rows = (secRes.data ?? []) as unknown as DbSecurityRow[];
  const closesMap = await fetchClosesWith(supabase, rows.map((r) => r.ticker)); // 실 스파크·등락률(없으면 mock 폴백)
  return rows.map((r) => mapSecurity(r, [], watched.has(r.ticker), null, closesMap[r.ticker]));
}

/** watchlist join securities select 절 — securities 컬럼은 SECURITY_SELECT와 동형(중첩 관계). */
export const SECURITIES_LIST_SELECT = `ticker, sort, securities:securities!inner ( ${SECURITY_SELECT} )`;

/** watchlist 한 행 + 조인된 securities(중첩) — SECURITIES_LIST_SELECT와 짝. */
interface WatchlistJoinRow {
  ticker: string;
  sort: number | null;
  securities: DbSecurityRow;
}

/**
 * 유저의 관심종목 → UISecurity[](watched=true). sort asc 정렬.
 * financials 없이(빈 배열) 매핑 — 관심종목 리스트는 eps/재무를 안 쓴다.
 * @returns 조인된 securities 행이 없으면(정합성 깨진 경우) 스킵.
 */
export async function fetchWatchedSecurities(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<UISecurity[]> {
  const { data } = await supabase
    .from("watchlist")
    .select(SECURITIES_LIST_SELECT)
    .eq("user_id", userId)
    .order("sort", { ascending: true });

  const rows = (data ?? []) as unknown as WatchlistJoinRow[];
  const present = rows.filter((r) => r.securities != null);
  const closesMap = await fetchClosesWith(supabase, present.map((r) => r.securities.ticker));
  return present.map((r) => mapSecurity(r.securities, [], true, null, closesMap[r.securities.ticker]));
}
