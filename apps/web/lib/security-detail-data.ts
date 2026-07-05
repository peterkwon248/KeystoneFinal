// 종목 상세 데이터 로더 — 페이지(securities/[ticker]/page)와 SecurityPeek 서버액션이 공유.
// page.tsx의 fetch/매핑을 그대로 옮김(중복 제거). notFound()는 호출부가 처리(여기선 null 반환).
import { supabaseServer } from "@/lib/supabase/server";
import { mapDbPlan, PLAN_SELECT, type DbPlanRow } from "@/lib/plan-mapper";
import { buildPlanFin, type DbFinRow } from "@/lib/fin-mapper";
import { fetchClosesWith } from "@/lib/price-closes-query";
import {
  mapSecurity, secPlanOf, SECURITY_SELECT, SECURITY_FIN_SELECT,
  type DbSecurityRow, type DbSecurityFinRow, type DbSecNoteRow, type SecNote,
} from "@/lib/security-mapper";
import type { UIPlan } from "@/lib/plan-mapper";
import type { UISecurity } from "@/lib/security-mapper";
import type { Fin } from "@keystone/core/types";
import type { SecScenario } from "@/components/securities/security-detail";

export interface SecurityDetailData {
  security: UISecurity;
  secPlan: UIPlan;
  fin: Fin | null;
  plans: UIPlan[];
  secNotes: SecNote[];
  secScenarios: SecScenario[];
}

export async function loadSecurityDetail(ticker: string): Promise<SecurityDetailData | null> {
  const supabase = await supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: secRow } = await supabase
    .from("securities").select(SECURITY_SELECT).eq("ticker", ticker).maybeSingle();
  if (!secRow) return null;

  // 재무(security_financials) + 관심 여부 + 관련 플랜 + 종목 메모(journal_entries) + adhoc 시나리오를 병렬로.
  const [{ data: finRows }, watchRes, { data: planRows }, noteRes, scenRes] = await Promise.all([
    supabase.from("security_financials").select(SECURITY_FIN_SELECT).eq("ticker", ticker).order("fiscal_year", { ascending: false }),
    user
      ? supabase.from("watchlist").select("id").eq("user_id", user.id).eq("ticker", ticker).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("plans").select(PLAN_SELECT).is("deleted_at", null).order("updated_at", { ascending: false }),
    // 종목 메모: 이 종목 스코프(plan_id=null, ticker) — RLS로 소유자 것만. 최신순.
    user
      ? supabase.from("journal_entries")
          .select("id,body,price_snapshot,created_at")
          .eq("ticker", ticker).is("plan_id", null)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
    // adhoc(종목단독) 시나리오: plan_id=null, ticker 스코프 — RLS로 소유자 것만(S2).
    user
      ? supabase.from("scenarios")
          .select("id,label,case_t,color,target,thesis")
          .eq("ticker", ticker).is("plan_id", null)
          .order("sort", { ascending: true })
      : Promise.resolve({ data: null }),
  ]);

  const watched = !!(watchRes as { data: unknown }).data;

  const now = new Date();
  const allPlans = ((planRows ?? []) as unknown as DbPlanRow[]).map((r) => mapDbPlan(r, now));
  // 이 종목의 플랜만 남겨 payload를 가볍게 — SecurityDetailScreen은 plans.filter(p => p.ticker === s.ticker)만 사용.
  const plans = allPlans.filter((p) => p.ticker === ticker);

  // eps는 security_financials에 컬럼이 없어(마일스톤6) 같은 ticker 플랜에서 유도 — 현재 유일한 실 출처.
  // 여러 플랜이면 첫(최신 updated_at) 것. 플랜 없는 종목은 null 폴백(진짜 데이터 없음 — 문서화된 seam).
  const epsFromPlan = plans.find((p) => p.ticker === ticker && p.eps > 0)?.eps ?? null;

  const closesMap = await fetchClosesWith(supabase, [ticker]); // 실 스파크·등락률(없으면 mock 폴백)
  const security = mapSecurity(
    secRow as unknown as DbSecurityRow,
    (finRows ?? []) as unknown as DbSecurityFinRow[],
    watched,
    epsFromPlan,
    closesMap[ticker],
  );
  const secPlan = secPlanOf(security);

  // 종목 메모(journal_entries 공유) → UI가 읽는 형태. 상대시간/날짜는 클라이언트에서 포맷.
  const secNotes: SecNote[] = ((noteRes as { data: DbSecNoteRow[] | null }).data ?? []).map((n) => ({
    id: n.id,
    body: n.body,
    price: n.price_snapshot != null ? Number(n.price_snapshot) : null,
    createdAt: n.created_at,
  }));

  // DB 우선·시드 폴백 — plans/[id] page.tsx와 동일 산식(lib/fin-mapper). eps는 플랜 유도값(없으면 0).
  const fin = buildPlanFin(
    security.ticker, security.cur, (finRows ?? []) as unknown as DbFinRow[],
    security.price, security.eps ?? 0, security.sharesOut,
  );

  // adhoc 시나리오(secScenarios) → SecScenario[]. status pending→tracking 불필요(표시엔 label/target만).
  const scenRows = (scenRes as { data: DbSecScenarioRow[] | null }).data ?? [];
  const secScenarios: SecScenario[] = scenRows.map((r) => ({
    dbId: r.id,
    caseT: r.case_t,
    label: r.label ?? { en: "Base", ko: "중간" },
    color: r.color || "var(--r-base)",
    target: Number(r.target),
    thesis: r.thesis ?? undefined,
  }));

  return { security, secPlan, fin, plans, secNotes, secScenarios };
}

interface DbSecScenarioRow {
  id: string;
  label: { en: string; ko: string } | null;
  case_t: "bull" | "base" | "bear";
  color: string | null;
  target: number;
  thesis: { en: string; ko: string } | null;
}
