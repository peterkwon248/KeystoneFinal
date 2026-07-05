// Tiingo 어댑터 (마일스톤 6 — US 과거 일봉 OHLCV 백필)
// 무료 티어: 50콜/시·1000콜/일·500종목/월. 티커당 1콜(날짜범위)로 전체 히스토리를 받는다
// → 5~8종목 백필 = 총 5~8콜(한도 대비 여유 무한). Finnhub 무료 candle은 US 401이라 이 용도엔 못 씀.
// 저장은 원가격(open/high/low/close)을 넣는다 — adjClose(분할/배당 반영 수정종가)는 응답에 있지만
// security_price_history엔 원가격 기준. 차트 수정종가 기준 정할 때 별도.
import { env } from "../env.js";
import type { PriceBar } from "../db.js";

const BASE = "https://api.tiingo.com/tiingo/daily";

interface TiingoBar {
  date: string; // ISO, 예: "2026-06-25T00:00:00.000Z"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose: number;
  divCash: number;
  splitFactor: number;
}

/** US 일봉 히스토리. startDate = YYYY-MM-DD(포함). endDate 미지정 시 최신까지. */
export async function fetchTiingoDaily(ticker: string, startDate: string, endDate?: string): Promise<PriceBar[]> {
  const qs = new URLSearchParams({ startDate, token: env.tiingoApiKey(), format: "json" });
  if (endDate) qs.set("endDate", endDate);
  const res = await fetch(`${BASE}/${ticker}/prices?${qs}`, {
    headers: { "content-type": "application/json" },
  });
  if (res.status === 429) throw new Error("tiingo rate limit (50/hr · 1000/day)");
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`tiingo HTTP ${res.status} (${ticker})${detail ? ` — ${detail.slice(0, 120)}` : ""}`);
  }
  const rows = (await res.json()) as TiingoBar[];
  return rows
    .map((r) => ({
      date: r.date.slice(0, 10),
      open: r.open ?? null,
      high: r.high ?? null,
      low: r.low ?? null,
      close: r.close,
      volume: r.volume ?? null,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
