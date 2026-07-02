// SEC EDGAR 어댑터 (ARCHITECTURE §6 — US 재무, XBRL companyfacts → security_financials)
// 키 불필요, User-Agent 필수. ticker→CIK는 company_tickers.json (디스크 캐시).
// US-GAAP 우선, 해외상장사(ADR, 예: TSM)는 IFRS(ifrs-full) 태그 폴백.
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../env.js";
import type { RawYear } from "../normalize/financials.js";

const CACHE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../.cache");

async function edgarFetch(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": env.edgarUserAgent() } });
  if (!res.ok) throw new Error(`EDGAR HTTP ${res.status} — ${url}`);
  return res.json();
}

export async function cikMap(): Promise<Map<string, string>> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = resolve(CACHE_DIR, "edgar-ciks.json");
  if (existsSync(cachePath)) {
    return new Map(Object.entries(JSON.parse(readFileSync(cachePath, "utf8"))));
  }
  const body = (await edgarFetch("https://www.sec.gov/files/company_tickers.json")) as Record<
    string,
    { cik_str: number; ticker: string }
  >;
  const map: Record<string, string> = {};
  for (const e of Object.values(body)) map[e.ticker] = String(e.cik_str).padStart(10, "0");
  writeFileSync(cachePath, JSON.stringify(map));
  return new Map(Object.entries(map));
}

interface FactUnit {
  start?: string; // 손익 등 duration 팩트만 존재 (BS instant 팩트엔 없음)
  end: string;
  val: number;
  fy: number;
  fp: string; // FY | Q1…
  form: string; // 10-K | 20-F | …
  frame?: string;
}

const DAY = 86_400_000;
/** duration 팩트는 연간(≈330일 이상)만 — 10-K 안의 Q4 3개월치가 연간값을 밀어내는 것 방지 */
function isAnnualSpan(f: FactUnit): boolean {
  if (!f.start) return true; // instant(BS) 팩트
  return (Date.parse(f.end) - Date.parse(f.start)) / DAY >= 330;
}
type Facts = Record<string, Record<string, { units: Record<string, FactUnit[]> }>>;

// 우선순위 태그 목록 — 앞에서부터 첫 매칭 사용
const TAGS: Record<keyof Omit<RawYear, "fiscalYear">, string[]> = {
  revenue: [
    "us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax",
    "us-gaap:Revenues",
    "us-gaap:SalesRevenueNet",
    "ifrs-full:Revenue",
  ],
  grossProfit: ["us-gaap:GrossProfit", "ifrs-full:GrossProfit"],
  operatingIncome: ["us-gaap:OperatingIncomeLoss", "ifrs-full:ProfitLossFromOperatingActivities"],
  netIncome: ["us-gaap:NetIncomeLoss", "ifrs-full:ProfitLoss", "ifrs-full:ProfitLossAttributableToOwnersOfParent"],
  equity: [
    "us-gaap:StockholdersEquity",
    "us-gaap:StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
    "ifrs-full:Equity",
  ],
  liabilities: ["us-gaap:Liabilities", "ifrs-full:Liabilities"],
  currentAssets: ["us-gaap:AssetsCurrent", "ifrs-full:CurrentAssets"],
  currentLiabilities: ["us-gaap:LiabilitiesCurrent", "ifrs-full:CurrentLiabilities"],
};

/** 연차보고(10-K/20-F, fp=FY)의 연도별 값. 같은 (fy) 재보고 시 최신 end 우선. */
function annualByYear(facts: Facts, tag: string): Map<number, number> {
  const [ns, name] = tag.split(":");
  const units = facts[ns]?.[name]?.units;
  const out = new Map<number, { end: string; val: number }>();
  if (!units) return new Map();
  const series = units["USD"] ?? Object.values(units)[0] ?? [];
  for (const f of series) {
    if (f.fp !== "FY" || !/^(10-K|20-F)/.test(f.form) || !isAnnualSpan(f)) continue;
    // 회계연도 라벨: 보고서의 fy가 아니라 기간 종료일 기준 (재보고 시 fy가 밀리는 문제 회피)
    const year = Number(f.end.slice(0, 4));
    const prev = out.get(year);
    if (!prev || f.end > prev.end) out.set(year, { end: f.end, val: f.val });
  }
  return new Map([...out].map(([y, v]) => [y, v.val]));
}

export async function fetchEdgarFinancials(ticker: string, years: number[]): Promise<RawYear[]> {
  const ciks = await cikMap();
  const cik = ciks.get(ticker);
  if (!cik) throw new Error(`EDGAR CIK not found for ${ticker}`);
  const body = (await edgarFetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`)) as {
    facts: Facts;
  };
  const byField = new Map<keyof Omit<RawYear, "fiscalYear">, Map<number, number>>();
  for (const [field, tags] of Object.entries(TAGS) as [keyof Omit<RawYear, "fiscalYear">, string[]][]) {
    const merged = new Map<number, number>();
    for (const tag of tags) {
      for (const [y, v] of annualByYear(body.facts, tag)) if (!merged.has(y)) merged.set(y, v);
    }
    byField.set(field, merged);
  }
  const out: RawYear[] = [];
  for (const y of years) {
    const raw: RawYear = { fiscalYear: y };
    let any = false;
    for (const [field, m] of byField) {
      const v = m.get(y);
      if (v != null) {
        raw[field] = v;
        any = true;
      }
    }
    if (any && (raw.revenue != null || raw.netIncome != null)) out.push(raw);
  }
  return out;
}
