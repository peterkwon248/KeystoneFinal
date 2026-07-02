// FX 어댑터 수동 검증 CLI: pnpm --filter @keystone/server check:fx [-- --base USD --quote KRW]
import { fetchFxRate } from "./adapters/fx.js";

function arg(flag: string, dflt: string): string {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : dflt;
}

const fx = await fetchFxRate(arg("--base", "USD"), arg("--quote", "KRW"));
console.log(`${fx.base}/${fx.quote} = ${fx.rate} (${fx.date}, ${fx.provider})`);
