// design_handoff_keystone/source/Journal.jsx JournalReader 이식 — 일지 디테일(중앙 리더).
// 헤드(subject + ctx 배지 + 열기) · 메타(티커·전략·when·수정) · 노트 본문/편집 ·
// "기록 시점→현재" since 트랙(jrWritePrice) · 시나리오게이지 + 포지션카드(hasPos) ·
// 같은 종목 스레드(siblings) · 이 종목에 기록 추가 버튼.
// 스코프: 플랜 노트만(SECS=[]) — isSec 분기는 구조 보존용이나 실제로는 항상 false.
// SWC 함정 회피: JSX 안 제네릭 캐스트 없음. 순수 로직/포맷은 @keystone/core, since 가격은 lib/journal.
"use client";
import { Fragment, useEffect, useState } from "react";
import type { Lang } from "@keystone/core/types";
import { fmtCompact } from "@keystone/core/format";
import { planReturn } from "@keystone/core/analytics";
import { EXEC_STRATEGIES } from "@keystone/core/reference";
import { Lic } from "@/components/icons";
import { ScenarioGauge } from "@/components/plan/scenario-gauge";
import { jrWritePrice, wlab, type JournalEntry } from "@/lib/journal";

/** ctx 배지(현재가 vs base target 갭) — subjName/subjColor 등과 함께 부모에서 주입 */
export interface CtxBadge { g: number; tone: string; lab: string }

