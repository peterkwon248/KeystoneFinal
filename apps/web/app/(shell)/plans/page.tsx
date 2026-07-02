// 플랜 리스트 자리 — 마일스톤 7 데이터 경로 검증판.
// screens/03-plans.png 기준의 본격 ListView/BoardView 이식은 다음 단계.
import { supabaseServer } from "@/lib/supabase/server";

export default async function PlansPage({ searchParams }: {
  searchParams: Promise<{ pf?: string }>;
}) {
  const { pf } = await searchParams;
  const supabase = await supabaseServer();

  let q = supabase
    .from("plans")
    .select("id, human_id, ticker, name, status, currency, portfolio_id, securities(name, last_close)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (pf) q = q.eq("portfolio_id", pf);
  const { data: plans } = await q;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px" }}>
      <h1 style={{ font: "var(--fw-semi) 16px var(--font-sans)", color: "var(--fg)", margin: "0 0 16px" }}>
        플랜 {plans?.length ?? 0}{pf ? " · 포트폴리오 필터" : ""}
      </h1>
      {(plans ?? []).map((p) => {
        const nm = p.name as { en: string; ko: string };
        const sec = p.securities as { name: unknown; last_close: number | null } | null;
        return (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 8 }}>
            <span style={{ font: "var(--fw-medium) 12px var(--font-mono)", color: "var(--fg-4)" }}>{p.human_id ?? "—"}</span>
            <span style={{ font: "var(--fw-medium) 13.5px var(--font-sans)", color: "var(--fg)" }}>{nm.ko}</span>
            <span style={{ color: "var(--fg-3)", font: "var(--fw-regular) 12.5px var(--font-mono)" }}>{p.ticker}</span>
            <span style={{ flex: 1 }} />
            <span style={{ color: "var(--fg-3)", font: "var(--fw-regular) 12.5px var(--font-mono)" }}>
              {sec?.last_close != null ? `${p.currency === "KRW" ? "₩" : "$"}${Number(sec.last_close).toLocaleString()}` : "—"}
            </span>
            <span style={{ font: "var(--fw-medium) 11.5px var(--font-sans)", color: "var(--accent)", background: "var(--accent-soft)", padding: "2px 8px", borderRadius: 99 }}>
              {p.status}
            </span>
          </div>
        );
      })}
      {!plans?.length && (
        <div style={{ color: "var(--fg-4)", font: "var(--fw-regular) 13px var(--font-sans)", padding: "18px 0" }}>
          아직 플랜이 없습니다.
        </div>
      )}
      <div style={{ color: "var(--fg-4)", font: "var(--fw-regular) 11.5px var(--font-sans)", marginTop: 24 }}>
        * screens/03-plans.png 기준 ListView 이식 예정 — 지금은 데이터 경로 검증판
      </div>
    </div>
  );
}
