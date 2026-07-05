// source/P4Views.jsx:920-1020 ScenariosMonitor 이식 — 플랜을 가로지르는 시나리오 모니터.
// 헤드라인 스탯(추적·근접·돌파·이탈·평균괴리) + 필터바 + 상태/종목/케이스별 그룹 행.
// t/lang 은 usePrefs + I18N[lang]. 상단 toolbar에 filter/display 버튼(plans-screen 패턴), onOpenPlan=router.push.
//
// 어댑테이션(faithful, 의도적):
//  - adhoc(SECURITY_SCENARIOS) rows 생략(defer) — 웹에 종목 단독 시나리오 데이터 모델 없음. r.adhoc은 항상 false지만
//    원본 분기(r.adhoc ? … : r.plan.id)는 구조 보존 위해 유지.
//  - securityOf(tk) 제거 → 해당 ticker의 첫 plan row에서 name[lang](라벨) + cur("KRW"→"KR")로 Flag.
//  - onNewScenario(작성 모달) defer — "새 시나리오" 버튼은 렌더 유지, onClick은 no-op 스텁.
//  - React.useState → named useState, scenGroupLoad는 try/catch 인라인.
//  - SWC 함정 회피: JSX 안 제네릭 앵글브래킷 캐스트 없음. cats/groups 계산은 return 이전 본문에서.
"use client";
import type { ReactNode } from "react";
import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { I18nDict, Lang } from "@keystone/core/types";
import { I18N } from "@keystone/core/i18n";
import { scAutoStatus } from "@keystone/core/analytics";
import { fmtCompact } from "@keystone/core/format";
import { Flag, Lic } from "@/components/icons";
import { usePrefs } from "@/components/shell/prefs";
import type { UIPlan } from "@/lib/plan-mapper";
import type { UISecurity } from "@/lib/security-mapper";
import type { Scenario, ScenarioStatus } from "@keystone/core/types";
import { DashStat, type DashTipRow } from "@/components/plan/dash-stat";
import { FilterPanel, type FilterCat, type FilterAnchor } from "@/components/plan/filter-panel";
import { ScenarioAuthorModal } from "@/components/plan/scenario-author-modal";
import { deleteSecurityScenario } from "@/app/(shell)/scenarios/actions";
import { SC_STATUS_COLOR, SCEN_ORDER, SC_CASE_ORDER, scCaseLabel } from "@/lib/scenario-ref";

type ScPanel = "filter" | "display" | null;

/** adhoc(종목단독) 시나리오 — 서버가 scenarios(plan_id null) + securities 조인으로 매핑해 전달(S2).
 *  dbId/caseT는 편집·삭제 액션(updateSecurityScenario/deleteSecurityScenario)에 필요(CRUD 배선). */
export interface AdhocScenario {
  dbId: string;
  ticker: string;
  name: { en: string; ko: string };
  cur: string;
  price: number;
  label: { en: string; ko: string };
  caseT: "bull" | "base" | "bear";
  color: string;
  target: number;
  status: ScenarioStatus;
  thesis?: { en: string; ko: string };
}

// 시나리오 모니터 한 행 — plan row 유래(adhoc 생략).
// dbId/caseT는 adhoc 행 편집·삭제(updateSecurityScenario/deleteSecurityScenario)에 필요 — plan 행은 미사용.
interface ScMonRow {
  plan: UIPlan | null;
  sc: Scenario;
  ticker: string;
  cur: string;
  price: number;
  name: { en: string; ko: string };
  adhoc: boolean;
  dbId?: string;
  caseT?: "bull" | "base" | "bear";
  st?: string;
  kase?: string;
}

function scenGroupLoad(): string {
  try { return localStorage.getItem("keystone-scen-group") || "status"; } catch { return "status"; }
}

