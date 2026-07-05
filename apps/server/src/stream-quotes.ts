// 실시간 시세 스트리밍 워커 (Stage A) — KIS/Finnhub WS → live_quotes upsert.
// securities에서 티커 로드(KR=KIS, US=Finnhub) → 각 WS 구독 → 틱을 티커별 버퍼링 →
// 1.5초마다 last-write-wins 배치 upsert(틱마다 DB 쓰지 않음). Supabase Realtime이
// live_quotes 변경을 브라우저로 방송(Stage B). SIGINT 시 graceful shutdown + 마지막 flush.
//
//   pnpm --filter @keystone/server stream:quotes
import { serviceDb } from "./db.js";
import { connectKisWs, type LiveTick, type WsHandle } from "./adapters/kis-ws.js";
import { connectFinnhubWs } from "./adapters/finnhub-ws.js";

const FLUSH_INTERVAL_MS = 1500;

async function main() {
  const db = serviceDb();

  // 티커 로드 (KR/US 분리) — sync-quotes.ts와 동일 소스.
  const { data: secs, error } = await db.from("securities").select("ticker, market");
  if (error) throw error;
  if (!secs?.length) {
    console.log("no securities — nothing to stream");
    return;
  }
  const krTickers = secs.filter((s) => s.market === "KR").map((s) => s.ticker);
  const usTickers = secs.filter((s) => s.market === "US").map((s) => s.ticker);
  console.log(`[stream] loaded ${krTickers.length} KR + ${usTickers.length} US tickers`);

  // 티커별 최신 틱 버퍼 (last-write-wins).
  const buffer = new Map<string, LiveTick>();
  let tickCount = 0;
  const onTick = (t: LiveTick) => {
    buffer.set(t.ticker, t);
    tickCount++;
  };

  const handles: WsHandle[] = [];
  if (krTickers.length) handles.push(connectKisWs(krTickers, onTick));
  if (usTickers.length) handles.push(connectFinnhubWs(usTickers, onTick));

  // 1.5초 배치 flush → live_quotes upsert.
  let flushing = false;
  async function flush() {
    if (flushing || buffer.size === 0) return;
    flushing = true;
    const batch = [...buffer.values()];
    buffer.clear();
    try {
      const rows = batch.map((t) => ({
        ticker: t.ticker,
        price: t.price,
        change_pct: t.changePct,
        ts: new Date(t.ts).toISOString(),
      }));
      // ① 최신 스냅샷(live_quotes, 티커당 1행 덮어쓰기) — Realtime 브로드캐스트 소스.
      const { error: upErr } = await db.from("live_quotes").upsert(rows, { onConflict: "ticker" });
      if (upErr) {
        console.error(`[stream] upsert error: ${upErr.message}`);
        // 실패분은 되돌리지 않음(다음 틱이 곧 덮어씀) — 무한 누적 방지.
      } else {
        console.log(`[stream] flushed ${rows.length} quotes (total ticks ${tickCount})`);
      }
      // ② 인트라데이 이력(intraday_prices, append) — 차트 당일 라인 소스. (ticker,ts) 충돌은 무시.
      const { error: intErr } = await db
        .from("intraday_prices")
        .upsert(rows, { onConflict: "ticker,ts", ignoreDuplicates: true });
      if (intErr) console.error(`[stream] intraday insert error: ${intErr.message}`);
    } finally {
      flushing = false;
    }
  }
  const flushTimer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);

  // graceful shutdown.
  let shuttingDown = false;
  async function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("\n[stream] SIGINT — shutting down");
    clearInterval(flushTimer);
    for (const h of handles) h.close();
    await flush(); // 마지막 flush
    console.log("[stream] done");
    process.exit(0);
  }
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());

  console.log(`[stream] running — flushing every ${FLUSH_INTERVAL_MS}ms. Ctrl+C to stop.`);
}

main().catch((e) => {
  console.error(`[stream] fatal: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
