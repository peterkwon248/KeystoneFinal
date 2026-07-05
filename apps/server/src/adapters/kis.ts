// KIS Developers 어댑터 (ARCHITECTURE §6 — KR 시세 스냅샷)
// REST 토큰(24h 유효)은 발급이 분당 1회로 제한되므로 반드시 디스크 캐시한다.
// 실전(real)/모의(vts) 도메인 분리 — KIS_ENV로 선택. 실시간 WS는 마일스톤 6.
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../env.js";
import type { Quote } from "./finnhub.js";
import type { PriceBar } from "../db.js";

const DOMAINS = {
  real: "https://openapi.koreainvestment.com:9443",
  vts: "https://openapivts.koreainvestment.com:29443",
} as const;
const CACHE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../.cache");

function base(): string {
  return DOMAINS[env.kisEnv()];
}

interface CachedToken {
  access_token: string;
  expires_at: number; // epoch ms
  env: string;
}

/** access_token 발급 — 분당 1회 제한이라 파일 캐시 (만료 1시간 전 갱신) */
async function kisToken(): Promise<string> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = resolve(CACHE_DIR, "kis-token.json");
  if (existsSync(cachePath)) {
    const cached = JSON.parse(readFileSync(cachePath, "utf8")) as CachedToken;
    if (cached.env === env.kisEnv() && Date.now() < cached.expires_at - 60 * 60 * 1000) {
      return cached.access_token;
    }
  }
  const res = await fetch(`${base()}/oauth2/tokenP`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: env.kisAppKey(),
      appsecret: env.kisAppSecret(),
    }),
  });
  const body = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error_code?: string;
    error_description?: string;
  };
  if (!res.ok || !body.access_token) {
    throw new Error(`KIS token: ${body.error_code ?? res.status} ${body.error_description ?? ""}`.trim());
  }
  const token: CachedToken = {
    access_token: body.access_token,
    expires_at: Date.now() + (body.expires_in ?? 86400) * 1000,
    env: env.kisEnv(),
  };
  writeFileSync(cachePath, JSON.stringify(token));
  return token.access_token;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 주식현재가 시세 (FHKST01010100). stockCode = 6자리 종목코드.
 *  KIS REST는 연속 호출 시 간헐적 500을 뱉음(유량 제한) → 짧은 백오프 재시도로 흡수. */
