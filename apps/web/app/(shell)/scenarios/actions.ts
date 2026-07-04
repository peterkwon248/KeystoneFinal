"use server";
// adhoc(종목단독) 시나리오 서버액션 — plan_id 없이 ticker+user_id 로 insert(S2 스키마).
// 프로토타입 SECURITY_SCENARIOS 부활. plan-scoped 는 plans/[id]/actions.ts addPlanScenario 참조.
// label/color 는 case_t 로부터 재구성(addPlanScenario 와 동일 매핑). status default 'pending'.
// supabase-js 빌더는 lazy thenable 이라 반드시 await. RLS(plan_id null → user_id 본인)로 소유자만.
import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type AddSecurityScenarioInput = {
  ticker: string;
  caseT: "bull" | "base" | "bear";
  target: number;
  thesis: string;
};

export async function addSecurityScenario(input: AddSecurityScenarioInput) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const caseLabel = {
    bull: { en: "Bull", ko: "상단" },
    base: { en: "Base", ko: "중간" },
    bear: { en: "Bear", ko: "하단" },
  }[input.caseT];
  const color = { bull: "var(--r-bull)", base: "var(--r-base)", bear: "var(--r-bear)" }[input.caseT];

  const { error } = await supabase.from("scenarios").insert({
    plan_id: null,
    ticker: input.ticker,
    user_id: user.id,
    case_t: input.caseT,
    label: caseLabel,
    target: input.target,
    thesis: input.thesis ? { en: input.thesis, ko: input.thesis } : null,
    status: "pending",
    color,
    is_auto: false,
    sort: 999,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/scenarios");
  revalidatePath(`/securities/${input.ticker}`);
}
