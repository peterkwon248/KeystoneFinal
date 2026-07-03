// dev-seed-plans.mjs — 로컬 검증용 플랜 시드 (service_role, RLS 우회).
// source/data.jsx PLANS 11종을 테스트 유저 밑에 재생성한다 (리스트/보드/타임라인 상태 커버리지).
// 실행: node apps/web/scripts/dev-seed-plans.mjs
// ⚠️ 로컬 전용. 클라우드에서 실행 금지 (하드코딩된 로컬 데모 키).
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const EMAIL = "webtest@keystone.local";
const PASSWORD = "web-test-password-1";

const db = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });

// "Mon D" → ISO date. Jul~Dec → 2025, Jan~Jun → 2026 (프로토타입 Sep~Jun mock 창).
const MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
function monD(s) {
  const [mon, d] = s.split(" ");
  const mo = MON[mon]; if (!mo) return null;
  const y = mo >= 7 ? 2025 : 2026;
  return `${y}-${String(mo).padStart(2, "0")}-${String(+d).padStart(2, "0")}`;
}
// updatedAt 토큰("2d"/"4h"/"Apr 18") → updated_at ISO timestamp
function updTs(tok) {
  const now = Date.now();
  let m;
  if ((m = /^(\d+)h$/.exec(tok))) return new Date(now - +m[1] * 3600e3).toISOString();
  if ((m = /^(\d+)d$/.exec(tok))) return new Date(now - +m[1] * 86400e3).toISOString();
  const iso = monD(tok); if (iso) return new Date(iso + "T12:00:00Z").toISOString();
  return new Date(now).toISOString();
}
const caseOf = (enLabel) => (enLabel === "Bull" ? "bull" : enLabel === "Bear" ? "bear" : "base");
const scStatus = (s) => (["tracking", "approaching", "realized", "invalidated", "pending"].includes(s) ? s : "pending");

const PF = [
  { id: "pf1", name: "국내 성장주", base: "KRW", sort: 0 },
  { id: "pf2", name: "미국 빅테크", base: "USD", sort: 1 },
  { id: "pf3", name: "가치·배당", base: "KRW", sort: 2 },
];

