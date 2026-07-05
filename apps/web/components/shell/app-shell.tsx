// 앱 셸 — 사이드바 + 메인 프레임 (프로토타입 App.jsx의 .app 레이아웃 대응).
// 메뉴/설정 모달 상태와 사이드바 접기를 관리한다.
"use client";
import { useEffect, useState } from "react";
import { Sidebar, type SidebarPortfolio, type SidebarView } from "./sidebar";
import { WorkspaceMenu, SettingsModal } from "./workspace-menu";
import { CustomizeModal } from "./customize-modal";
import { PanelIcon } from "@/components/icons";
import { PrefsProvider } from "./prefs";
import { SidebarConfigProvider } from "./sidebar-config";
import { InboxBadgeProvider } from "./inbox-badge";
import { SearchModal } from "@/components/search/search-modal";
import { ComposeModal } from "@/components/plan/compose-modal";
import { SecurityPeekProvider } from "@/components/securities/security-peek";
import { LiveQuotesProvider } from "@/components/live-quotes-provider";

export function AppShell({
  userId, sidebarPrefs, portfolios, plansTotal, activeCount, inboxUnread, views, banner, signOutAction, children,
}: {
  userId: string;
  sidebarPrefs: unknown;
  portfolios: SidebarPortfolio[];
  plansTotal: number;
  activeCount: number;
  inboxUnread?: number;
  views: SidebarView[];
  banner?: React.ReactNode;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [wsMenu, setWsMenu] = useState(false);
  const [settings, setSettings] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [sbHidden, setSbHidden] = useState(false);
  const [search, setSearch] = useState(false);
  const [compose, setCompose] = useState(false);

  // source/App.jsx:454 이식 — ⌘K/Ctrl+K로 전역 검색모달 토글, Escape로 닫기.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearch((v) => !v);
      }
      if (e.key === "Escape") setSearch(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <PrefsProvider>
     <SidebarConfigProvider userId={userId} initial={sidebarPrefs}>
      <InboxBadgeProvider initial={inboxUnread ?? 0}>
      <SecurityPeekProvider>
      <LiveQuotesProvider>
      {/* 프로토타입 App.jsx 구조: .app(세로) > banner + .app-row(가로) > 사이드바 + 메인 */}
      <div className="app" style={{ background: "var(--bg-app)" }}>
        {banner}
        <div className="app-row">
          {!sbHidden && (
            <Sidebar
              portfolios={portfolios}
              plansTotal={plansTotal}
              activeCount={activeCount}
              views={views}
              onWsMenu={() => setWsMenu(true)}
              onCollapse={() => setSbHidden(true)}
              onSearch={() => setSearch(true)}
              onNewPlan={() => setCompose(true)}
            />
          )}
          {sbHidden && (
            <button className="iconbtn" style={{ position: "fixed", top: 10, left: 10, zIndex: 50 }}
              onClick={() => setSbHidden(false)} title="사이드바 열기">
              <PanelIcon side="left" size={16} />
            </button>
          )}
          <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>{children}</main>
        </div>
        {wsMenu && (
          <WorkspaceMenu
            onClose={() => setWsMenu(false)}
            onSettings={() => setSettings(true)}
            onCustomize={() => setCustomize(true)}
            onLogout={() => void signOutAction()}
          />
        )}
        {settings && <SettingsModal onClose={() => setSettings(false)} />}
        {customize && <CustomizeModal onClose={() => setCustomize(false)} />}
        {search && <SearchModal userId={userId} onClose={() => setSearch(false)} />}
        {compose && <ComposeModal userId={userId} onClose={() => setCompose(false)} />}
      </div>
      </LiveQuotesProvider>
      </SecurityPeekProvider>
      </InboxBadgeProvider>
     </SidebarConfigProvider>
    </PrefsProvider>
  );
}
