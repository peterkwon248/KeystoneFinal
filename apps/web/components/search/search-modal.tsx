// source/SecurityView.jsx:365-458 SearchModal 이식 — 전역 검색모달(⌘K). 플랜·종목·전략·관점 통합 검색.
// 원본과 달리 전역 SECURITIES/PLANS가 없어 모달 마운트 시 client fetch(fetchAllSecurities + plans select)로
// 데이터를 로드한다(⚠️ 매 오픈마다 재조회 — 캐싱은 후속). 나머지 검색/정렬/렌더 로직은 원본 그대로.
//
// 어댑테이션(faithful):
//  - SECURITIES → securities(state, fetchAllSecurities). plans(전역) → plans(state, mapDbPlan).
//  - plansForTicker(원본 전역 헬퍼) → plans.filter(...) 인라인.
//  - onOpenPlan(p)/onOpenSecurity(ticker)/onOpenStrategy(id) → 각각 router.push 후 onClose (호출부 prop 그대로 전달받아 사용).
//  - SWC≠tsc 함정 회피: 마켓토글 세그 배열(security-picker.tsx의 marketSegs 패턴)을 컴포넌트 본문 const로 hoist,
//    JSX 자식에 제네릭/캐스트 없음. RELMIN/secRank/mini/capCap 등도 본문 함수로 유지.
"use client";
import { useEffect, useState } from "react";
import type { L10n } from "@keystone/core/types";
import { I18N } from "@keystone/core/i18n";
import { EXEC_STRATEGIES, STRATEGIES, MARKETS } from "@keystone/core/reference";
import { planReturn } from "@keystone/core/analytics";
import { fmtCompact } from "@keystone/core/format";
import { Flag, Lic, StatusIcon } from "@/components/icons";
import { usePrefs } from "@/components/shell/prefs";
import { supabaseBrowser } from "@/lib/supabase/client";
import { fetchAllSecurities } from "@/lib/securities-list";
import { getSecRecents } from "@/lib/sec-recents";
import { mapDbPlan, PLAN_SELECT, type DbPlanRow, type UIPlan } from "@/lib/plan-mapper";
import type { UISecurity } from "@/lib/security-mapper";
import { useRouter } from "next/navigation";

