// 앱 셸 레이아웃 (인증 필수 구간) — 사이드바 데이터 로딩 + 가드
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/app-shell";
import { VerifyBanner } from "@/components/verify-banner";
import { computeInboxUnread } from "@/lib/inbox-unread";
import { signOut } from "@/app/actions";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("onboarded, email_verified, sidebar").eq("id", user.id).maybeSingle();
  if (!profile?.onboarded) redirect("/onboarding");

  const [{ data: portfolios }, { data: plans }, { data: views }] = await Promise.all([
    supabase.from("portfolios").select("id, name, sort").order("sort"),
    supabase.from("plans").select("id, status, portfolio_id").is("deleted_at", null),
    supabase.from("saved_views").select("id, name").eq("scope", "plans").order("sort"),
  ]);

  const plansList = plans ?? [];
  const sbPortfolios = (portfolios ?? []).map((pf) => ({
    id: pf.id,
    name: pf.name,
    count: plansList.filter((p) => p.portfolio_id === pf.id).length,
  }));

  // 사이드바 인박스 배지 — 서버측 안읽음 카운트(규칙 발동 동기화 포함).
  const inboxUnread = await computeInboxUnread(supabase, user.id);

  const showVerify = !profile.email_verified && !user.email_confirmed_at;

  return (
    <AppShell
      userId={user.id}
      sidebarPrefs={profile.sidebar}
      portfolios={sbPortfolios}
      plansTotal={plansList.length}
      activeCount={plansList.filter((p) => p.status === "active").length}
      inboxUnread={inboxUnread}
      views={views ?? []}
      banner={showVerify ? <VerifyBanner email={user.email ?? ""} /> : undefined}
      signOutAction={signOut}
    >
      {children}
    </AppShell>
  );
}
