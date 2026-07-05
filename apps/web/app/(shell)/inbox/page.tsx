// 인박스 (screens/01-inbox.png) — 트리아지 표면. 서버에서 plans(관계 포함)+portfolios 를 읽어
// UIPlan[] 로 매핑, 클라이언트 InboxScreen 에 전달. 알림 파생/트리아지 상태는 클라이언트에서.
import { supabaseServer } from "@/lib/supabase/server";
import { mapDbPlan, PLAN_SELECT, type DbPlanRow } from "@/lib/plan-mapper";
import { pfColor, type PfLite } from "@/lib/pf-palette";
import { syncRuleFirings } from "@/lib/rule-worker";
import { InboxScreen } from "@/components/inbox/inbox-screen";

export default async function InboxPage() {
  const supabase = await supabaseServer();

  const [{ data: rows }, { data: pfRows }, { data: { user } }] = await Promise.all([
    supabase.from("plans").select(PLAN_SELECT).is("deleted_at", null).order("updated_at", { ascending: false }),
    supabase.from("portfolios").select("id, name, sort").order("sort"),
    supabase.auth.getUser(),
  ]);

  const now = new Date();
  const plans = ((rows ?? []) as unknown as DbPlanRow[]).map((r) => mapDbPlan(r, now));
  const portfolios: PfLite[] = (pfRows ?? []).map((p, i) => ({ id: p.id, name: p.name, color: pfColor(i) }));

  // 규칙 발동 동기화: 새로 fired된 규칙 → rules.last_fired + notifications. plans도 인메모리 갱신.
  if (user) await syncRuleFirings(supabase, user.id, plans);

  // 트리아지 상태 로드(옵션2: DB가 진실원). timestamp non-null인 note_key만 각 배열로.
  const triageRes = user
    ? await supabase.from("inbox_triage").select("note_key, read_at, resolved_at, muted_at")
    : null;
  const triageRows = triageRes?.data ?? [];
  const readKeys = triageRows.filter((r) => r.read_at).map((r) => r.note_key);
  const resolvedKeys = triageRows.filter((r) => r.resolved_at).map((r) => r.note_key);
  const mutedKeys = triageRows.filter((r) => r.muted_at).map((r) => r.note_key);

  return (
    <InboxScreen
      plans={plans}
      portfolios={portfolios}
      readKeys={readKeys}
      resolvedKeys={resolvedKeys}
      mutedKeys={mutedKeys}
    />
  );
}
