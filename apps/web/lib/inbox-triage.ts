// 인박스 트리아지 상태 — localStorage(클라이언트 전용, 프로토타입과 동일 키).
// read/resolved/muted Set. Next 클라이언트에서만 접근(SSR 가드: 헬퍼는 window 체크).
// DB 동기화는 이번 스코프 아님(후속). Inbox.jsx ibxSetOf/ibxSaveSet/ibxReadSet verbatim.
export const IBX_READ_KEY = "keystone-inbox-read-v1";
export const IBX_RESOLVE_KEY = "keystone-inbox-resolved-v1";
export const IBX_MUTE_KEY = "keystone-inbox-muted-v1";

/** localStorage 키에서 Set 복원 — SSR/파싱 실패 시 빈 Set */
export function ibxSetOf(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

/** Set → localStorage 저장 (클라이언트에서만) */
export function ibxSaveSet(key: string, set: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* noop */
  }
}

export function ibxReadSet(): Set<string> {
  return ibxSetOf(IBX_READ_KEY);
}
