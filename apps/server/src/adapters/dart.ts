// DART 오픈API 어댑터 (ARCHITECTURE §6 — KR 재무, K-IFRS → security_financials)
// 흐름: corpCode.xml(zip, 종목코드→corp_code 매핑, 디스크 캐시)
//   → fnlttSinglAcntAll.json (사업보고서 11011, 연결 CFS 우선/별도 OFS 폴백)
// 알려진 한계: 금융업(은행/보험/증권)은 계정 체계가 달라("영업수익" 일부만 매핑)
//   지표가 부분 결측될 수 있음 — 금융주 추가 시 계정 매핑 보강 필요.
import { mkdirSync, existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync, strFromU8 } from "fflate";
import { env } from "../env.js";
import type { RawYear } from "../normalize/financials.js";

const BASE = "https://opendart.fss.or.kr/api";
const CACHE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../.cache");

const CORP_CODE_TTL = 24 * 60 * 60 * 1000; // 24h — 신규 상장/코드 변경 반영 (OpenDartReader 등 생태계 관행)

/** stock_code(6자리) → corp_code(8자리). 전체 매핑을 받아 캐시. */
export async function corpCodeMap(): Promise<Map<string, string>> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = resolve(CACHE_DIR, "dart-corp-codes.json");
  if (existsSync(cachePath) && Date.now() - statSync(cachePath).mtimeMs < CORP_CODE_TTL) {
    return new Map(Object.entries(JSON.parse(readFileSync(cachePath, "utf8"))));
  }
  const res = await fetch(`${BASE}/corpCode.xml?crtfc_key=${env.dartApiKey()}`);
  if (!res.ok) throw new Error(`DART corpCode HTTP ${res.status}`);
  const zip = unzipSync(new Uint8Array(await res.arrayBuffer()));
  const xml = strFromU8(zip["CORPCODE.xml"]);
  const map: Record<string, string> = {};
  // <list> 블록 단위로 파싱 — 블록 경계를 무시하면 비상장사(빈 stock_code)의
  // corp_code가 다음 상장사의 stock_code와 잘못 짝지어진다
  const blockRe = /<list>([\s\S]*?)<\/list>/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(xml))) {
    const corp = /<corp_code>(\d{8})<\/corp_code>/.exec(m[1])?.[1];
    const stock = /<stock_code>(\d{6})<\/stock_code>/.exec(m[1])?.[1];
    if (corp && stock) map[stock] = corp;
  }
  writeFileSync(cachePath, JSON.stringify(map));
  return new Map(Object.entries(map));
}

interface DartAccount {
  account_id: string;
  account_nm: string;
  sj_div: string; // BS | IS | CIS | CF | SCE
  fs_div: string; // CFS | OFS
  thstrm_amount: string;
}

// K-IFRS 표준계정 ID → RawYear 필드 (account_id 우선, 계정명 폴백)
const ACCOUNT_IDS: Record<string, keyof Omit<RawYear, "fiscalYear">> = {
  "ifrs-full_Revenue": "revenue",
  "ifrs-full_GrossProfit": "grossProfit",
  "dart_OperatingIncomeLoss": "operatingIncome",
  "ifrs-full_ProfitLoss": "netIncome",
  "ifrs-full_ProfitLossAttributableToOwnersOfParent": "netIncome",
  "ifrs-full_Equity": "equity",
  "ifrs-full_Liabilities": "liabilities",
  "ifrs-full_CurrentAssets": "currentAssets",
  "ifrs-full_CurrentLiabilities": "currentLiabilities",
};
const ACCOUNT_NAMES: Record<string, keyof Omit<RawYear, "fiscalYear">> = {
  "매출액": "revenue",
  "수익(매출액)": "revenue",
  "영업수익": "revenue",
  "매출총이익": "grossProfit",
  "영업이익": "operatingIncome",
  "영업이익(손실)": "operatingIncome",
  "당기순이익": "netIncome",
  "당기순이익(손실)": "netIncome",
  "연결당기순이익": "netIncome",
  "지배기업 소유주지분 순이익": "netIncome",
  "자본총계": "equity",
  "부채총계": "liabilities",
  "유동자산": "currentAssets",
  "유동부채": "currentLiabilities",
};

function parseAmount(s: string): number | undefined {
  const n = Number(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

/** 한 회계연도 재무 (연결 우선, 없으면 별도) */
export async function fetchDartYear(corpCode: string, year: number): Promise<RawYear | null> {
  for (const fsDiv of ["CFS", "OFS"] as const) {
    const url =
      `${BASE}/fnlttSinglAcntAll.json?crtfc_key=${env.dartApiKey()}` +
      `&corp_code=${corpCode}&bsns_year=${year}&reprt_code=11011&fs_div=${fsDiv}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`DART fnlttSinglAcntAll HTTP ${res.status}`);
    const body = (await res.json()) as { status: string; message: string; list?: DartAccount[] };
    if (body.status === "013") continue; // 조회 데이터 없음 → 다음 fs_div
    if (body.status !== "000") throw new Error(`DART ${body.status}: ${body.message}`);
    const raw: RawYear = { fiscalYear: year };
    for (const row of body.list ?? []) {
      // 손익 계정은 IS(별도 손익계산서) 우선, 없으면 CIS(포괄손익) — 첫 매칭만 채움
      const key = ACCOUNT_IDS[row.account_id] ?? ACCOUNT_NAMES[row.account_nm.trim()];
      if (!key || raw[key] != null) continue;
      const v = parseAmount(row.thstrm_amount);
      if (v != null) raw[key] = v;
    }
    if (raw.revenue != null || raw.netIncome != null) return raw;
  }
  return null;
}

/** 최근 N개 연도 재무 시계열 (사업보고서 미공시 연도는 건너뜀) */
export async function fetchDartFinancials(stockCode: string, years: number[]): Promise<RawYear[]> {
  const codes = await corpCodeMap();
  const corpCode = codes.get(stockCode);
  if (!corpCode) throw new Error(`DART corp_code not found for ${stockCode}`);
  const out: RawYear[] = [];
  for (const y of years) {
    const row = await fetchDartYear(corpCode, y);
    if (row) out.push(row);
  }
  return out;
}