// source/data.jsx PLANS (요약: 리스트/보드/타임라인에 필요한 필드만)
const PLANS = [
  { hid: "PLN-001", ticker: "005930", cur: "KRW", name: { en: "Samsung memory discount", ko: "삼성전자 메모리 저평가" }, status: "active", pf: "pf1", st: "st1", eps: 4830, so: 5969, div: 40, createdAt: "Mar 3", updatedAt: "2d",
    sc: [["Bull", 92000, "tracking"], ["Base", 78000, "approaching"], ["Bear", 58000, "tracking"]],
    ex: [[12, "buy", 70100, 14, "Jun 5"], [11, "buy", 69400, 15, "Jun 3"], [10, "buy", 68200, 15, "May 30"], [9, "buy", 67500, 16, "May 28"]], rules: 4 },
  { hid: "PLN-002", ticker: "AAPL", cur: "USD", name: { en: "Apple services margin", ko: "Apple 서비스 마진" }, status: "active", pf: "pf2", st: "st1", eps: 6.43, so: 15204, div: 40, createdAt: "Feb 18", updatedAt: "4h",
    sc: [["Bull", 260, "tracking"], ["Base", 220, "tracking"], ["Bear", 170, "approaching"]],
    ex: [[9, "buy", 199.10, 4, "Jun 6"], [8, "buy", 202.40, 4, "Jun 2"], [7, "buy", 206.80, 4, "May 29"]], rules: 2 },
  { hid: "PLN-005", ticker: "NVDA", cur: "USD", name: { en: "NVIDIA datacenter growth", ko: "NVIDIA 데이터센터 성장" }, status: "active", pf: "pf2", st: "st1", eps: 18.90, so: 2460, div: 40, createdAt: "Jan 12", updatedAt: "1h",
    sc: [["Bull", 1500, "tracking"], ["Base", 1250, "approaching"], ["Bear", 800, "tracking"]],
    ex: [[18, "buy", 1170, 1, "Jun 7"], [17, "buy", 1095, 1, "Jun 1"], [16, "buy", 980, 2, "May 24"]], rules: 2 },
  { hid: "PLN-004", ticker: "000660", cur: "KRW", name: { en: "SK hynix HBM cycle", ko: "SK하이닉스 HBM 사이클" }, status: "active", pf: "pf1", st: "st3", eps: 9870, so: 728, div: null, createdAt: "Apr 28", updatedAt: "6h",
    sc: [["Bull", 240000, "tracking"], ["Base", 195000, "approaching"], ["Bear", 130000, "tracking"]],
    ex: [[null, "buy", 182000, 3, "Jun 16"], [null, "buy", 176000, 3, "Jun 9"], [null, "buy", 170000, 3, "Jun 2"], [null, "buy", 158000, 3, "May 26"], [null, "buy", 165000, 3, "May 19"]], rules: 1 },
  { hid: "PLN-003", ticker: "TSLA", cur: "USD", name: { en: "Tesla robotaxi optionality", ko: "Tesla 로보택시 옵션" }, status: "research", pf: "pf2", st: "st2", eps: 3.65, so: 3180, div: null, createdAt: "Jun 6", updatedAt: "1d",
    sc: [["Bull", 340, "tracking"], ["Base", 260, "approaching"], ["Bear", 160, "tracking"]], ex: [], rules: 0 },
  { hid: "PLN-006", ticker: "035720", cur: "KRW", name: { en: "Kakao governance discount", ko: "카카오 거버넌스 디스카운트" }, status: "paused", pf: "pf1", st: "st1", eps: 1240, so: 4434, div: 40, createdAt: "Feb 2", updatedAt: "5d",
    sc: [["Bull", 62000, "tracking"], ["Base", 50000, "tracking"], ["Bear", 33000, "approaching"]],
    ex: [[14, "buy", 42100, 7, "May 20"], [13, "buy", 44800, 6, "May 14"]], rules: 1 },
  { hid: "PLN-007", ticker: "005380", cur: "KRW", name: { en: "Hyundai Korea discount", ko: "현대차 코리아 디스카운트" }, status: "closing", pf: "pf3", st: "st3", eps: 47200, so: 209, div: null, createdAt: "Nov 8", updatedAt: "3d",
    sc: [["Bull", 290000, "approaching"], ["Base", 250000, "realized"], ["Bear", 180000, "tracking"]],
    ex: [[null, "sell", 246000, 10, "Jun 5"], [null, "buy", 205000, 30, "Nov 8"]], rules: 1 },
  { hid: "PLN-008", ticker: "MSFT", cur: "USD", name: { en: "Microsoft cloud (closed)", ko: "Microsoft 클라우드 (종료)" }, status: "closed", pf: "pf2", st: "st2", eps: 11.80, so: 7430, div: null, createdAt: "Sep 2", updatedAt: "Apr 18", closedAt: "Apr 18", realizedPl: 3040,
    sc: [["Bull", 460, "realized"], ["Base", 410, "realized"], ["Bear", 330, "invalidated"]],
    ex: [[null, "sell", 448, 40, "Apr 18"], [null, "buy", 372, 40, "Sep 2"]], rules: 0 },
  { hid: "PLN-009", ticker: "035420", cur: "KRW", name: { en: "NAVER commerce/fintech", ko: "NAVER 커머스·핀테크" }, status: "research", pf: "pf1", st: null, eps: 11200, so: 164, div: null, createdAt: "Jun 7", updatedAt: "12h",
    sc: [["Bull", 230000, "tracking"], ["Base", 190000, "approaching"], ["Bear", 140000, "tracking"]], ex: [], rules: 0 },
  { hid: "PLN-010", ticker: "GOOGL", cur: "USD", name: { en: "Alphabet AI search", ko: "Alphabet AI 검색" }, status: "active", pf: "pf2", st: "st1", eps: 7.54, so: 12300, div: 40, createdAt: "Mar 20", updatedAt: "3h",
    sc: [["Bull", 220, "tracking"], ["Base", 195, "approaching"], ["Bear", 140, "tracking"]],
    ex: [[11, "buy", 175.40, 4, "Jun 7"], [10, "buy", 171.20, 4, "Jun 3"]], rules: 1 },
  { hid: "PLN-011", ticker: "005930", cur: "KRW", name: { en: "Samsung range grid", ko: "삼성전자 박스권 그리드" }, status: "active", pf: "pf1", st: "st1", eps: 3841, so: 5969, div: null, createdAt: "Apr 8", updatedAt: "2h",
    sc: [["Bull", 90000, "tracking"], ["Base", 75000, "approaching"], ["Bear", 60000, "tracking"]],
    ex: [[null, "buy", 69000, 60, "Jun 9"], [null, "buy", 66000, 30, "May 19"], [null, "sell", 73500, 30, "May 2"], [null, "buy", 67500, 30, "Apr 14"]], rules: 2 },
];

