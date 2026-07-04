// source/P4Views.jsx:1022-1080 ArchiveView 이식 — 보관된 플랜(archived_at) 리스트 + 검색 + 필터 + 복구.
// 방식2(archived_at 분리) 채택: 프로토타입은 status==="closed" 필터였으나, 웹은 서버가 archived_at 있는
//   플랜만 넘겨주므로(상태 무관) 여기선 전부 표시. → 미실현 플랜도 보관 가능.
// 래퍼(viewheader + filter/display 버튼 + panel state)는 scenarios-screen 패턴. 복구=restorePlanFromArchive(dbId).
// SWC 함정 회피: JSX 안 제네릭 캐스트 없음. cats/list 계산은 return 이전 본문.
"use client";
import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { I18nDict, Lang } from "@keystone/core/types";
import { I18N } from "@keystone/core/i18n";
import { EXEC_STRATEGIES, EXEC_CATS } from "@keystone/core/reference";
import { planReturn } from "@keystone/core/analytics";
import { fmtCompact } from "@keystone/core/format";
import { Lic, StatusIcon } from "@/components/icons";
import { usePrefs } from "@/components/shell/prefs";
import type { PfLite } from "@/lib/pf-palette";
import type { UIPlan } from "@/lib/plan-mapper";
import { FilterPanel, type FilterCat, type FilterAnchor } from "@/components/plan/filter-panel";
import { matchesFilters, filterValueLabel } from "@/lib/plan-filters";
import { restorePlanFromArchive } from "@/app/(shell)/archive/actions";

type ArPanel = "filter" | "display" | null;
const STRAT_CAT_ICON: Record<string, string> = { accum: "layers", rebal: "scale", signal: "activity" };
const CHIP_TYPE_KEY: Record<string, string> = { portfolio: "portfolio", strategy: "strategy", return: "returnCat" };

function ArchiveView({ t, lang, plans, portfolios, onOpenPlan, onRestore, pending, panel, setPanel, filterAnchor }: {
  t: I18nDict;
  lang: Lang;
  plans: UIPlan[];
  portfolios: PfLite[];
  onOpenPlan: (p: UIPlan) => void;
  onRestore: (p: UIPlan) => void;
  pending: boolean;
  panel: ArPanel;
  setPanel: (p: ArPanel) => void;
  filterAnchor: FilterAnchor | null;
}) {
  const ko = lang === "ko";
  const [q, setQ] = useState("");
  const [aF, setAF] = useState<Record<string, string[]>>({});
  const [sort, setSort] = useState<"recent" | "return" | "name">("recent");
  const aToggle = (type: string, value: string) => setAF(prev => {
    const cur = prev[type] || [];
    const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
    const out = { ...prev };
    if (next.length) out[type] = next; else delete out[type];
    return out;
  });

  // 서버가 이미 archived_at 있는 플랜만 넘겨줌(상태 무관) → 여기선 전부가 보관 대상.
  const archived = plans;
  const ql = q.trim().toLowerCase();
  let list = archived.filter(p => matchesFilters(p, aF) && (!ql
    || (p.name[lang] || "").toLowerCase().includes(ql)
    || (p.ticker || "").toLowerCase().includes(ql)
    || (p.id || "").toLowerCase().includes(ql)));
  if (sort === "return") list = [...list].sort((a, b) => { const ra = planReturn(a), rb = planReturn(b); return (rb ? rb.rate : -999) - (ra ? ra.rate : -999); });
  else if (sort === "name") list = [...list].sort((a, b) => a.name[lang].localeCompare(b.name[lang]));
  const nF = Object.keys(aF).length, activeAny = nF > 0 || !!ql;

  // cats = portfolio/strategy/return (프로토타입 ArchiveView 3종). plans-screen 구성 미러.
  const cats: FilterCat[] = [
    { type: "portfolio", label: t.portfolio, options: portfolios.map(p => ({ value: p.id, label: p.name, icon: <span className="pf-dot" style={{ background: p.color }} /> })).concat([{ value: "none", label: t.noPortfolio, icon: <span className="pf-dot" style={{ background: "var(--fg-4)" }} /> }]) },
    {
      type: "strategy", label: t.strategy, headerType: "category",
      head: [{ value: "none", label: t.noStrategy, icon: <span className="strat-dot" style={{ background: "var(--fg-4)" }} /> }],
      groups: EXEC_CATS.map(c => ({
        value: c.id, label: c.label[lang], icon: <Lic name={STRAT_CAT_ICON[c.id] || "shapes"} size={13} cls="icon-sm" color="var(--fg-3)" />,
        items: EXEC_STRATEGIES.filter(s => (s.cat || "accum") === c.id).map(s => ({ value: s.id, label: s.name[lang], icon: <span className="strat-dot" style={{ background: s.color }} /> })),
      })),
    },
    { type: "return", label: t.returnCat, options: [
      { value: "profit", label: t.inProfit, icon: <Lic name="trending-up" size={13} cls="icon-sm" color="var(--pos)" /> },
      { value: "loss", label: t.inLoss, icon: <Lic name="trending-down" size={13} cls="icon-sm" color="var(--neg)" /> },
    ] },
  ];
  const chipTypeLabel = (type: string) => t[CHIP_TYPE_KEY[type] || type] || type;
  const chipValLabel = (type: string, v: string): string =>
    type === "portfolio" && v !== "none"
      ? (portfolios.find(p => p.id === v)?.name ?? filterValueLabel(type, v, t, lang))
      : filterValueLabel(type, v, t, lang);

  return (
    <div className="body-main">
      <div className="filterbar" style={{ borderTop: 0, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 10px", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", minWidth: 210 }}>
          <Lic name="search" size={13} cls="icon-sm" color="var(--fg-4)" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={ko ? "보관함 검색…" : "Search archive…"} style={{ border: "none", background: "transparent", outline: "none", color: "var(--fg)", font: "var(--fw-medium) 12px var(--font-sans)", width: "100%" }} />
        </span>
        {Object.entries(aF).map(([type, vals]) => (
          <div className="filter-chip" key={type}>
            <span className="fc-seg fc-key">{chipTypeLabel(type)}</span>
            <span className="fc-seg">{vals.map(v => chipValLabel(type, v)).join(", ")}</span>
            <span className="fc-x" onClick={() => setAF(prev => { const o = { ...prev }; delete o[type]; return o; })}><Lic name="x" size={12} cls="icon-sm" color="inherit" /></span>
          </div>
        ))}
        <span style={{ font: "var(--fw-medium) 12px var(--font-sans)", color: "var(--fg-4)" }}>{activeAny ? list.length + " / " + archived.length : archived.length}</span>
        {activeAny && <div className="right"><span className="linklike" onClick={() => { setAF({}); setQ(""); }}>{t.clear}</span></div>}
      </div>
      {archived.length === 0 ? <div className="empty-state"><Lic name="archive" size={26} color="var(--fg-4)" /><div className="es-title">{t.emptyArchive}</div></div>
        : !list.length ? <div className="empty-state"><Lic name="archive" size={26} color="var(--fg-4)" /><div className="es-title">{ko ? "결과 없음" : "No results"}</div><div className="linklike" style={{ marginTop: 8 }} onClick={() => { setAF({}); setQ(""); }}>{t.clear}</div></div>
        : list.map(p => (
          <div className="plan-row" key={p.id} onClick={() => onOpenPlan(p)}>
            <StatusIcon status={p.status} size={14} />
            <span className="mono" style={{ width: 64, color: "var(--fg-4)", fontSize: 12 }}>{p.id}</span>
            <span style={{ flex: 1, font: "var(--fw-medium) 13px var(--font-sans)", color: "var(--fg)" }}>{p.name[lang]}</span>
            {p.realizedPL ? <span className="mono pos" style={{ width: 80, textAlign: "right" }}>+{fmtCompact(p.realizedPL, p.cur)}</span> : null}
            <button className="watch-btn" style={{ height: 26, padding: "0 10px" }} disabled={pending} onClick={(e) => { e.stopPropagation(); onRestore(p); }}><Lic name="rotate-ccw" size={13} cls="icon-sm" color="inherit" />{t.restore}</button>
          </div>
        ))}
      {panel === "filter" && <FilterPanel t={t} lang={lang} filters={aF} onToggle={aToggle} onClose={() => setPanel(null)} anchor={filterAnchor} cats={cats} />}
      {panel === "display" && <Fragment>
        <div className="overlay" onClick={() => setPanel(null)} />
        <div className="panel" style={{ position: "fixed", top: 84, right: 52, width: 300, zIndex: 45, padding: 8 }}>
          <div className="disp-segrow"><span className="disp-segrow-lab">{t.order}</span>
            <div className="rb-modebar" style={{ margin: 0 }}>
              {([["recent", ko ? "최근" : "Recent"], ["return", ko ? "수익률" : "Return"], ["name", ko ? "이름" : "Name"]] as [ArSort, string][]).map(([v, lab]) => <div key={v} className={"rb-mode" + (sort === v ? " on" : "")} onClick={() => setSort(v)}>{lab}</div>)}
            </div>
          </div>
        </div>
      </Fragment>}
    </div>
  );
}

