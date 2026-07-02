// @keystone/core/reference — read-only catalogs promoted from the prototype
// (source/data.jsx, source/securities.jsx): status system, portfolios, valuation
// frameworks (구 Strategies), execution strategies, execution categories, and the
// shared securities metric dictionary/formula. Ported verbatim.

import type {
  ExecCat,
  ExecStrategy,
  Lang,
  PlanStatus,
  Portfolio,
  Strategy,
  WfType,
} from "../types/index.ts";

// 전략·프레임워크는 수익화/API 연동 전까지 읽기 전용 카탈로그로 고정. true → 생성·편집·삭제 잠금.
export const LIBRARY_LOCKED = true;

/* ============ Status system (Reticle lifecycle) ============ */
export const PLAN_STATUS: Record<PlanStatus, { color: string; key: PlanStatus }> = {
  research: { color: "var(--r-research)", key: "research" },
  planning: { color: "var(--r-planning)", key: "planning" },
  active:   { color: "var(--r-active)",   key: "active" },
  paused:   { color: "var(--r-paused)",   key: "paused" },
  closing:  { color: "var(--r-closing)",  key: "closing" },
  closed:   { color: "var(--r-closed)",   key: "closed" },
};
export const STATUS_ORDER: PlanStatus[] = ["research", "planning", "active", "paused", "closing", "closed"];
// workflow-tab grouping: 검토(pre) / 진행중(open) / 종료(closed)
export const WF_TYPE: Record<PlanStatus, WfType> = { research: "pre", planning: "pre", active: "open", paused: "open", closing: "open", closed: "closed" };

/* ============ Portfolios ============ */
export const PORTFOLIOS: Portfolio[] = [
  { id: "pf1", name: { en: "Korea growth", ko: "국내 성장주" }, color: "#4C8DFF", icon: "trending-up" },
  { id: "pf2", name: { en: "US big tech", ko: "미국 빅테크" }, color: "#BB6BD9", icon: "cpu" },
  { id: "pf3", name: { en: "Value & dividend", ko: "가치·배당" }, color: "#4CB782", icon: "landmark" },
];

