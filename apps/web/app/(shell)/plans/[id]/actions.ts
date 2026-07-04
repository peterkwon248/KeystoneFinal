"use server";
// 플랜 상세 헤더 픽커(상태/포트폴리오/전략) 영속. supabase-js 빌더는 lazy thenable이므로 반드시 await.
import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Json, PlanStatus } from "@keystone/core/types";
import type { UINote } from "@/lib/plan-mapper";
import { autoRulesFor } from "@/lib/rules-from-strategy";

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
  // 전략(execId) 변경 시 자동 규칙 재생성 (전략 없음↔무한매수법 등).
  if (patch.execId !== undefined) await regenerateAutoRules(id);
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
  // 목표 변경 → 목표 규칙 재생성(설정 시 추가·수정, 삭제 시 제거).
  await regenerateAutoRules(id);
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

/** 시나리오 탭 "새 시나리오" 저장 — scenarios insert. unique(plan_id,case_t) 제약 없음이라
 *  같은 case 로 여러 개 추가 가능(P5Scenarios ScenarioAuthor 저장 동치, plan-scoped 이므로 종목 선택 없음).
 *  label/color 는 case_t 로부터 재구성(plan-mapper SC_CASE 와 동일 매핑). status 는 스키마 default 'pending'.
 *  supabase-js 빌더는 lazy thenable 이라 반드시 await. RLS 로 소유 플랜만. */
export type AddScenarioInput = { caseT: "bull" | "base" | "bear"; target: number; thesis: string };

export async function addPlanScenario(planId: string, input: AddScenarioInput) {
  const supabase = await supabaseServer();
  const caseLabel = {
    bull: { en: "Bull", ko: "상단" },
    base: { en: "Base", ko: "중간" },
    bear: { en: "Bear", ko: "하단" },
  }[input.caseT];
  const color = { bull: "var(--r-bull)", base: "var(--r-base)", bear: "var(--r-bear)" }[input.caseT];
  const { error } = await supabase.from("scenarios").insert({
    plan_id: planId,
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
  revalidatePath(`/plans/${planId}`);
}

/** 플랜 보관(archive) — archived_at=now(). 청산(status)과 별개 축이라 상태는 건드리지 않는다.
 *  프로토타입 archivePlan은 status=closed였으나(방식1), 웹은 archived_at 분리(방식2)로 미실현 플랜도 보관 가능.
 *  supabase-js 빌더는 lazy thenable 이라 반드시 await. RLS 로 소유자만. */
export async function archivePlan(planId: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("plans").update({ archived_at: new Date().toISOString() }).eq("id", planId);
  if (error) throw new Error(error.message);
  revalidatePath("/plans");
  revalidatePath("/archive");
}

/** 플랜 소프트삭제(휴지통으로) — deleted_at=now(). 휴지통 뷰(restore/deleteForever)의 진입점.
 *  프로토타입 trashPlan 대응. supabase-js 빌더는 lazy thenable 이라 반드시 await. RLS 로 소유자만. */
export async function softDeletePlan(planId: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("plans").update({ deleted_at: new Date().toISOString() }).eq("id", planId);
  if (error) throw new Error(error.message);
  revalidatePath("/plans");
  revalidatePath("/trash");
}

/** 전략/목표 → 자동 규칙 재생성 (규칙 자동화 v1). (is_auto && !edited) 규칙만 교체 → 커스텀·편집분 보존.
 *  전략 변경·목표 설정·플랜 생성 시 호출. supabase-js 빌더는 lazy thenable 이라 반드시 await. RLS 로 소유 플랜만. */
export async function regenerateAutoRules(planId: string) {
  const supabase = await supabaseServer();
  const { data: plan, error: readErr } = await supabase
    .from("plans").select("exec_id, custom_fields").eq("id", planId).single();
  if (readErr) throw new Error(readErr.message);

  // custom_fields.goal → PlanGoal (setGoalAction 인코딩과 동일 가드).
  const cf = (plan?.custom_fields as { goal?: { type?: unknown; value?: unknown } } | null) ?? {};
  const g = cf.goal;
  const goal: PlanGoal | null =
    g && (g.type === "return" || g.type === "price") && typeof g.value === "number"
      ? { type: g.type, value: g.value } : null;

  const specs = autoRulesFor(plan?.exec_id ?? null, goal);

  // 기존 auto(미편집) 규칙 삭제 후 재삽입.
  const { error: delErr } = await supabase
    .from("rules").delete().eq("plan_id", planId).eq("is_auto", true).eq("edited", false);
  if (delErr) throw new Error(delErr.message);

  if (specs.length) {
    const { error: insErr } = await supabase.from("rules").insert(
      specs.map((s) => ({
        plan_id: planId, enabled: true,
        condition: s.condition as unknown as Json, action: s.action as unknown as Json,
        is_auto: true, edited: false, source: s.source,
      })),
    );
    if (insErr) throw new Error(insErr.message);
  }
  revalidatePath(`/plans/${planId}`);
}
