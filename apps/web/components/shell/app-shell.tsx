// 앱 셸 — 사이드바 + 메인 프레임 (프로토타입 App.jsx의 .app 레이아웃 대응).
// 메뉴/설정 모달 상태와 사이드바 접기를 관리한다.
"use client";
import { useState } from "react";
import { Sidebar, type SidebarPortfolio, type SidebarView } from "./sidebar";
import { WorkspaceMenu, SettingsModal } from "./workspace-menu";
import { PanelIcon } from "@/components/icons";
import { PrefsProvider } from "./prefs";

export function AppShell({
  portfolios, plansTotal, activeCount, views, banner, signOutAction, children,
}: {
  portfolios: SidebarPortfolio[];
  plansTotal: number;
  activeCount: number;
  views: SidebarView[];
  banner?: React.ReactNode;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [wsMenu, setWsMenu] = useState(false);
  const [settings, setSettings] = useState(false);
  const [sbHidden, setSbHidden] = useState(false);

  return (
    <PrefsProvider>
      {banner}
      <div className="app" style={{ display: "flex", height: banner ? "calc(100vh - 34px)" : "100vh", overflow: "hidden", background: "var(--bg-app)" }}>
        {!sbHidden && (
          <Sidebar
            portfolios={portfolios}
            plansTotal={plansTotal}
            activeCount={activeCount}
            views={views}
            onWsMenu={() => setWsMenu(true)}
            onCollapse={() => setSbHidden(true)}
          />
        )}
        {sbHidden && (
          <button className="iconbtn" style={{ position: "fixed", top: 10, left: 10, zIndex: 50 }}
            onClick={() => setSbHidden(false)} title="사이드바 열기">
            <PanelIcon side="left" size={16} />
          </button>
        )}
        <main style={{ flex: 1, minWidth: 0, overflow: "auto" }}>{children}</main>
        {wsMenu && (
          <WorkspaceMenu
            onClose={() => setWsMenu(false)}
            onSettings={() => setSettings(true)}
            onLogout={() => void signOutAction()}
          />
        )}
        {settings && <SettingsModal onClose={() => setSettings(false)} />}
      </div>
    </PrefsProvider>
  );
}