export function SearchModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { lang } = usePrefs();
  const t = I18N[lang];
  const router = useRouter();

  const [secs, setSecs] = useState<UISecurity[]>([]);
  const [plans, setPlans] = useState<UIPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser();
      const [loadedSecs, { data: planRows }] = await Promise.all([
        fetchAllSecurities(sb, userId),
        sb.from("plans").select(PLAN_SELECT).is("deleted_at", null).order("updated_at", { ascending: false }),
      ]);
      setSecs(loadedSecs);
      setPlans(((planRows ?? []) as unknown as DbPlanRow[]).map((r) => mapDbPlan(r, new Date())));
      setLoading(false);
    })();
  }, [userId]);

  const [q, setQ] = useState("");
  const [mkt, setMkt] = useState("all");
  const ql = q.toLowerCase();

  const onOpenPlan = (p: UIPlan) => router.push(`/plans/${p.dbId}`);
  const onOpenSecurity = (ticker: string) => router.push(`/securities/${ticker}`);
  const onOpenStrategy = (id: string) => router.push(`/strategy/${id}`);

  const plansForTicker = (list: UIPlan[], ticker: string) => list.filter((p) => p.ticker === ticker);

  const planHits = plans.filter((p) =>
    !q ||
    p.name[lang].toLowerCase().includes(ql) ||
    p.tickerName[lang].toLowerCase().includes(ql) ||
    p.ticker.toLowerCase().includes(ql) ||
    p.id.toLowerCase().includes(ql),
  );
  const secHits = secs.filter((s) =>
    (mkt === "all" || s.market === mkt) &&
    (!q || s.ticker.toLowerCase().includes(ql) || s.name.en.toLowerCase().includes(ql) || s.name.ko.includes(q)),
  );
  const stratHits = EXEC_STRATEGIES.filter((s) => !q || s.name[lang].toLowerCase().includes(ql) || s.name.en.toLowerCase().includes(ql));
  const fwHits = STRATEGIES.filter((s) => s.model && (!q || s.name[lang].toLowerCase().includes(ql) || s.name.en.toLowerCase().includes(ql)));

  const cap = <A,>(arr: A[]): A[] => (q ? arr : arr.slice(0, 6));
  const moreCount = (arr: unknown[]) => (!q && arr.length > 6 ? arr.length - 6 : 0);

  // recency rank for relative ("2h"/"1d"/"now") or absolute ("Apr 18") updatedAt — smaller = more recent
  const RELMIN = (s: string | undefined): number => {
    if (!s) return 1e9;
    if (s === "now") return 0;
    let m: RegExpExecArray | null;
    if ((m = /^(\d+)\s*m/.exec(s))) return +m[1];
    if ((m = /^(\d+)\s*h/.exec(s))) return +m[1] * 60;
    if ((m = /^(\d+)\s*d/.exec(s))) return +m[1] * 1440;
    const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const am = /^([A-Za-z]{3})\s+(\d+)/.exec(s);
    if (am) {
      const mo = mon.indexOf(am[1]);
      if (mo >= 0) return 1e6 - (mo * 31 + +am[2]);
    }
    return 1e9;
  };
  const planOrdered = q ? planHits : [...planHits].sort((a, b) => RELMIN(a.updatedAt) - RELMIN(b.updatedAt));

  const capCap = (label: string, arr: unknown[]) => {
    const more = moreCount(arr);
    return (
      <div className="cmd-cap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>{label}</span>
        {more > 0 && <span className="cmd-cap-more">+{more}</span>}
      </div>
    );
  };

  // default (no query): rank securities by recency → watched → array order.
  const secRecents = getSecRecents();
  const secRank = (s: UISecurity) => {
    const ri = secRecents.indexOf(s.ticker);
    if (ri >= 0) return ri;
    return s.watched ? 100 : 200;
  };
  const secOrdered = q ? secHits : [...secHits].sort((a, b) => secRank(a) - secRank(b));
  const secShownIsRecent = !q && secRecents.length > 0;

  const mini = (s: UISecurity) => {
    const sp = s.spark.slice(-16);
    const min = Math.min(...sp), max = Math.max(...sp);
    const pts = sp.map((v, i) => `${(i / (sp.length - 1) * 52).toFixed(1)},${(16 - (v - min) / (max - min || 1) * 14 - 1).toFixed(1)}`).join(" ");
    return (
      <svg width="52" height="16" style={{ flex: "none" }}>
        <polyline points={pts} fill="none" stroke={s.change >= 0 ? "var(--pos)" : "var(--neg)"} strokeWidth="1.5" />
      </svg>
    );
  };

  // 마켓토글 세그 — SWC 회피 위해 JSX 밖에서 계산(제네릭/캐스트를 JSX 자식에 넣지 않음).
  const marketSegs: { key: string; label: L10n }[] = [
    { key: "all", label: { en: "All", ko: "전체" } },
    ...MARKETS.map((m) => ({ key: m.key, label: m.label as L10n })),
  ];

  const empty = !planHits.length && !secHits.length && !stratHits.length && !fwHits.length;

  return (
    <div className="scrim" onClick={onClose}>
      <div className="cmd" onClick={(e) => e.stopPropagation()} style={{ width: 620 }}>
        <div className="cmd-input-row">
          <Lic name="search" size={17} color="var(--fg-4)" />
          <input
            autoFocus
            className="cmd-input"
            placeholder={lang === "ko" ? "플랜·종목·전략 검색…" : "Search plans, securities, strategies…"}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
          />
          <span className="kbd">/</span>
        </div>
        <div className="cmd-list" style={{ maxHeight: 440 }}>
          {loading && <div style={{ padding: 24, textAlign: "center", color: "var(--fg-4)", font: "var(--fw-medium) 13px var(--font-sans)" }}>{lang === "ko" ? "불러오는 중…" : "Loading…"}</div>}
          {!loading && <>
            {planHits.length > 0 && <>
              {capCap(t.plans, planOrdered)}
              {cap(planOrdered).map((p) => {
                const r = planReturn(p);
                return (
                  <div className="cmd-item" key={p.id} onClick={() => { onOpenPlan(p); onClose(); }}>
                    <StatusIcon status={p.status} size={14} />
                    <span className="mono" style={{ color: "var(--fg-4)", fontSize: 11, width: 54 }}>{p.id}</span>
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name[lang]}</span>
                    <span className={"mono " + (r ? (r.rate >= 0 ? "pos" : "neg") : "")} style={{ fontSize: 12 }}>{r ? (r.rate >= 0 ? "+" : "") + r.rate.toFixed(1) + "%" : ""}</span>
                  </div>
                );
              })}
            </>}
            {secHits.length > 0 && <>
              <div className="cmd-cap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {secShownIsRecent ? (lang === "ko" ? "종목 · 최근 본" : "Securities · Recent") : t.securities}
                  {moreCount(secOrdered) > 0 && <span className="cmd-cap-more">+{moreCount(secOrdered)}</span>}
                </span>
                <div className="market-toggle" onClick={(e) => e.stopPropagation()}>
                  {marketSegs.map(({ key, label }) => (
                    <div key={key} className={"mt-seg" + (mkt === key ? " on" : "")} onClick={() => setMkt(key)}>{label[lang] ?? key}</div>
                  ))}
                </div>
              </div>
              {cap(secOrdered).map((s) => {
                const up = s.change >= 0;
                const n = plansForTicker(plans, s.ticker).length;
                return (
                  <div className="cmd-item" key={s.ticker} onClick={() => { onOpenSecurity(s.ticker); onClose(); }}>
                    <Flag market={s.market} size={14} />
                    <span className="mono" style={{ color: "var(--fg-4)", fontSize: 11, width: 58 }}>{s.ticker}</span>
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name[lang]}</span>
                    {s.watched && <Lic name="star" size={11} cls="icon-sm" color="var(--r-base)" />}
                    {n > 0 && <span className="sec-nplans">{n}</span>}
                    {mini(s)}
                    <span className="mono" style={{ width: 78, textAlign: "right", fontSize: 12, color: "var(--fg-2)" }}>{fmtCompact(s.price, s.cur)}</span>
                    <span className={"mono " + (up ? "pos" : "neg")} style={{ width: 52, textAlign: "right", fontSize: 11 }}>{up ? "+" : ""}{s.change.toFixed(1)}%</span>
                  </div>
                );
              })}
            </>}
            {stratHits.length > 0 && <>
              {capCap(t.strategies, stratHits)}
              {cap(stratHits).map((s) => (
                <div className="cmd-item" key={s.id} onClick={() => { onOpenStrategy(s.id); onClose(); }}>
                  <Lic name={s.icon} size={14} cls="icon-sm" color={s.color} /><span>{s.name[lang]}</span>
                </div>
              ))}
            </>}
            {fwHits.length > 0 && <>
              {capCap(t.framework, fwHits)}
              {cap(fwHits).map((s) => (
                <div className="cmd-item" key={s.id} onClick={() => { onOpenStrategy(s.id); onClose(); }}>
                  <Lic name={s.icon || "gauge"} size={14} cls="icon-sm" color={s.color || "var(--fg-3)"} /><span>{s.name[lang]}</span>
                </div>
              ))}
            </>}
            {empty && <div style={{ padding: 24, textAlign: "center", color: "var(--fg-4)", font: "var(--fw-medium) 13px var(--font-sans)" }}>{lang === "ko" ? "검색 결과 없음" : "No results"}</div>}
          </>}
        </div>
      </div>
    </div>
  );
}