/* ============ Valuation Frameworks (구 Strategies) ============ */
// 프레임워크 = 밸류에이션 스키마. 각 프레임워크가 모델 + 가정 필드 + 시나리오를 가르는
// 스윙 변수(swing:true)를 정의한다. cat: multiple(멀티플) / intrinsic(내재가치) / asset(자산).
export const STRATEGIES: Strategy[] = [
  {
    id: "st1", name: { en: "Quality P/E", ko: "퀄리티 PER" }, color: "#4CB782", icon: "gauge", isPreset: true, cat: "multiple", model: "PER", gradeFocus: ["PER", "ROE", "OPM"], thresholds: { PER: { dir: "low", good: 15, warn: 40 }, ROE: { dir: "high", good: 25, warn: 8 }, OPM: { dir: "high", good: 32, warn: 9 } },
    desc: { en: "Forward EPS × target P/E. Standard for earnings-visible compounders.", ko: "예상 EPS × 목표 PER. 이익 가시성 높은 우량주 표준 평가." },
    fields: [
      { key: "eps_growth", label: { en: "EPS growth", ko: "예상 EPS 성장률" }, type: "Percent", default: "8%" },
      { key: "target_per", label: { en: "Target P/E", ko: "목표 PER" }, type: "Number", default: "12", swing: true },
      { key: "fwd_eps", label: { en: "Forward EPS", ko: "예상 EPS" }, type: "Currency", default: "auto", auto: true },
    ],
  },
  {
    id: "st2", name: { en: "Growth DCF", ko: "성장주 DCF" }, color: "#4C8DFF", icon: "trending-up", isPreset: true, cat: "intrinsic", model: "DCF", gradeFocus: ["REVG", "OPM", "ROE"], thresholds: { REVG: { dir: "high", good: 20, warn: 4 }, OPM: { dir: "high", good: 32, warn: 9 }, ROE: { dir: "high", good: 25, warn: 8 } },
    desc: { en: "Discounted free cash flow. For high-growth, services-heavy businesses.", ko: "미래 잉여현금흐름 할인. 고성장·서비스 비즈니스에 적합." },
    fields: [
      { key: "fcf_growth", label: { en: "FCF growth (5y)", ko: "FCF 성장률(5y)" }, type: "Percent", default: "12%", swing: true },
      { key: "discount_rate", label: { en: "Discount rate", ko: "할인율(WACC)" }, type: "Percent", default: "9%" },
      { key: "term_growth", label: { en: "Terminal growth", ko: "영구성장률" }, type: "Percent", default: "2.5%" },
    ],
  },
  {
    id: "st3", name: { en: "Asset / Book P/B", ko: "가치·자산주 PBR" }, color: "#2D9CDB", icon: "layers", isPreset: true, cat: "asset", model: "PBR", gradeFocus: ["PBR", "ROE", "DIVY"], thresholds: { PBR: { dir: "low", good: 1.2, warn: 8 }, ROE: { dir: "high", good: 25, warn: 8 }, DIVY: { dir: "high", good: 1.4, warn: 0.2 } },
    desc: { en: "Net-asset based. For low-P/B, asset-rich names. Does ROE justify the multiple?", ko: "순자산 기반. 저PBR·자산주. ROE가 목표 PBR을 정당화하는가." },
    fields: [
      { key: "target_pbr", label: { en: "Target P/B", ko: "목표 PBR" }, type: "Number", default: "0.9", swing: true },
      { key: "roe", label: { en: "Normalized ROE", ko: "정상 ROE" }, type: "Percent", default: "10%" },
      { key: "bps", label: { en: "BPS", ko: "주당순자산" }, type: "Currency", default: "auto", auto: true },
    ],
  },
  {
    id: "st4", name: { en: "Dividend DDM", ko: "배당주 DDM" }, color: "#F2994A", icon: "coins", isPreset: true, cat: "intrinsic", model: "DDM", gradeFocus: ["DIVY", "NPM", "DEBT"], thresholds: { DIVY: { dir: "high", good: 1.4, warn: 0.2 }, NPM: { dir: "high", good: 25, warn: 8 }, DEBT: { dir: "low", good: 33, warn: 120 } },
    desc: { en: "Dividend discount model. For stable payers. Growth & required return drive it.", ko: "배당할인모형. 안정적 배당주. 배당성장률·요구수익률이 핵심." },
    fields: [
      { key: "div_growth", label: { en: "Dividend growth", ko: "배당성장률" }, type: "Percent", default: "4%" },
      { key: "req_return", label: { en: "Required return", ko: "요구수익률" }, type: "Percent", default: "8%", swing: true },
      { key: "dps", label: { en: "DPS", ko: "주당배당금" }, type: "Currency", default: "auto", auto: true },
    ],
  },
  {
    id: "st5", name: { en: "Cyclical EV/EBITDA", ko: "경기민감 EV/EBITDA" }, color: "#F2C94C", icon: "activity", isPreset: true, cat: "multiple", model: "EV", gradeFocus: ["OPM", "DEBT", "GPM"], thresholds: { OPM: { dir: "high", good: 32, warn: 9 }, DEBT: { dir: "low", good: 33, warn: 120 }, GPM: { dir: "high", good: 52, warn: 30 } },
    desc: { en: "Capital-structure-neutral. For semis/materials cycles. Normalized EBITDA is key.", ko: "자본구조 중립 평가. 반도체·소재 사이클. 정상화 EBITDA가 관건." },
    fields: [
      { key: "ebitda_growth", label: { en: "EBITDA growth", ko: "EBITDA 성장률" }, type: "Percent", default: "10%" },
      { key: "target_ev", label: { en: "Target EV/EBITDA", ko: "목표 EV/EBITDA" }, type: "Number", default: "6", swing: true },
      { key: "net_debt", label: { en: "Net debt", ko: "순부채" }, type: "Currency", default: "auto", auto: true },
    ],
  },
  {
    id: "st6", name: { en: "Platform P/S", ko: "플랫폼 PSR" }, color: "#BB6BD9", icon: "boxes", isPreset: true, cat: "multiple", model: "PSR", gradeFocus: ["REVG", "GPM", "NPM"], thresholds: { REVG: { dir: "high", good: 20, warn: 4 }, GPM: { dir: "high", good: 52, warn: 30 }, NPM: { dir: "high", good: 25, warn: 8 } },
    desc: { en: "Revenue-based. For loss-making early growth. Margin-normalization is the bet.", ko: "매출 기반 평가. 적자·초기 고성장 기업. 마진 정상화 가정이 핵심." },
    fields: [
      { key: "rev_growth", label: { en: "Revenue growth", ko: "매출 성장률" }, type: "Percent", default: "25%" },
      { key: "target_psr", label: { en: "Target P/S", ko: "목표 PSR" }, type: "Number", default: "8", swing: true },
      { key: "sps", label: { en: "Sales per share", ko: "주당매출" }, type: "Currency", default: "auto", auto: true },
    ],
  },
  {
    id: "st7", name: { en: "Sum-of-the-Parts", ko: "부분합산 SOTP" }, color: "#9B6BD9", icon: "pie-chart", isPreset: true, cat: "asset", model: "PBR", gradeFocus: ["PBR", "DEBT", "ROE"], thresholds: { PBR: { dir: "low", good: 1.2, warn: 8 }, DEBT: { dir: "low", good: 33, warn: 120 }, ROE: { dir: "high", good: 25, warn: 8 } },
    desc: { en: "Value each segment separately, sum, subtract net debt. For conglomerates.", ko: "사업부별로 따로 평가해 합산 후 순부채 차감. 지주·복합기업용." },
    fields: [
      { key: "core_mult", label: { en: "Core segment mult.", ko: "핵심 사업부 배수" }, type: "Number", default: "10", swing: true },
      { key: "holdco_disc", label: { en: "Holdco discount", ko: "지주 할인율" }, type: "Percent", default: "30%" },
      { key: "sotp_value", label: { en: "SOTP value", ko: "합산 가치" }, type: "Currency", default: "auto", auto: true },
    ],
  },
  {
    id: "st8", name: { en: "Turnaround", ko: "턴어라운드" }, color: "#2BB3A3", icon: "rotate-ccw", isPreset: true, cat: "intrinsic", model: "PER", gradeFocus: ["OPM", "DEBT", "REVG"], thresholds: { OPM: { dir: "high", good: 32, warn: 9 }, DEBT: { dir: "low", good: 33, warn: 120 }, REVG: { dir: "high", good: 20, warn: 4 } },
    desc: { en: "Values normalized recovery earnings × target P/E. For margin-recovery / restructuring stories.", ko: "정상화된 회복 이익 × 목표 PER로 평가. 마진 회복·구조조정 국면 기업에 적합." },
    fields: [
      { key: "norm_opm", label: { en: "Normalized op. margin", ko: "정상 영업이익률" }, type: "Percent", default: "10%", swing: true },
      { key: "recovery_years", label: { en: "Recovery horizon", ko: "회복 기간" }, type: "Text", default: "2y" },
      { key: "target_per", label: { en: "Target P/E (norm.)", ko: "목표 PER(정상)" }, type: "Number", default: "11" },
      { key: "norm_eps", label: { en: "Normalized EPS", ko: "정상 EPS" }, type: "Currency", default: "auto", auto: true },
    ],
  },
];

