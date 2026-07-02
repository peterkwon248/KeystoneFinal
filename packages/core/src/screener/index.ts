// @keystone/core/screener — indicator grading thresholds and grade helpers
// promoted from the prototype (source/data.jsx). Ported verbatim; the global
// STRATEGIES reference (formerly guarded with `typeof STRATEGIES !== "undefined"`)
// is now imported from ../reference/index.ts.

import type { Grade, Threshold } from "../types/index.ts";
import { STRATEGIES } from "../reference/index.ts";

export const IND_THRESH: Record<string, Threshold> = { PER: { dir: "low", good: 10, warn: 25 }, PBR: { dir: "low", good: 1, warn: 3 }, PSR: { dir: "low", good: 1.5, warn: 6 }, PCR: { dir: "low", good: 8, warn: 20 }, EVEB: { dir: "low", good: 8, warn: 18 }, PEG: { dir: "low", good: 1, warn: 2 }, ROE: { dir: "high", good: 15, warn: 5 }, ROA: { dir: "high", good: 8, warn: 2 }, OPM: { dir: "high", good: 12, warn: 5 }, NPM: { dir: "high", good: 8, warn: 2 }, GPM: { dir: "high", good: 40, warn: 20 }, REVG: { dir: "high", good: 10, warn: 0 }, OPG: { dir: "high", good: 10, warn: 0 }, NPG: { dir: "high", good: 10, warn: 0 }, DEBT: { dir: "low", good: 100, warn: 200 }, CURR: { dir: "high", good: 150, warn: 100 }, INTCOV: { dir: "high", good: 5, warn: 1.5 }, DIVY: { dir: "high", good: 3, warn: 1 }, PAYOUT: { dir: "high", good: 30, warn: 10 }, DIVG: { dir: "high", good: 5, warn: 0 } };
export function gradeOf(key: string, v: number | null | undefined): Grade { const t = IND_THRESH[key]; if (!t || v == null || !isFinite(v)) return "neutral"; if (t.dir === "low") return v <= t.good ? "good" : v >= t.warn ? "bad" : "mid"; return v >= t.good ? "good" : v <= t.warn ? "bad" : "mid"; }
// 관점(렌즈)별 채점 임계값 — 관점에 thresholds 오버라이드가 있으면 그걸, 없으면 전역 IND_THRESH를 쓴다. (하이브리드: 전역 기본 + 관점이 핵심 지표만 재정의)
export function lensThreshOf(fwId: string | null | undefined, key: string): Threshold | null { const fw = (fwId && fwId !== "none") ? STRATEGIES.find(s => s.id === fwId) : null; return (fw && fw.thresholds && fw.thresholds[key]) || IND_THRESH[key] || null; }
export function gradeWithFw(fwId: string | null | undefined, key: string, v: number | null | undefined): Grade { const t = lensThreshOf(fwId, key); if (!t || v == null || !isFinite(v)) return "neutral"; if (t.dir === "low") return v <= t.good ? "good" : v >= t.warn ? "bad" : "mid"; return v >= t.good ? "good" : v <= t.warn ? "bad" : "mid"; }
