// KIS Developers 어댑터 (ARCHITECTURE §6 — KR 시세 스냅샷)
// REST 토큰(24h 유효)은 발급이 분당 1회로 제한되므로 반드시 디스크 캐시한다.
// 실전(real)/모의(vts) 도메인 분리 — KIS_ENV로 선택. 실시간 WS는 마일스톤 6.
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../env.js";
import type { Quote } from "./finnhub.js";

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
  let res: Response;
  for (let attempt = 0; ; attempt++) {
    res = await fetch(`${base()}/uapi/domestic-stock/v1/quotations/inquire-price?${qs}`, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        authorization: `Bearer ${token}`,
        appkey: env.kisAppKey(),
        appsecret: env.kisAppSecret(),
        tr_id: "FHKST01010100",
        custtype: "P", // 개인
      },
    });
    if (res.ok || attempt >= retries) break;
    await sleep(400 * (attempt + 1));
  }
  if (!res.ok) throw new Error(`KIS quote HTTP ${res.status} (${stockCode})`);
  const body = (await res.json()) as {
    rt_cd: string;
    msg1?: string;
    output?: { stck_prpr: string; stck_sdpr: string; prdy_ctrt: string };
  };
  if (body.rt_cd !== "0" || !body.output) throw new Error(`KIS quote ${stockCode}: ${body.msg1 ?? "no output"}`);
  const price = Number(body.output.stck_prpr);
  if (!price) return null;
  return {
    price,
    prevClose: Number(body.output.stck_sdpr) || null, // 기준가(전일 종가)
    changePct: Number(body.output.prdy_ctrt) || null,
  };
}
