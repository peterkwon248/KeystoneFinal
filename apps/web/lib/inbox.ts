// design_handoff_keystone/source/Inbox.jsx 순수 파생 로직 이식 — 인박스를 트리아지 표면으로.
// 발동한 규칙 + 시나리오 목표가 알림 → actionable 알림 목록. 정렬·분류·단위 매수 산식은 verbatim.
// UIPlan[] 입력(웹 이음새). IBX_META 아이콘/색은 그대로. 순수(브라우저 API 없음) — SSR 안전.
import type { Lang } from "@keystone/core/types";
import { fmtCompact } from "@keystone/core/format";
import { EXEC_STRATEGIES } from "@keystone/core/reference";
import type { UIPlan } from "@/lib/plan-mapper";

/** 알림에 붙는 규칙(있을 때) */
export type InboxRule = UIPlan["rules"][number];

/** 트리아지 대상 알림 — 발동 규칙 또는 시나리오 목표가 파생 알림 */
export interface InboxNote {
  id: string;
  plan: UIPlan;
  rule?: InboxRule;
  type: string;
  time: string;
  title?: string;
  body?: string;
  computed?: boolean;
  action?: "buy" | "sell";
}

/** 이벤트 유형별 아이콘/색/soft배경 (Inbox.jsx IBX_META 그대로) */
export const IBX_META: Record<string, { icon: string; color: string; soft: string }> = {
  buy: { icon: "arrow-down-left", color: "var(--r-active)", soft: "color-mix(in srgb, var(--r-active) 14%, transparent)" },
  sell: { icon: "arrow-up-right", color: "var(--r-closing)", soft: "color-mix(in srgb, var(--r-closing) 14%, transparent)" },
  info: { icon: "zap", color: "var(--fg-3)", soft: "var(--bg-elevated-2)" },
  opportunity: { icon: "shield-check", color: "var(--pos)", soft: "color-mix(in srgb, var(--pos) 14%, transparent)" },
  impair: { icon: "alert-triangle", color: "var(--neg)", soft: "color-mix(in srgb, var(--neg) 14%, transparent)" },
  converge: { icon: "target", color: "var(--accent)", soft: "color-mix(in srgb, var(--accent) 14%, transparent)" },
};

// 규칙을 이벤트 유형으로 분류 → 아이콘·색·트리아지 액션 결정 (Inbox.jsx ibxType verbatim)
export function ibxType(rule: InboxRule): string {
  const s = (rule.name.en + " " + rule.then.en).toLowerCase();
  if (/buy|loc|average|add/.test(s) && !/sell|trim|exit|profit/.test(s)) return "buy";
  if (/sell|trim|exit|profit|take|band|target/.test(s)) return "sell";
  return "info";
}

// 시나리오 기반 알림: 각 플랜의 시나리오 목표가(상단/중간/하단) vs 현재가에서 파생.
// 추상적 '내재가치' 대신 사용자가 직접 세운 구체적 목표가를 트리거로 사용 → API 연동 시 그대로 유효.
export function scenarioAlerts(p: UIPlan, lang: Lang): InboxNote[] {
  if (!p.scenarios || p.scenarios.length < 3) return [];
  const ko = lang === "ko";
  const px = p.currentPrice;
  const find = (en: string) => p.scenarios.find((s) => s.label.en === en);
  const bull = find("Bull"), base = find("Base"), bear = find("Bear");
  if (!bull || !base || !bear) return [];
  const f = (v: number) => fmtCompact(v, p.cur);
  const out: InboxNote[] = [];
  const mk = (id: string, type: string, title: string, body: string, action?: "buy" | "sell"): InboxNote =>
    ({ id: p.id + ":scn:" + id, plan: p, type, time: p.updatedAt || "Today", title, body, computed: true, action });
  // 상단
  if (px >= bull.target) {
    out.push(mk("bull-hit", "converge", ko ? "상단 목표가 돌파" : "Upper target reached",
      ko ? `현재가가 상단 목표가 ${f(bull.target)}를 돌파했습니다. 차익 실현을 검토하세요.` : `Price broke above the upper target (${f(bull.target)}). Consider taking profit.`, "sell"));
  } else if (px >= bull.target * 0.97) {
    out.push(mk("bull-near", "converge", ko ? "상단 목표가 근접" : "Approaching upper target",
      ko ? `현재가가 상단 목표가 ${f(bull.target)}의 ${(px / bull.target * 100).toFixed(0)}%에 도달했습니다.` : `Price reached ${(px / bull.target * 100).toFixed(0)}% of the upper target ${f(bull.target)}.`));
  }
  // 하단
  if (px <= bear.target) {
    out.push(mk("bear-hit", "impair", ko ? "하단 목표가 이탈" : "Fell below lower target",
      ko ? `현재가가 하단 목표가 ${f(bear.target)} 아래로 내려갔습니다. 논제를 재점검하세요.` : `Price fell below the lower target (${f(bear.target)}). Re-check the thesis.`));
  } else if (px <= bear.target * 1.03) {
    out.push(mk("bear-near", "opportunity", ko ? "하단 근접 · 매수 검토" : "Near lower target · consider buying",
      ko ? `현재가가 하단 목표가 ${f(bear.target)}에 근접했습니다. 분할 매수를 검토하세요.` : `Price is near the lower target ${f(bear.target)}. Consider scaling in.`, "buy"));
  }
  // 중간 수렴 (상·하단 알림이 없을 때만)
  if (!out.length && Math.abs(px / base.target - 1) <= 0.02) {
    out.push(mk("base", "converge", ko ? "중간 목표가 수렴" : "Converging on base target",
      ko ? `현재가가 중간 목표가 ${f(base.target)} 부근에서 움직이고 있습니다.` : `Price is hovering around the base target ${f(base.target)}.`));
  }
  return out;
}

