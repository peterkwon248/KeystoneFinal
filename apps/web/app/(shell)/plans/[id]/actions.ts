"use server";
// 플랜 상세 헤더 픽커(상태/포트폴리오/전략) 영속. supabase-js 빌더는 lazy thenable이므로 반드시 await.
import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { PlanStatus } from "@keystone/core/types";

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
