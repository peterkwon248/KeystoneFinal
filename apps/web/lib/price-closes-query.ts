// 실 종가 쿼리(클라이언트-세이프) — supabase 클라이언트를 인자로 받아 server-only에 의존하지 않는다.
// securities-list처럼 클라이언트 컴포넌트(search-modal)에서 import되는 모듈도 안전하게 쓸 수 있게 분리.
// price-history-map(server-only 래퍼)와 securities-list가 공유.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@keystone/core/types";
import type { PriceClose } from "@/lib/trajectory";

// 궤적 창 시작 앵커 — planTrajectory의 REF_YEAR(2026) 프레임(Sep 2025~Jun 2026). 여유분 포함.
// 날짜 앵커 실제화(→ now())는 별도 태스크.
export const CLOSES_WINDOW_START = "2025-08-01";

/** 티커 배열 → {ticker: 오름차순 종가[]}. 전달된 클라이언트로 배치 IN + max_rows 페이지네이션. */
export async function fetchClosesWith(
  supabase: SupabaseClient<Database>,
  tickers: string[],
): Promise<Record<string, PriceClose[]>> {
  const out: Record<string, PriceClose[]> = {};
  const uniq = [...new Set(tickers.filter(Boolean))];
  if (!uniq.length) return out;

  const PAGE = 1000;
  const rows: { ticker: string; date: string; close: number }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("security_price_history")
      .select("ticker, date, close")
      .in("ticker", uniq)
      .gte("date", CLOSES_WINDOW_START)
      .order("date", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const page = (data ?? []) as { ticker: string; date: string; close: number }[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  for (const r of rows) (out[r.ticker] ??= []).push({ date: r.date, close: Number(r.close) });
  return out;
}

/** 단일 티커의 연간 종가 = {연도(YYYY): 그 해 마지막 거래일 종가}. 멀티플 밴드 차트(fin-history)용. */
export async function fetchAnnualCloses(
  supabase: SupabaseClient<Database>,
  ticker: string,
  fromYear: number,
): Promise<Record<string, number>> {
  const from = `${fromYear}-01-01`;
  const PAGE = 1000;
  const rows: { date: string; close: number }[] = [];
  for (let f = 0; ; f += PAGE) {
    const { data, error } = await supabase
      .from("security_price_history")
      .select("date, close")
      .eq("ticker", ticker)
      .gte("date", from)
      .order("date", { ascending: true })
      .range(f, f + PAGE - 1);
    if (error) throw error;
    const page = (data ?? []) as { date: string; close: number }[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  const byYear: Record<string, number> = {};
  for (const r of rows) byYear[r.date.slice(0, 4)] = Number(r.close); // 오름차순 → 연도별 마지막이 최종
  return byYear;
}