/* ============ Execution Strategies (키스톤 실행 전략 — 사이드바 '전략' 섹션) ============ */
// 프레임워크(밸류에이션 렌즈)와 별개. 전략 = 어떻게 사고파나. cat: accum/rebal/signal.
// 편집형 카테고리 레지스트리 — 사용자가 이름 변경·추가 가능 (원본은 localStorage 영속; 포트에서는 기본값만 유지)
export const DEFAULT_EXEC_CATS: ExecCat[] = [
  { id: "accum", label: { en: "Accumulate", ko: "분할·누적" } },
  { id: "rebal", label: { en: "Rebalance", ko: "리밸런싱" } },
  { id: "signal", label: { en: "Signal", ko: "시그널" } },
];
export const EXEC_CATS = DEFAULT_EXEC_CATS;
export function catLabel(id: string, lang: Lang, cats: ExecCat[] = EXEC_CATS): string { const c = cats.find(x => x.id === id); return c ? c.label[lang] : id; }
export const EXEC_STRATEGIES: ExecStrategy[] = [
  { id: "ex1", name: { en: "Infinite Buying", ko: "무한매수법" }, color: "#BB6BD9", icon: "repeat-2", cat: "accum", isPreset: true, desc: { en: "40-way split LOC accumulation with a fixed take-profit (라오어).", ko: "40분할 LOC 누적 매수 + 고정 익절(라오어 방식)." }, fields: [
    { key: "divisions", label: { en: "Divisions", ko: "분할 수" }, type: "Number", default: "40" },
    { key: "loc_pct", label: { en: "LOC threshold", ko: "LOC 기준" }, type: "Percent", default: "-5.0%" },
    { key: "unit_buy", label: { en: "Unit buy", ko: "1회 매수금" }, type: "Currency", default: "auto", auto: true },
    { key: "tp_pct", label: { en: "Take-profit", ko: "익절 기준" }, type: "Percent", default: "10.0%" },
    { key: "round", label: { en: "Current round", ko: "현재 회차" }, type: "Number", default: "auto", auto: true },
    { key: "loc_price", label: { en: "LOC price", ko: "LOC 가격" }, type: "Currency", default: "auto", auto: true },
  ] },
  { id: "ex2", name: { en: "Dollar-Cost Averaging", ko: "정액분할매수" }, color: "#4C8DFF", icon: "calendar-clock", cat: "accum", isPreset: true, desc: { en: "Buy a fixed amount on a set schedule, regardless of price.", ko: "가격과 무관하게 정해진 주기마다 같은 금액을 매수." }, fields: [
    { key: "amount", label: { en: "Per-period amount", ko: "회당 매수금" }, type: "Currency", default: "500,000" },
    { key: "interval", label: { en: "Interval", ko: "매수 주기" }, type: "Select", default: "Weekly", options: [{ en: "Daily", ko: "매일" }, { en: "Weekly", ko: "매주" }, { en: "Biweekly", ko: "격주" }, { en: "Monthly", ko: "매월" }] },
    { key: "avg_cost", label: { en: "Avg cost", ko: "평균 단가" }, type: "Currency", default: "auto", auto: true },
  ] },
  { id: "ex3", name: { en: "Value Averaging", ko: "밸류애버리징" }, color: "#F2994A", icon: "trending-up", cat: "accum", isPreset: true, desc: { en: "Buy more when below the target value path, less when above.", ko: "목표 평가액 경로보다 부족하면 더, 넘으면 덜 매수." }, fields: [
    { key: "target_path", label: { en: "Target growth/mo", ko: "목표 증가액/월" }, type: "Currency", default: "600,000" },
    { key: "gap", label: { en: "Gap to path", ko: "경로 대비 갭" }, type: "Currency", default: "auto", auto: true },
  ] },
  { id: "ex4", name: { en: "Grid Trading", ko: "그리드 매매" }, color: "#9B6BD9", icon: "grid-3x3", cat: "accum", isPreset: true, desc: { en: "Buy/sell in steps across a price band — a systematic way to trade a range-bound (box) market.", ko: "설정 구간을 격자로 나눠 등락마다 분할 매수·매도. 가격이 박스권에서 횡보할 때 효과적인 대표적 분할 매매 방식입니다." }, fields: [
    { key: "upper", label: { en: "Upper band", ko: "상단" }, type: "Currency", default: "90,000" },
    { key: "lower", label: { en: "Lower band", ko: "하단" }, type: "Currency", default: "60,000" },
    { key: "grids", label: { en: "Grid count", ko: "그리드 수" }, type: "Number", default: "20" },
  ] },
  { id: "ex5", name: { en: "Value Rebalance", ko: "밸류리밸런싱" }, color: "#4CB782", icon: "scale", cat: "rebal", isPreset: true,
    desc: { en: "Track a target value line that grows yearly; trim above the upper band, add below the lower band, using a cash pool.", ko: "매년 커지는 목표 가치선을 따라 — 상단 밴드를 넘으면 매도, 하단 밴드를 이탈하면 현금풀로 매수합니다." },
    fields: [
      { key: "vr_vline", label: { en: "Target value line (V)", ko: "목표 가치선 (V)" }, type: "Currency", default: "auto", auto: true },
      { key: "vr_upper", label: { en: "Upper band", ko: "상단 밴드" }, type: "Percent", default: "15%" },
      { key: "vr_lower", label: { en: "Lower band", ko: "하단 밴드" }, type: "Percent", default: "15%" },
      { key: "vr_growth", label: { en: "Annual growth", ko: "연 성장률" }, type: "Percent", default: "15%" },
      { key: "vr_pool", label: { en: "Cash pool limit", ko: "현금풀 한도" }, type: "Percent", default: "25%" },
    ] },
  { id: "ex6", name: { en: "60/40 Allocation", ko: "6:4 자산배분" }, color: "#2D9CDB", icon: "pie-chart", cat: "rebal", isPreset: true, desc: { en: "Classic 60% equity / 40% defensive, rebalanced periodically.", ko: "주식 60 / 방어자산 40 비중을 주기적으로 리밸런싱." }, fields: [
    { key: "equity_w", label: { en: "Equity weight", ko: "주식 비중" }, type: "Percent", default: "60%" },
    { key: "rebal", label: { en: "Rebalance cycle", ko: "리밸런싱 주기" }, type: "Select", default: "Quarterly", options: [{ en: "Monthly", ko: "매월" }, { en: "Quarterly", ko: "분기마다" }, { en: "Yearly", ko: "매년" }] },
  ] },
  { id: "ex7", name: { en: "Momentum", ko: "모멘텀" }, color: "#2D9CDB", icon: "activity", cat: "signal", isPreset: true, desc: { en: "Ride relative-strength trends with a trailing stop.", ko: "상대강도 추세를 추종하고 트레일링 스탑으로 관리." }, fields: [
    { key: "lookback", label: { en: "Lookback", ko: "조회 기간" }, type: "Text", default: "12-1mo" },
    { key: "stop", label: { en: "Trailing stop", ko: "트레일링 스탑" }, type: "Percent", default: "-15%" },
  ] },
];

