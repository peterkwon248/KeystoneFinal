// 시나리오 모니터 공용 참조 상수 — source/P4Views.jsx:915-918 + source/icons.jsx SC_STATUS_COLOR 이식.
// 순수 데이터(색/순서/라벨) — scenarios-tab.tsx 로컬 복제본과 동일 값. 향후 watchlist/screener도 재사용.
import type { Lang } from "@keystone/core/types";

// source/icons.jsx:26 SC_STATUS_COLOR — 시나리오 상태 dot/pill 색.
export const SC_STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  tracking: { bg: "var(--bg-elevated-2)", fg: "var(--fg-3)" },
  approaching: { bg: "rgba(242,201,76,.18)", fg: "var(--r-base)" },
  realized: { bg: "rgba(76,183,130,.18)", fg: "var(--r-bull)" },
  invalidated: { bg: "rgba(235,87,87,.16)", fg: "var(--r-bear)" },
};

// source/P4Views.jsx:915 — 상태 그룹/헤드라인 순서.
export const SCEN_ORDER = ["approaching", "realized", "tracking", "invalidated"];

// source/P4Views.jsx:916 — 케이스(Bull/Base/Bear) 순서 + dot 색.
export const SC_CASE_ORDER: [string, string][] = [
  ["Bull", "var(--r-bull)"],
  ["Base", "var(--r-base)"],
  ["Bear", "var(--r-bear)"],
];

// source/P4Views.jsx:917 — 케이스 라벨(ko/en).
export const SC_CASE_LAB: Record<string, { ko: string; en: string }> = {
  Bull: { ko: "상단", en: "Bull" },
  Base: { ko: "중간", en: "Base" },
  Bear: { ko: "하단", en: "Bear" },
};

// source/P4Views.jsx:918.
export const scCaseLabel = (k: string, lang: Lang): string =>
  (SC_CASE_LAB[k] || { ko: k, en: k })[lang] || k;
