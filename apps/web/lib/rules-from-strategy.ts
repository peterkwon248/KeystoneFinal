// 전략/목표 → 자동 규칙(materialized rules) 순수 매핑 — 규칙 자동화 v1.
// 웹 인라인(플랜 필터 patterns 일치): source/*.jsx에 대응 원본 없는 net-new 로직이라 골든 대상 아님.
// 설계: memory rules-automation-design. WHEN(조건)→THEN(동작), 파라메트릭(상대%) 저장 + 평가 시 라이브 계산.
//
// v1 스코프 = "loc_pct/tp_pct 필드를 가진 전략" = 무한매수법 + 전 플랜 목표.
//   그리드/밸류리밸런싱은 절대 파라미터(밴드 ₩, 가치선 V)를 사용자가 선설정해야 의미있어 v2로 미룸
//   (제네릭 default 60k/90k로 자동생성하면 ₩2M 종목에 헛규칙 → 오히려 오작동). 필드가 없으니 여기선 자연히 [] 반환.
//
// condition/action(jsonb)은 plan-mapper decodeTrig가 해독하는 형태:
//   loc(op lte)→loc_hit · return(op gte)→ret_ge · price(op gte/lte)→price_ge/le. action.type=RULE_ACTS id.
import { EXEC_STRATEGIES } from "@keystone/core/reference";
import type { UIPlan } from "./plan-mapper";
import type { PlanGoal } from "@/app/(shell)/plans/[id]/actions";

/** 물질화 규칙 스펙 — 서버액션이 rules insert 시 사용(plan_id·is_auto·source 부착). */
export interface RuleSpec {
  name: { en: string; ko: string };
  condition: { type: string; op?: string; value?: number };
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
