// 규칙 발동 워커 (마일스톤 6 — Phase C 알림) — server-only.
// 유저 플랜의 활성 규칙을 evalRuleV2로 평가해, 새로 "fired"된 규칙을 감지하면
//   ① rules.last_fired 세팅(→ 기존 인박스 buildInboxNotes가 자동 표시)
//   ② notifications insert(영속 기록: 크로스기기·이력·서버 unread 토대)
// 중복방지 = last_fired 게이트: 이미 발동 기록(last≠"Never")인 규칙은 건너뛴다(재발동은 후속).
// 시세가 정적(실시간 스트리밍 없음)이라 인박스 로드 시 호출로 충분.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@keystone/core/types";
import type { UIPlan } from "./plan-mapper";
import { toMonD } from "./plan-mapper";
import { evalRuleV2 } from "./rule-eval-v2";
import { refNow } from "./clock";

type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

/** 유저 플랜들의 규칙을 평가해 새 발동을 동기화. plans의 rule.last를 인메모리로도 갱신해
 *  이번 렌더에 즉시 반영한다. 반환 = 이번에 새로 발동한 규칙 수. */
export async function syncRuleFirings(
  supabase: SupabaseClient<Database>,
  userId: string,
  plans: UIPlan[],
): Promise<number> {
  // 앱 canonical 'now'(KS_REF, clock.ts) — 프레임 일관성(fmtDate 연도 추론·ibxBucket과 동일 기준).
  const nowIso = refNow().toISOString();
  const nowMonD = toMonD(nowIso);
  const firedRuleIds: string[] = [];
  const notifications: NotificationInsert[] = [];

  for (const plan of plans) {
    for (const rule of plan.rules || []) {
      if (!rule.on || !rule.trig) continue;
      if (rule.last && rule.last !== "Never") continue; // 이미 발동 기록 → 중복방지
      let res: ReturnType<typeof evalRuleV2>;
      try {
        res = evalRuleV2(plan, rule, false);
      } catch {
        continue; // 평가 불가 규칙은 조용히 스킵
      }
      if (res.state !== "fired") continue;
      const metaEn = res.meta;
      const metaKo = (() => { try { return evalRuleV2(plan, rule, true).meta; } catch { return res.meta; } })();
      notifications.push({
        user_id: userId,
        plan_id: plan.dbId,
        rule_id: rule.id,
        ticker: plan.ticker,
        kind: "rule_fired",
        title: rule.name as unknown as NotificationInsert["title"],
        body: { en: metaEn, ko: metaKo } as unknown as NotificationInsert["body"],
        payload: { state: res.state, price: plan.currentPrice, meta: metaEn } as unknown as NotificationInsert["payload"],
      });
      firedRuleIds.push(rule.id);
      rule.last = nowMonD; // 인메모리 반영 → 이번 buildInboxNotes에 즉시 노출
    }
  }

  if (firedRuleIds.length) {
    // last_fired 먼저 세팅(중복방지 게이트) → 성공 시 notifications insert.
    const { error: upErr } = await supabase.from("rules").update({ last_fired: nowIso }).in("id", firedRuleIds);
    if (upErr) return 0;
    if (notifications.length) await supabase.from("notifications").insert(notifications);
  }
  return firedRuleIds.length;
}
