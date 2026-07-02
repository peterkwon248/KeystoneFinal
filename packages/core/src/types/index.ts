// @keystone/core/types — canonical shapes promoted from the prototype's mock data
// (source/data.jsx, source/securities.jsx). These mirror DATA_MODEL.md entities;
// mock-only fields (spark, priceHistory seeds…) are optional and marked.

/* ============ primitives ============ */
export type Lang = "en" | "ko";
/** bilingual string — every user-facing label carries both */
export interface L10n {
  en: string;
  ko: string;
}
export type Currency = "KRW" | "USD";
export type Market = "KR" | "US";

/* ============ plan lifecycle ============ */
export type PlanStatus = "research" | "planning" | "active" | "paused" | "closing" | "closed";
/** workflow-tab grouping: 검토(pre) / 진행중(open) / 종료(closed) */
export type WfType = "pre" | "open" | "closed";
export type ScenarioStatus = "tracking" | "approaching" | "realized" | "invalidated" | "pending";

export interface Scenario {
  label: L10n;
  color: string;
  target: number;
  status: ScenarioStatus;
  per?: number;
  cap?: number;
  thesis?: L10n;
  isAuto?: boolean;
}

export interface Execution {
  round?: number | null;
  side: "buy" | "sell";
  price: number;
  qty: number;
  date: string;
}

export interface Rule {
  id: string;
  name: L10n;
  on: boolean;
  last: string;
  trig?: string;
  trigVal?: string;
  when: L10n;
  then: L10n;
}

export interface PlanNote {
  id: string;
  when: L10n;
  text: string;
}

/* ============ strategy / framework catalogs ============ */
export type FieldType = "Text" | "Number" | "Percent" | "Currency" | "Date" | "Select";

export interface StrategyField {
  key: string;
  label: L10n;
  type: FieldType;
  default: string;
  /** the swing variable that separates Bull/Base/Bear */
  swing?: boolean;
  /** value derived from plan state, not user-entered */
  auto?: boolean;
  options?: L10n[];
}

export interface Threshold {
  dir: "low" | "high";
  good: number;
  warn: number;
}

export type FrameworkCat = "multiple" | "intrinsic" | "asset";

/** 관점(밸류에이션 렌즈) — 구 Strategies */
export interface Strategy {
  id: string;
  name: L10n;
  color: string;
  icon: string;
  isPreset?: boolean;
  cat: FrameworkCat;
  model: string;
  gradeFocus: string[];
  thresholds: Record<string, Threshold>;
  desc: L10n;
  fields: StrategyField[];
}

export interface ExecCat {
  id: string;
  label: L10n;
}

/** 실행 전략 — 어떻게 사고파나 (사이드바 '전략' 섹션) */
export interface ExecStrategy {
  id: string;
  name: L10n;
  color: string;
  icon: string;
  cat: string; // accum | rebal | signal | custom
  isPreset?: boolean;
  desc: L10n;
  fields: StrategyField[];
}

export interface Portfolio {
  id: string;
  name: L10n;
  color: string;
  icon: string;
}

/* ============ synthesized financials (seed shape — DART/EDGAR later) ============ */
export interface FinYearIS {
  y: string;
  rev: number;
  cogs: number;
  gross: number;
  sga: number;
  op: number;
  nonOp: number;
  pretax: number;
  tax: number;
  net: number;
  opm: number;
}
export interface FinYearBS {
  y: string;
  curAssets: number;
  nonCurAssets: number;
  assets: number;
  curLiab: number;
  nonCurLiab: number;
  liab: number;
  equity: number;
}
export interface FinYearCF {
  y: string;
  ocf: number;
  da: number;
  capex: number;
  icf: number;
  fcf_fin: number;
  net: number;
  fcf: number;
}

export type Grade = "good" | "mid" | "bad" | "neutral";
export type IndicatorCat = "value" | "profit" | "growth" | "stability" | "dividend";

export interface Indicator {
  key: string;
  cat: IndicatorCat;
  v: number | null;
  fmt: "x" | "pct";
  tone: Grade;
}

export interface Fin {
  unit: number;
  /** alias of `is` kept for prototype compatibility */
  rows: FinYearIS[];
  is: FinYearIS[];
  bs: FinYearBS[];
  cf: FinYearCF[];
  indicators: Indicator[];
}

