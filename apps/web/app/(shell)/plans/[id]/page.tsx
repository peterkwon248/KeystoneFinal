// 플랜 상세 자리 — screens/04-plan-detail.png (DetailView) 이식은 다음 단계.
// 리스트에서 클릭 시 404가 나지 않도록 하는 최소 라우트.
import { supabaseServer } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: plan } = await supabase
    .from("plans")
    .select("human_id, name, ticker, status")
    .eq("id", id)
    .maybeSingle();
  if (!plan) notFound();
  const nm = plan.name as { en: string; ko: string };
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px" }}>
      <h1 style={{ font: "var(--fw-semi) 16px var(--font-sans)", color: "var(--fg)", margin: "0 0 8px" }}>
        {plan.human_id ?? "—"} · {nm.ko}
      </h1>
      <div style={{ color: "var(--fg-3)", font: "var(--fw-regular) 13px var(--font-sans)" }}>
        {plan.ticker} · {plan.status}
      </div>
      <div style={{ color: "var(--fg-4)", font: "var(--fw-regular) 11.5px var(--font-sans)", marginTop: 24 }}>
        * screens/04-plan-detail.png 기준 DetailView 이식 예정
      </div>
    </div>
  );
}
