// FX 어댑터 (ARCHITECTURE §6 — KEYSTONE_FX=1380 상수 대체)
// 1순위 Frankfurter(ECB, 키 불필요) → 폴백 open.er-api.com (둘 다 스펙 §6 무료 목록).
// ECB 기준환율은 일 1회(평일 CET 16:00경) 갱신 — 일일 환율이면 충분(§6).
// 클라이언트는 GET /fx 응답을 core의 setFxRate()에 넣으면 앱 전체가 리플로우된다.

export interface FxRate {
  base: string;   // "USD"
  quote: string;  // "KRW"
  rate: number;   // quote per 1 base
  date: string;   // YYYY-MM-DD (provider 기준일)
  provider: "frankfurter" | "er-api";
}

async function fromFrankfurter(base: string, quote: string): Promise<FxRate> {
  const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${quote}`);
  if (!res.ok) throw new Error(`frankfurter HTTP ${res.status}`);
  const body = (await res.json()) as { date: string; rates: Record<string, number> };
  const rate = body.rates[quote];
  if (!rate) throw new Error(`frankfurter: no rate for ${quote}`);
  return { base, quote, rate, date: body.date, provider: "frankfurter" };
}

async function fromErApi(base: string, quote: string): Promise<FxRate> {
  const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
  if (!res.ok) throw new Error(`er-api HTTP ${res.status}`);
  const body = (await res.json()) as {
    result: string;
    time_last_update_utc: string;
    rates: Record<string, number>;
  };
  if (body.result !== "success" || !body.rates[quote]) throw new Error(`er-api: no rate for ${quote}`);
  return {
    base,
    quote,
    rate: body.rates[quote],
    date: new Date(body.time_last_update_utc).toISOString().slice(0, 10),
    provider: "er-api",
  };
}

/** USD→KRW 등 일일 환율. provider 장애 시 폴백 체인. */
export async function fetchFxRate(base = "USD", quote = "KRW"): Promise<FxRate> {
  try {
    return await fromFrankfurter(base, quote);
  } catch (e) {
    console.warn(`frankfurter failed (${e instanceof Error ? e.message : e}) — falling back to er-api`);
    return fromErApi(base, quote);
  }
}
