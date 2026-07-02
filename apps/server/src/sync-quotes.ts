// 시세 스냅샷 동기화 CLI (마일스톤 5) — KR=KIS, US=Finnhub REST 폴링.
//   1) securities.last_close 갱신
//   2) dividend_yield 채우기 (최신 회계연도 행): KR = DART alotMatter DPS ÷ 현재가, US = Finnhub 지표
// 실시간 WS 스트리밍은 마일스톤 6 (§8) — 여기는 폴백/부트스트랩 경로.
//
//   pnpm --filter @keystone/server sync:quotes                # 전체
//   pnpm --filter @keystone/server sync:quotes -- --market KR
//   pnpm --filter @keystone/server sync:quotes -- --skip-dividend
import { serviceDb } from "./db.js";
import { fetchKisQuote } from "./adapters/kis.js";
import { fetchFinnhubQuote, fetchFinnhubDividendYield } from "./adapters/finnhub.js";
import { corpCodeMap, fetchDartDps } from "./adapters/dart.js";

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    market: get("--market")?.toUpperCase(),
    tickers: get("--tickers")?.split(",").map((s) => s.trim()),
    skipDividend: argv.includes("--skip-dividend"),
  };
}

const round2 = (v: number) => Math.round(v * 100) / 100;

async function main() {
  const { market, tickers, skipDividend } = parseArgs(process.argv.slice(2));
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

  let ok = 0,
    failed = 0;
  for (const sec of secs) {
    try {
      const quote = sec.market === "KR" ? await fetchKisQuote(sec.ticker) : await fetchFinnhubQuote(sec.ticker);
      if (!quote) {
        console.warn(`∅ ${sec.ticker}: no quote`);
        failed++;
        continue;
      }
      const { error: upErr } = await db
        .from("securities")
        .update({ last_close: quote.price })
        .eq("ticker", sec.ticker);
      if (upErr) throw upErr;

      let divNote = "";
      if (!skipDividend) {
        // 최신 회계연도 행에 배당수익률 기입 (연 1회 갱신이면 충분한 값)
        const { data: latest } = await db
          .from("security_financials")
          .select("fiscal_year")
          .eq("ticker", sec.ticker)
          .order("fiscal_year", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latest) {
          let divYield: number | null = null;
          if (sec.market === "KR") {
            const corp = (await corpCodeMap()).get(sec.ticker);
            const dps = corp ? await fetchDartDps(corp, latest.fiscal_year) : null;
            divYield = dps ? round2((dps / quote.price) * 100) : null;
          } else {
            divYield = await fetchFinnhubDividendYield(sec.ticker);
          }
          if (divYield != null) {
            const { error: divErr } = await db
              .from("security_financials")
              .update({ dividend_yield: divYield })
              .eq("ticker", sec.ticker)
              .eq("fiscal_year", latest.fiscal_year);
            if (divErr) throw divErr;
            divNote = ` div ${divYield}%`;
          }
        }
      }
      console.log(`✓ ${sec.ticker} (${sec.market}): ${quote.price}${quote.changePct != null ? ` (${quote.changePct}%)` : ""}${divNote}`);
      ok++;
    } catch (e) {
      console.error(`✗ ${sec.ticker}: ${e instanceof Error ? e.message : e}`);
      failed++;
    }
  }
  console.log(`done — ok ${ok} / failed ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main();
