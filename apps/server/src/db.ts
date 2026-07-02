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
