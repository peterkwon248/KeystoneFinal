// source/P4Views.jsx:6-122 WatchlistView + :222 NPlansBadge 이식 — 관심(watched) 종목 리스트.
// 헤드라인 스탯(종목·상승·하락·평균등락·한국/미국) + 필터바 + (그룹) 행(star·ticker·name/sector·NPlansBadge·미니 스파크·price·change%).
// t/lang은 usePrefs + I18N[lang]. 상단 toolbar filter/display 버튼(scenarios-screen 패턴), onOpenSecurity=router.push(`/securities/${ticker}`).
//
// 어댑테이션(faithful, 의도적):
//  - SECURITIES.filter(s=>s.watched) → prop `securities`(서버가 이미 watched만 fetch).
//  - React.useState → named useState, watchViewLoad(localStorage)는 try/catch 인라인.
//  - plansForTicker 인라인(plans.filter(p=>p.ticker===ticker)).
//  - NPlansBadge: onOpenPlan optional 유지하되 watchlist에선 미전달(행 클릭이 종목 상세로 감).
//    planReturn은 core에서(관심종목 플랜은 대개 avgPrice/totalShares 없어 상태 라벨을 표시).
//  - SWC≠tsc: JSX 안 제네릭 앵글브래킷 캐스트 없음. cats/groups/미니 스파크 좌표는 return 이전 본문/헬퍼에서.
"use client";
import type { ReactNode } from "react";
import { Fragment, useRef, useState } from "react";
import { useSecurityPeek } from "@/components/securities/security-peek";
import type { I18nDict, Lang, L10n } from "@keystone/core/types";
import { I18N } from "@keystone/core/i18n";
import { MARKETS } from "@keystone/core/reference";
import { fmtCompact } from "@keystone/core/format";
import { planReturn } from "@keystone/core/analytics";
import { Flag, Lic, StatusIcon } from "@/components/icons";
import { usePrefs } from "@/components/shell/prefs";
import { DashStat, type DashTipRow } from "@/components/plan/dash-stat";
import { FilterPanel, type FilterCat, type FilterAnchor } from "@/components/plan/filter-panel";
import { GICS_SECTORS } from "@/lib/gics";
import type { UISecurity } from "@/lib/security-mapper";
import type { UIPlan } from "@/lib/plan-mapper";
import { useLiveQuote } from "@/components/live-quotes-provider";
import { LiveDot } from "@/components/live-dot";

type WlPanel = "filter" | "display" | null;

// source/securities.jsx:47 plansForTicker 인라인.
function plansForTicker(plans: UIPlan[], ticker: string): UIPlan[] {
  return plans.filter((p) => p.ticker === ticker);
}

// 종목의 광의 섹터 = gics 우선, 없으면 sector(원본 s.gics || s.sector).
function gicsOf(s: UISecurity): L10n {
  return s.gics ?? s.sector;
}

// source/P4Views.jsx:4 watchViewLoad — localStorage 저장 뷰 상태.
function watchViewLoad(): { sort?: string; grp?: string } {
  try { return JSON.parse(localStorage.getItem("keystone-watch-view") || "{}"); } catch { return {}; }
}

