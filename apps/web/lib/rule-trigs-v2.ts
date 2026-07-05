// v2 웹측 트리거 카탈로그 — core RULE_TRIGS(i18n-reference.test 골든 deep-equal 락)에 추가 불가라 웹에서 확장.
// 전략에서 자동 물질화(rules-from-strategy)되고, 표시·평가는 웹 레이어(rule-eval-v2)가 담당. closeout.ts 패턴.
import { RULE_TRIGS, type RuleTrig } from "@keystone/core/reference";

export const RULE_TRIGS_V2: readonly RuleTrig[] = [
  { id: "time_due", ko: "적립 예정일 도달", en: "Schedule due", hasValue: false, unit: "", descKo: "정액분할 주기(예: 매주)에 따라 다음 매수 예정일이 되면 발동합니다. 가격과 무관하게 정액 매수 알림.", descEn: "Fires on the next scheduled buy date (fixed-amount DCA), regardless of price." },
  { id: "weight_off", ko: "목표 비중 이탈", en: "Weight off-band", hasValue: false, unit: "", descKo: "평가 비중이 목표 비중 ±밴드를 벗어나면 발동합니다. 상단 초과=매도, 하단 미만=매수.", descEn: "Fires when weight drifts outside the target band. Above = trim, below = add." },
  { id: "trail_stop", ko: "트레일링 스탑 도달", en: "Trailing stop", hasValue: false, unit: "", descKo: "고점 대비 스탑% 아래로 현재가가 내려오면 발동합니다. 추세 추종 청산 신호.", descEn: "Fires when price falls the stop% below the running peak — a trend-following exit." },
  { id: "path_gap", ko: "가치 경로 이탈", en: "Value-path gap", hasValue: false, unit: "", descKo: "평가액이 목표 가치 경로(밸류애버리징)에서 벗어나면 알림. 경로 아래=매수, 위=매도 검토.", descEn: "Alerts when value drifts off the target value path (value-averaging). Below = add, above = trim." },
];

export const RULE_TRIGS_ALL: readonly RuleTrig[] = [...RULE_TRIGS, ...RULE_TRIGS_V2];

/** trig id → 정의 (core 7 + v2 4 병합 룩업). strategy-tab 라벨/설명에 사용. */
export function findTrig(id: string | undefined): RuleTrig | undefined {
  return id ? RULE_TRIGS_ALL.find((x) => x.id === id) : undefined;
}
