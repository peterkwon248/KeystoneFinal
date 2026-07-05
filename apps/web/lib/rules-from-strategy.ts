// 전략/목표 → 자동 규칙(materialized rules) 순수 매핑 — 규칙 자동화 v1.
// 웹 인라인(플랜 필터 patterns 일치): source/*.jsx에 대응 원본 없는 net-new 로직이라 골든 대상 아님.
// 설계: memory rules-automation-design. WHEN(조건)→THEN(동작), 파라메트릭(상대%) 저장 + 평가 시 라이브 계산.
//
// v1 스코프 = "loc_pct/tp_pct 필드를 가진 전략" = 무한매수법 + 전 플랜 목표.
// v2 스코프 = 시간(interval+amount→time)·비중(equity_w|target_w→weight)·트레일링(stop+lookback→trailing)·
//   경로(target_path→path). 신규 트리거는 core RULE_TRIGS(골든)에 못 넣어 웹 래퍼(rule-eval-v2)가
//   표시·평가하고, 여기서는 필드 주도로 물질화만 한다(closeout.ts 패턴). 그리드는 절대 파라미터
//   문제(밴드 ₩/가치선 V 자동생성 헛규칙)로 여전히 미룸.
//
// condition/action(jsonb)은 plan-mapper decodeTrig가 해독하는 형태:
//   loc(op lte)→loc_hit · return(op gte)→ret_ge · price(op gte/lte)→price_ge/le. action.type=RULE_ACTS id.
import { EXEC_STRATEGIES } from "@keystone/core/reference";
import type { UIPlan } from "./plan-mapper";
import type { PlanGoal } from "@/app/(shell)/plans/[id]/actions";

/** 물질화 규칙 스펙 — 서버액션이 rules insert 시 사용(plan_id·is_auto·source 부착). */
export interface RuleSpec {
  name: { en: string; ko: string };
  condition: { type: string; op?: string; value?: number; count?: number; unit?: string; target?: number; band?: number };
  action: { type: string };
  source: string; // 출처 태그: 'strategy:<execId>:<kind>' | 'goal:<type>'
}

/** 전략 field(default 문자열, 예 "-5.0%")에서 숫자 파싱. 없거나 auto면 null. */
function fieldNum(ex: (typeof EXEC_STRATEGIES)[number], key: string): number | null {
  const f = ex.fields?.find((x) => x.key === key);
  if (!f || f.auto) return null;
  const n = parseFloat(String(f.default).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? null : n;
}

/** 전략 → 자동 규칙 배열. 필드 주도(loc_pct/tp_pct 유무) — v2 전략은 해당 필드가 없어 [] 반환. */
export function rulesFromStrategy(execId: string | null | undefined, _plan?: UIPlan): RuleSpec[] {
  if (!execId) return [];
  const ex = EXEC_STRATEGIES.find((s) => s.id === execId);
  if (!ex) return [];
  const specs: RuleSpec[] = [];

  // LOC 누적 매수 — 현재가 ≤ 평단×(1+loc_pct). 상대%라 평단 따라 라이브 계산(stale 없음).
  const loc = fieldNum(ex, "loc_pct");
  if (loc != null) {
    specs.push({
      name: { en: "LOC buy alert", ko: "LOC 매수 알림" },
      condition: { type: "loc", op: "lte", value: loc },
      action: { type: "notify_buy" },
      source: `strategy:${ex.id}:loc`,
    });
  }
  // 고정 익절 — 수익률 ≥ tp_pct. 상대%.
  const tp = fieldNum(ex, "tp_pct");
  if (tp != null) {
    specs.push({
      name: { en: "Take-profit alert", ko: "익절 알림" },
      condition: { type: "return", op: "gte", value: tp },
      action: { type: "notify_sell" },
      source: `strategy:${ex.id}:tp`,
    });
  }
  // ex2 시간(정액분할매수): interval + amount → time 트리거. 가격 무관 정액 매수 알림.
  const interval = ex.fields?.find((f) => f.key === "interval");
  const hasAmount = ex.fields?.some((f) => f.key === "amount");
  if (interval && hasAmount) {
    const unitMap: Record<string, string> = { Daily: "day", Weekly: "week", Biweekly: "biweek", Monthly: "month" };
    const unit = unitMap[String(interval.default)] ?? "week";
    specs.push({
      name: { en: "Scheduled buy", ko: "정액 적립 매수" },
      condition: { type: "time", count: 1, unit },
      action: { type: "notify_buy" },
      source: `strategy:${ex.id}:time`,
    });
  }
  // ex6 비중(6:4 자산배분/리밸런싱): equity_w|target_w → weight 트리거. band는 콕핏과 동일하게 파생.
  const wKey = ex.fields?.find((f) => f.key === "equity_w" || f.key === "target_w")?.key;
  if (wKey) {
    const tw = fieldNum(ex, wKey);
    if (tw != null && tw > 0) {
      const band = Math.max(3, Math.round(tw * 0.25));
      specs.push({
        name: { en: "Rebalance to weight", ko: "목표 비중 리밸런싱" },
        condition: { type: "weight", target: tw, band },
        action: { type: "notify" },
        source: `strategy:${ex.id}:weight`,
      });
    }
  }
  // ex7 트레일링(모멘텀): stop + lookback → trailing 트리거. 고점 대비 스탑% 청산.
  const hasStop = ex.fields?.some((f) => f.key === "stop");
  const hasLook = ex.fields?.some((f) => f.key === "lookback");
  if (hasStop && hasLook) {
    const stopN = fieldNum(ex, "stop");
    const stop = stopN != null ? Math.abs(stopN) : 15;
    specs.push({
      name: { en: "Trailing stop", ko: "트레일링 스탑" },
      condition: { type: "trailing", value: stop },
      action: { type: "notify_sell" },
      source: `strategy:${ex.id}:trail`,
    });
  }
  // ex3 경로(밸류애버리징) — 미니멀: target_path → path 트리거(가치 경로 이탈 알림).
  const hasPath = ex.fields?.some((f) => f.key === "target_path");
  if (hasPath) {
    const V = fieldNum(ex, "target_path");
    if (V != null && V > 0) {
      specs.push({
        name: { en: "Value-path gap", ko: "가치 경로 이탈" },
        condition: { type: "path", op: "lte", value: V },
        action: { type: "notify" },
        source: `strategy:${ex.id}:path`,
      });
    }
  }
  return specs;
}

/** 목표(수익률/목표가) → 자동 규칙 1건. 전략 무관, 전 플랜 공통. */
export function rulesFromGoal(goal: PlanGoal | null | undefined): RuleSpec[] {
  if (!goal || !(goal.value > 0)) return [];
  if (goal.type === "return") {
    return [{
      name: { en: "Return goal", ko: "목표 수익률 도달" },
      condition: { type: "return", op: "gte", value: goal.value }, // 상대% (누적수익, 회차익절과 별개)
      action: { type: "notify" },
      source: "goal:return",
    }];
  }
  return [{
    name: { en: "Price goal", ko: "목표가 도달" },
    condition: { type: "price", op: "gte", value: goal.value }, // 절대 ₩ (사용자 지정)
    action: { type: "notify" },
    source: "goal:price",
  }];
}

/** 플랜의 전 자동 규칙(전략+목표) — 서버액션 재생성 시 단일 진입점. */
export function autoRulesFor(execId: string | null | undefined, goal: PlanGoal | null | undefined, plan?: UIPlan): RuleSpec[] {
  return [...rulesFromStrategy(execId, plan), ...rulesFromGoal(goal)];
}