export interface FinSeed {
  unit: number;
  rev: number[];
  opm: number[];
  npm: number;
  roe: number;
  gpm: number;
  debt: number;
  curr: number;
  divy: number;
  revg: number;
  divg?: number;
}

/* ============ plan ============ */
export interface PricePoint {
  q: number;
  v: number;
}
export interface ScenarioSnap {
  q: number;
  base: number;
  bull: number;
  bear: number;
}

export interface Plan {
  id: string;
  ticker: string;
  tickerName: L10n;
  flag?: string;
  cur: Currency;
  name: L10n;
  status: PlanStatus;
  portfolioId: string | null;
  strategyId: string | null;
  /** 실행 전략 (EXEC_STRATEGIES id) */
  execId?: string | null;
  currentPrice: number;
  avgPrice: number | null;
  totalShares: number;
  totalInvested: number;
  round?: number | null;
  divisions?: number;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  realizedPL?: number;
  goal?: { type: string; value: number };
  eps: number;
  sharesOut: number;
  scenarios: Scenario[];
  executions: Execution[];
  rules: Rule[];
  notes?: PlanNote[];
  /** per-plan SL/TP overrides (drag-set action lines) */
  tpPrice?: number | null;
  slPrice?: number | null;
  /* ---- 동행(갭 추적) enrichment — mock-derived today ---- */
  iv?: number;
  ivUpdatedAt?: string;
  ivHistory?: PricePoint[];
  priceHistory?: PricePoint[];
  gapMonths?: number;
  scenarioHistory?: ScenarioSnap[];
  gapReason?: L10n;
  catalyst?: L10n;
  fin?: Fin | null;
}

/* ============ securities ============ */
export interface Security {
  ticker: string;
  name: L10n;
  market: Market;
  flag: string;
  cur: Currency;
  price: number;
  change: number;
  eps: number;
  sharesOut: number;
  /** mock 5yr trailing PER band — real historical band via API later */
  perLo: number;
  perHi: number;
  sector: L10n;
  gics: L10n;
  exchange: string;
  watched: boolean;
  /** mock placeholder chart */
  spark?: number[];
}

export interface SecurityScenario {
  id: string;
  ticker: string;
  label: L10n;
  color: string;
  target: number;
  status: ScenarioStatus;
  createdAt: string;
  thesis: L10n;
}

/* ============ valuation engine ============ */
export interface ValuationInput {
  revenue: number;
  op: number;
  net: number;
  equity: number;
  dps: number;
  ebitda: number;
  fcf: number;
  netDebt: number;
  growth: number;
  targetPer: number;
  targetPbr: number;
  targetPsr: number;
  years: number;
}

export type Verdict = "under" | "fair" | "over";

export interface ValuationResult {
  cEps: number; fEps: number; cBps: number; fBps: number; cSps: number; fSps: number;
  fDps: number; cOps: number; fOps: number;
  cPer: number; fPer: number; cPbr: number; fPbr: number; cPsr: number; fPsr: number;
  cEbitdaPs: number; fEbitdaPs: number; cFcfPs: number; fFcfPs: number; netDebtPs: number;
  cEvEbitda: number; fEvEbitda: number;
  cOpM: number; fOpM: number; cNetM: number; fNetM: number; cRoe: number; fRoe: number;
  divYield: number; fDivYield: number;
  fairPer: number; fairPbr: number; fairPsr: number; fairAvg: number;
  upPer: number; upPbr: number; upPsr: number; upAvg: number;
  discount: number;
  verdict: Verdict;
}

export type BandKind = "per" | "pbr" | "psr" | "ev" | "fcf" | "por";

export interface Band {
  lo: number;
  mid: number;
  hi: number;
}

export interface BandTargets {
  bearP: number;
  baseP: number;
  bullP: number;
  bear: number;
  base: number;
  bull: number;
}

export interface ScenarioTargets {
  bull: number;
  base: number;
  bear: number;
}

export interface ValuationSlot {
  m: BandKind;
  v: number;
}

/* ============ future-test simulator ============ */
export type FTShape = "vrebound" | "lshape" | "stair" | "range" | "uptrend" | "spike";