// source/P4Views.jsx:222 NPlansBadge — 플랜 카운트 배지 + 호버 시 실제 플랜 리스트.
function NPlansBadge({ plans, ticker, lang, t, onOpenPlan }: {
  plans: UIPlan[];
  ticker: string;
  lang: Lang;
  t: I18nDict;
  onOpenPlan?: (p: UIPlan) => void;
}) {
  const list = plansForTicker(plans, ticker);
  if (!list.length) return null;
  const ko = lang === "ko";
  return (
    <span className="sec-nplans fin-term nplb">{list.length}
      <span className="fin-tip nplb-tip">
        <span className="nplb-tip-h">{ko ? "이 종목의 플랜" : "Plans on this security"}<span className="nplb-tip-n">{list.length}</span></span>
        {list.map((p) => {
          const ret = planReturn(p);
          return (
            <span className="nplb-row" key={p.id} onClick={onOpenPlan ? (e) => { e.stopPropagation(); onOpenPlan(p); } : undefined}>
              <StatusIcon status={p.status} size={12} />
              <span className="nplb-nm">{p.name ? p.name[lang] : p.id}</span>
              {ret ? <span className={"nplb-ret mono " + (ret.rate >= 0 ? "pos" : "neg")}>{(ret.rate >= 0 ? "+" : "") + ret.rate.toFixed(1) + "%"}</span>
                : <span className="nplb-st">{t["s_" + p.status] ?? p.status}</span>}
            </span>
          );
        })}
      </span>
    </span>
  );
}

// 미니 스파크라인 — SWC 함정 회피 위해 좌표 계산을 헬퍼로 hoist(JSX 안 계산 없음).
function miniSpark(s: UISecurity): ReactNode {
  const sp = s.spark.slice(-18);
  const min = Math.min(...sp), max = Math.max(...sp);
  const pts = sp.map((v, i) => `${(i / (sp.length - 1) * 64).toFixed(1)},${(18 - (v - min) / (max - min || 1) * 15 - 1).toFixed(1)}`).join(" ");
  return <svg width="64" height="18" style={{ flex: "none" }}><polyline points={pts} fill="none" stroke={s.change >= 0 ? "var(--pos)" : "var(--neg)"} strokeWidth="1.5" /></svg>;
}