export async function fetchKisQuote(stockCode: string, retries = 2): Promise<Quote | null> {
  const token = await kisToken();
  const qs = new URLSearchParams({
    fid_cond_mrkt_div_code: "J", // 주식/ETF/ETN
    fid_input_iscd: stockCode,
  });
  let body:
    | {
        rt_cd: string;
        msg_cd?: string;
        msg1?: string;
        output?: { stck_prpr: string; stck_sdpr: string; prdy_ctrt: string };
      }
    | undefined;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${base()}/uapi/domestic-stock/v1/quotations/inquire-price?${qs}`, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        authorization: `Bearer ${token}`,
        appkey: env.kisAppKey(),
        appsecret: env.kisAppSecret(),
        tr_id: "FHKST01010100",
        custtype: "P", // 개인
      },
    });
    if (res.ok) {
      body = (await res.json()) as typeof body;
      // EGW00201 = 초당 거래건수 초과 (공식 rate-limit 코드) — HTTP 200으로 올 수 있음
      if (body!.rt_cd === "0" || body!.msg_cd !== "EGW00201") break;
    } else if (attempt >= retries) {
      throw new Error(`KIS quote HTTP ${res.status} (${stockCode})`);
    }
    if (attempt >= retries) break;
    await sleep(400 * (attempt + 1));
  }
  if (!body || body.rt_cd !== "0" || !body.output)
    throw new Error(`KIS quote ${stockCode}: ${body?.msg1 ?? "no output"}`);
  const price = Number(body.output.stck_prpr);
  if (!price) return null;
  return {
    price,
    prevClose: Number(body.output.stck_sdpr) || null, // 기준가(전일 종가)
    changePct: Number(body.output.prdy_ctrt) || null,
  };
}

// ─── 국내주식 기간별 시세 일봉 (마일스톤 6 — KR 과거 OHLCV 백필) ────────────────
// inquire-daily-itemchartprice(FHKST03010100)는 호출당 최대 100봉만 반환하므로,
// 종료일에서 과거로 100일 캘린더 윈도우를 밀며 페이지네이션한다(100캘린더일 ≈ 70거래일 < 100 캡).
const YMD = (ymd: string) => ymd.replace(/-/g, ""); // YYYY-MM-DD → YYYYMMDD
/** YYYYMMDD에 days를 더한 YYYYMMDD (음수 가능). UTC 기준. */
function addDaysYmd(ymd: string, days: number): string {
  const dt = new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8)));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10).replace(/-/g, "");
}

interface KisDailyRow {
  stck_bsop_date: string; // YYYYMMDD
  stck_oprc: string;
  stck_hgpr: string;
  stck_lwpr: string;
  stck_clpr: string;
  acml_vol: string;
}

/** 단일 윈도우(≤100봉) 조회. from/to = YYYYMMDD. 원주가(fid_org_adj_prc=0). */
async function kisDailyWindow(token: string, stockCode: string, from: string, to: string, retries = 2): Promise<KisDailyRow[]> {
  const qs = new URLSearchParams({
    fid_cond_mrkt_div_code: "J",
    fid_input_iscd: stockCode,
    fid_input_date_1: from,
    fid_input_date_2: to,
    fid_period_div_code: "D", // 일봉
    fid_org_adj_prc: "0", // 0=원주가, 1=수정주가
  });
  let body: { rt_cd: string; msg_cd?: string; msg1?: string; output2?: KisDailyRow[] } | undefined;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${base()}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice?${qs}`, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        authorization: `Bearer ${token}`,
        appkey: env.kisAppKey(),
        appsecret: env.kisAppSecret(),
        tr_id: "FHKST03010100",
        custtype: "P",
      },
    });
    if (res.ok) {
      body = (await res.json()) as typeof body;
      if (body!.rt_cd === "0" || body!.msg_cd !== "EGW00201") break;
    } else if (attempt >= retries) {
      throw new Error(`KIS daily HTTP ${res.status} (${stockCode})`);
    }
    if (attempt >= retries) break;
    await sleep(400 * (attempt + 1));
  }
  if (!body || body.rt_cd !== "0") throw new Error(`KIS daily ${stockCode}: ${body?.msg1 ?? "no output"}`);
  // 빈 구간(휴장·상장 전)은 output2 없음 → 빈 배열. 유효행만(가격·날짜 존재).
  return (body.output2 ?? []).filter((r) => r?.stck_bsop_date && Number(r.stck_clpr) > 0);
}

/** KR 일봉 히스토리. startDate/endDate = YYYY-MM-DD(포함). 100봉 페이지네이션·중복제거·오름차순. */
export async function fetchKisDaily(stockCode: string, startDate: string, endDate: string): Promise<PriceBar[]> {
  const token = await kisToken();
  const START = YMD(startDate);
  const bars = new Map<string, PriceBar>();
  let cursorEnd = YMD(endDate);
  for (let guard = 0; guard < 80; guard++) {
    if (cursorEnd < START) break;
    const winStart = addDaysYmd(cursorEnd, -99) < START ? START : addDaysYmd(cursorEnd, -99);
    const rows = await kisDailyWindow(token, stockCode, winStart, cursorEnd);
    if (!rows.length) break;
    for (const r of rows) {
      const d = r.stck_bsop_date;
      bars.set(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, {
        date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
        open: Number(r.stck_oprc) || null,
        high: Number(r.stck_hgpr) || null,
        low: Number(r.stck_lwpr) || null,
        close: Number(r.stck_clpr),
        volume: Number(r.acml_vol) || null,
      });
    }
    const earliest = rows.reduce((m, r) => (r.stck_bsop_date < m ? r.stck_bsop_date : m), rows[0].stck_bsop_date);
    if (earliest <= START) break;
    cursorEnd = addDaysYmd(earliest, -1);
    await sleep(300);
  }
  return [...bars.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}
