// 앱 셸 — 사이드바 + 메인 프레임 (프로토타입 App.jsx의 .app 레이아웃 대응).
// 메뉴/설정 모달 상태와 사이드바 접기를 관리한다.
"use client";
import { useState } from "react";
import { Sidebar, type SidebarPortfolio, type SidebarView } from "./sidebar";
import { WorkspaceMenu, SettingsModal } from "./workspace-menu";
import { CustomizeModal } from "./customize-modal";
import { PanelIcon } from "@/components/icons";
import { PrefsProvider } from "./prefs";
import { SidebarConfigProvider } from "./sidebar-config";

export function AppShell({
  userId, sidebarPrefs, portfolios, plansTotal, activeCount, views, banner, signOutAction, children,
}: {
  userId: string;
  sidebarPrefs: unknown;
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
  const [customize, setCustomize] = useState(false);
  const [sbHidden, setSbHidden] = useState(false);

  return (
    <PrefsProvider>
     <SidebarConfigProvider userId={userId} initial={sidebarPrefs}>
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
      </div>
     </SidebarConfigProvider>
    </PrefsProvider>
  );
}
