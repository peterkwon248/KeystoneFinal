// 거래일(trading-day) 판정 — sync-daily 가드용. **완전 자동·무유지보수**(사용자 갱신 불필요).
//
// 설계: 두 시장 모두 코드가 스스로 계산 → 년도가 바뀌어도 손댈 것 없음.
//   - US(NYSE/NASDAQ) = 규칙 계산(nth-weekday·부활절 computus·관측규칙). 무한 년도.
//   - KR(KRX) = 고정휴일(규칙) + 음력명절(설/추석/부처님, korean-lunar-calendar 오프라인 변환)
//              + 대체공휴일(규칙) + KRX 자체휴장(근로자의날 5/1·연말 12/31). 라이브러리 범위(~2050)까지 자동.
//   판정은 각 시장 로컬 타임존 기준(KR=Asia/Seoul, US=America/New_York) — 서버 로컬시간·위치 무관.
//   범위 밖 년도(KR>2050)는 "주말만 스킵"으로 안전 폴백 + 콘솔 경고.
//   OHLCV/시세 upsert가 멱등이라 오판(예: 정부 임시공휴일 누락)도 무해 — 그날 sync가 헛돌 뿐 데이터 손상 0.
//   에러 방향 안전: 휴장일 누락 → "안 돌려도 될 날 돎"(낭비), "돌려야 할 날 건너뜀"(유실) 아님.
//
// 검증: 2025~2027 권위 캘린더(ICE/NYSE 공식·KRX KIND) 전량을 self-test(scripts)로 대조 — 계산 결과 일치.
import { createRequire } from "node:module";

// korean-lunar-calendar는 CJS(module.exports = Class) — ESM에서 createRequire로 로드(타입은 default 선언 사용).
const require = createRequire(import.meta.url);
const KoreanLunarCalendar = require("korean-lunar-calendar") as typeof import("korean-lunar-calendar").default;

export type Market = "KR" | "US";

const TZ: Record<Market, string> = { KR: "Asia/Seoul", US: "America/New_York" };

/** korean-lunar-calendar 유효 상한(그레고리력 ~2050-11). 초과 년도는 KR 폴백. */
export const KR_LUNAR_MAX_YEAR = 2050;

