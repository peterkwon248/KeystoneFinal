// trading-calendar 자체검증 — 2025~2027 권위 캘린더(ICE/NYSE 공식·KRX KIND) 전량 대조.
// 실행: pnpm --filter @keystone/server check:calendar
// US = 규칙 계산 결과가 공식 날짜와 정확히 일치하는지. KR = 평일 휴장일이 권위 목록과 일치하는지.
//   (KR 계산 결과엔 주말 겹친 휴일·정부 임시공휴일 제외 — 가드는 주말을 별도 처리, 임시공휴일은 예측 불가·무해.)
import { holidaysOf, classifyDay, type Market } from "../src/trading-calendar.js";

let fail = 0;
function eqSet(label: string, got: string[], want: string[]) {
  const g = [...got].sort().join(",");
  const w = [...want].sort().join(",");
  if (g === w) {
    console.log(`✓ ${label} (${want.length})`);
  } else {
    fail++;
    const gs = new Set(got), ws = new Set(want);
    const missing = want.filter((x) => !gs.has(x));
    const extra = got.filter((x) => !ws.has(x));
    console.log(`✗ ${label}\n    missing: ${missing.join(", ") || "-"}\n    extra:   ${extra.join(", ") || "-"}`);
  }
}
function assert(label: string, cond: boolean) {
  if (cond) console.log(`✓ ${label}`);
  else { fail++; console.log(`✗ ${label}`); }
}
function dow(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
const weekdaysOnly = (arr: string[]) => arr.filter((d) => dow(d) !== 0 && dow(d) !== 6);

// ── US(NYSE/NASDAQ) 공식 휴장일 ──
const US: Record<number, string[]> = {
  2025: ["2025-01-01", "2025-01-20", "2025-02-17", "2025-04-18", "2025-05-26", "2025-06-19", "2025-07-04", "2025-09-01", "2025-11-27", "2025-12-25"],
  2026: ["2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25", "2026-06-19", "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25"],
  2027: ["2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31", "2027-06-18", "2027-07-05", "2027-09-06", "2027-11-25", "2027-12-24"],
};
for (const [y, want] of Object.entries(US)) eqSet(`US ${y}`, holidaysOf("US", Number(y)), want);

// ── KR(KRX) 권위 평일 휴장일(주말·임시공휴일 제외) ──
const KR: Record<number, string[]> = {
  // 2025 — 정부 임시공휴일 2025-01-27은 제외(예측 불가·계산 대상 아님).
  2025: ["2025-01-01", "2025-01-28", "2025-01-29", "2025-01-30", "2025-03-03", "2025-05-01", "2025-05-05", "2025-05-06", "2025-06-06", "2025-08-15", "2025-10-03", "2025-10-06", "2025-10-07", "2025-10-08", "2025-10-09", "2025-12-25", "2025-12-31"],
  2026: ["2026-01-01", "2026-02-16", "2026-02-17", "2026-02-18", "2026-03-02", "2026-05-01", "2026-05-05", "2026-05-25", "2026-08-17", "2026-09-24", "2026-09-25", "2026-10-05", "2026-10-09", "2026-12-25", "2026-12-31"],
  2027: ["2027-01-01", "2027-02-08", "2027-02-09", "2027-03-01", "2027-05-05", "2027-05-13", "2027-08-16", "2027-09-14", "2027-09-15", "2027-09-16", "2027-10-04", "2027-10-11", "2027-12-27", "2027-12-31"],
};
for (const [y, want] of Object.entries(KR)) eqSet(`KR ${y} (평일)`, weekdaysOnly(holidaysOf("KR", Number(y))), want);

// ── classifyDay 스팟체크(시장 타임존 정오 UTC로 날짜 고정) ──
const noon = (iso: string) => new Date(`${iso}T04:00:00Z`); // KST 13:00 / ET 00:00 근처 — 날짜 안전대
assert("KR 2026-09-25(추석) 휴장", !classifyDay("KR", noon("2026-09-25")).trading);
assert("KR 2026-09-28(월) 거래일", classifyDay("KR", noon("2026-09-28")).trading);
assert("KR 2025-05-06(대체) 휴장", !classifyDay("KR", noon("2025-05-06")).trading);
assert("US 2026-07-03(독립기념일 관측) 휴장", !classifyDay("US", noon("2026-07-03")).trading);
assert("US 2026-07-06(월) 거래일", classifyDay("US", noon("2026-07-06")).trading);

// ── 폴백(범위 밖) 동작 ──
const far = classifyDay("KR", new Date("2099-03-02T04:00:00Z"));
assert("KR 2099(범위밖) 폴백=거래일·fallback플래그", far.trading && far.fallback);

console.log(fail === 0 ? "\n✅ ALL PASS" : `\n❌ ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