export interface FTPreset {
  depth: number;
  troughT: number;
  endPct: number;
  vol: number;
  peak: boolean;
}

export interface FTAnchor {
  t: number;
  pct: number;
}

export interface PathPoint {
  t: number;
  price: number;
}

/** the engine attaches control-point metadata onto the array (prototype behavior kept) */
export interface PricePath extends Array<PathPoint> {
  cps?: number[][];
  anchors?: number[];
}

export type FTKind = "infinite" | "dca" | "value" | "grid" | "rebalance" | "signal" | "hold";

export interface FTPathParams {
  anchors?: FTAnchor[] | null;
  depth?: number;
  troughT?: number;
  endPct?: number;
  vol?: number;
  peak?: boolean;
  seed?: string;
}

export interface FTCfg {
  kind: FTKind;
  budget: number;
  startPrice?: number;
  divisions?: number;
  intervalSteps?: number;
  buyAmount?: number;
  tpPct?: number;
  slPct?: number;
  tpMode?: "pct" | "amt";
  slMode?: "pct" | "amt";
  tpAmt?: number;
  slAmt?: number;
  tpCur?: Currency;
  slCur?: Currency;
  valueStep?: number;
  gridLow?: number;
  gridHigh?: number;
  gridCount?: number;
  perGrid?: number;
  targetValue?: number;
  bandLow?: number;
  bandHigh?: number;
  maWin?: number;
  trailPct?: number;
  stopPct?: number;
  costPct?: number;
}

export interface SimStep {
  t: number;
  price: number;
  avg: number | null;
  qty: number;
  deployed: number;
  value: number;
  pnl: number;
}

export interface SimEvent {
  t: number;
  side: "buy" | "sell";
  price: number;
  qty: number;
  amount: number;
  round: number;
}

export interface SimExit {
  type: "tp" | "sl";
  t: number;
}

export interface SimSummary {
  finalAvg: number | null;
  maxDeployed: number;
  rounds: number;
  sells: number;
  mdd: number;
  mddPct: number;
  breakeven: number | null;
  finalValue: number;
  finalRet: number;
  won: boolean;
  tpHit: boolean;
  exit: SimExit | null;
  sigTrades: number;
  kind: FTKind;
}

export interface SimResult {
  steps: SimStep[];
  events: SimEvent[];
  summary: SimSummary;
}

/* ============ analytics helpers ============ */
export interface PlanReturn {
  rate: number;
  amt: number;
}

export interface GaugeData {
  lo: number;
  hi: number;
  bull: Scenario;
  base: Scenario | undefined;
  bear: Scenario;
  bearPos: number;
  basePos: number;
  bullPos: number;
  pos: number;
  primary: number;
  exitPrice: number | null;
  avgPos: number | null;
  avgPrice: number | null;
  isExit: boolean;
  dim: boolean;
}

export interface ActionLines {
  tp?: number;
  sl?: number;
}

export type ExecStateDir = "buy" | "sell" | "tp" | "stop" | "time" | "info";

export interface ExecStateCell {
  dir?: ExecStateDir;
  label: L10n;
  value: number | string | L10n;
  isMoney?: boolean;
  isText?: boolean;
  tip?: string;
}

export interface ExecStateHero {
  kind: "pct" | "money" | "text";
  value: number | string | L10n;
  dp?: number;
  sign?: string;
  tone?: string;
  sub?: L10n;
  tip?: string;
}

export interface PlanExecState {
  ex: ExecStrategy;
  type: string;
  progress: { round: number; divisions: number; pct: number } | null;
  hero: ExecStateHero | null;
  tagline: L10n | null;
  cells: ExecStateCell[];
}

/* ============ i18n ============ */
export type I18nDict = Record<string, string>;
export interface I18nTable {
  en: I18nDict;
  ko: I18nDict;
}

/* ============ display helpers ============ */
export interface SharesDisp {
  v: number;
  suf: string;
}

export interface DispMoney {
  v: number;
  cur: Currency;
}

/* ============ DB schema types (generated) ============ */
// supabase/migrations 스키마에서 생성 — 재생성: 루트에서 `pnpm db:types`
export type { Database, Json } from "./database";
