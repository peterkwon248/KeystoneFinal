// securities(DB) + security_financials → 프로토타입 Security 이음새 + 재사용 탭용 합성 UIPlan(secPlan).
// SecurityDetail(source/SecurityView.jsx)이 읽는 형태로 DB 행을 변환하고, financials/indicators/valuation
// 탭이 기대하는 UIPlan(plan-mapper의 mapDbPlan 산출물과 동일 시그니처)을 합성한다.
// ARCHITECTURE §7: 뷰/계산 로직은 그대로 — 데이터 소스만 교체하는 이음새.
import type { Currency, L10n, Market } from "@keystone/core/types";
import type { UIPlan, UINote } from "@/lib/plan-mapper";
import type { PriceClose } from "@/lib/trajectory";

/** securities 테이블 한 행 (select 결과) — SECURITY_SELECT와 짝. */
export interface DbSecurityRow {
  ticker: string;
  name: L10n;
  market: string;
  currency: string;
  sector: L10n | null;
  gics: L10n | null;
  exchange: string | null;
  shares_out: number | null;
  last_close: number | null;
}

/** security_financials 한 행 — eps는 스키마에 없어(마일스톤6) optional로 관대하게 읽는다. */
export interface DbSecurityFinRow {
  fiscal_year: number;
  eps?: number | null;
}

/** 프로토타입 SecurityView가 읽는 security 객체(source/data.jsx SECURITIES 항목과 동형). */
export interface UISecurity {
  ticker: string;
  name: L10n;
  market: Market;
  cur: Currency;
  sector: L10n;
  /** GICS 11 섹터(광의) — securities.gics jsonb. 관심종목 섹터 필터/그룹은 gics를 우선(원본 s.gics||s.sector). */
  gics: L10n | null;
  sharesOut: number;
  price: number;
  eps: number | null;
  /** ⚠️ DB 미저장 — mock 이음새(마일스톤6 실데이터 교체). 원본은 등락률을 보유.
   *  현재는 spark(mock 시계열)의 마지막 구간 델타에서 유도해 spark 방향과 부호가 일치하는
   *  self-consistent mock 값을 채운다(0 하드코딩 제거). 실 시세 델타는 마일스톤6에서 교체. */
  change: number;
  watched: boolean;
  /** mock placeholder chart — source/securities.jsx genSpark 재현. */
  spark: number[];
  journal: UINote[];
}

/** source/securities.jsx genSpark(seed, base, n=40) 그대로 — 결정적 mock 시계열.
 *  ⚠️ mock 이음새: 실 시세 이력은 마일스톤6에서 교체. */
export function genSpark(seed: number, base: number, n = 40): number[] {
  const pts: number[] = [];
  let v = base * 0.82;
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < n; i++) {
    v += (rnd() - 0.46) * base * 0.045;
    v = Math.max(base * 0.6, Math.min(base * 1.25, v));
    pts.push(v);
  }
  pts[n - 1] = base; // end at current price
  return pts;
}

/** 티커 문자열 → genSpark 시드(안정적). 원본은 배열 인덱스(i*37+11)를 썼으나 DB엔 인덱스가 없어
 *  티커 해시로 결정성을 유지한다(같은 종목이면 항상 같은 spark). */
function sparkSeedOf(ticker: string): number {
  let h = 11;
  for (let i = 0; i < ticker.length; i++) h = (h * 37 + ticker.charCodeAt(i)) % 233280;
  return h;
}

/** 실 종가(오름차순)에서 스파크 = 최근 n봉 종가. genSpark mock 대체(마일스톤6). */
function sparkFromCloses(closes: PriceClose[], n = 40): number[] {
  return closes.slice(-n).map((c) => c.close);
}
/** 실 종가에서 일일 등락률(%) = 마지막 2봉 델타. mockChange 대체(마일스톤6). */
function changeFromCloses(closes: PriceClose[]): number | null {
  if (closes.length < 2) return null;
  const last = closes[closes.length - 1].close, prev = closes[closes.length - 2].close;
  if (!prev) return null;
  return Math.round((last / prev - 1) * 10000) / 100;
}

/**
 * DB 행 → UISecurity. currency(KRW→KR/USD→US)로 market/cur 파생.
 * @param financialsRows fiscal_year desc 정렬 가정(최신이 [0]) — eps는 스키마 미저장이라 대개 null.
 * @param watched watchlist 존재 여부.
 * @param epsFromPlan 같은 ticker 플랜(plans 테이블)의 eps. security_financials엔 eps 컬럼이 없어
 *   현재 데이터로 유도 가능한 유일한 실 출처 — 있으면 사용, 없으면(플랜 없는 종목) null 폴백(문서화된 seam).
 */
