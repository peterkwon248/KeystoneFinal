// source/icons.jsx의 Lic(lucide CDN 래퍼)·Flag·KeystoneLogo·PanelIcon·StatusIcon·StrategyBadge 이식본.
// Lic는 lucide-react 동적 매핑 — 프로토타입처럼 kebab-case 이름을 그대로 받는다
// (strokeWidth 1.7 = 프로토타입 기본값 유지).
"use client";
import type { CSSProperties } from "react";
import { icons } from "lucide-react";
import type { ExecStrategy, Lang, PlanStatus } from "@keystone/core/types";
import { PLAN_STATUS } from "@keystone/core/reference";

const pascal = (name: string) =>
  name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");

// lucide-react가 개명한 아이콘 — 프로토타입/core(골든 보호라 수정 불가)의 옛 kebab 이름을 현행 이름으로 매핑.
// 새 항목은 렌더 시 dev 경고(아래)를 보고 추가한다.
const LUCIDE_ALIASES: Record<string, string> = {
  filter: "Funnel",         // Filter → Funnel
  "pie-chart": "ChartPie",  // PieChart → ChartPie
  "help-circle": "CircleQuestionMark", // HelpCircle → CircleQuestionMark (lucide 0.545)
};

export function Lic({
  name, size = 16, cls = "icon", color, style,
}: { name: string; size?: number; cls?: string; color?: string; style?: CSSProperties }) {
  const key = LUCIDE_ALIASES[name] ?? pascal(name);
  const I = icons[key as keyof typeof icons];
  if (!I) {
    if (process.env.NODE_ENV !== "production") console.warn(`[Lic] 알 수 없는 아이콘 "${name}" (→ ${key}). LUCIDE_ALIASES에 추가 필요.`);
    return null;
  }
  // lucide-react는 color prop을 svg stroke 속성에 넣는다. 프로토타입은 "inherit"로
  // "부모 텍스트색 상속"을 의도했지만, stroke="inherit"는 CSS 초기값 none으로 상속돼
  // 아이콘이 완전히 사라진다(사이드바 nav 전부). 올바른 값은 currentColor.
  const stroke = color == null || color === "inherit" ? "currentColor" : color;
  return <I className={cls} width={size} height={size} strokeWidth={1.7} color={stroke} style={style} />;
}

/** 사이드바 접기 아이콘 (source/icons.jsx PanelIcon 그대로) */
export function PanelIcon({ side = "left", size = 16, color = "currentColor" }: { side?: "left" | "right"; size?: number; color?: string }) {
  const railLeft = side === "left";
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" style={{ flex: "none" }}>
      <rect x="2" y="3" width="14" height="12" rx="4" stroke={color} strokeWidth="1.6" />
      <line x1={railLeft ? "7" : "11"} y1="3.6" x2={railLeft ? "7" : "11"} y2="14.4" stroke={color} strokeWidth="1.6" />
      <rect x={railLeft ? "2.8" : "11.2"} y="3.8" width="4" height="10.4" rx="2.4" fill={color} opacity="0.18" />
    </svg>
  );
}

/** 시장 뱃지 (source/icons.jsx Flag 그대로) */
export function Flag({ market, size = 15 }: { market: "KR" | "US"; size?: number }) {
  const mk = market === "KR" ? "KR" : "US";
  const fs = Math.max(8, Math.round(size * 0.62));
  return (
    <span
      style={{
        flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center",
        minWidth: Math.round(size * 1.5), height: Math.round(size * 1.05),
        padding: `0 ${Math.round(size * 0.28)}px`, borderRadius: 4,
        background: mk === "KR" ? "rgba(38,99,230,0.14)" : "rgba(180,40,60,0.14)",
        color: mk === "KR" ? "#4C8DFF" : "#E5687A",
        font: `700 ${fs}px var(--font-mono, ui-monospace)`, letterSpacing: "0.02em", lineHeight: 1,
      }}
    >
      {mk}
    </span>
  );
}

/** 브랜드 로고 (source/icons.jsx KeystoneLogo 그대로) */
export function KeystoneLogo({ size = 22, tile = false }: { size?: number; tile?: boolean }) {
  const s = 24, g = s * 0.022;
  const left = `M${s * 0.5 - g} ${s * 0.27} L${s * 0.18} ${s * 0.71} L${s * 0.39} ${s * 0.71} L${s * 0.5 - g} ${s * 0.52} Z`;
  const right = `M${s * 0.5 + g} ${s * 0.27} L${s * 0.82} ${s * 0.71} L${s * 0.61} ${s * 0.71} L${s * 0.5 + g} ${s * 0.52} Z`;
  if (tile) {
    return (
      <svg className="logo-mark" width={size} height={size} viewBox="0 0 24 24" style={{ width: size, height: size }}>
        <rect width="24" height="24" rx="6.5" fill="#4C8DFF" />
        <path d="M12 5.5 L5.4 14.6 L9.3 14.6 L12 10.9 Z" fill="#fff" />
        <path d="M12 5.5 L18.6 14.6 L14.7 14.6 L12 10.9 Z" fill="#fff" opacity="0.62" />
      </svg>
    );
  }
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ width: size, height: size, borderRadius: 0 }}>
      <path d={left} fill="#4C8DFF" />
      <path d={right} fill="#2C66CC" />
    </svg>
  );
}