/* ============ Markets (from securities.jsx) ============ */
export const MARKETS = [
  { key: "KR", label: { en: "Korea", ko: "한국" }, flag: "🇰🇷" },
  { key: "US", label: { en: "US", ko: "미국" }, flag: "🇺🇸" },
];

// Shared metric dictionary (name + plain-language concept) + formula — SINGLE SOURCE OF TRUTH
// so the screener row tooltips match the security-detail indicator cards exactly (no drift).
export function KS_METRIC_DICT(ko: boolean): Record<string, [string, string]> {
  return {
    PER: ["PER", ko ? "지금 주가가 1년 이익의 몇 배인지 보여줘요. 낮을수록 이익 대비 싸게 거래되는 거예요." : "How many years of earnings the price equals — lower is cheaper."],
    PBR: ["PBR", ko ? "주가가 회사 순자산의 몇 배인지예요. 1배보다 낮으면 장부가보다 싸게 팔리는 셈이에요." : "Price vs. net assets — under 1× trades below book value."],
    PSR: ["PSR", ko ? "주가를 매출과 비교해요. 아직 적자거나 빠르게 크는 회사를 볼 때 유용해요." : "Price vs. sales — useful for loss-making or fast-growing firms."],
    PCR: ["PCR", ko ? "주가를 실제 벌어들인 현금과 비교해요. 회계 이익보다 현금이 탄탄한지 봐요." : "Price vs. operating cash — checks cash strength behind profit."],
    EVEB: ["EV/EBITDA", ko ? "빚까지 포함한 회사 전체 값을 영업현금창출력과 비교해요. 인수자 관점의 가격이에요." : "Whole-company value (incl. debt) vs. core cash earnings."],
    PEG: ["PEG", ko ? "PER을 이익 성장률로 나눠요. 1배보다 낮으면 성장에 비해 주가가 싸다는 뜻이에요." : "PER divided by growth — under 1× is cheap for the growth."],
    ROE: ["ROE", ko ? "자기자본으로 1년에 얼마를 벌었는지예요. 높을수록 돈을 잘 굴리는 회사예요." : "Profit earned on shareholders' money — higher is better."],
    ROA: ["ROA", ko ? "보유 자산 전체로 얼마를 벌었는지예요. 자산을 얼마나 효율적으로 쓰는지 봐요." : "Profit earned on all assets — asset efficiency."],
    OPM: [ko ? "영업이익률" : "Op. margin", ko ? "매출 대비 남는 이익률이에요. 사업 자체의 수익성을 보여줘요." : "Profit kept from each ₩100 of sales, before non-operating items."],
    NPM: [ko ? "순이익률" : "Net margin", ko ? "매출에서 세금·이자까지 다 빼고 최종으로 남는 비율이에요." : "What's left from sales after all costs and taxes."],
    GPM: [ko ? "매출총이익률" : "Gross margin", ko ? "원가를 빼고 남는 마진이에요. 제품 경쟁력과 가격결정력을 보여줘요." : "Margin after cost of goods — pricing power signal."],
    REVG: [ko ? "매출성장률" : "Rev. growth", ko ? "작년보다 매출이 얼마나 늘었는지예요. 회사가 커지고 있는지 보는 1순위 지표예요." : "How much sales grew vs. last year."],
    OPG: [ko ? "영업이익성장률" : "OP growth", ko ? "영업이익이 작년보다 얼마나 늘었는지예요. 매출보다 빠르면 수익성이 좋아지는 중이에요." : "Operating profit growth — faster than sales means improving margins."],
    NPG: [ko ? "순이익성장률" : "NI growth", ko ? "최종 이익이 작년보다 얼마나 늘었는지예요." : "How much bottom-line profit grew vs. last year."],
    DEBT: [ko ? "부채비율" : "Debt ratio", ko ? "자기자본 대비 빚의 크기예요. 낮을수록 안전하고, 100% 이하면 양호해요." : "Debt vs. equity — lower is safer, under 100% is healthy."],
    CURR: [ko ? "유동비율" : "Current ratio", ko ? "1년 안에 갚을 빚을 당장 동원 가능한 자산으로 감당할 수 있는지예요. 150% 넘으면 안정적이에요." : "Short-term assets vs. short-term debts — over 150% is stable."],
    INTCOV: [ko ? "이자보상배율" : "Int. coverage", ko ? "영업이익으로 이자를 몇 번 갚을 수 있는지예요. 높을수록 빚 부담이 적어요." : "How many times profit covers interest — higher is safer."],
    DIVY: [ko ? "배당수익률" : "Div. yield", ko ? "지금 주가로 샀을 때 1년에 받는 배당 비율이에요. 예금 이자처럼 생각하면 돼요." : "Annual dividend as a % of today's price."],
    PAYOUT: [ko ? "배당성향" : "Payout", ko ? "번 이익 중 얼마를 배당으로 나눠주는지예요. 너무 높으면 배당을 유지하기 빠듯할 수 있어요." : "Share of profit paid as dividends — too high can be unsustainable."],
    DIVG: [ko ? "배당성장률" : "Div. growth", ko ? "배당금이 해마다 얼마나 늘었는지예요. 배당이 꾸준히 커지는 회사를 찾을 때 봐요." : "How fast the dividend has been growing each year."],
  };
}
export const KS_METRIC_FORMULA: Record<string, string> = { PER: "PER = 주가 / EPS", PBR: "PBR = 주가 / BPS", PSR: "PSR = 주가 / 주당매출", PCR: "PCR = 주가 / 주당영업현금흐름", EVEB: "EV/EBITDA = (시총+순부채) / EBITDA", PEG: "PEG = PER / 이익성장률", ROE: "ROE = 순이익 / 자기자본", ROA: "ROA = 순이익 / 총자산", OPM: "영업이익률 = 영업이익 / 매출", NPM: "순이익률 = 순이익 / 매출", GPM: "매출총이익률 = 매출총이익 / 매출", REVG: "매출성장률 = (당기−전기) / 전기 매출", OPG: "영업이익성장률 = (당기−전기) / 전기 영업이익", NPG: "순이익성장률 = (당기−전기) / 전기 순이익", DEBT: "부채비율 = 부채 / 자기자본", CURR: "유동비율 = 유동자산 / 유동부채", INTCOV: "이자보상배율 = 영업이익 / 이자비용", DIVY: "배당수익률 = 주당배당 / 주가", PAYOUT: "배당성향 = 배당 / 순이익", DIVG: "배당성장률 = 배당 연평균 증가율" };
