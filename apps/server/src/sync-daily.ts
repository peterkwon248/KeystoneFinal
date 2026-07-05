// 일일 재동기화 오케스트레이터 (자동 스케줄용) — 거래일 가드 + sync:ohlc(증분) → sync:quotes 순차 실행.
// OS cron·클라우드 스케줄러·GitHub Action 등 무엇으로도 매 거래일 1회(양 시장 마감 후) 호출하면 됨.
//   pnpm --filter @keystone/server sync:daily                     # 주말이면 스킵
//   pnpm --filter @keystone/server sync:daily -- --force          # 가드 무시(수동 실행)
//   pnpm --filter @keystone/server sync:daily -- --market US
//
// ⚠️ 거래일 가드 = 주말(토/일, 서버 로컬시간)만 스킵. 공휴일 달력은 미반영(후속: 거래소 휴장일 캘린더).
//    양 시장(KR/US) 휴일/타임존이 달라 완전한 "거래일" 판정은 스케줄러 시각 선택 + 휴장일 API 몫.
// OHLCV upsert(ticker,date)·last_close update는 멱등 → 중복 실행 안전.
import { spawnSync } from "node:child_process";

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

  // 거래일 가드 — 주말 스킵(서버 로컬시간). --force로 무시.
  const dow = new Date().getDay(); // 0=일, 6=토
  if ((dow === 0 || dow === 6) && !force) {
    console.log("[daily] skip: 주말(비거래일). --force 로 강제 실행 가능.");
    return;
  }

  const passthru: string[] = [];
  if (market) passthru.push("--market", market);
  if (tickers) passthru.push("--tickers", tickers);

  // ① OHLCV 증분 백필(차트·밴드 실 시계열) → ② 시세 스냅샷(last_close + 배당수익률).
  const ohlcStatus = run("sync-ohlc", [...passthru, "--years", years]);
  const quotesStatus = run("sync-quotes", passthru);

  const failed = (ohlcStatus !== 0) || (quotesStatus !== 0);
  console.log(`\n[daily] done — ohlc ${ohlcStatus === 0 ? "ok" : "fail(" + ohlcStatus + ")"} · quotes ${quotesStatus === 0 ? "ok" : "fail(" + quotesStatus + ")"}`);
  if (failed) process.exitCode = 1;
}

main();
