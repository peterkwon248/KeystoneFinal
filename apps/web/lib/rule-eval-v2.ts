// v2 규칙 평가 래퍼 — core evalRule(골든)에 7개 기존 트리거 위임, 4개 신규(time/weight/trailing/path) 자체 평가.
// closeout.ts 패턴(core 무수정). 신규 타입 수학은 strategy-tab 콕핏 오버레이(isMomentum/isWeight/isTime)와 일치시켜 시각적 패리티 유지.
import { evalRule } from "@keystone/core/analytics";
import { fmtMoney } from "@keystone/core/format";
import type { DbRuleCondition, UIPlan, UIRule } from "./plan-mapper";

type RuleEvalResult = ReturnType<typeof evalRule>;

const V2_TRIGS = new Set(["time_due", "weight_off", "trail_stop", "path_gap"]);
const MON_IDX: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const MON_EN3 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY = 86400000;

export function evalRuleV2(plan: UIPlan, rule: UIRule, ko: boolean): RuleEvalResult {
  if (rule.trig && V2_TRIGS.has(rule.trig)) return evalV2(plan, rule, ko);
  return evalRule(plan, rule, ko);
}

function evalV2(plan: UIPlan, rule: UIRule, ko: boolean): RuleEvalResult {
  const cur = plan.cur;
  const px = plan.currentPrice, avg = plan.avgPrice || 0;
  const c: Partial<DbRuleCondition> = rule.cond ?? {};

  if (rule.trig === "trail_stop") {
    const stop = Math.abs(c.value ?? 15);
    const started = avg > 0;
    if (!started) return { state: "armed", meta: ko ? `진입 전 · 스탑 −${stop}%` : `Not started · stop −${stop}%` };
    const refHigh = Math.max(px, avg);
    const stopLine = refHigh * (1 - stop / 100);
    const hit = px <= stopLine;
    return { state: hit ? "fired" : "armed", meta: (ko ? "현재가 " : "Price ") + fmtMoney(px, cur) + (hit ? " ≤ " : " > ") + (ko ? "스탑 " : "stop ") + fmtMoney(stopLine, cur) };
  }

  if (rule.trig === "weight_off") {
    const tw = c.target ?? 0;
    const band = c.band ?? Math.max(3, Math.round(tw * 0.25));
    if (!(avg > 0)) return { state: "armed", meta: ko ? "진입 전" : "Not started" };
    const curW = tw * (px / avg);
    const loB = tw - band, hiB = tw + band;
    const off = curW > hiB || curW < loB;
    const dir = curW > hiB ? (ko ? "상한 초과·매도" : "above·trim") : curW < loB ? (ko ? "하한 미만·매수" : "below·add") : (ko ? "밴드 안" : "in band");
    return { state: off ? "fired" : "armed", meta: (ko ? "비중 " : "Weight ") + curW.toFixed(1) + "% · " + dir + ` (${tw}±${band})` };
  }

  if (rule.trig === "time_due") {
    const unitDays: Record<string, number> = { day: 1, week: 7, biweek: 14, month: 30, quarter: 91, year: 365 };
    const step = Math.max(1, (c.count ?? 1) * (unitDays[c.unit ?? "week"] ?? 7));
    const parse = (s: string): Date | null => { const m = (s || "").match(/([A-Za-z]{3})\s*(\d+)/); return (m && MON_IDX[m[1]] != null) ? new Date(2025, MON_IDX[m[1]], +m[2]) : null; };
    const fmtMD = (d: Date) => ko ? `${d.getMonth() + 1}월 ${d.getDate()}일` : `${MON_EN3[d.getMonth()]} ${d.getDate()}`;
    const buys = (plan.executions || []).filter((e) => e.side === "buy").map((e) => parse(e.date)).filter((d): d is Date => !!d).sort((a, b) => a.getTime() - b.getTime());
    if (!buys.length) return { state: "event", meta: ko ? `적립 대기 · ${step}일 주기` : `Scheduled · every ${step}d` };
    const last = buys[buys.length - 1];
    const nextBuy = new Date(last.getTime() + step * DAY);
    return { state: "event", meta: ko ? `다음 적립 ${fmtMD(nextBuy)} · ${step}일 주기` : `Next ${fmtMD(nextBuy)} · every ${step}d` };
  }

  // path_gap — 미니멀: 평가액 vs 목표 가치 경로(target_path). 발동 임계 미정의라 상태는 armed(경고 아님), gap 방향만 표시.
  const V = c.value ?? 0;
  const value = (plan.totalShares || 0) * px;
  if (!(value > 0) || !(V > 0)) return { state: "armed", meta: ko ? "진입 전 · 가치 경로" : "Not started · value path" };
  const gap = (value - V) / V * 100;
  const dir = value < V ? (ko ? "경로 아래·매수" : "below·add") : value > V ? (ko ? "경로 위·매도" : "above·trim") : (ko ? "경로 일치" : "on path");
  return { state: "armed", meta: (ko ? "평가액 " : "Value ") + fmtMoney(value, cur) + " vs " + fmtMoney(V, cur) + ` (${gap >= 0 ? "+" : ""}${gap.toFixed(1)}%) · ${dir}` };
}
