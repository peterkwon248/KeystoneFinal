"use server";
// 종목 관심(관심종목) 토글 — watchlist upsert/delete. supabase-js 빌더는 lazy thenable 이라 반드시 await.
// RLS로 소유자(user_id)만. 낙관적 UI는 클라이언트가, 영속은 여기가 담당.
import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/** watchlist에 (user_id,ticker)가 있으면 delete, 없으면 insert. 반환 = 토글 후 watched 상태. */
export async function toggleWatch(ticker: string): Promise<boolean> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data: existing, error: readErr } = await supabase
    .from("watchlist")
    .select("id")
    .eq("user_id", user.id)
    .eq("ticker", ticker)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);

  let watched: boolean;
  if (existing) {
    const { error } = await supabase.from("watchlist").delete().eq("id", existing.id);
    if (error) throw new Error(error.message);
    watched = false;
  } else {
    const { error } = await supabase.from("watchlist").insert({ user_id: user.id, ticker });
    if (error) throw new Error(error.message);
    watched = true;
  }

  revalidatePath(`/securities/${ticker}`);
  return watched;
}
