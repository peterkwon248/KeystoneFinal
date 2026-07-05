// service_role 클라이언트 — 참조 데이터(securities/security_financials) 쓰기는
// RLS상 service_role 전용 (DATA_MODEL §7)
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@keystone/core/types";
import { env } from "./env.js";

export function serviceDb() {
  return createClient<Database>(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { persistSession: false },
  });
}

export type FinancialRow = Database["public"]["Tables"]["security_financials"]["Insert"];
export type PriceHistoryRow = Database["public"]["Tables"]["security_price_history"]["Insert"];

/** 정규화된 일봉 (OHLCV 어댑터 공통 반환형). ticker/source는 sync 단계에서 부착. */
export interface PriceBar {
  date: string; // YYYY-MM-DD
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
}
