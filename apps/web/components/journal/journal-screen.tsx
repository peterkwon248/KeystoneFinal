// design_handoff_keystone/source/Journal.jsx JournalScreen 이식 — 일지 3-pane(마스터-디테일).
// .jr > .jr-master(헤드 + 새기록 토글 · 필터바 · 검색행(input + MiniDropdown 필터) · 일자별 그룹 리스트 · 더보기)
//     + .jr-detail(compose 박스 OR JournalReader OR pick empty)
//     + .jr-rail(요약: 기록/종목 수 · 마지막 · 종목별 클릭필터).
// 스코프(마일스톤 7): 플랜 노트만 — SECS=[](웹엔 종목 저장소 없음). sec 분기는 구조 보존용이나 항상 비게 렌더.
// 영속: addNote/editNote → patchNotesAction(플랜 대상, custom_fields.notes revalidate) + router.refresh.
//   원본의 useReducer jrForce 는 종목 저널 로컬반영용이었으므로 플랜-only 에선 router.refresh 로 대체.
// pfColor: 원본은 PORTFOLIOS 전역을 봤으나 웹은 portfolios(PfLite[]) prop 을 portfolioId 로 매칭.
// SWC 함정 회피: JSX 안 제네릭 캐스트 없음.
"use client";
import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@keystone/core/types";
import { Lic } from "@/components/icons";
import { MiniDropdown, type MdItem } from "@/components/plan/mini-dropdown";
import { usePrefs } from "@/components/shell/prefs";
import type { PfLite } from "@/lib/pf-palette";
import type { UIPlan, UINote } from "@/lib/plan-mapper";
import { patchNotesAction } from "@/app/(shell)/plans/[id]/actions";
import { flattenNotes, wlab, type JournalEntry } from "@/lib/journal";
import { refNow } from "@/lib/clock";
import { JournalReader, type CtxBadge } from "./journal-reader";

// 종목 저장소(SECURITIES/s.journal)는 이번 스코프 밖 — 웹엔 아직 종목 저장소가 없다.
// 원본의 sec 분기는 후속 종목상세(19~22) 이식 시 채우도록 구조만 보존하고, 여기선 플랜 노트만 다룬다.

