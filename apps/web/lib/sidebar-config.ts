// source/P4Views.jsx OPTIONAL_DESTS + App.jsx SB_CFG0/SB_ORDER0 이식.
// 사이드바 "도구" 섹션의 선택형 목적지 정의 + 기본 구성.
// 영속화는 profiles.sidebar (jsonb {cfg, order, pinned}) — DATA_MODEL §9 / ARCHITECTURE §9.
export interface OptionalDest {
  key: string;
  icon: string;
  labelKey: string;
}

export const OPTIONAL_DESTS: OptionalDest[] = [
  { key: "watchlist", icon: "star", labelKey: "watchlist" },
  { key: "insights", icon: "chart-line", labelKey: "insights" },
  { key: "research", icon: "book-open", labelKey: "research" },
  { key: "scenarios", icon: "target", labelKey: "scenariosMon" },
  { key: "screener", icon: "filter", labelKey: "screenerNav" },
  { key: "archive", icon: "archive", labelKey: "archiveNav" },
  { key: "trash", icon: "trash-2", labelKey: "trash" },
];

export type SbCfg = Record<string, boolean>;
export interface SidebarPrefs {
  cfg: SbCfg;
  order: string[];
  pinned: string[];
}

export const SB_CFG0: SbCfg = { watchlist: true, insights: true, research: true, scenarios: true, screener: true, archive: true, trash: true };
export const SB_ORDER0: string[] = ["watchlist", "insights", "research", "scenarios", "screener", "archive", "trash"];

/** profiles.sidebar(부분 저장 가능) → 완전한 SidebarPrefs (누락 시 기본값) */
export function normalizeSidebar(raw: unknown): SidebarPrefs {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<SidebarPrefs>;
  return {
    cfg: o.cfg && typeof o.cfg === "object" ? { ...SB_CFG0, ...o.cfg } : { ...SB_CFG0 },
    order: Array.isArray(o.order) ? o.order : [...SB_ORDER0],
    pinned: Array.isArray(o.pinned) ? o.pinned : [],
  };
}

/** 저장된 order를 base(OPTIONAL_DESTS) 기준으로 병합 — 누락 키는 원위치에 삽입 (source 그대로) */
export function mergedKeys(order: string[] | null | undefined): string[] {
  const base = OPTIONAL_DESTS.map((d) => d.key);
  if (!order) return base;
  const merged = order.filter((k) => base.includes(k));
  base.forEach((k, i) => { if (!merged.includes(k)) merged.splice(Math.min(i, merged.length), 0, k); });
  return merged;
}