// 관심종목 행 — 실시간 override: live 값이 있으면 price/change를 덮어쓴다(훅은 컴포넌트에서만).
function WlRow({ s: base, plans, lang, t, onOpenSecurity }: {
  s: UISecurity; plans: UIPlan[]; lang: Lang; t: I18nDict; onOpenSecurity: (ticker: string) => void;
}) {
  const lq = useLiveQuote(base.ticker);
  const s: UISecurity = lq
    ? { ...base, price: lq.price, change: lq.changePct ?? base.change }
    : base;
  const up = s.change >= 0;
  return (
    <div className="plan-row" onClick={() => onOpenSecurity(s.ticker)}>
      <Lic name="star" size={14} cls="icon-sm" color="var(--r-base)" />
      <span className="mono" style={{ width: 64, color: "var(--fg-4)", fontSize: 12 }}>{s.ticker}</span>
      <span className="pr-tk" style={{ width: 220 }}>
        <span className="pr-name"><Flag market={s.market} size={14} /> {s.name[lang]}</span>
        <span className="pr-ticker">{s.sector[lang]}</span>
      </span>
      <span className="pr-spacer" />
      <NPlansBadge plans={plans} ticker={s.ticker} lang={lang} t={t} />
      {miniSpark(s)}
      <span className="mono" style={{ width: 96, textAlign: "right", color: "var(--fg)", display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>{lq && <LiveDot />}{fmtCompact(s.price, s.cur)}</span>
      <span className={"mono " + (up ? "pos" : "neg")} style={{ width: 70, textAlign: "right", fontWeight: 600 }}>{up ? "+" : ""}{s.change.toFixed(2)}%</span>
    </div>
  );
}

interface WlGroup { key: string; headIcon: ReactNode; title: string; items: UISecurity[] }

function WatchlistView({ t, lang, securities, plans, onOpenSecurity, panel, setPanel, filterAnchor }: {
  t: I18nDict;
  lang: Lang;
  securities: UISecurity[];
  plans: UIPlan[];
  onOpenSecurity: (ticker: string) => void;
  panel: WlPanel;
  setPanel: (p: WlPanel) => void;
  filterAnchor: FilterAnchor | null;
}) {
  const ko = lang === "ko";
  const saved = useRef(watchViewLoad()).current;
  const [wF, setWF] = useState<Record<string, string[]>>({});
  const [sort, setSort] = useState<string>(saved.sort || "default");
  const [grp, setGrp] = useState<string>(saved.grp || "none");
  const persist = (s: string, g: string) => { try { localStorage.setItem("keystone-watch-view", JSON.stringify({ sort: s, grp: g })); } catch { /* ignore */ } };
  const setSort1 = (s: string) => { setSort(s); persist(s, grp); };
  const setGrp1 = (g: string) => { setGrp(g); persist(sort, g); };
  const wToggle = (type: string, value: string) => setWF((prev) => {
    const cur = prev[type] || [];
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    const out = { ...prev };
    if (next.length) out[type] = next; else delete out[type];
    return out;
  });

  const watched = securities; // 서버가 watched만 fetch(원본 SECURITIES.filter(s=>s.watched)).
  const sectorsPresent = [...new Map(watched.map((s) => [gicsOf(s).en, gicsOf(s)])).values()];
  const gicsCount: Record<string, number> = {};
  watched.forEach((s) => { const k = gicsOf(s).en; gicsCount[k] = (gicsCount[k] || 0) + 1; });

  const cats: FilterCat[] = [
    { type: "market", label: ko ? "시장" : "Market", axis: "globe", options: MARKETS.map((m) => ({ value: m.key, label: (m.label as L10n)[lang], icon: <Flag market={m.key as "KR" | "US"} size={12} /> })) },
    { type: "sector", label: ko ? "섹터" : "Sector", axis: "shapes", options: GICS_SECTORS.map((g) => ({ value: g.en, label: g[lang], n: gicsCount[g.en] || 0, icon: <Lic name="shapes" size={13} cls="icon-sm" color="var(--fg-3)" /> })) },
    { type: "plans", label: ko ? "플랜" : "Plans", axis: "square-pen", options: [{ value: "has", label: ko ? "플랜 있음" : "Has plans", icon: <Lic name="square-pen" size={13} cls="icon-sm" color="var(--fg-3)" /> }, { value: "none", label: ko ? "관심만" : "Watch only", icon: <Lic name="star" size={13} cls="icon-sm" color="var(--r-base)" /> }] },
    { type: "change", label: ko ? "등락" : "Change", axis: "trending-up", options: [{ value: "up", label: ko ? "상승" : "Up", icon: <Lic name="trending-up" size={13} cls="icon-sm" color="var(--pos)" /> }, { value: "down", label: ko ? "하락" : "Down", icon: <Lic name="trending-down" size={13} cls="icon-sm" color="var(--neg)" /> }] },
  ];

  const wMatch = (s: UISecurity) => Object.entries(wF).every(([type, vals]) => {
    if (!vals || !vals.length) return true;
    if (type === "market") return vals.includes(s.market);
    if (type === "sector") return vals.includes(gicsOf(s).en);
    if (type === "plans") { const has = plansForTicker(plans, s.ticker).length > 0; return (vals.includes("has") && has) || (vals.includes("none") && !has); }
    if (type === "change") return (vals.includes("up") && s.change >= 0) || (vals.includes("down") && s.change < 0);
    return true;
  });
  let list = watched.filter(wMatch);
  if (sort === "change") list = [...list].sort((a, b) => b.change - a.change);
  else if (sort === "name") list = [...list].sort((a, b) => a.name[lang].localeCompare(b.name[lang]));
  const nF = Object.keys(wF).length;

  const chipTypeLabel: Record<string, string> = { market: ko ? "시장" : "Market", sector: ko ? "섹터" : "Sector", plans: ko ? "플랜" : "Plans", change: ko ? "등락" : "Change" };
  const chipValLabel = (type: string, v: string) => {
    if (type === "market") { const m = MARKETS.find((x) => x.key === v); return m ? (m.label as L10n)[lang] : v; }
    if (type === "sector") { const sec = GICS_SECTORS.find((x) => x.en === v) || sectorsPresent.find((x) => x.en === v); return sec ? sec[lang] : v; }
    if (type === "plans") return v === "has" ? (ko ? "플랜 있음" : "Has plans") : (ko ? "관심만" : "Watch only");
    if (type === "change") return v === "up" ? (ko ? "상승" : "Up") : (ko ? "하락" : "Down");
    return v;
  };

  const rowEl = (s: UISecurity) => (
    <WlRow key={s.ticker} s={s} plans={plans} lang={lang} t={t} onOpenSecurity={onOpenSecurity} />
  );

  let groups: WlGroup[] | null = null;
  if (grp === "market") groups = MARKETS.filter((m) => list.some((s) => s.market === m.key)).map((m) => ({ key: m.key, headIcon: <Flag market={m.key as "KR" | "US"} size={13} />, title: (m.label as L10n)[lang], items: list.filter((s) => s.market === m.key) }));
  else if (grp === "sector") groups = sectorsPresent.filter((sec) => list.some((s) => gicsOf(s).en === sec.en)).map((sec) => ({ key: sec.en, headIcon: <Lic name="shapes" size={13} cls="icon-sm" color="var(--fg-3)" />, title: sec[lang], items: list.filter((s) => gicsOf(s).en === sec.en) }));

  const wRow = (s: UISecurity): DashTipRow => ({ name: s.name[lang], flag: <Flag market={s.market} size={11} />, val: (s.change >= 0 ? "+" : "") + s.change.toFixed(2) + "%", tone: s.change >= 0 ? "pos" : "neg" });
  const byChg = [...list].sort((a, b) => b.change - a.change);
  const upList = list.filter((s) => s.change >= 0), downList = list.filter((s) => s.change < 0);
  const avgChg = list.length ? list.reduce((a, s) => a + s.change, 0) / list.length : null;
  const krList = list.filter((s) => s.market === "KR"), usList = list.filter((s) => s.market === "US");

  return (
    <div className="body-main">
      {list.length > 0 && <div className="dash-headline" style={{ padding: "16px 20px", margin: 0 }}>
        <DashStat lab={ko ? "종목" : "Securities"} val={String(list.length)} tip={byChg.map(wRow)} />
        <DashStat lab={ko ? "상승" : "Up"} val={String(upList.length)} tone={upList.length ? "pos" : undefined} tip={[...upList].sort((a, b) => b.change - a.change).map(wRow)} />
        <DashStat lab={ko ? "하락" : "Down"} val={String(downList.length)} tone={downList.length ? "neg" : undefined} tip={[...downList].sort((a, b) => a.change - b.change).map(wRow)} />
        {avgChg != null && <DashStat lab={ko ? "평균 등락" : "Avg change"} val={(avgChg >= 0 ? "+" : "") + avgChg.toFixed(2) + "%"} tone={avgChg >= 0 ? "pos" : "neg"} tip={byChg.map(wRow)} />}
        <DashStat lab={ko ? "한국 / 미국" : "KR / US"} val={krList.length + " / " + usList.length} tip={[...krList, ...usList].map(wRow)} />
      </div>}
      {nF > 0 && <div className="filterbar" style={{ borderTop: 0 }}>
        {Object.entries(wF).map(([type, vals]) => (
          <div className="filter-chip" key={type}>
            <span className="fc-seg fc-key">{chipTypeLabel[type]}</span>
            <span className="fc-seg">{vals.map((v) => chipValLabel(type, v)).join(", ")}</span>
            <span className="fc-x" onClick={() => setWF((prev) => { const o = { ...prev }; delete o[type]; return o; })}><Lic name="x" size={12} cls="icon-sm" color="inherit" /></span>
          </div>
        ))}
        <span style={{ font: "var(--fw-medium) 12px var(--font-sans)", color: "var(--fg-4)" }}>{list.length} / {watched.length}</span>
        <div className="right"><span className="linklike" onClick={() => setWF({})}>{t.clear}</span></div>
      </div>}
      {!watched.length ? <div className="empty-state"><Lic name="star" size={26} color="var(--fg-4)" /><div className="es-title">{t.emptyWatch}</div></div>
        : !list.length ? <div className="empty-state"><Lic name="star" size={26} color="var(--fg-4)" /><div className="es-title">{ko ? "조건에 맞는 종목 없음" : "No securities match"}</div><div className="linklike" style={{ marginTop: 8 }} onClick={() => setWF({})}>{t.clear}</div></div>
          : groups ? groups.map((g) => <div key={g.key}><div className="grp-head">{g.headIcon}<span className="grp-title">{g.title}</span><span className="grp-count">{g.items.length}</span></div>{g.items.map(rowEl)}</div>)
            : list.map(rowEl)}
      {panel === "filter" && <FilterPanel t={t} lang={lang} filters={wF} onToggle={wToggle} onClose={() => setPanel(null)} anchor={filterAnchor} cats={cats} />}
      {panel === "display" && <Fragment>
        <div className="overlay" onClick={() => setPanel(null)} />
        <div className="panel" style={{ position: "fixed", top: 84, right: 52, width: 300, zIndex: 45, padding: 8 }}>
          <div className="disp-segrow"><span className="disp-segrow-lab">{t.order}</span>
            <div className="rb-modebar" style={{ margin: 0 }}>
              {[["default", ko ? "기본" : "Default"], ["change", ko ? "등락률" : "Change"], ["name", ko ? "이름" : "Name"]].map(([v, lab]) => <div key={v} className={"rb-mode" + (sort === v ? " on" : "")} onClick={() => setSort1(v)}>{lab}</div>)}
            </div>
          </div>
          <div className="disp-segrow"><span className="disp-segrow-lab">{t.group}</span>
            <div className="rb-modebar" style={{ margin: 0 }}>
              {[["none", t.none], ["market", ko ? "시장" : "Market"], ["sector", ko ? "섹터" : "Sector"]].map(([v, lab]) => <div key={v} className={"rb-mode" + (grp === v ? " on" : "")} onClick={() => setGrp1(v)}>{lab}</div>)}
            </div>
          </div>
        </div>
      </Fragment>}
    </div>
  );
}

export function WatchlistScreen({ securities, plans }: { securities: UISecurity[]; plans: UIPlan[] }) {
  const { lang }: { lang: Lang } = usePrefs();
  const t = I18N[lang];
  const [panel, setPanel] = useState<WlPanel>(null);
  const [filterAnchor, setFilterAnchor] = useState<FilterAnchor | null>(null);

  const { openPeek } = useSecurityPeek();
  const onOpenSecurity = openPeek;

  const openFilter = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFilterAnchor({ left: r.left, top: r.bottom + 6 });
    setPanel(panel === "filter" ? null : "filter");
  };

  return (
    <div className="main" style={{ height: "100%" }}>
      <div className="viewheader">
        <div className="viewtitle">
          <Lic name="star" size={16} color="var(--fg-2)" />
          <h1 className="vt-title">{t.watchlist}</h1>
        </div>
        <span className="spacer" />
        <div className="toolbar-icons" style={{ marginLeft: 8 }}>
          <button className={"iconbtn" + (panel === "filter" ? " active" : "")} onClick={openFilter} title={t.filter}><Lic name="list-filter" size={16} /></button>
          <button className={"iconbtn" + (panel === "display" ? " active" : "")} onClick={() => setPanel(panel === "display" ? null : "display")} title={t.display}><Lic name="sliders-horizontal" size={16} /></button>
        </div>
      </div>
      <div className="body-row">
        <WatchlistView t={t} lang={lang} securities={securities} plans={plans} onOpenSecurity={onOpenSecurity} panel={panel} setPanel={setPanel} filterAnchor={filterAnchor} />
      </div>
    </div>
  );
}
