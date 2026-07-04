// source/data.jsx:1008-1010 이식 — 최근 본 종목(ticker) localStorage 헬퍼.
// 검색 리스트가 "실제로 만진 것"을 우선 노출하도록 최근순 티커 목록을 유지한다(최대 16개).
// "use client" 불필요(순수 함수) — SSR 환경(window 없음)에서는 빈 배열/no-op으로 가드.
const SEC_RECENT_KEY = "keystone-sec-recent-v1";

export function getSecRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SEC_RECENT_KEY) || "[]") || [];
  } catch {
    return [];
  }
}

export function pushSecRecent(ticker: string): void {
  if (!ticker || typeof window === "undefined") return;
  try {
    const next = [ticker, ...getSecRecents().filter((x) => x !== ticker)].slice(0, 16);
    localStorage.setItem(SEC_RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