type ArSort = "recent" | "return" | "name";

export function ArchiveScreen({ plans, portfolios }: { plans: UIPlan[]; portfolios: PfLite[] }) {
  const router = useRouter();
  const { lang }: { lang: Lang } = usePrefs();
  const t = I18N[lang];
  const [panel, setPanel] = useState<ArPanel>(null);
  const [filterAnchor, setFilterAnchor] = useState<FilterAnchor | null>(null);
  const [pending, startTransition] = useTransition();

  const onOpenPlan = (p: UIPlan) => router.push(`/plans/${p.dbId}`);
  const onRestore = (p: UIPlan) => startTransition(() => { void restorePlanFromArchive(p.dbId); });

  const openFilter = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFilterAnchor({ left: r.left, top: r.bottom + 6 });
    setPanel(panel === "filter" ? null : "filter");
  };

  return (
    <div className="main" style={{ height: "100%" }}>
      <div className="viewheader">
        <div className="viewtitle">
          <Lic name="archive" size={16} color="var(--fg-2)" />
          <h1 className="vt-title">{t.archiveNav}</h1>
        </div>
        <span className="spacer" />
        <div className="toolbar-icons" style={{ marginLeft: 8 }}>
          <button className={"iconbtn" + (panel === "filter" ? " active" : "")} onClick={openFilter} title={t.filter}><Lic name="list-filter" size={16} /></button>
          <button className={"iconbtn" + (panel === "display" ? " active" : "")} onClick={() => setPanel(panel === "display" ? null : "display")} title={t.display}><Lic name="sliders-horizontal" size={16} /></button>
        </div>
      </div>
      <div className="body-row">
        <ArchiveView t={t} lang={lang} plans={plans} portfolios={portfolios} onOpenPlan={onOpenPlan} onRestore={onRestore} pending={pending} panel={panel} setPanel={setPanel} filterAnchor={filterAnchor} />
      </div>
    </div>
  );
}