export function JournalScreen({ plans, portfolios }: { plans: UIPlan[]; portfolios: PfLite[] }) {
  const router = useRouter();
  const { lang }: { lang: Lang } = usePrefs();
  const ko = lang === "ko";

  // 플랜 → 포트폴리오 색 (원본 pfColor(PORTFOLIOS) 대체)
  const pfColor = (p: UIPlan | null | undefined): string =>
    (p && portfolios.find((x) => x.id === p.portfolioId)?.color) || "var(--fg-3)";

  const [scope, setScope] = useState<string>("all"); // all | planId
  const [q, setQ] = useState("");
  const [selKey, setSelKey] = useState<string | null>(null);
  const [compose, setCompose] = useState(true);
  const [composeFor, setComposeFor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [limit, setLimit] = useState(80);

  const subjOf = (n: JournalEntry) => n.plan.id;
  const keyOf = (n: JournalEntry) => subjOf(n) + ":" + n.id;

  // 모든 플랜의 노트를 단일 피드로 평탄화 + 최신순 (플랜 노트만; SECS 는 스코프 밖)
  const all = useMemo(() => flattenNotes(plans), [plans]);

  const filtered = all.filter((n) => {
    if (scope !== "all" && subjOf(n) !== scope) return false;
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      const nm = n.plan.name[lang] || "";
      return (n.text || "").toLowerCase().includes(s) || nm.toLowerCase().includes(s);
    }
    return true;
  });
  const shown = filtered.slice(0, limit);
  const more = filtered.length - shown.length;

  const withNotes = (plans || []).filter((p) => (p.notes || []).length);
  const todayStamp = ko ? "6월 22일" : "Jun 22";

  // ctx 배지 — 현재가 vs base target 갭
  const ctxOf = (p: UIPlan): CtxBadge | null => {
    const base = ((p.scenarios || []).find((s) => s.label && s.label.en === "Base") || {}).target || p.iv;
    const px = p.currentPrice;
    if (!base || !px) return null;
    const g = (px - base) / base * 100;
    const tone = g <= -2 ? "pos" : g >= 2 ? "neg" : "warn";
    const lab = ko ? (g <= -2 ? "저평가" : g >= 2 ? "고평가" : "적정") : (g <= -2 ? "undervalued" : g >= 2 ? "overvalued" : "fair");
    return { g, tone, lab };
  };

  // 표시 일자별 그룹핑
  const groups: { key: string; label: string; items: JournalEntry[] }[] = [];
  shown.forEach((n) => {
    const key = wlab(n.when, lang);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) { g = { key, label: key === todayStamp ? (ko ? "오늘" : "Today") : key, items: [] }; groups.push(g); }
    g.items.push(n);
  });

  // compose 대상
  const targetId = composeFor || (scope !== "all" ? scope : ((plans || [])[0] || {}).id);
  const targetPlan = (plans || []).find((p) => p.id === targetId) || null;

  const addNote = () => {
    const v = draft.trim(); if (!v || !targetPlan) return;
    const d = refNow();
    const stamp = { en: `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]} ${d.getDate()}`, ko: `${d.getMonth() + 1}월 ${d.getDate()}일` };
    const snap = targetPlan.currentPrice;
    const entry: UINote = { id: "nt" + Date.now(), when: stamp, text: v, price: snap };
    const next = [entry, ...((targetPlan.notes as UINote[] | undefined) || [])];
    void patchNotesAction(targetPlan.dbId, next).then(() => router.refresh()).catch(() => {});
    setDraft("");
    setSelKey(targetPlan.id + ":" + entry.id);
    setCompose(false);
  };

  // 선택 노트
  const sel = !compose ? all.find((n) => keyOf(n) === selKey) || null : null;
  const selectNote = (n: JournalEntry) => { setSelKey(keyOf(n)); setCompose(false); };
  const editNote = (n: JournalEntry, text: string) => {
    const v = (text || "").trim(); if (!v) return;
    const next = ((n.plan.notes as UINote[] | undefined) || []).map((x) => x.id === n.id ? { ...x, text: v, editedAt: Date.now() } : x);
    void patchNotesAction(n.plan.dbId, next).then(() => router.refresh()).catch(() => {});
  };
  const startCompose = () => { setCompose(true); setSelKey(null); };

  // 레일 통계
  const total = all.length;
  const bySubj: Record<string, { key: string; plan: UIPlan; n: number }> = {};
  all.forEach((n) => { const k = subjOf(n); bySubj[k] = bySubj[k] || { key: k, plan: n.plan, n: 0 }; bySubj[k].n++; });
  const topSubj = Object.values(bySubj).sort((a, b) => b.n - a.n).slice(0, 6);
  const subjPlans = Object.values(bySubj).sort((a, b) => b.n - a.n);
  const mkSubjItem = (s: { key: string; plan: UIPlan; n: number }): MdItem => ({
    value: s.key,
    label: s.plan.name[lang],
    search: s.plan.name[lang] + " " + (s.plan.ticker || ""),
    icon: <span className="jr-chip-dot" style={{ background: pfColor(s.plan) }} />,
    right: s.n, on: s.key === scope,
  });
  const lastWhen = all.length ? all[0].when : null;

  const subjName = (n: JournalEntry) => n.plan.name[lang];
  const subjColor = (n: JournalEntry) => pfColor(n.plan);

  const scopeName = () => {
    const s = topSubj.find((x) => x.key === scope) || Object.values(bySubj).find((x) => x.key === scope);
    return s ? s.plan.name[lang] : (ko ? "전체" : "All");
  };

  return (
    <div className="jr">
      {/* ── master: note list ── */}
      <div className="jr-master">
        <div className="jr-head">
          <span className="jr-h-title">{ko ? "일지" : "Journal"}</span>
          {total > 0 && <span className="jr-h-count">{total}</span>}
          <button className={"jr-h-new" + (compose ? " on" : "")} onClick={startCompose} title={ko ? "새 기록" : "New entry"}>
            <Lic name="pencil" size={13} cls="icon-sm" color="currentColor" />{ko ? "새 기록" : "Write"}
          </button>
        </div>

        {scope !== "all" && (() => {
          const subj = withNotes.find((p) => p.id === scope);
          if (!subj) return null;
          return <div className="jr-filterbar">
            <span className="jr-filter-pill">
              <span className="jr-filter-lab">{ko ? "필터" : "Filter"}</span>
              <span className="jr-chip-dot" style={{ background: pfColor(subj) }} />
              <span className="jr-filter-nm">{subj.name[lang]}</span>
              <button className="jr-filter-x" onClick={() => setScope("all")} title={ko ? "필터 해제" : "Clear filter"}><Lic name="x" size={12} color="currentColor" /></button>
            </span>
          </div>;
        })()}

        <div className="jr-search-row">
          <div className="jr-search">
            <Lic name="search" size={14} cls="icon-sm" color="var(--fg-4)" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ko ? "메모 검색…" : "Search notes…"} />
          </div>
          <MiniDropdown width={240} align="right" searchable={ko ? "종목·플랜 검색…" : "Search…"} lang={lang}
            trigger={<span className={"jr-filter-trig" + (scope !== "all" ? " on" : "")}>
              <Lic name="list-filter" size={13} cls="icon-sm" color="currentColor" />
              <span className="jr-filter-trig-nm">{scope === "all" ? (ko ? "전체" : "All") : scopeName()}</span>
              <Lic name="chevron-down" size={11} cls="icon-sm" color="var(--fg-4)" />
            </span>}
            items={[
              { value: "all", label: ko ? "전체 기록" : "All entries", icon: <Lic name="layers" size={14} cls="icon-sm" color="var(--fg-4)" />, right: total, on: scope === "all" },
              ...(subjPlans.length ? [{ cap: ko ? "플랜" : "Plans" } as MdItem, ...subjPlans.map(mkSubjItem)] : []),
            ]}
            onPick={(v) => setScope(v || "all")} />
        </div>

        <div className="jr-items">
          {filtered.length === 0 ? (
            <div className="jr-empty">
              <Lic name="notebook-pen" size={24} color="var(--fg-4)" />
              <div className="jr-empty-h">{ko ? "아직 기록이 없습니다" : "No entries yet"}</div>
              <div className="jr-empty-sub">{ko ? "오른쪽에서 첫 기록을 남겨보세요." : "Write your first note on the right."}</div>
            </div>
          ) : groups.map((grp, gi) => (
            <div className="jr-daygrp" key={grp.key + gi}>
              <div className="jr-dayhead">{grp.label}<span className="jr-day-n">{grp.items.length}</span></div>
              {grp.items.map((n) => {
                const ctx = ctxOf(n.plan);
                const active = !compose && keyOf(n) === selKey;
                return (
                  <div className={"jr-item" + (active ? " active" : "")} key={keyOf(n)} onClick={() => selectNote(n)}>
                    <div className="jr-item-body">
                      <div className="jr-item-head">
                        <span className="jr-tkr-chip"><span className="jr-chip-dot" style={{ background: subjColor(n) }} />{subjName(n)}</span>
                        {ctx && <span className={"jr-ctx " + ctx.tone}>{(ctx.g >= 0 ? "+" : "") + ctx.g.toFixed(0)}%</span>}
                        <span className="jr-when">{wlab(n.when, lang)}</span>
                      </div>
                      <div className="jr-item-text">{n.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {more > 0 && <button className="jr-more" onClick={() => setLimit((l) => l + 80)}>{ko ? `더 보기 (${more}개 남음)` : `Show more (${more} left)`}</button>}
        </div>
      </div>

      {/* ── detail: compose OR note reader ── */}
      <div className="jr-detail">
        {compose ? (
          <div className="jr-compose-pane">
            <div className="jr-cp-head">
              <span className="jr-cp-title">{ko ? "새 기록" : "New entry"}</span>
              <div className="jr-cp-target">
                <span className="jr-cp-lab">{ko ? "기록할 대상" : "Log to"}</span>
                <MiniDropdown width={280} searchable={ko ? "플랜·종목 검색…" : "Search…"} lang={lang}
                  trigger={<span className="jr-plan-pick">{targetPlan ? <Fragment><span className="jr-chip-dot" style={{ background: pfColor(targetPlan) }} />{targetPlan.name[lang]}</Fragment> : (ko ? "대상 선택" : "Pick")}<Lic name="chevron-down" size={11} cls="icon-sm" color="var(--fg-4)" /></span>}
                  items={[
                    { cap: ko ? "플랜" : "Plans" } as MdItem,
                    ...(plans || []).map((p): MdItem => ({ value: p.id, label: p.name[lang], search: p.name[lang] + " " + (p.ticker || "") + " " + (p.tickerName ? p.tickerName[lang] : ""), icon: <span className="jr-chip-dot" style={{ background: pfColor(p) }} />, on: p.id === targetId })),
                  ]}
                  onPick={(v) => setComposeFor(v || null)} />
              </div>
            </div>
            <textarea className="jr-cp-input" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote(); }}
              placeholder={ko ? "오늘의 관찰·결정을 기록하세요…\n\n무엇을 봤고, 무엇을 결정했는지. (⌘/Ctrl+Enter로 저장)" : "Log today's observation or decision…\n\n(⌘/Ctrl+Enter to save)"} />
            <div className="jr-cp-foot">
              <span className="jr-cp-hint">{ko ? "⌘/Ctrl + Enter" : "⌘/Ctrl + Enter"}</span>
              <button className="v-btn v-btn--primary" disabled={!draft.trim()} onClick={addNote}>{ko ? "기록 저장" : "Save entry"}</button>
            </div>
          </div>
        ) : sel ? (
          <JournalReader n={sel} all={all} lang={lang} ctxOf={ctxOf} subjName={subjName} subjColor={subjColor} keyOf={keyOf} pfColor={pfColor}
            onSelect={selectNote} onEditNote={editNote} onOpen={(pl) => router.push(`/plans/${pl.dbId}`)} onCompose={(id) => { setComposeFor(id); startCompose(); }} />
        ) : (
          <div className="jr-pick">
            <Lic name="notebook-pen" size={26} cls="icon" color="var(--fg-4)" />
            <div className="jr-pick-t">{ko ? "기록을 선택하세요" : "Select an entry"}</div>
            <div className="jr-pick-s">{ko ? "왼쪽에서 기록을 고르거나, 새 기록을 작성하세요." : "Pick a note on the left, or write a new one."}</div>
          </div>
        )}
      </div>

      {/* ── rail: summary ── */}
      <aside className="jr-rail">
        {total === 0 ? (
          <div className="jr-rail-card jr-rail-empty">{ko ? "첫 기록을 남기면 여기에 요약이 쌓입니다." : "Write your first note and a summary builds here."}</div>
        ) : <Fragment>
          <div className="jr-rail-card">
            <div className="jr-rail-h">{ko ? "기록 요약" : "Journal summary"}</div>
            <div className="jr-rail-stats">
              <div className="jr-rail-stat"><span className="jr-rail-num">{total}</span><span className="jr-rail-lab">{ko ? "기록" : "entries"}</span></div>
              <div className="jr-rail-stat"><span className="jr-rail-num">{topSubj.length}</span><span className="jr-rail-lab">{ko ? "종목" : "subjects"}</span></div>
            </div>
            {lastWhen && <div className="jr-rail-last">{ko ? "마지막 기록 · " : "Last · "}{wlab(lastWhen, lang)}</div>}
          </div>
          {topSubj.length > 0 && <div className="jr-rail-card">
            <div className="jr-rail-h">{ko ? "종목별 기록" : "By subject"}<span className="jr-rail-hint">{ko ? "클릭해 필터" : "click to filter"}</span></div>
            {topSubj.map((s) => (
              <div className={"jr-rail-row" + (scope === s.key ? " on" : "")} key={s.key} onClick={() => setScope(scope === s.key ? "all" : s.key)}>
                <span className="jr-chip-dot" style={{ background: pfColor(s.plan) }} />
                <span className="jr-rail-nm">{s.plan.name[lang]}</span>
                <span className="jr-rail-cnt">{s.n}</span>
              </div>
            ))}
          </div>}
        </Fragment>}
      </aside>
    </div>
  );
}