async function main() {
  // 1) 테스트 유저 (있으면 재사용)
  let userId;
  const { data: list } = await db.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email === EMAIL);
  if (existing) {
    userId = existing.id;
    console.log("• reuse user", EMAIL, userId);
  } else {
    const { data, error } = await db.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true });
    if (error) throw error;
    userId = data.user.id;
    console.log("• created user", EMAIL, userId);
  }

  // 2) 프로필 (온보딩 완료)
  await db.from("profiles").upsert({ id: userId, email: EMAIL, provider: "email", email_verified: true, onboarded: true });

  // 3) 기존 데이터 클린 (재실행 idempotent)
  await db.from("plans").delete().eq("user_id", userId);
  await db.from("portfolios").delete().eq("user_id", userId);

  // 4) 포트폴리오
  const pfMap = {};
  for (const pf of PF) {
    const { data, error } = await db.from("portfolios").insert({ user_id: userId, name: pf.name, base_currency: pf.base, sort: pf.sort }).select("id").single();
    if (error) throw error;
    pfMap[pf.id] = data.id;
  }
  console.log("• portfolios:", Object.keys(pfMap).length);

  // 5) 플랜 + 시나리오 + 체결 + 룰
  for (const p of PLANS) {
    const { data: plan, error } = await db.from("plans").insert({
      user_id: userId, human_id: p.hid, portfolio_id: pfMap[p.pf], ticker: p.ticker, currency: p.cur,
      name: p.name, status: p.status, strategy_id: p.st, exec_id: null,
      eps: p.eps, shares_out: p.so, realized_pl: p.realizedPl ?? null,
      custom_fields: p.div ? { divisions: p.div } : {},
      created_at: new Date(monD(p.createdAt) + "T09:00:00Z").toISOString(),
      updated_at: updTs(p.updatedAt),
      closed_at: p.closedAt ? new Date(monD(p.closedAt) + "T15:00:00Z").toISOString() : null,
    }).select("id").single();
    if (error) throw error;

    const sc = p.sc.map(([lab, target, status], i) => ({
      plan_id: plan.id, case_t: caseOf(lab), label: { en: lab, ko: lab === "Bull" ? "상단" : lab === "Bear" ? "하단" : "중간" },
      target, status: scStatus(status), is_auto: false, sort: i,
    }));
    if (sc.length) { const { error: e } = await db.from("scenarios").insert(sc); if (e) throw e; }

    const ex = p.ex.map(([round, side, price, qty, date]) => ({
      plan_id: plan.id, side, exec_date: monD(date), price, quantity: qty, amount: price * qty, round_no: round,
    }));
    if (ex.length) { const { error: e } = await db.from("executions").insert(ex); if (e) throw e; }

    if (p.rules > 0) {
      const rules = Array.from({ length: p.rules }, () => ({
        plan_id: plan.id, enabled: true, condition: { type: "price", op: "lte", value: 0 }, action: { type: "notify" },
      }));
      const { error: e } = await db.from("rules").insert(rules); if (e) throw e;
    }
  }
  console.log("• plans:", PLANS.length);
  console.log("✓ dev seed complete →", EMAIL, "/", PASSWORD);
}

main().catch((e) => { console.error("✗", e); process.exit(1); });