const IBX_MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// 시간 버킷(today/earlier). 프로토타입 ibxBucket은 "Today HH:MM" 절대문자열 전제였으나,
// 웹 이음새는 상대토큰(now/Nh/Nd·plan.updatedAt)과 "Mon D"(rule.last=toMonD)를 쓴다 → 두 형식 모두 인식.
// today = 레거시 "Today*" · "now" · "Nh"(24h 이내) · 오늘 날짜의 "Mon D".
export function ibxBucket(last: string): "today" | "earlier" {
  if (!last) return "earlier";
  const s = last.trim();
  if (/^today/i.test(s)) return "today";
  if (/^now$/i.test(s)) return "today";
  if (/^\d+\s*h$/i.test(s)) return "today"; // "8h" = 24시간 이내 → 오늘
  const now = new Date();
  if (s === `${IBX_MON[now.getMonth()]} ${now.getDate()}`) return "today"; // 오늘 날짜의 "Mon D"
  return "earlier";
}

// 플랜에서 전체 알림 목록 파생: 발동 규칙 + 시나리오 목표가 알림 (Inbox.jsx buildInboxNotes verbatim)
export function buildInboxNotes(source: UIPlan[], lang: Lang): InboxNote[] {
  const out: InboxNote[] = [];
  source.forEach((p) => (p.rules || []).filter((r) => r.on && r.last && r.last !== "Never")
    .forEach((r) => out.push({ id: p.id + ":" + r.id, plan: p, rule: r, type: ibxType(r), time: r.last })));
  source.forEach((p) => scenarioAlerts(p, lang).forEach((a) => out.push(a)));
  return out.sort((a, b) => (a.computed === b.computed ? (a.time < b.time ? 1 : -1) : a.computed ? -1 : 1));
}

// per-buy size is strategy-aware: DCA → the fixed period amount; grid → one rung (budget ÷ grids);
// split (무한매수법) → one round's worth; else fall back to budget/round or total. (Inbox.jsx unitBudget verbatim)
export function unitBudget(p: UIPlan): number {
  const ex = EXEC_STRATEGIES.find((s) => s.id === p.execId);
  const fNum = (k: string, d: number): number => {
    const f = ex && ex.fields && ex.fields.find((x) => x.key === k);
    if (!f) return d;
    const n = parseFloat(String(f.default).replace(/[^0-9.\-]/g, ""));
    return isNaN(n) ? d : n;
  };
  if (ex) {
    if (p.execId === "ex2") { const a = fNum("amount", 0); if (a > 0) return a; }
    if (p.execId === "ex4" && p.totalInvested) { const g = Math.max(1, fNum("grids", 10)); return p.totalInvested / g; }
  }
  return (p.totalInvested && p.round) ? p.totalInvested / p.round : (p.totalInvested || p.currentPrice * 10);
}

export function unitQty(p: UIPlan): number {
  return Math.max(1, Math.round(unitBudget(p) / (p.currentPrice || 1)));
}
