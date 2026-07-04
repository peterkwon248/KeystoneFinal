// securities(DB) + security_financials → 프로토타입 Security 이음새 + 재사용 탭용 합성 UIPlan(secPlan).
// SecurityDetail(source/SecurityView.jsx)이 읽는 형태로 DB 행을 변환하고, financials/indicators/valuation
// 탭이 기대하는 UIPlan(plan-mapper의 mapDbPlan 산출물과 동일 시그니처)을 합성한다.
// ARCHITECTURE §7: 뷰/계산 로직은 그대로 — 데이터 소스만 교체하는 이음새.
import type { Currency, L10n, Market } from "@keystone/core/types";
import type { UIPlan, UINote } from "@/lib/plan-mapper";

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
  sharesOut: number;
  price: number;
  eps: number | null;
  /** ⚠️ DB 미저장 — mock 이음새(마일스톤6 실데이터 교체). 원본은 등락률을 보유. */
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
  return {
    ticker: row.ticker,
    name: row.name,
    market,
    cur,
    sector,
    sharesOut: Number(row.shares_out ?? 0),
    price,
    eps,
    change: 0, // ⚠️ DB 미저장 — mock 이음새(마일스톤6).
    watched,
    spark: genSpark(sparkSeedOf(row.ticker), price > 0 ? price : 1),
    journal: [],
  };
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

/** securities 테이블 select 절 — mapSecurity(DbSecurityRow)와 짝. */
export const SECURITY_SELECT = `
  ticker, name, market, currency, sector, gics, exchange, shares_out, last_close
`;

/** security_financials select 절 — eps는 스키마에 없어 있으면 읽고 없으면 무시(관대). */
export const SECURITY_FIN_SELECT = `fiscal_year, revenue, operating_margin, net_margin, roe, gross_margin, debt_ratio, current_ratio, dividend_yield, revenue_growth, unit`;
