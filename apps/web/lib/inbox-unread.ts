// 서버측 인박스 안읽음 카운트 (사이드바 배지) — server-only.
// 인박스 페이지와 동일한 파생: 규칙 발동 동기화 → buildInboxNotes → triage(muted/resolved/read) 제외.
// ⚠️ 카운트는 lang 독립: buildInboxNotes의 노트 집합(규칙 last 필터 + scenarioAlerts 가격 임계)과
//    triage note_key 모두 언어 무관(lang은 표시 문자열에만 영향) → "en" 고정으로 계산해도 정확.
// inbox/page.tsx와 같은 syncRuleFirings를 호출하므로, 배지가 새 발동을 즉시 반영한다(레이아웃 렌더 시점).
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@keystone/core/types";
import { mapDbPlan, PLAN_SELECT, type DbPlanRow } from "./plan-mapper";
import { syncRuleFirings } from "./rule-worker";
import { buildInboxNotes } from "./inbox";

/** 사이드바 인박스 배지용 안읽음 수. 발동 동기화 포함(inbox/page.tsx와 동일 기준). */
export async function computeInboxUnread(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const [{ data: rows }, triageRes] = await Promise.all([
    supabase.from("plans").select(PLAN_SELECT).is("deleted_at", null).order("updated_at", { ascending: false }),
    supabase.from("inbox_triage").select("note_key, read_at, resolved_at, muted_at"),
  ]);

  const now = new Date();
  const plans = ((rows ?? []) as unknown as DbPlanRow[]).map((r) => mapDbPlan(r, now));

  // 규칙 발동 동기화(새 fired → rules.last_fired + notifications, plans 인메모리 갱신).
  await syncRuleFirings(supabase, userId, plans);

  // buildInboxNotes는 sync 이후 실행 → 이번에 새로 발동한 규칙도 포함.
  const notes = buildInboxNotes(plans, "en");

  const triage = triageRes.data ?? [];
  const muted = new Set(triage.filter((r) => r.muted_at).map((r) => r.note_key));
  const resolved = new Set(triage.filter((r) => r.resolved_at).map((r) => r.note_key));
  const read = new Set(triage.filter((r) => r.read_at).map((r) => r.note_key));

  // inbox-screen.tsx unreadCount와 동일 식: 음소거·처리완료·읽음 제외.
  return notes.filter((n) => !muted.has(n.id) && !resolved.has(n.id) && !read.has(n.id)).length;
}
