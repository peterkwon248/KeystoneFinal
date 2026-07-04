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

// ---- 종목 메모(journal_entries, plan_id=null·ticker 스코프) CRUD ----
// 원본 SecurityView.jsx(282-310)의 secNotes. 전용 notes 테이블 없이 journal_entries를 공유 →
// "일지에도 함께 모입니다"(같은 테이블). RLS user_id=auth.uid(). supabase-js 빌더는 lazy thenable → 반드시 await.

/** 종목 메모 추가. price_snapshot = 작성 시점 현재가(securities.last_close). body 트림 후 저장. */
export async function addSecNote(ticker: string, body: string): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) return;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  // 작성 시점 주가 스냅샷(실앱은 실시세). securities.last_close에서 읽는다.
  const { data: secRow } = await supabase
    .from("securities").select("last_close").eq("ticker", ticker).maybeSingle();
  const price = secRow?.last_close != null ? Number(secRow.last_close) : null;

  const { error } = await supabase.from("journal_entries").insert({
    user_id: user.id,
    plan_id: null,
    ticker,
    body: trimmed,
    price_snapshot: price,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/securities/${ticker}`);
}

/** 종목 메모 수정. 소유자 메모만(RLS + user_id 일치). */
export async function editSecNote(id: string, body: string): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) return;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data: updated, error } = await supabase
    .from("journal_entries")
    .update({ body: trimmed })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("ticker")
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (updated?.ticker) revalidatePath(`/securities/${updated.ticker}`);
}

/** 종목 메모 삭제. 소유자 메모만. */
export async function deleteSecNote(id: string): Promise<void> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data: removed, error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("ticker")
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (removed?.ticker) revalidatePath(`/securities/${removed.ticker}`);
}
