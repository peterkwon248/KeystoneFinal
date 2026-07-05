// 인박스 배지 라이브 브리지 (client) — 사이드바 배지를 세션 중 즉시 갱신.
// 서버가 셸 레이아웃에서 계산한 안읽음 수(initial)를 시드로, 인박스 화면이 트리아지(읽음/처리완료/음소거)
// 낙관적 변경을 push 하면 배지가 리로드 없이 반영된다. 풀 로드·router.refresh 로 initial 이 바뀌면 그 값으로 동기화
// (비인박스 페이지에서 규칙이 새로 발동해 서버 재계산값이 커지는 경우 등).
"use client";
import { createContext, useContext, useEffect, useState } from "react";

const InboxBadgeCtx = createContext<{ unread: number; setUnread: (n: number) => void }>({
  unread: 0,
  setUnread: () => {},
});

export function InboxBadgeProvider({ initial, children }: { initial: number; children: React.ReactNode }) {
  const [unread, setUnread] = useState(initial);
  // 서버 재계산값(풀 로드·router.refresh)이 바뀌면 반영. 값이 그대로면 재실행 안 함 →
  // 인박스의 낙관적 갱신을 stale 서버값으로 덮어쓰지 않는다.
  useEffect(() => { setUnread(initial); }, [initial]);
  return <InboxBadgeCtx.Provider value={{ unread, setUnread }}>{children}</InboxBadgeCtx.Provider>;
}

export function useInboxBadge() { return useContext(InboxBadgeCtx); }
