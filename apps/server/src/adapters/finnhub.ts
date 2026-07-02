// Finnhub 어댑터 (ARCHITECTURE §6 — US 시세 스냅샷 + 배당지표)
// 무료 티어: 60콜/분 — 종목 수 적을 땐 순차 호출로 충분. 실시간 WS는 마일스톤 6.
import { env } from "../env.js";

const BASE = "https://finnhub.io/api/v1";

async function finnhubFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ ...params, token: env.finnhubApiKey() });
  const res = await fetch(`${BASE}${path}?${qs}`);
  if (res.status === 429) throw new Error("finnhub rate limit (60/min)");
  if (!res.ok) throw new Error(`finnhub HTTP ${res.status} — ${path}`);
  return res.json() as Promise<T>;
}

export interface Quote {
  price: number;        // 현재가 (장중) 또는 최근 종가
  prevClose: number | null;
  changePct: number | null;
}

/** 현재가 스냅샷. 미존재 심볼은 c=0으로 오므로 null 처리. */
export async function fetchFinnhubQuote(symbol: string): Promise<Quote | null> {
  const q = await finnhubFetch<{ c: number; pc: number; dp: number | null }>("/quote", { symbol });
  if (!q.c) return null;
  return { price: q.c, prevClose: q.pc || null, changePct: q.dp ?? null };
}

/** 배당수익률(%) — TTM 우선, 없으면 indicated annual. 무배당(TSLA 등)은 null. */
export async function fetchFinnhubDividendYield(symbol: string): Promise<number | null> {
  const body = await finnhubFetch<{ metric?: Record<string, number | null> }>("/stock/metric", {
    symbol,
    metric: "all",
  });
  const m = body.metric ?? {};
  const y = m["currentDividendYieldTTM"] ?? m["dividendYieldIndicatedAnnual"];
  return y != null && isFinite(y) && y > 0 ? Math.round(y * 100) / 100 : null;
}
