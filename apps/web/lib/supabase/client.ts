// 브라우저용 Supabase 클라이언트 (anon key — RLS가 행 격리)
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@keystone/core/types";

export function supabaseBrowser() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
