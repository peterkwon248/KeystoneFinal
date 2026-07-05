"use server";
// 인박스 트리아지 영속 — read/resolved/muted 상태를 inbox_triage 테이블에 upsert(옵션2: 기기간 동기화).
// note_key는 인박스 노트 복합키({planId}:{ruleId} / {planId}:scn:{id}). user_id는 세션에서.
// supabase-js 빌더는 lazy thenable 이므로 반드시 await. RLS(user_id=auth.uid())로 본인 행만.
import { supabaseServer } from "@/lib/supabase/server";
import type { Database } from "@keystone/core/types";

type TriageField = "read" | "resolved" | "muted";
type TriageRow = Database["public"]["Tables"]["inbox_triage"]["Insert"];

/** 단일 노트의 트리아지 플래그 토글 — 해당 timestamp 컬럼을 on ? now() : null 로 upsert.
 *  onConflict(user_id,note_key)로 기존 행은 갱신, 없으면 삽입. */
export async function setTriage(noteKey: string, field: TriageField, on: boolean) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthenticated");
  const now = new Date().toISOString();
  const val = on ? now : null;
  const row: TriageRow = { user_id: user.id, note_key: noteKey, updated_at: now };
  if (field === "read") row.read_at = val;
  else if (field === "resolved") row.resolved_at = val;
  else row.muted_at = val;
  const { error } = await supabase.from("inbox_triage").upsert(row, { onConflict: "user_id,note_key" });
  if (error) throw new Error(error.message);
}

/** 마크올(모두 읽음) — 주어진 note_key 배치를 read_at=now() 로 upsert. */
export async function markAllRead(noteKeys: string[]) {
  if (!noteKeys.length) return;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthenticated");
  const now = new Date().toISOString();
  const rows = noteKeys.map((note_key) => ({ user_id: user.id, note_key, read_at: now, updated_at: now }));
  const { error } = await supabase.from("inbox_triage").upsert(rows, { onConflict: "user_id,note_key" });
  if (error) throw new Error(error.message);
}
