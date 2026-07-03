// 전략 편집기(StrategyEditor, screens/05) 로컬 카탈로그 상수 — verbatim 이식.
// 원본: design_handoff_keystone/source/StrategyEditor.jsx 상단 상수 (STRAT_COLORS ~ FIELD_PRESETS).
// 읽기전용 카탈로그 뷰어라 이 상수들은 표시(픽커 옵션·툴팁·룰 카탈로그)에만 쓰인다.
// metricLabel 은 core metricDef(key) 를 래핑(원본 metricLabel(k,lang) → metricDef(k)?.[lang]).
import type { Lang, L10n } from "@keystone/core/types";
import { metricDef } from "@keystone/core/analytics";

export const STRAT_COLORS = ["#4C8DFF", "#BB6BD9", "#4CB782", "#F2994A", "#2D9CDB", "#EB5757", "#F2C94C"];
export const STRAT_ICONS = ["repeat-2", "activity", "scale", "trending-up", "target", "layers", "zap"];

export type FieldTypeKey = "Number" | "Percent" | "Currency" | "Text" | "Select" | "Date" | "Toggle";
export const FIELD_TYPE_LABEL: Record<FieldTypeKey, L10n> = {
  Number: { en: "Number", ko: "숫자" },
  Percent: { en: "Percent", ko: "퍼센트" },
  Currency: { en: "Currency", ko: "통화" },
  Text: { en: "Text", ko: "텍스트" },
  Select: { en: "Select", ko: "선택" },
  Date: { en: "Date", ko: "날짜" },
  Toggle: { en: "Toggle", ko: "토글" },
};

export const AUTO_FORMULA: Record<string, L10n> = {
  vr_vline: { ko: "목표 가치선 V — 진입 자본의 절반에서 시작해 연 성장률만큼 매일 복리로 커집니다. 평가액을 이 선에 맞춰 덜고 담습니다.", en: "Target value line — starts at half the entry capital and compounds daily by the annual growth rate." },
  loc_price: { ko: "평단가 × (1 − LOC 기준 %). LOC 기준을 바꾸면 자동으로 다시 계산됩니다.", en: "Avg cost × (1 − LOC %)." },
  unit_buy: { ko: "총 투자금 ÷ 분할 수. 1회당 매수 금액입니다.", en: "Capital ÷ divisions." },
  round: { ko: "지금까지 입력된 매수 체결 횟수에서 자동 집계됩니다.", en: "Counted from logged buy fills." },
  avg_cost: { ko: "전체 매수 체결의 가중 평균 단가입니다.", en: "Weighted average of all buy fills." },
  net_debt: { ko: "총차입금 − 현금성자산. 재무제표에서 자동 계산됩니다.", en: "Total debt − cash & equivalents, from the statements." },
  DEBT: { ko: "총부채 ÷ 자기자본 × 100. 재무제표에서 자동 계산됩니다.", en: "Total liabilities ÷ equity × 100, from the statements." },
  FCF: { ko: "영업현금흐름 − 자본적지출(CAPEX). 재무제표에서 자동 계산됩니다.", en: "Operating cash flow − capex." },
};
export const autoFormula = (key: string, lang: Lang): string => {
  const f = AUTO_FORMULA[key];
  return f ? f[lang] : (lang === "ko" ? "재무제표·체결 데이터에서 자동으로 계산되는 값입니다. 직접 입력하지 않습니다." : "Computed automatically from statement/fill data.");
};