export function JournalReader({
  n, all, lang, ctxOf, subjName, subjColor, keyOf, pfColor, onSelect, onEditNote, onOpen, onCompose,
}: {
  n: JournalEntry;
  all: JournalEntry[];
  lang: Lang;
  ctxOf: (p: JournalEntry["plan"]) => CtxBadge | null;
  subjName: (n: JournalEntry) => string;
  subjColor: (n: JournalEntry) => string;
  keyOf: (n: JournalEntry) => string;
  pfColor: (p: JournalEntry["plan"]) => string;
  onSelect: (n: JournalEntry) => void;
  onEditNote: (n: JournalEntry, text: string) => void;
  onOpen: (plan: JournalEntry["plan"]) => void;
  onCompose: (subjId: string) => void;
}) {
  const ko = lang === "ko";
  const isSec = !!n.sec; // 스코프상 항상 false(플랜 노트만) — 구조 보존
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  useEffect(() => { setEditing(false); }, [n.id, isSec]);
  const commitEdit = () => { onEditNote(n, editText); setEditing(false); };
  const p = isSec ? null : n.plan;
  const subjId = n.plan.id;
  const ctx = isSec ? null : ctxOf(n.plan);
  const siblings = all.filter((x) => x.plan.id === subjId);
  const ticker = p && p.ticker;
  const cur = p ? p.cur : "USD";
  const hasPos = !!(p && p.totalShares > 0 && p.avgPrice != null);
  const hasScen = !!(p && p.scenarios && p.scenarios.length >= 3);
  const ret = p ? planReturn(p) : null;
  const openSubj = () => onOpen(n.plan);

  // "기록 이후" — 작성 당시 가격 → 현재 (일지 고유; 인박스의 실시간 next-signal 과 대비)
  const curPrice = p ? p.currentPrice : null;
  const scen = (p && p.scenarios) || [];
  const bear = scen.find((s) => s.label && s.label.en === "Bear");
  const bull = scen.find((s) => s.label && s.label.en === "Bull");
  const lo = bear ? bear.target : null;
  const hi = bull ? bull.target : null;
  const wrote = jrWritePrice(n, curPrice, lo, hi);
  const sincePct = (wrote != null && curPrice) ? (curPrice - wrote) / wrote * 100 : null;

  // 전략 배지(플랜 execId → EXEC_STRATEGIES)
  const stg = (!isSec && p) ? EXEC_STRATEGIES.find((s) => s.id === p.execId) : null;

  return (
    <div className="jr-reader">
      <div className="jr-rd-head">
        <span className="jr-rd-subj">
          <span className="jr-chip-dot lg" style={{ background: subjColor(n) }} />
          {subjName(n)}
        </span>
        {ctx && <span className={"jr-ctx " + ctx.tone}>{(ctx.g >= 0 ? "+" : "") + ctx.g.toFixed(0)}% {ctx.lab}</span>}
        <button className="jr-rd-open" onClick={openSubj}>{ko ? "플랜 열기" : "Open plan"}<Lic name="arrow-up-right" size={13} cls="icon-sm" color="currentColor" /></button>
      </div>
      <div className="jr-rd-meta">
        {ticker && <span className="jr-rd-tk mono">{ticker}</span>}
        {ticker && <span className="jr-rd-sep">·</span>}
        {stg && (
          <Fragment>
            <span className="jr-rd-strat"><Lic name={stg.icon || "git-branch"} size={12} cls="icon-sm" color={stg.color} />{stg.name[lang]}</span>
            <span className="jr-rd-sep">·</span>
          </Fragment>
        )}
        <span className="jr-rd-when">{wlab(n.when, lang)}{n.editedAt && <span className="note-edited">{ko ? " · 수정됨" : " · edited"}</span>}</span>
        {!editing && <button className="jr-rd-edit" title={ko ? "수정" : "Edit"} onClick={() => { setEditText(n.text); setEditing(true); }}><Lic name="pencil" size={12} cls="icon-sm" color="currentColor" />{ko ? "수정" : "Edit"}</button>}
      </div>

      {editing
        ? <div className="jr-rd-editbox">
            <textarea className="note-input" autoFocus rows={4} value={editText} onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commitEdit(); if (e.key === "Escape") setEditing(false); }} />
            <div className="note-edit-acts">
              <button className="note-cancel" onClick={() => setEditing(false)}>{ko ? "취소" : "Cancel"}</button>
              <button className="v-btn v-btn--primary note-save" onClick={commitEdit}>{ko ? "저장" : "Save"}</button>
            </div>
          </div>
        : <div className="jr-rd-note">{n.text}</div>}

      {sincePct != null && wrote != null && curPrice != null && <div className="jr-rd-since">
        <div className="jr-rd-since-track">
          <span className="jr-rd-since-cell">
            <span className="jr-rd-since-lab">{ko ? "기록 시점" : "At writing"}</span>
            <span className="jr-rd-since-val mono">{fmtCompact(wrote, cur)}</span>
            <span className="jr-since-tip"><b>{wlab(n.when, lang)}</b> {ko ? "작성 당시 가격" : "price when written"}</span>
          </span>
          <span className="jr-rd-since-arrow"><Lic name="arrow-right" size={15} cls="icon-sm" color="var(--fg-4)" /></span>
          <span className="jr-rd-since-cell">
            <span className="jr-rd-since-lab">{ko ? "현재" : "Now"}</span>
            <span className="jr-rd-since-val mono">{fmtCompact(curPrice, cur)}</span>
            <span className="jr-since-tip">{ko ? "기록 이후" : "Since note"} <b>{(curPrice - wrote >= 0 ? "+" : "−") + fmtCompact(Math.abs(curPrice - wrote), cur)}</b></span>
          </span>
          <span className={"jr-rd-since-pct " + (sincePct >= 0 ? "pos" : "neg")}>
            <Lic name={sincePct >= 0 ? "trending-up" : "trending-down"} size={13} cls="icon-sm" color="currentColor" />
            {(sincePct >= 0 ? "+" : "") + sincePct.toFixed(1)}%
          </span>
        </div>
      </div>}

      {(hasScen || hasPos) && p && <div className="jr-rd-ctxblock">
        {hasScen && <div className="jr-rd-gauge">
          <div className="jr-rd-cap">{ko ? "시나리오 범위" : "Scenario range"}</div>
          <ScenarioGauge plan={p} lang={lang} />
        </div>}
        {hasPos && (() => {
          const evalAmt = p.currentPrice * p.totalShares;
          const tone = ret && ret.rate >= 0 ? "pos" : "neg";
          return (
            <div className={"jr-rd-poscard " + tone}>
              <div className="jr-rd-poscard-top">
                <div className="jr-rd-poscard-head">
                  <span className="jr-rd-poscard-cap">{ko ? "포지션" : "Position"}</span>
                  <span className="jr-rd-poscard-sub mono">{(p.totalShares || 0).toLocaleString("en-US")}{ko ? "주" : " sh"}</span>
                </div>
                <div className="jr-rd-poscard-pl">
                  <span className={"jr-rd-poscard-rate " + tone}>{!ret ? "—" : (ret.rate >= 0 ? "+" : "") + ret.rate.toFixed(1) + "%"}</span>
                  <span className={"jr-rd-poscard-amt mono " + tone}>{!ret ? "" : (ret.amt >= 0 ? "+" : "−") + fmtCompact(Math.abs(ret.amt), cur)}</span>
                </div>
              </div>
              <div className="jr-rd-poscard-stats">
                <div className="jr-rd-poscell"><span className="jr-rd-poslab">{ko ? "평단" : "Avg"}</span><span className="jr-rd-posval mono">{fmtCompact(p.avgPrice, cur)}</span></div>
                <div className="jr-rd-poscell"><span className="jr-rd-poslab">{ko ? "현재가" : "Price"}</span><span className="jr-rd-posval mono">{fmtCompact(p.currentPrice, cur)}</span></div>
                <div className="jr-rd-poscell"><span className="jr-rd-poslab">{ko ? "평가액" : "Value"}</span><span className="jr-rd-posval mono">{fmtCompact(evalAmt, cur)}</span></div>
                <div className="jr-rd-poscell"><span className="jr-rd-poslab">{ko ? "투자금" : "Cost"}</span><span className="jr-rd-posval mono">{fmtCompact(p.totalInvested, cur)}</span></div>
              </div>
            </div>
          );
        })()}
      </div>}

      {siblings.length > 1 && <div className="jr-rd-thread">
        <div className="jr-rd-cap">{ko ? `이 종목의 다른 기록 ${siblings.length - 1}` : `Other entries · ${siblings.length - 1}`}</div>
        <div className="jr-rd-thread-list">
          {siblings.filter((x) => keyOf(x) !== keyOf(n)).slice(0, 8).map((x) => {
            const xw = jrWritePrice(x, curPrice, lo, hi);
            return (
              <div className="jr-rd-titem" key={keyOf(x)} onClick={() => onSelect(x)}>
                <span className="jr-rd-twhen mono">{wlab(x.when, lang)}</span>
                {xw != null && <span className="jr-rd-tprice mono">{fmtCompact(xw, cur)}</span>}
                <span className="jr-rd-ttext">{x.text}</span>
              </div>
            );
          })}
        </div>
      </div>}

      <button className="jr-rd-addmore" onClick={() => onCompose(subjId)}>
        <Lic name="plus" size={13} cls="icon-sm" color="currentColor" />{ko ? "이 종목에 기록 추가" : "Add entry for this subject"}
      </button>
    </div>
  );
}
