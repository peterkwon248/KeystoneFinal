// GET /api/ohlc?ticker=005930&range=5y&interval=1mo — 과거 봉 시계열(차트·계절성·성과밴드).
// API.md §C. 데이터는 security_price_history(후속 백필). 지금은 빈 테이블이라 bars=[] 반환(스켈레톤).
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

interface Bar { t: string; o: number | null; h: number | null; l: number | null; c: number; v: number | null }
type Row = { date: string; open: number | null; high: number | null; low: number | null; close: number; volume: number | null };

function rangeStart(range: string, now: Date): Date | null {
  const d = new Date(now);
  if (range === "1y") { d.setFullYear(d.getFullYear() - 1); return d; }
  if (range === "5y") { d.setFullYear(d.getFullYear() - 5); return d; }
  return null; // max
}
// 1d=원본, 1wk/1mo=기간별 집계(첫 open·max high·min low·마지막 close·합 volume).
function resample(rows: Row[], interval: string): Bar[] {
  if (interval === "1d" || rows.length === 0) return rows.map((r) => ({ t: r.date, o: r.open, h: r.high, l: r.low, c: r.close, v: r.volume }));
  const key = (dateStr: string): string => {
    const d = new Date(dateStr);
    if (interval === "1mo") return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    // 1wk: ISO-ish year-week
    const onejan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  };
  const groups = new Map<string, Row[]>();
  for (const r of rows) { const k = key(r.date); const g = groups.get(k); if (g) g.push(r); else groups.set(k, [r]); }
  const out: Bar[] = [];
  for (const g of groups.values()) {
    const first = g[0], last = g[g.length - 1];
    out.push({
      t: last.date,
      o: first.open,
      h: g.reduce<number | null>((m, r) => (r.high != null ? (m == null ? r.high : Math.max(m, r.high)) : m), null),
      l: g.reduce<number | null>((m, r) => (r.low != null ? (m == null ? r.low : Math.min(m, r.low)) : m), null),
      c: last.close,
      v: g.reduce<number | null>((s, r) => (r.volume != null ? (s ?? 0) + r.volume : s), null),
    });
  }
  return out;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const ticker = sp.get("ticker");
  const range = sp.get("range") ?? "5y";
  const interval = sp.get("interval") ?? "1mo";
  if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });

  const supabase = await supabaseServer();
  const { data: secRow } = await supabase.from("securities").select("market").eq("ticker", ticker).maybeSingle();
  const market = (secRow as { market?: string } | null)?.market;
  const currency = market === "US" ? "USD" : "KRW";

  const now = new Date();
  const start = rangeStart(range, now);
  const startStr = start ? start.toISOString().slice(0, 10) : null;
  // PostgREST는 요청당 max_rows(기본 1000)로 잘라서 반환한다 — 5년 일봉(~1254행)은 한 번에 다 못 옴.
  // .range()로 페이지네이션해 전체 히스토리를 모은다(1페이지 < PAGE면 마지막).
  const PAGE = 1000;
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from("security_price_history")
      .select("date, open, high, low, close, volume")
      .eq("ticker", ticker)
      .order("date", { ascending: true })
      .range(from, from + PAGE - 1);
    if (startStr) q = q.gte("date", startStr);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const page = (data ?? []) as unknown as Row[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }

  const bars = resample(rows, interval);
  return NextResponse.json({ ticker, currency, interval, bars });
}
