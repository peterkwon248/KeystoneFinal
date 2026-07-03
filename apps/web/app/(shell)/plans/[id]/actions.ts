"use server";
// 플랜 상세 헤더 픽커(상태/포트폴리오/전략) 영속. supabase-js 빌더는 lazy thenable이므로 반드시 await.
import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Json, PlanStatus } from "@keystone/core/types";
import type { UINote } from "@/lib/plan-mapper";

type PlanPatch = { status?: PlanStatus; portfolioId?: string | null; execId?: string | null };

export async function patchPlanAction(id: string, patch: PlanPatch) {
  const supabase = await supabaseServer();
  const row: { status?: PlanStatus; portfolio_id?: string | null; exec_id?: string | null } = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.portfolioId !== undefined) row.portfolio_id = patch.portfolioId;
  if (patch.execId !== undefined) row.exec_id = patch.execId;
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from("plans").update(row).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/plans/${id}`);
}

/** 전략 탭 목표(수익률/가격) 설정·삭제 — plans.custom_fields.goal 병합. RLS로 소유자만.
 *  supabase-js 빌더는 lazy thenable이라 read/update 모두 반드시 await. */
export type PlanGoal = { type: "return" | "price"; value: number };

export async function setGoalAction(id: string, goal: PlanGoal | null) {
  const supabase = await supabaseServer();
  // custom_fields는 jsonb 통째 컬럼 — 기존 값을 읽어 goal만 병합/삭제 후 되쓴다.
  const { data, error: readErr } = await supabase
    .from("plans").select("custom_fields").eq("id", id).single();
  if (readErr) throw new Error(readErr.message);
  const cf: { [k: string]: Json } = { ...((data?.custom_fields as { [k: string]: Json } | null) ?? {}) };
  if (goal) cf.goal = goal; else delete cf.goal;
  const { error } = await supabase.from("plans").update({ custom_fields: cf }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/plans/${id}`);
}

/** 사이드바 메모(투자 일지) 영속 — plans.custom_fields.notes 병합 update. setGoalAction 패턴.
 *  supabase-js 빌더는 lazy thenable 이라 read/update 모두 반드시 await. RLS 로 소유자만. */
export async function patchNotesAction(id: string, notes: UINote[]) {
  const supabase = await supabaseServer();
  const { data, error: readErr } = await supabase
    .from("plans").select("custom_fields").eq("id", id).single();
  if (readErr) throw new Error(readErr.message);
  const cf: { [k: string]: Json } = { ...((data?.custom_fields as { [k: string]: Json } | null) ?? {}) };
  cf.notes = notes as unknown as Json;
  const { error } = await supabase.from("plans").update({ custom_fields: cf }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/plans/${id}`);
}

/** 인박스 트리아지 매수/매도 체결 기록 — executions insert. RLS로 소유 플랜만.
 *  상태 자동전이(active/closing)는 DB 트리거(t_exec_activate/t_exec_close)가 처리 → insert만.
 *  supabase-js 빌더는 lazy thenable 이라 반드시 await. exec_date는 오늘(ISO date). */
export type ExecInput = { side: "buy" | "sell"; price: number; quantity: number };

export async function addExecutionAction(planId: string, input: ExecInput) {
  const supabase = await supabaseServer();
  const execDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const { error } = await supabase.from("executions").insert({
    plan_id: planId,
    side: input.side,
    price: input.price,
    quantity: input.quantity,
    exec_date: execDate,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/plans/${planId}`);
  revalidatePath("/inbox");
}

/** 전략 탭 규칙 활성/비활성 토글 — rules.enabled. RLS로 소유 플랜의 규칙만. */
export async function toggleRuleAction(id: string, ruleId: string, enabled: boolean) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from("rules").update({ enabled }).eq("id", ruleId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plans/${id}`);
}

/** 밸류에이션 탭 "시나리오에 적용" — 슬롯 적정가(하단·중간·상단)를 각 시나리오 target에 기록.
 *  시나리오는 case_t('bull'|'base'|'bear')로 키잉된다(프로토타입 applyFairTargets의 라벨 매핑과 동치).
 *  base target 을 갱신하면 plan-mapper 가 iv 를 base.target 에서 파생하므로 iv 는 자동 반영 — 별도 필드 없음.
 *  supabase-js 빌더는 lazy thenable 이라 각 update 를 반드시 await. RLS 로 소유 플랜만. */
export async function applyValuationTargetsAction(
  planId: string,
  targets: { bull: number; base: number; bear: number },
) {
  const supabase = await supabaseServer();
  const cases: ("bull" | "base" | "bear")[] = ["bull", "base", "bear"];
  for (const c of cases) {
    const target = targets[c];
    if (!(target > 0)) continue;
    const { error } = await supabase
      .from("scenarios").update({ target }).eq("plan_id", planId).eq("case_t", c);
    if (error) throw new Error(error.message);
  }
  revalidatePath(`/plans/${planId}`);
}
