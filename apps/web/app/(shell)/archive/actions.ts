"use server";
// 보관함 서버액션 — 보관 복구(archived_at null화). archivePlan(보관)은 plans/[id]/actions.ts에 co-located.
// supabase-js 빌더는 lazy thenable 이라 반드시 await. RLS 로 소유자만.
import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/** 보관 해제(복구) — archived_at=null. 플랜은 원래 상태 그대로 메인 리스트로 돌아온다. */
export async function restorePlanFromArchive(dbId: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from("plans").update({ archived_at: null }).eq("id", dbId);
  if (error) throw new Error(error.message);
  revalidatePath("/archive");
  revalidatePath("/plans");
}