export const FIELD_DESC: Record<string, L10n> = {
  divisions: { ko: "전체 투자금을 몇 번에 나눠 매수할지(분할 횟수)입니다. 무한매수법의 핵심 — 예: 40이면 40회로 나눠 삽니다.", en: "How many splits to divide your capital into for buying." },
  loc_pct: { ko: "LOC = 장 마감가(종가)로 자동 매수하는 주문이에요. 이 값은 그 매수 기준선 — 현재가가 이 % 만큼 빠지면 매수 신호가 떠요 (보통 음수, 예: −5%).", en: "LOC = auto-buy at the close. This is the trigger line — buy when price drops this % (usually negative)." },
  unit_buy: { ko: "1회당 매수 금액입니다. 보통 투자금 ÷ 분할 수로 자동 계산됩니다.", en: "Amount to buy per round (capital ÷ splits)." },
  tp_pct: { ko: "익절 기준 수익률 — 평단가 대비 이 % 이상이면 매도(익절) 신호를 냅니다.", en: "Take-profit threshold vs average cost." },
  round: { ko: "현재까지 진행한 매수 회차입니다. 체결이 쌓이면 자동으로 증가합니다.", en: "Current buy round; auto-increments on fills." },
  loc_price: { ko: "'LOC 기준 %'로 자동 계산된 매수 기준가예요. 직접 못 바꾸고, % 를 바꾸면 따라 움직여요.", en: "Auto-calculated buy price from the 'LOC %'. Read-only — change the %." },
};

export const TYPE_DESC: Record<string, L10n> = {
  Number: { ko: "숫자 값입니다 (예: 분할 수, 회차).", en: "A plain number." },
  Percent: { ko: "퍼센트 값입니다 (예: −5%, 10%).", en: "A percentage." },
  Currency: { ko: "금액입니다 (표시 통화 기준).", en: "A money amount." },
  Text: { ko: "자유 텍스트입니다.", en: "Free text." },
  Select: { ko: "정해진 보기 중 하나를 고릅니다.", en: "Pick from options." },
};

export interface StratRule { n?: string; when: L10n; then: L10n }
// Preset rules per strategy (for the editor's Rules + Preview)
export const STRAT_RULES: Record<string, StratRule[]> = {
  st1: [
    { n: "R1", when: { en: "Price ≤ LOC price", ko: "현재가 ≤ LOC 가격" }, then: { en: "Buy alert + show unit buy", ko: "매수 알림 + 1회 매수금 표시" } },
    { n: "R2", when: { en: "Buy execution added", ko: "매수 체결 입력됨" }, then: { en: "Round +1, recompute avg, new LOC", ko: "회차 +1, 평단가 재계산, 새 LOC 산출" } },
    { n: "R3", when: { en: "Return ≥ take-profit", ko: "수익률 ≥ 익절 기준" }, then: { en: "Alert + propose Closing", ko: "익절 알림 + 상태 → Closing 제안" } },
    { n: "R4", when: { en: "Round = divisions", ko: "회차 = 분할수" }, then: { en: "\"Complete\" badge + wait mode", ko: "\"매수 완료\" 뱃지 + 대기 모드" } },
  ],
  st2: [
    { n: "R1", when: { en: "Entry signal fires", ko: "진입 신호 발생" }, then: { en: "Entry alert", ko: "진입 알림" } },
    { n: "R2", when: { en: "Price ≤ stop line", ko: "현재가 ≤ 손절 라인" }, then: { en: "Stop-loss alert + Closing", ko: "손절 알림 + Closing" } },
    { n: "R3", when: { en: "Drawdown ≥ trailing stop", ko: "고점대비 하락 ≥ 트레일링 스탑" }, then: { en: "Trailing-stop sell alert", ko: "트레일링 스탑 매도 알림" } },
  ],
  st3: [
    { n: "R1", when: { en: "Price ≤ band low", ko: "현재가 ≤ 밴드 하한" }, then: { en: "Buy to target weight", ko: "목표 비중까지 매수" } },
    { n: "R2", when: { en: "Price ≥ band high", ko: "현재가 ≥ 밴드 상한" }, then: { en: "Trim to target weight", ko: "목표 비중까지 매도" } },
    { n: "R3", when: { en: "Rebalance cycle elapsed", ko: "리밸런싱 주기 경과" }, then: { en: "Rebalance reminder", ko: "리밸런싱 알림" } },
  ],
  st4: [
    { n: "R1", when: { en: "Interval reached", ko: "매수 주기 도래" }, then: { en: "Fixed-amount buy alert", ko: "정액 매수 알림" } },
    { n: "R2", when: { en: "Buy execution added", ko: "매수 체결 입력됨" }, then: { en: "Tranche +1, recompute avg", ko: "회차 +1, 평단가 재계산" } },
    { n: "R3", when: { en: "Tranche = total", ko: "회차 = 총 횟수" }, then: { en: "\"Complete\" badge + hold", ko: "\"완료\" 뱃지 + 보유 모드" } },
  ],
  st5: [
    { n: "R1", when: { en: "Interval reached", ko: "점검 주기 도래" }, then: { en: "Recompute target value path", ko: "목표 가치경로 재계산" } },
    { n: "R2", when: { en: "Value < target path", ko: "평가액 < 목표 경로" }, then: { en: "Buy gap to path", ko: "부족분만큼 매수 알림" } },
    { n: "R3", when: { en: "Value > target path", ko: "평가액 > 목표 경로" }, then: { en: "Trim excess to path", ko: "초과분만큼 매도 알림" } },
  ],
  st6: [
    { n: "R1", when: { en: "Price crosses grid down", ko: "현재가 격자 하향 돌파" }, then: { en: "Buy one grid lot", ko: "격자 1칸 매수" } },
    { n: "R2", when: { en: "Price crosses grid up", ko: "현재가 격자 상향 돌파" }, then: { en: "Sell one grid lot", ko: "격자 1칸 매도" } },
    { n: "R3", when: { en: "Price exits range", ko: "현재가 구간 이탈" }, then: { en: "Pause + alert", ko: "그리드 정지 + 알림" } },
  ],
  st7: [
    { n: "R1", when: { en: "Check cycle elapsed", ko: "점검 주기 경과" }, then: { en: "Compute current weight", ko: "현재 비중 산출" } },
    { n: "R2", when: { en: "Drift > band", ko: "이탈 > 허용치" }, then: { en: "Rebalance to target", ko: "목표 비중까지 리밸런싱" } },
  ],
};
// 실행 전략(ex)·프레임워크(fw) 키로 별칭 매핑 (의미 기준)
Object.assign(STRAT_RULES, {
  ex1: STRAT_RULES.st1, ex2: STRAT_RULES.st4, ex3: STRAT_RULES.st5, ex4: STRAT_RULES.st6, ex5: STRAT_RULES.st3, ex6: STRAT_RULES.st7, ex7: STRAT_RULES.st2,
});

