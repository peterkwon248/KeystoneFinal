// provider payload → security_financials 공통 shape (ARCHITECTURE §3 normalize/)
// K-IFRS(DART)·US-GAAP(EDGAR) 원시 계정과목을 받아 비율(%)로 정규화한다.
// 저장 규칙(DATA_MODEL §4): revenue = 절대값(종목 네이티브 통화), 비율 = %.

/** 한 회계연도의 원시 계정 집계 (통화 절대값) */
export interface RawYear {
  fiscalYear: number;
  revenue?: number;
  grossProfit?: number;
  operatingIncome?: number;
  netIncome?: number;
  equity?: number;
  liabilities?: number;
  currentAssets?: number;
  currentLiabilities?: number;
}

export interface NormalizedFinancial {
  fiscal_year: number;
  revenue: number | null;
  operating_margin: number | null;
  net_margin: number | null;
  roe: number | null;
  gross_margin: number | null;
  debt_ratio: number | null;
  current_ratio: number | null;
  dividend_yield: number | null; // 시세 필요 — 마일스톤 5에서 채움
  revenue_growth: number | null;
  unit: string;
}

const pct = (num?: number, den?: number): number | null =>
  num != null && den != null && den !== 0 ? round2((num / den) * 100) : null;
const round2 = (v: number) => Math.round(v * 100) / 100;

/** 연도 오름차순으로 정규화 + 전년 대비 매출성장률 계산 */
export function normalizeYears(years: RawYear[], currency: string): NormalizedFinancial[] {
  const sorted = [...years].sort((a, b) => a.fiscalYear - b.fiscalYear);
  return sorted.map((y, i) => {
    const prev = i > 0 ? sorted[i - 1] : undefined;
    return {
      fiscal_year: y.fiscalYear,
      revenue: y.revenue ?? null,
      operating_margin: pct(y.operatingIncome, y.revenue),
      net_margin: pct(y.netIncome, y.revenue),
      roe: pct(y.netIncome, y.equity),
      gross_margin: pct(y.grossProfit, y.revenue),
      debt_ratio: pct(y.liabilities, y.equity),
      current_ratio: pct(y.currentAssets, y.currentLiabilities),
      dividend_yield: null,
      revenue_growth:
        prev?.revenue && y.revenue != null ? round2(((y.revenue - prev.revenue) / prev.revenue) * 100) : null,
      unit: currency,
    };
  });
}
