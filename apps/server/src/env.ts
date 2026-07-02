// 루트 .env 로딩 — 서버 전용 시크릿 (ARCHITECTURE §2: API 키는 절대 클라이언트에 두지 않는다)
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const rootEnv = resolve(here, "../../../.env");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env: ${name} (.env.example 참고)`);
  return v;
}

export const env = {
  dartApiKey: () => req("DART_API_KEY"),
  supabaseUrl: () => req("SUPABASE_URL"),
  supabaseServiceRoleKey: () => req("SUPABASE_SERVICE_ROLE_KEY"),
  edgarUserAgent: () => req("EDGAR_USER_AGENT"),
  finnhubApiKey: () => req("FINNHUB_API_KEY"),
  kisAppKey: () => req("KIS_APP_KEY"),
  kisAppSecret: () => req("KIS_APP_SECRET"),
  kisEnv: () => (process.env.KIS_ENV === "vts" ? "vts" : "real") as "real" | "vts",
};