export interface TriggerRefItem { l: L10n; d: L10n }
export interface TriggerRefGroup { cat: L10n; items: TriggerRefItem[] }
export const TRIGGER_REF: TriggerRefGroup[] = [
  { cat: { en: "Price", ko: "가격" }, items: [{ l: { en: "Price ≤ / ≥", ko: "현재가 ≤ / ≥" }, d: { ko: "현재 주가가 정한 값 이하(≤)·이상(≥)이 되면 발동해요.", en: "Fires when price is at/below or at/above a value." } }] },
  { cat: { en: "Return", ko: "수익" }, items: [{ l: { en: "Return ≤ / ≥", ko: "수익률 ≤ / ≥" }, d: { ko: "평단가 대비 수익률이 정한 %에 도달하면 발동해요.", en: "Fires when return vs avg cost reaches a %." } }] },
  { cat: { en: "Event", ko: "이벤트" }, items: [{ l: { en: "Execution added", ko: "체결 입력됨" }, d: { ko: "매수·매도 체결이 기록될 때마다 발동해요.", en: "Fires whenever a fill is logged." } }] },
  { cat: { en: "Field", ko: "필드" }, items: [{ l: { en: "Field = / ≥", ko: "Field 값 = / ≥" }, d: { ko: "전략 필드(예: 회차, LOC 가격)의 값이 특정 값과 같거나(=)·이상(≥)이면 발동해요. 예: '회차 = 분할수'면 분할 매수를 다 채웠을 때.", en: "Fires when a strategy field's value equals (=) or is at least (≥) a target. e.g. round = divisions." } }] },
  { cat: { en: "Time", ko: "시간" }, items: [{ l: { en: "Elapsed ≥ / daily at", ko: "경과 시간 ≥ / 매일 특정 시각" }, d: { ko: "보유 경과 시간이 일정 이상이거나, 매일 정해진 시각에 발동해요.", en: "Fires after an elapsed time, or daily at a set time." } }] },
];

