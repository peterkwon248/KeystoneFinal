// 재무 동기화 CLI (마일스톤 4) — securities의 시장별 티커를 DART/EDGAR에서
// 끌어와 정규화 후 security_financials upsert (seed를 실데이터로 덮어씀).
//
//   pnpm --filter @keystone/server sync:financials              # 전체
//   pnpm --filter @keystone/server sync:financials -- --market KR
//   pnpm --filter @keystone/server sync:financials -- --tickers 005930,AAPL
import { serviceDb, type FinancialRow } from "./db.js";
import { fetchDartFinancials } from "./adapters/dart.js";
import { fetchEdgarFinancials } from "./adapters/edgar.js";
import { normalizeYears } from "./normalize/financials.js";

const YEARS_BACK = 5;

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    market: get("--market")?.toUpperCase(),
    tickers: get("--tickers")?.split(",").map((s) => s.trim()),
  };
}

async function main() {
  const { market, tickers } = parseArgs(process.argv.slice(2));
  const db = serviceDb();

  let q = db.from("securities").select("ticker, market, currency");
  if (market) q = q.eq("market", market as "KR" | "US");
  if (tickers?.length) q = q.in("ticker", tickers);
  const { data: secs, error } = await q;
  if (error) throw error;
  if (!secs?.length) {
    console.log("no securities matched — seed부터 확인 (pnpm supabase db reset)");
    return;
  }

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: YEARS_BACK }, (_, i) => thisYear - YEARS_BACK + i); // 직전 5개 연도
  let ok = 0,
    failed = 0;

  for (const sec of secs) {
    try {
      const raw =
        sec.market === "KR"
          ? await fetchDartFinancials(sec.ticker, years)
          : await fetchEdgarFinancials(sec.ticker, years);
      if (!raw.length) {
        console.warn(`∅ ${sec.ticker}: no annual data in ${years[0]}–${years.at(-1)}`);
        failed++;
        continue;
      }
      const rows: FinancialRow[] = normalizeYears(raw, sec.currency).map((n) => ({
        ...n,
        ticker: sec.ticker,
        source: sec.market === "KR" ? "dart" : "edgar",
        as_of: new Date().toISOString().slice(0, 10),
      }));
      const { error: upErr } = await db
        .from("security_financials")
        .upsert(rows, { onConflict: "ticker,fiscal_year" });
      if (upErr) throw upErr;
      console.log(
        `✓ ${sec.ticker} (${sec.market}): ${rows.length}y [${rows[0].fiscal_year}–${rows.at(-1)!.fiscal_year}]`,
      );
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