/** 시장 로컬 날짜(YYYY-MM-DD)를 해당 시장 타임존 기준으로 산출. en-CA 로케일 = ISO 형식. */
export function marketDateISO(market: Market, at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ[market],
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function iso(y: number, m1: number, d: number): string {
  return `${y}-${pad(m1)}-${pad(d)}`;
}
/** ISO(YYYY-MM-DD)의 요일(0=일..6=토). UTC 고정 산출로 타임존 표류 없음. */
function dowISO(s: string): number {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
function isWeekendISO(s: string): boolean {
  const w = dowISO(s);
  return w === 0 || w === 6;
}
/** ISO 날짜에 delta일 더한 ISO(월경계·년경계 안전). */
function addDaysISO(s: string, delta: number): string {
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

// ─────────────────────────────────────────────────────────────
// US(NYSE/NASDAQ) — 규칙 계산(음력 없음 → 모든 년도 자동)
// ─────────────────────────────────────────────────────────────

/** month0(0-11)의 n번째 weekday(0=일..6=토), 1-based n. */
function nthWeekday(y: number, month0: number, weekday: number, n: number): string {
  const first = new Date(Date.UTC(y, month0, 1)).getUTCDay();
  const day = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
  return iso(y, month0 + 1, day);
}
/** month0(0-11)의 마지막 weekday. */
function lastWeekday(y: number, month0: number, weekday: number): string {
  const dim = new Date(Date.UTC(y, month0 + 1, 0)).getUTCDate();
  const last = new Date(Date.UTC(y, month0, dim)).getUTCDay();
  const day = dim - ((last - weekday + 7) % 7);
  return iso(y, month0 + 1, day);
}
/** 부활절 일요일(그레고리력 computus, Meeus/Jones/Butcher). */
function easterSunday(y: number): { m0: number; d: number } {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { m0: month - 1, d: day };
}
/** Good Friday = 부활절 일요일 − 2일. */
function goodFriday(y: number): string {
  const { m0, d } = easterSunday(y);
  const dt = new Date(Date.UTC(y, m0, d - 2));
  return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}
/** 고정휴일 관측일. saturdayShift=false면 토요일에 앞당기지 않음
 *  (신정 예외 — NYSE는 1/1이 토요일이면 전 금요일[전년 12/31]에 폐장하지 않음). */
function observed(y: number, month0: number, day: number, saturdayShift = true): string {
  const w = new Date(Date.UTC(y, month0, day)).getUTCDay();
  let shift = 0;
  if (w === 6 && saturdayShift) shift = -1; // 토 → 전 금
  else if (w === 0) shift = 1; // 일 → 다음 월
  const dt = new Date(Date.UTC(y, month0, day + shift));
  return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

function computeUsHolidays(y: number): Set<string> {
  const s = new Set<string>();
  s.add(observed(y, 0, 1, false)); // 신정 1/1 — 토요일이면 폐장 안 함(신정만의 예외), 일요일이면 월요일
  s.add(nthWeekday(y, 0, 1, 3)); // MLK Day — 1월 3째 월
  s.add(nthWeekday(y, 1, 1, 3)); // Presidents Day — 2월 3째 월
  s.add(goodFriday(y)); // Good Friday
  s.add(lastWeekday(y, 4, 1)); // Memorial Day — 5월 마지막 월
  if (y >= 2022) s.add(observed(y, 5, 19)); // Juneteenth — NYSE 2022~ 준수(6/19)
  s.add(observed(y, 6, 4)); // Independence Day — 7/4
  s.add(nthWeekday(y, 8, 1, 1)); // Labor Day — 9월 1째 월
  s.add(nthWeekday(y, 10, 4, 4)); // Thanksgiving — 11월 4째 목
  s.add(observed(y, 11, 25)); // Christmas — 12/25
  return s;
}

// ─────────────────────────────────────────────────────────────
// KR(KRX) — 고정휴일 + 음력명절 + 대체공휴일 + KRX 자체휴장 계산
// ─────────────────────────────────────────────────────────────

/** 음력(lm/ld, 평달)의 양력 ISO. 범위 밖/오류면 null. */
function solarOfLunar(y: number, lm: number, ld: number): string | null {
  try {
    const cal = new KoreanLunarCalendar();
    if (!cal.setLunarDate(y, lm, ld, false)) return null;
    const s = cal.getSolarCalendar();
    if (!s || !s.year) return null;
    return iso(s.year, s.month, s.day);
  } catch {
    return null;
  }
}

/** 대체공휴일 대상 여부(eligible)와 토요일 트리거 여부(satTrigger).
 *  설/추석 연휴는 일요일·타 공휴일 겹침만 트리거(토요일 X). 나머지 국경일은 토·일 모두 트리거. */
interface KrBase {
  date: string;
  eligible: boolean;
  satTrigger: boolean;
}

/** 특정 년도 KR 휴장일(대체공휴일 포함) 계산. 음력 범위 밖이면 null(→ 폴백). */
function computeKrHolidays(year: number): Set<string> | null {
  const seollal = solarOfLunar(year, 1, 1); // 설날(음력 1/1)
  const chuseok = solarOfLunar(year, 8, 15); // 추석(음력 8/15)
  const buddha = solarOfLunar(year, 4, 8); // 부처님오신날(음력 4/8)
  if (!seollal || !chuseok || !buddha) return null; // 라이브러리 범위(~2050) 밖 → 폴백

  const base: KrBase[] = [
    { date: iso(year, 1, 1), eligible: false, satTrigger: false }, // 신정(대체 대상 아님)
    { date: addDaysISO(seollal, -1), eligible: true, satTrigger: false }, // 설 연휴 전날
    { date: seollal, eligible: true, satTrigger: false }, // 설날
    { date: addDaysISO(seollal, 1), eligible: true, satTrigger: false }, // 설 연휴 다음날
    { date: iso(year, 3, 1), eligible: true, satTrigger: true }, // 삼일절
    { date: iso(year, 5, 5), eligible: true, satTrigger: true }, // 어린이날
    { date: buddha, eligible: true, satTrigger: true }, // 부처님오신날(2023~ 대체 대상)
    { date: iso(year, 6, 6), eligible: false, satTrigger: false }, // 현충일(대체 대상 아님)
    { date: iso(year, 8, 15), eligible: true, satTrigger: true }, // 광복절
    { date: addDaysISO(chuseok, -1), eligible: true, satTrigger: false }, // 추석 연휴 전날
    { date: chuseok, eligible: true, satTrigger: false }, // 추석
    { date: addDaysISO(chuseok, 1), eligible: true, satTrigger: false }, // 추석 연휴 다음날
    { date: iso(year, 10, 3), eligible: true, satTrigger: true }, // 개천절
    { date: iso(year, 10, 9), eligible: true, satTrigger: true }, // 한글날
    { date: iso(year, 12, 25), eligible: true, satTrigger: true }, // 성탄절(2023~ 대체 대상)
  ];

  const holidays = new Set<string>(base.map((b) => b.date));

  // 같은 날짜에 공휴일 2개 이상이면 "겹침"(예: 2025 어린이날≡부처님) → 대체 트리거.
  const dateCount = new Map<string, number>();
  for (const b of base) dateCount.set(b.date, (dateCount.get(b.date) ?? 0) + 1);

  // eligible 휴일을 날짜 오름차순으로: 트리거 시 다음 첫 평일-비공휴일을 대체휴일로 누적 추가.
  const eligibleDates = [...new Set(base.filter((b) => b.eligible).map((b) => b.date))].sort();
  for (const date of eligibleDates) {
    const meta = base.find((b) => b.date === date && b.eligible)!;
    const w = dowISO(date);
    const triggered = w === 0 || (meta.satTrigger && w === 6) || (dateCount.get(date) ?? 0) > 1;
    if (!triggered) continue;
    let cand = addDaysISO(date, 1);
    while (dowISO(cand) === 0 || dowISO(cand) === 6 || holidays.has(cand)) {
      cand = addDaysISO(cand, 1);
    }
    holidays.add(cand);
  }

  // KRX 자체 휴장(법정공휴일 아님, 대체 없음): 근로자의날 5/1, 연말휴장 12/31.
  holidays.add(iso(year, 5, 1));
  holidays.add(iso(year, 12, 31));

  return holidays;
}

// ─────────────────────────────────────────────────────────────
// 판정 API
// ─────────────────────────────────────────────────────────────

const usCache = new Map<number, Set<string>>();
function usHolidaySet(y: number): Set<string> {
  let s = usCache.get(y);
  if (!s) {
    s = computeUsHolidays(y);
    usCache.set(y, s);
  }
  return s;
}
const krCache = new Map<number, Set<string> | null>();
function krHolidaySet(y: number): Set<string> | null {
  if (!krCache.has(y)) krCache.set(y, computeKrHolidays(y));
  return krCache.get(y) ?? null;
}

export interface DayStatus {
  /** 거래일이면 true. */
  trading: boolean;
  /** 판정 사유(로깅용). */
  reason: string;
  /** 계산 범위 밖으로 주말만 판정한 경우 true(셀프 리마인더). */
  fallback: boolean;
}

/** 특정 시장의 특정 시점(기본 now)이 거래일인지 + 사유. */
export function classifyDay(market: Market, at: Date = new Date()): DayStatus {
  const date = marketDateISO(market, at);
  const year = Number(date.slice(0, 4));

  if (isWeekendISO(date)) return { trading: false, reason: "주말", fallback: false };

  if (market === "US") {
    const hit = usHolidaySet(year).has(date);
    return { trading: !hit, reason: hit ? "휴장(공휴일)" : "거래일", fallback: false };
  }

  // KR
  const set = krHolidaySet(year);
  if (!set) {
    return {
      trading: true,
      reason: `거래일(음력 계산 범위 초과 ${year}>${KR_LUNAR_MAX_YEAR} — 주말만 판정)`,
      fallback: true,
    };
  }
  const hit = set.has(date);
  return { trading: !hit, reason: hit ? "휴장(공휴일)" : "거래일", fallback: false };
}

/** 특정 시장의 특정 시점(기본 now)이 거래일인가. */
export function isTradingDay(market: Market, at: Date = new Date()): boolean {
  return classifyDay(market, at).trading;
}

/** 특정 시장·년도의 휴장일 ISO 목록(정렬). 검증·디버깅용. 범위 밖 KR은 빈 배열. */
export function holidaysOf(market: Market, year: number): string[] {
  const set = market === "US" ? usHolidaySet(year) : krHolidaySet(year);
  return set ? [...set].sort() : [];
}