function ScenariosMonitor({ t, lang, plans, securities, securityScenarios, onOpenPlan, onNewScenario, panel, setPanel, filterAnchor }: {
  t: I18nDict;
  lang: Lang;
  plans: UIPlan[];
  securities: UISecurity[];
  securityScenarios: AdhocScenario[];
  onOpenPlan: (p: UIPlan) => void;
  onNewScenario: (ticker?: string) => void;
  panel: ScPanel;
  setPanel: (p: ScPanel) => void;
  filterAnchor: FilterAnchor | null;
}) {
  const ko = lang === "ko";
  const [scF, setScF] = useState<Record<string, string[]>>({});
  const [editRow, setEditRow] = useState<ScMonRow | null>(null);
  const [, startScTransition] = useTransition();
  const onDeleteAdhoc = (id: string, ticker: string) => startScTransition(() => { void deleteSecurityScenario(id, ticker); });
  const [grp, setGrp] = useState<string>(scenGroupLoad);
  const setGrp1 = (g: string) => { setGrp(g); try { localStorage.setItem("keystone-scen-group", g); } catch { /* ignore */ } };
  const scToggle = (type: string, value: string) => setScF(prev => {
    const cur = prev[type] || [];
    const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
    const out = { ...prev };
    if (next.length) out[type] = next; else delete out[type];
    return out;
  });

  const rows: ScMonRow[] = [];
  plans.forEach(p => p.scenarios.forEach(sc => rows.push({ plan: p, sc, ticker: p.ticker, cur: p.cur, price: p.currentPrice, name: p.tickerName, adhoc: false })));
  // adhoc(종목단독) 시나리오(S2) — plan 없이 ticker+가격으로 합성 Scenario 행 push. per=0(EPS 미보유 seam).
  securityScenarios.forEach(a => rows.push({
    plan: null,
    sc: { label: a.label, color: a.color, target: a.target, per: 0, status: a.status, thesis: a.thesis, isAuto: false },
    ticker: a.ticker, cur: a.cur, price: a.price, name: a.name, adhoc: true,
    dbId: a.dbId, caseT: a.caseT,
  }));
  rows.forEach(r => { r.st = scAutoStatus(r.plan || { currentPrice: r.price }, r.sc.target); r.kase = r.sc.label.en; });

  // securityOf 대체: ticker → 첫 row의 name/cur.
  const firstRowOf = (tk: string) => rows.find(r => r.ticker === tk);
  const tickerLabel = (tk: string) => { const r = firstRowOf(tk); return r ? r.name[lang] : tk; };
  const tickerFlag = (tk: string): ReactNode => { const r = firstRowOf(tk); return <Flag market={r && r.cur === "KRW" ? "KR" : "US"} size={13} />; };

  const tickersPresent = [...new Set(rows.map(r => r.ticker))];
  const cats: FilterCat[] = [
    { type: "ticker", label: ko ? "종목" : "Security", axis: "chart-line", options: tickersPresent.map(tk => ({ value: tk, label: tickerLabel(tk), icon: <Flag market={firstRowOf(tk)?.cur === "KRW" ? "KR" : "US"} size={12} /> })) },
    { type: "kase", label: ko ? "케이스" : "Case", axis: "target", options: SC_CASE_ORDER.map(([k, c]) => ({ value: k, label: scCaseLabel(k, lang), icon: <span className="scsum-dot" style={{ background: c }} /> })) },
    { type: "scstatus", label: t.scenStatus, axis: "circle-dot", options: SCEN_ORDER.map(st => ({ value: st, label: t["sc_" + st], icon: <span className="scsum-dot" style={{ background: SC_STATUS_COLOR[st].fg }} /> })) },
    { type: "source", label: ko ? "출처" : "Source", axis: "git-branch", options: [{ value: "plan", label: ko ? "플랜" : "Plan", icon: <Lic name="square-pen" size={13} cls="icon-sm" color="var(--fg-3)" /> }, { value: "adhoc", label: t.adhoc, icon: <Lic name="zap" size={13} cls="icon-sm" color="var(--accent)" /> }] },
  ];
  const scMatch = (r: ScMonRow) => Object.entries(scF).every(([type, vals]) => {
    if (!vals || !vals.length) return true;
    if (type === "ticker") return vals.includes(r.ticker);
    if (type === "kase") return vals.includes(r.kase!);
    if (type === "scstatus") return vals.includes(r.st!);
    if (type === "source") return vals.includes(r.adhoc ? "adhoc" : "plan");
    return true;
  });
  const filtered = rows.filter(scMatch);
  const nF = Object.keys(scF).length;
  const chipTypeLabel: Record<string, string> = { ticker: ko ? "종목" : "Security", kase: ko ? "케이스" : "Case", scstatus: t.scenStatus, source: ko ? "출처" : "Source" };
  const chipValLabel = (type: string, v: string) => {
    if (type === "ticker") return tickerLabel(v);
    if (type === "kase") return scCaseLabel(v, lang);
    if (type === "scstatus") return t["sc_" + v];
    if (type === "source") return v === "adhoc" ? t.adhoc : (ko ? "플랜" : "Plan");
    return v;
  };

  interface ScGroup { key: string; headIcon: ReactNode; title: string; items: ScMonRow[] }
  let groups: ScGroup[];
  if (grp === "ticker") groups = tickersPresent.filter(tk => filtered.some(r => r.ticker === tk)).map(tk => ({ key: tk, headIcon: tickerFlag(tk), title: tickerLabel(tk), items: filtered.filter(r => r.ticker === tk) }));
  else if (grp === "kase") groups = SC_CASE_ORDER.map(([k, c]) => ({ key: k, headIcon: <span className="scsum-dot" style={{ background: c }} />, title: scCaseLabel(k, lang), items: filtered.filter(r => r.kase === k) })).filter(g => g.items.length);
  else if (grp === "none") groups = [{ key: "all", headIcon: <Lic name="target" size={13} cls="icon-sm" color="var(--fg-3)" />, title: ko ? "모든 시나리오" : "All scenarios", items: filtered }];
  else groups = SCEN_ORDER.map(st => ({ key: st, headIcon: <span className="scsum-dot" style={{ background: SC_STATUS_COLOR[st].fg }} />, title: t["sc_" + st], items: filtered.filter(r => r.st === st) })).filter(g => g.items.length);

  const stCount = (st: string) => filtered.filter(r => r.st === st).length;
  const avgGap = filtered.length ? filtered.reduce((a, r) => a + Math.abs(r.sc.target / r.price - 1) * 100, 0) / filtered.length : null;
  const scRow = (r: ScMonRow): DashTipRow => { const g = (r.sc.target / r.price - 1) * 100; return { name: r.name[lang] + " · " + r.sc.label[lang], flag: <Flag market={r.cur === "KRW" ? "KR" : "US"} size={11} />, val: (g >= 0 ? "+" : "") + g.toFixed(0) + "%", tone: g >= 0 ? "pos" : "neg" }; };
  const scTip = (st: string) => filtered.filter(r => r.st === st).map(scRow);
  const avgGapTip = [...filtered].sort((a, b) => Math.abs(b.sc.target / b.price - 1) - Math.abs(a.sc.target / a.price - 1)).map(scRow);

  return (
    <div className="body-main">
      {filtered.length > 0 && <div className="dash-headline" style={{ padding: "16px 20px", margin: 0 }}>
        <DashStat lab={t.sc_tracking} val={String(stCount("tracking"))} tip={scTip("tracking")} />
        <DashStat lab={t.sc_approaching} val={String(stCount("approaching"))} tone={stCount("approaching") ? "warn" : undefined} tip={scTip("approaching")} />
        <DashStat lab={t.sc_realized} val={String(stCount("realized"))} tip={scTip("realized")} />
        <DashStat lab={t.sc_invalidated} val={String(stCount("invalidated"))} tip={scTip("invalidated")} />
        {avgGap != null && <DashStat lab={ko ? "평균 괴리" : "Avg gap"} val={avgGap.toFixed(0) + "%"} tip={avgGapTip} />}
      </div>}
      <div className="filterbar" style={{ borderTop: 0 }}>
        <span style={{ font: "var(--fw-medium) 12px var(--font-sans)", color: "var(--fg-3)" }}>{ko ? "플랜·종목의 모든 시나리오" : "Every scenario across plans & securities"} · <b className="mono" style={{ color: "var(--fg)" }}>{nF ? filtered.length + " / " + rows.length : rows.length}</b></span>
        <div className="right"><button className="v-btn v-btn--primary" style={{ height: 28 }} onClick={() => onNewScenario()}><Lic name="plus" size={14} cls="icon-sm" color="var(--fg-on-accent)" />{t.newScenario}</button></div>
      </div>
      {nF > 0 && <div className="filterbar" style={{ borderTop: 0 }}>
        {Object.entries(scF).map(([type, vals]) => (
          <div className="filter-chip" key={type}>
            <span className="fc-seg fc-key">{chipTypeLabel[type]}</span>
            <span className="fc-seg">{vals.map(v => chipValLabel(type, v)).join(", ")}</span>
            <span className="fc-x" onClick={() => setScF(prev => { const o = { ...prev }; delete o[type]; return o; })}><Lic name="x" size={12} cls="icon-sm" color="inherit" /></span>
          </div>
        ))}
        <div className="right"><span className="linklike" onClick={() => setScF({})}>{t.clear}</span></div>
      </div>}
      {groups.length && filtered.length ? groups.map(g => (
        <div key={g.key}>
          <div className="grp-head">
            {g.headIcon}
            <span className="grp-title">{g.title}</span><span className="grp-count">{g.items.length}</span>
          </div>
          {g.items.map((r, i) => {
            const gap = (r.sc.target / r.price - 1) * 100;
            return (
              <div className="plan-row" key={i} onClick={() => r.plan ? onOpenPlan(r.plan) : undefined}>
                <span className="scsum-dot" style={{ background: r.sc.color }} />
                <span className="mono" style={{ width: 64, color: "var(--fg-4)", fontSize: 12 }}>{r.ticker}</span>
                <span style={{ flex: 1, font: "var(--fw-medium) 13px var(--font-sans)", color: "var(--fg)" }}>{r.name[lang]} · <b style={{ color: r.sc.color }}>{r.sc.label[lang]}</b></span>
                <span className="scn-tag">{r.adhoc ? <span className="fl-auto" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>{t.adhoc}</span> : <span className="fl-auto">{r.plan!.id}</span>}</span>
                <span className="mono" style={{ width: 110, textAlign: "right", color: "var(--fg-2)" }}>{fmtCompact(r.sc.target, r.cur)}</span>
                <span className={"mono " + (gap >= 0 ? "pos" : "neg")} style={{ width: 70, textAlign: "right", fontWeight: 600 }}>{gap >= 0 ? "+" : ""}{gap.toFixed(0)}%</span>
                {r.adhoc && (
                  <span style={{ display: "inline-flex", gap: 4, marginLeft: 8 }} onClick={(e) => e.stopPropagation()}>
                    <button className="iconbtn" onClick={() => setEditRow(r)} title={ko ? "수정" : "Edit"}><Lic name="pencil" size={12} /></button>
                    <button className="iconbtn" onClick={() => onDeleteAdhoc(r.dbId!, r.ticker)} title={ko ? "삭제" : "Remove"}><Lic name="x" size={12} /></button>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )) : <div className="empty-state"><Lic name="target" size={26} color="var(--fg-4)" /><div className="es-title">{nF ? (ko ? "조건에 맞는 시나리오 없음" : "No scenarios match") : t.emptyScen}</div>{nF > 0 && <div className="linklike" style={{ marginTop: 8 }} onClick={() => setScF({})}>{t.clear}</div>}</div>}
      {panel === "filter" && <FilterPanel t={t} lang={lang} filters={scF} onToggle={scToggle} onClose={() => setPanel(null)} anchor={filterAnchor} cats={cats} />}
      {panel === "display" && <Fragment>
        <div className="overlay" onClick={() => setPanel(null)} />
        <div className="panel" style={{ position: "fixed", top: 84, right: 52, width: 300, zIndex: 45, padding: 8 }}>
          <div className="disp-segrow"><span className="disp-segrow-lab">{ko ? "그룹" : "Group"}</span>
            <div className="rb-modebar" style={{ margin: 0 }}>
              {[["status", t.status], ["ticker", ko ? "종목" : "Security"], ["kase", ko ? "케이스" : "Case"], ["none", t.none]].map(([v, lab]) => <div key={v} className={"rb-mode" + (grp === v ? " on" : "")} onClick={() => setGrp1(v)}>{lab}</div>)}
            </div>
          </div>
        </div>
      </Fragment>}
      {editRow && <ScenarioAuthorModal adhoc={{ securities, initialTicker: editRow.ticker, lockTicker: true }}
        editScenario={{ id: editRow.dbId!, caseT: editRow.caseT!, target: editRow.sc.target, thesis: editRow.sc.thesis?.ko ?? editRow.sc.thesis?.en ?? "" }}
        onClose={() => setEditRow(null)} />}
    </div>
  );
}

export function ScenariosScreen({ plans, securities, securityScenarios }: {
  plans: UIPlan[];
  securities: UISecurity[];
  securityScenarios: AdhocScenario[];
}) {
  const router = useRouter();
  const { lang }: { lang: Lang } = usePrefs();
  const t = I18N[lang];
  const [panel, setPanel] = useState<ScPanel>(null);
  const [filterAnchor, setFilterAnchor] = useState<FilterAnchor | null>(null);
  // adhoc 작성 모달 — null이면 닫힘. ticker=열 때 프리셀렉트할 종목(없으면 null).
  const [author, setAuthor] = useState<{ ticker: string | null } | null>(null);

  const onOpenPlan = (p: UIPlan) => router.push(`/plans/${p.dbId}`);
  const onNewScenario = (ticker?: string) => setAuthor({ ticker: ticker ?? null });

  const openFilter = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFilterAnchor({ left: r.left, top: r.bottom + 6 });
    setPanel(panel === "filter" ? null : "filter");
  };

  return (
    <div className="main" style={{ height: "100%" }}>
      <div className="viewheader">
        <div className="viewtitle">
          <Lic name="crosshair" size={16} color="var(--fg-2)" />
          <h1 className="vt-title">{lang === "ko" ? "시나리오 모니터" : "Scenarios monitor"}</h1>
        </div>
        <span className="spacer" />
        <div className="toolbar-icons" style={{ marginLeft: 8 }}>
          <button className={"iconbtn" + (panel === "filter" ? " active" : "")} onClick={openFilter} title={t.filter}><Lic name="list-filter" size={16} /></button>
          <button className={"iconbtn" + (panel === "display" ? " active" : "")} onClick={() => setPanel(panel === "display" ? null : "display")} title={t.display}><Lic name="sliders-horizontal" size={16} /></button>
        </div>
      </div>
      <div className="body-row">
        <ScenariosMonitor t={t} lang={lang} plans={plans} securities={securities} securityScenarios={securityScenarios} onOpenPlan={onOpenPlan} onNewScenario={onNewScenario} panel={panel} setPanel={setPanel} filterAnchor={filterAnchor} />
      </div>
      {author && <ScenarioAuthorModal adhoc={{ securities, initialTicker: author.ticker }} onClose={() => setAuthor(null)} />}
    </div>
  );
}
