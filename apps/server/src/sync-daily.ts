// 일일 재동기화 오케스트레이터 (자동 스케줄용) — 거래일 가드 + sync:ohlc(증분) → sync:quotes 순차 실행.
// OS cron·클라우드 스케줄러·GitHub Action 등 무엇으로도 매 거래일 1회(양 시장 마감 후) 호출하면 됨.
//   pnpm --filter @keystone/server sync:daily                     # 주말이면 스킵
//   pnpm --filter @keystone/server sync:daily -- --force          # 가드 무시(수동 실행)
//   pnpm --filter @keystone/server sync:daily -- --market US
//
// 거래일 가드 = 주말 + 공휴일(KR/US)까지 판정. 각 시장 로컬 타임존 기준(trading-calendar.ts).
//    대상 시장이 하나도 거래일이 아니면 스킵. --force로 무시. US=규칙계산·KR=음력계산(무유지보수).
// OHLCV upsert(ticker,date)·last_close update는 멱등 → 중복/오판 실행 안전.
import { spawnSync } from "node:child_process";
import { classifyDay, type Market } from "./trading-calendar.js";

function parseArgs(argv: string[]) {
  const get = (flag: string) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; };
  return {
    force: argv.includes("--force"),
    market: get("--market"),
    tickers: get("--tickers"),
    years: get("--years") ?? "1", // 일일 증분은 1년이면 충분(멱등 upsert).
  };
}

/** 형제 스크립트를 자식 프로세스로 실행(stdio 상속). node --import tsx 로 셸 없이 실행
 *  (shell:true 인자 미이스케이프 DEP0190 회피 + 크로스플랫폼). 반환 = exit status. */
function run(script: string, extra: string[]): number {
  console.log(`\n[daily] → ${script}.ts ${extra.join(" ")}`);
  const r = spawnSync(process.execPath, ["--import", "tsx", `src/${script}.ts`, ...extra], { stdio: "inherit" });
  return r.status ?? 1;
}

function main() {
  const { force, market, tickers, years } = parseArgs(process.argv.slice(2));
  const upMarket = market?.toUpperCase();

  // --market은 주면 KR|US만 유효 — 무효값은 가드/자식 대상 불일치를 막기 위해 즉시 종료.
  if (upMarket && upMarket !== "KR" && upMarket !== "US") {
    console.error(`[daily] 무효 --market "${market}" (KR|US만 허용).`);
    process.exitCode = 1;
    return;
  }

  // 거래일 가드 — 대상 시장(--market 있으면 그것, 없으면 KR+US) 중 하나도 거래일이 아니면 스킵.
  // 각 시장 로컬 타임존 기준 주말·공휴일 판정. --force로 무시.
  //   ⚠️ KR/US는 타임존이 달라 자정 근처 호출 시 판정 기준일이 다를 수 있음 — 각 시장 마감 직후 개별 호출 권장.
  const targets: Market[] = upMarket ? [upMarket as Market] : ["KR", "US"];
  const statuses = targets.map((m) => ({ m, ...classifyDay(m) }));
  for (const s of statuses) {
    if (s.fallback) console.warn(`[daily] ⚠️ ${s.m}: ${s.reason}`);
  }
  const open = statuses.filter((s) => s.trading);
  if (open.length === 0 && !force) {
    console.log(`[daily] skip: 비거래일 — ${statuses.map((s) => `${s.m} ${s.reason}`).join(" · ")}. --force 로 강제 실행 가능.`);
    return;
  }
  console.log(`[daily] 거래일: ${statuses.map((s) => `${s.m}=${s.reason}`).join(", ")}`);

  const passthru: string[] = [];
  if (upMarket) passthru.push("--market", upMarket);
  if (tickers) passthru.push("--tickers", tickers);

  // ① OHLCV 증분 백필(차트·밴드 실 시계열) → ② 시세 스냅샷(last_close + 배당수익률).
  const ohlcStatus = run("sync-ohlc", [...passthru, "--years", years]);
  const quotesStatus = run("sync-quotes", passthru);

  const failed = (ohlcStatus !== 0) || (quotesStatus !== 0);
  console.log(`\n[daily] done — ohlc ${ohlcStatus === 0 ? "ok" : "fail(" + ohlcStatus + ")"} · quotes ${quotesStatus === 0 ? "ok" : "fail(" + quotesStatus + ")"}`);
  if (failed) process.exitCode = 1;
}

main();