export interface ActionRefItem { en: string; ko: string; d: L10n }
export const ACTION_REF: ActionRefItem[] = [
  { en: "Send notification", ko: "알림 보내기", d: { ko: "푸시·인앱 알림을 보냅니다.", en: "Sends a notification." } },
  { en: "Status transition", ko: "상태 전이", d: { ko: "플랜 상태를 바꿉니다 (예: 진행중 → 청산 검토).", en: "Changes the plan status." } },
  { en: "Update field", ko: "Field 업데이트", d: { ko: "전략 필드 값을 바꿉니다 (예: 회차 +1).", en: "Updates a strategy field (e.g. round +1)." } },
  { en: "Recompute field", ko: "Field 재계산", d: { ko: "자동 필드를 다시 계산합니다 (예: 평단가, LOC 가격).", en: "Recomputes auto fields (e.g. avg cost, LOC price)." } },
  { en: "Show badge", ko: "뱃지 표시", d: { ko: "카드에 상태 뱃지를 표시합니다 (예: '매수 완료').", en: "Shows a status badge on the card." } },
];

export interface MetricDefItem { key: string; en: string; ko: string }
export const METRIC_DEFS: MetricDefItem[] = [
  { key: "PER", en: "PER", ko: "PER" }, { key: "PBR", en: "PBR", ko: "PBR" }, { key: "PSR", en: "PSR", ko: "PSR" },
  { key: "EVEB", en: "EV/EBITDA", ko: "EV/EBITDA" }, { key: "ROE", en: "ROE", ko: "ROE" },
  { key: "OPM", en: "Op. margin", ko: "영업이익률" }, { key: "NPM", en: "Net margin", ko: "순이익률" },
  { key: "GPM", en: "Gross margin", ko: "매출총이익률" }, { key: "REVG", en: "Rev. growth", ko: "매출성장률" },
  { key: "DEBT", en: "Debt ratio", ko: "부채비율" }, { key: "DIVY", en: "Div. yield", ko: "배당수익률" },
  { key: "FCF", en: "FCF yield", ko: "FCF 수익률" }, { key: "DCF", en: "DCF value", ko: "DCF 가치" },
];
// 원본 metricLabel(k,lang) = METRIC_DEFS 내부 검색이었으나, core metricDef(k)?.[lang] 를 우선 래핑하고
// core 에 없으면 로컬 METRIC_DEFS, 그마저 없으면 key 그대로.
export const metricLabel = (k: string, lang: Lang): string => {
  const core = metricDef(k);
  if (core) return core[lang];
  const m = METRIC_DEFS.find((x) => x.key === k);
  return m ? m[lang] : k;
};

export interface FieldPreset { key: string; label: L10n; type: FieldTypeKey; default: string; auto: boolean }
export const FIELD_PRESETS: FieldPreset[] = [
  { key: "divisions", label: { en: "Divisions", ko: "분할 수" }, type: "Number", default: "40", auto: false },
  { key: "loc_pct", label: { en: "LOC %", ko: "LOC 기준" }, type: "Percent", default: "-5", auto: false },
  { key: "unit_buy", label: { en: "Per-round buy", ko: "1회 매수금" }, type: "Currency", default: "0", auto: true },
  { key: "tp_pct", label: { en: "Take-profit %", ko: "익절 기준" }, type: "Percent", default: "10", auto: false },
  { key: "round", label: { en: "Current round", ko: "현재 회차" }, type: "Number", default: "0", auto: true },
  { key: "loc_price", label: { en: "LOC price", ko: "LOC 가격" }, type: "Currency", default: "0", auto: true },
  { key: "avg_cost", label: { en: "Avg cost", ko: "평단가" }, type: "Currency", default: "0", auto: true },
  { key: "target", label: { en: "Target price", ko: "목표가" }, type: "Currency", default: "0", auto: false },
  { key: "hold_days", label: { en: "Target hold days", ko: "목표 보유일" }, type: "Number", default: "0", auto: false },
];