export function mapSecurity(
  row: DbSecurityRow,
  financialsRows: DbSecurityFinRow[],
  watched: boolean,
  epsFromPlan?: number | null,
  closes?: PriceClose[],
): UISecurity {
  const cur = (row.currency === "KRW" ? "KRW" : "USD") as Currency;
  const market: Market = cur === "KRW" ? "KR" : "US";
  const price = Number(row.last_close ?? 0);
  // eps 출처: security_financials.eps(스키마 미저장 → 대개 null) → 같은 ticker 플랜의 eps.
  // security_financials엔 eps 컬럼이 없으므로 실제로는 plans 테이블 eps가 유일한 실 데이터 출처.
  const latestFin = (financialsRows ?? [])
    .slice()
    .sort((a, b) => b.fiscal_year - a.fiscal_year)[0];
  const epsFin = latestFin && latestFin.eps != null ? Number(latestFin.eps) : null;
  const eps = epsFin ?? (epsFromPlan != null && epsFromPlan > 0 ? Number(epsFromPlan) : null);
  const sector: L10n = row.sector ?? row.gics ?? { en: "—", ko: "—" };
  // 실 종가(closes)가 2봉 이상이면 실 스파크·실 등락률, 없으면 mock 폴백(genSpark/mockChange).
  const useReal = !!(closes && closes.length >= 2);
  const realSpark = useReal ? sparkFromCloses(closes!) : null;
  const realChange = useReal ? changeFromCloses(closes!) : null;
  const spark = realSpark && realSpark.length >= 2 ? realSpark : genSpark(sparkSeedOf(row.ticker), price > 0 ? price : 1);
  return {
    ticker: row.ticker,
    name: row.name,
    market,
    cur,
    sector,
    gics: row.gics ?? null,
    sharesOut: Number(row.shares_out ?? 0),
    price,
    eps,
    // ⚠️ mock 이음새(마일스톤6 실데이터 교체): 등락률은 DB 미저장.
    // 티커 시드 기반 결정적 등락률([-4.5%, +5.0%], 종목마다 다름·부호 섞임).
    // genSpark는 pts[n-1]=base로 엔드포인트를 고정해 마지막 구간 델타가 거의 항상 큰 양수 →
    // 예전 sparkChange가 전 종목을 +5.00%로 saturate하던 버그를 제거한다.
    change: realChange != null ? realChange : mockChange(row.ticker),
    watched,
    spark,
    journal: [],
  };
}

/** 티커 시드 → 결정적 일일 등락률(%) mock. 범위 [-4.5%, +5.0%], 종목마다 다르고 부호가 섞인다.
 *  genSpark의 강제 엔드포인트(pts[n-1]=base)에 의존하던 예전 sparkChange는 spark[n-2]가 거의 항상
 *  base 미만 → change가 항상 큰 양수 → ±5% 상한으로 saturate되어 전 종목이 +5.00%로 나오는 버그가
 *  있었다. 여기서는 spark와 독립적으로 티커 해시에서 균등분포를 뽑아 현실적 등락 범위로 매핑한다.
 *  결정적(리로드 시 동일)·종목마다 다름·부호 섞임. 스파크라인은 genSpark 유지(mini()가 change 부호로
 *  색칠하므로 색은 change와 일관). ⚠️ mock 이음새 — 실 시세 델타는 마일스톤6에서 교체. */
function mockChange(ticker: string): number {
  // FNV-1a 해시로 티커별 안정적 시드 → [0,1) 균등값.
  let h = 2166136261 >>> 0;
  for (let i = 0; i < ticker.length; i++) h = Math.imul(h ^ ticker.charCodeAt(i), 16777619);
  const u = (h >>> 0) / 4294967296; // [0,1)
  const LO = -4.5, HI = 5.0;
  const pct = LO + u * (HI - LO);
  return Math.round(pct * 100) / 100; // 소수 2자리
}

/**
 * 종목 → 재사용 탭(financials/indicators/valuation)이 읽는 합성 UIPlan.
 * plan-mapper.mapDbPlan 산출물과 같은 필드셋 — 탭들은 plan.cur/currentPrice/sharesOut/eps/strategyId/id/
 * priceHistory 만 읽으므로 그 필드를 정확히 채운다(나머지는 리스트/상세가 안 쓰는 안전한 기본값).
 * fin은 page.tsx가 buildPlanFin(plans/[id]와 동일)으로 계산해 탭에 별도 prop으로 넘기므로 여기선 null.
 */
export function secPlanOf(security: UISecurity): UIPlan {
  return {
    dbId: "" as unknown as string, // 합성 — DB 식별자 없음(라우팅/영속 대상 아님).
    id: "sec:" + security.ticker,
    ticker: security.ticker,
    tickerName: { en: security.name.en, ko: security.name.ko },
    cur: security.cur,
    name: { en: security.name.en, ko: security.name.ko },
    status: "research",
    portfolioId: null,
    strategyId: null,
    execId: null,
    currentPrice: security.price,
    avgPrice: 0,
    totalShares: 0,
    totalInvested: 0,
    round: null,
    createdAt: "",
    updatedAt: "",
    eps: security.eps ?? 0,
    sharesOut: security.sharesOut,
    scenarios: [],
    executions: [],
    rules: [],
    notes: [],
    tpPrice: null,
    slPrice: null,
    sector: security.sector,
    fin: null,
  };
}

/** journal_entries 한 행(종목 메모 스코프 select) — SEC_NOTE_SELECT와 짝. */
export interface DbSecNoteRow {
  id: string;
  body: string;
  price_snapshot: number | null;
  created_at: string;
}

/** 종목 상세 UI가 읽는 메모(journal_entries 공유, plan_id=null·ticker 스코프). */
export interface SecNote {
  id: string;
  body: string;
  /** 작성 시점 주가 스냅샷(없을 수 있음). */
  price: number | null;
  createdAt: string;
}

/** journal_entries 종목 메모 select 절. */
export const SEC_NOTE_SELECT = `id,body,price_snapshot,created_at`;

/** securities 테이블 select 절 — mapSecurity(DbSecurityRow)와 짝. */
export const SECURITY_SELECT = `
  ticker, name, market, currency, sector, gics, exchange, shares_out, last_close
`;

/** security_financials select 절 — eps는 스키마에 없어 있으면 읽고 없으면 무시(관대). */
export const SECURITY_FIN_SELECT = `fiscal_year, revenue, operating_margin, net_margin, roe, gross_margin, debt_ratio, current_ratio, dividend_yield, revenue_growth, unit`;
