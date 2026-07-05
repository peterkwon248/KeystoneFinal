// 과거 시세(OHLCV 일봉) 백필 CLI (마일스톤 6 — Phase C 데이터 파이프라인)
//   KR = KIS 기간별 시세(일봉), US = Tiingo daily. → security_price_history upsert(source='kis'|'tiingo').
//   차트·계절성·성과밴드의 실데이터 소스. 일회성 5년 백필 + 이후 일일 append 용도.
//
//   pnpm --filter @keystone/server sync:ohlc                          # 전체 14종목 5년
//   pnpm --filter @keystone/server sync:ohlc -- --market US
//   pnpm --filter @keystone/server sync:ohlc -- --tickers AAPL,NVDA --years 1
import { serviceDb, type PriceHistoryRow, type PriceBar } from "./db.js";
import { fetchKisDaily } from "./adapters/kis.js";
import { fetchTiingoDaily } from "./adapters/tiingo.js";

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    market: get("--market")?.toUpperCase(),
    tickers: get("--tickers")?.split(",").map((s) => s.trim()),
    years: Number(get("--years") ?? 5),
  };
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** 큰 배열을 chunk 단위로 upsert (onConflict ticker,date). */
async function upsertBars(db: ReturnType<typeof serviceDb>, rows: PriceHistoryRow[]): Promise<void> {
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await db
      .from("security_price_history")
      .upsert(rows.slice(i, i + CHUNK), { onConflict: "ticker,date" });
    if (error) throw error;
  }
}

async function main() {
  const { market, tickers, years } = parseArgs(process.argv.slice(2));
  const db = serviceDb();

  let q = db.from("securities").select("ticker, market");
  if (market) q = q.eq("market", market as "KR" | "US");
  if (tickers?.length) q = q.in("ticker", tickers);
  const { data: secs, error } = await q;
  if (error) throw error;
  if (!secs?.length) {
    console.log("no securities matched");
    return;
  }

  const now = new Date();
  const start = new Date(now);
  start.setFullYear(start.getFullYear() - years);
  const startDate = ymd(start);
  const endDate = ymd(now);
  console.log(`backfill ${startDate} → ${endDate} (${years}y) · ${secs.length} securities`);

  let ok = 0,
    failed = 0,
    totalBars = 0;
  for (const sec of secs) {
    try {
      const source = sec.market === "KR" ? "kis" : "tiingo";
      const bars: PriceBar[] =
        sec.market === "KR"
          ? await fetchKisDaily(sec.ticker, startDate, endDate)
          : await fetchTiingoDaily(sec.ticker, startDate, endDate);
      if (!bars.length) {
        console.warn(`∅ ${sec.ticker} (${sec.market}): no bars`);
        failed++;
        continue;
      }
      const rows: PriceHistoryRow[] = bars.map((b) => ({ ticker: sec.ticker, source, ...b }));
      await upsertBars(db, rows);
      totalBars += rows.length;
      console.log(`✓ ${sec.ticker} (${sec.market}): ${rows.length} bars [${bars[0].date} → ${bars[bars.length - 1].date}]`);
      ok++;
    } catch (e) {
      console.error(`✗ ${sec.ticker}: ${e instanceof Error ? e.message : e}`);
      failed++;
    }
  }
  console.log(`done — ok ${ok} / failed ${failed} · ${totalBars} bars upserted`);
  if (failed > 0) process.exitCode = 1;
}

main();
