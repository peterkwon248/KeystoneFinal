// 홈 — 마일스톤 7 1단계: DB 데이터 경로 증명용 최소 화면.
// (본격 뷰 이식은 screens/ 6장 기준으로 이후 단계에서 진행)
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { VerifyBanner } from "@/components/verify-banner";
import { KeystoneLogo } from "@/components/icons";
import { signOut } from "./actions";

export default async function HomePage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("onboarded, prefs, email_verified").eq("id", user.id).maybeSingle();
  if (!profile?.onboarded) redirect("/onboarding");

  const [{ data: portfolios }, { data: plans }] = await Promise.all([
    supabase.from("portfolios").select("id, name, base_currency").order("sort"),
    supabase
      .from("plans")
      .select("id, human_id, ticker, name, status, currency, securities(name, last_close)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const showVerify = !profile.email_verified && !user.email_confirmed_at;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)", color: "var(--fg)" }}>
      {showVerify && <VerifyBanner email={user.email ?? ""} />}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <KeystoneLogo size={22} />
          <span style={{ font: "var(--fw-semi) 17px var(--font-sans)" }}>Keystone</span>
          <span style={{ flex: 1 }} />
          <form action={signOut}>
            <button className="auth-tb-btn" type="submit">로그아웃</button>
          </form>
        </div>
        <div style={{ color: "var(--fg-3)", font: "var(--fw-regular) 13px var(--font-sans)", marginBottom: 32 }}>
          {user.email} · 웹 이식(마일스톤 7) 진행 중 — 아래는 DB 실데이터입니다
        </div>

        <h2 style={{ font: "var(--fw-semi) 14px var(--font-sans)", color: "var(--fg-2)", margin: "0 0 10px" }}>
          포트폴리오 {portfolios?.length ?? 0}
        </h2>
        {portfolios?.map((pf) => (
          <div key={pf.id} style={{ padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 8, font: "var(--fw-medium) 13.5px var(--font-sans)" }}>
            {pf.name} <span style={{ color: "var(--fg-4)", marginLeft: 8 }}>{pf.base_currency}</span>
          </div>
        ))}

        <h2 style={{ font: "var(--fw-semi) 14px var(--font-sans)", color: "var(--fg-2)", margin: "28px 0 10px" }}>
          플랜 {plans?.length ?? 0}
        </h2>
        {(plans ?? []).map((p) => {
          const nm = p.name as { en: string; ko: string };
          const sec = p.securities as { name: unknown; last_close: number | null } | null;
          const secName = sec?.name as { en: string; ko: string } | undefined;
          return (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 8 }}>
              <span style={{ font: "var(--fw-medium) 12px var(--font-mono)", color: "var(--fg-4)" }}>{p.human_id ?? "—"}</span>
              <span style={{ font: "var(--fw-medium) 13.5px var(--font-sans)" }}>{nm.ko}</span>
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
            아직 플랜이 없습니다 — 온보딩에서 건너뛰셨다면 곧 이식될 플랜 화면에서 만들 수 있어요.
          </div>
        )}

        <h2 style={{ font: "var(--fw-semi) 14px var(--font-sans)", color: "var(--fg-2)", margin: "28px 0 10px" }}>
          다음 이식 대상 (screens/ 6장)
        </h2>
        <div style={{ color: "var(--fg-4)", font: "var(--fw-regular) 12.5px var(--font-sans)", lineHeight: 1.7 }}>
          01 인박스 · 02 일지 · 03 플랜 리스트 · 04 플랜 상세 · 05 전략 편집기 · 06 청산 플로우
        </div>
      </div>
    </div>
  );
}
