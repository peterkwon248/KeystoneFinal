// 사이드바 구성(도구 표시/핀/순서) 상태 — 프로토타입 App.jsx의 sidebarCfg/optOrder/sidebarPin 대응.
// source는 localStorage "keystone-sidebar-v2"였으나, ARCHITECTURE §9에 따라 profiles.sidebar(DB)로 서버 동기화.
// Sidebar(렌더)와 CustomizeModal(편집)이 공유하는 컨텍스트.
"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Json } from "@keystone/core/types";
import { supabaseBrowser } from "@/lib/supabase/client";
import { normalizeSidebar, SB_CFG0, SB_ORDER0, type SbCfg, type SidebarPrefs } from "@/lib/sidebar-config";

interface SidebarConfigCtx {
  cfg: SbCfg;
  order: string[];
  pinned: string[];
  setCfg: (updater: (prev: SbCfg) => SbCfg) => void;
  setOrder: (next: string[]) => void;
  setPinned: (updater: (prev: string[]) => string[]) => void;
  reset: () => void;
}

const Ctx = createContext<SidebarConfigCtx>({
  cfg: SB_CFG0, order: SB_ORDER0, pinned: [],
  setCfg: () => {}, setOrder: () => {}, setPinned: () => {}, reset: () => {},
});

export const useSidebarConfig = () => useContext(Ctx);

export function SidebarConfigProvider({ userId, initial, children }: {
  userId: string; initial: unknown; children: React.ReactNode;
}) {
  const norm = normalizeSidebar(initial);
  const [cfg, setCfgState] = useState<SbCfg>(norm.cfg);
  const [order, setOrderState] = useState<string[]>(norm.order);
  const [pinned, setPinnedState] = useState<string[]>(norm.pinned);
  const firstRun = useRef(true);

  // 변경 시 profiles.sidebar로 영속 (최초 마운트 제외 — 초기값은 서버가 이미 가진 값).
  // ⚠️ supabase 쿼리 빌더는 thenable — .then/await로 "실행"해야 HTTP 요청이 나간다 (void면 요청 안 감).
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    const sidebar: SidebarPrefs = { cfg, order, pinned };
    supabaseBrowser().from("profiles").update({ sidebar: sidebar as unknown as Json }).eq("id", userId)
      .then(({ error }) => { if (error) console.error("[sidebar persist]", error.message); });
  }, [cfg, order, pinned, userId]);

  const reset = () => { setCfgState({ ...SB_CFG0 }); setOrderState([...SB_ORDER0]); setPinnedState([]); };

  return (
    <Ctx.Provider value={{
      cfg, order, pinned,
      setCfg: (u) => setCfgState(u),
      setOrder: (next) => setOrderState(next),
      setPinned: (u) => setPinnedState(u),
      reset,
    }}>
      {children}
    </Ctx.Provider>
  );
}