/** 플랜 라이프사이클 상태 아이콘 (source/icons.jsx StatusIcon 그대로) —
 * 링 + 단계별로 자라는 파이 웨지 */
export function StatusIcon({ status = "research", size = 15 }: { status?: PlanStatus; size?: number }) {
  const meta = PLAN_STATUS[status] || PLAN_STATUS.research;
  const c = meta.color;
  const common = { width: size, height: size, viewBox: "0 0 14 14" };
  const ring = <circle cx="7" cy="7" r="5.5" fill="none" stroke={c} strokeWidth="1.5" />;
  const wedge = (len: number) => (
    <circle cx="7" cy="7" r="3" fill="none" stroke={c} strokeWidth="6" strokeDasharray={len + " 100"} transform="rotate(-90 7 7)" />
  );
  if (status === "research")
    return <svg {...common}><circle cx="7" cy="7" r="5.5" fill="none" stroke={c} strokeWidth="1.5" strokeDasharray="1.7 1.9" /></svg>;
  if (status === "planning") return <svg {...common}>{ring}{wedge(4.7)}</svg>;
  if (status === "active") return <svg {...common}>{ring}{wedge(9.4)}</svg>;
  if (status === "paused") return <svg {...common}>{ring}{wedge(9.4)}</svg>;
  if (status === "closing") return <svg {...common}>{ring}{wedge(14.5)}</svg>;
  // closed
  return (
    <svg {...common}>
      <circle cx="7" cy="7" r="6" fill={c} />
      <path d="M4.3 7.1l1.8 1.8 3.4-3.6" stroke="var(--bg-app)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 전략 뱃지 — 색점 + 이름 (source/icons.jsx StrategyBadge 그대로) */
export function StrategyBadge({ strategy, lang }: { strategy: ExecStrategy | null | undefined; lang: Lang }) {
  if (!strategy) return <span className="strat-badge" style={{ color: "var(--fg-4)" }}>—</span>;
  return (
    <span className="strat-badge">
      <span className="strat-dot" style={{ background: strategy.color }} />
      {strategy.name[lang]}
    </span>
  );
}

/** 소셜 브랜드 글리프 (source/Auth.jsx SocialIcon 그대로) */
export function SocialIcon({ kind }: { kind: string }) {
  if (kind === "google")
    return (
      <svg width="17" height="17" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.63z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.02-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
    );
  if (kind === "apple")
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M11.18 8.5c-.02-1.7 1.39-2.52 1.45-2.56-.79-1.16-2.02-1.32-2.46-1.34-1.05-.1-2.04.61-2.57.61-.53 0-1.35-.6-2.22-.58-1.14.02-2.2.66-2.78 1.69-1.19 2.06-.3 5.1.85 6.77.57.82 1.24 1.73 2.12 1.7.85-.04 1.17-.55 2.2-.55s1.31.55 2.2.53c.91-.02 1.49-.83 2.04-1.65.65-.95.91-1.86.93-1.91-.02-.01-1.78-.68-1.8-2.71-.02-.01-.61-.01-.63-.01zM9.6 3.5c.47-.57.78-1.36.7-2.15-.67.03-1.49.45-1.97 1.01-.43.5-.81 1.31-.71 2.08.75.06 1.51-.38 1.98-.94z"/></svg>
    );
  if (kind === "kakao")
    return (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="#191600"><path d="M9 1.5C4.86 1.5 1.5 4.13 1.5 7.38c0 2.1 1.4 3.94 3.5 4.98-.15.55-.56 2.02-.64 2.33-.1.39.14.38.3.28.13-.08 2.04-1.39 2.87-1.95.32.04.64.06.97.06 4.14 0 7.5-2.63 7.5-5.88S13.14 1.5 9 1.5z"/></svg>
    );
  if (kind === "naver")
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="#fff"><path d="M10.6 8.45 5.2 1H1v14h4.4V7.55L10.8 15H15V1h-4.4v7.45z"/></svg>
    );
  return null;
}
