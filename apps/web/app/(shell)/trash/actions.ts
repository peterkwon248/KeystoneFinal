"use server";
// 휴지통 서버액션 — 복구(soft-restore: deleted_at null화) / 영구삭제(hard delete). plans/[id]/actions.ts 패턴.
import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function restorePlan(dbId: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from("plans").update({ deleted_at: null }).eq("id", dbId);
  if (error) throw new Error(error.message);
  revalidatePath("/trash");
  revalidatePath("/plans");
}

export async function deleteForeverPlan(dbId: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from("plans").delete().eq("id", dbId); // 하드 삭제
  if (error) throw new Error(error.message);
  revalidatePath("/trash");
}
