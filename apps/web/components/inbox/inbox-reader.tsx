// design_handoff_keystone/source/Inbox.jsx InboxReader 이식 — 인박스 디테일(리더).
// 헤드/메타/when-then/시나리오게이지/전략스트립/청산요약/액션(매수·매도 폼, 청산)/트리아지 바/로그박스.
// 매수·매도 폼 → doBuy/doSell(부모의 addExecutionAction 래퍼). 청산 → doClose(patchPlan). 기록 → logNote(patchNotes).
// SWC 함정 회피: JSX 안 제네릭 캐스트 없음. 순수 로직·포맷은 @keystone/core, 청산요약은 lib/closeout.
"use client";
import { Fragment, useEffect, useState } from "react";
import type { I18nDict, Lang } from "@keystone/core/types";
import { fmtCompact, fmtRel } from "@keystone/core/format";
import { EXEC_STRATEGIES } from "@keystone/core/reference";
import { Lic } from "@/components/icons";
import { ScenarioGauge } from "@/components/plan/scenario-gauge";
import { StrategyStrip } from "@/components/inbox/strategy-strip";
import { closeoutSummary } from "@/lib/closeout";
import { IBX_META, unitQty, type InboxNote } from "@/lib/inbox";

export function InboxReader({
  n, t, lang, onOpen, doBuy, doSell, doClose, resolve, mute, logNote,
}: {
  n: InboxNote;
  t: I18nDict;
  lang: Lang;
  onOpen: (plan: InboxNote["plan"], tab: string) => void;
  doBuy: (n: InboxNote, ov?: { price: number; qty: number }) => void;
  doSell: (n: InboxNote, ov?: { price: number; qty: number }) => void;
  doClose: (n: InboxNote) => void;
  resolve: (n: InboxNote) => void;
  mute: (n: InboxNote) => void;
  logNote: (n: InboxNote, text: string) => void;
}) {
  const ko = lang === "ko";
  const m = IBX_META[n.type];
  const p = n.plan;
  const hasScen = !!(p.scenarios && p.scenarios.length >= 3);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [buyOpen, setBuyOpen] = useState(false);
  const [buyPrice, setBuyPrice] = useState("");
  const [buyQty, setBuyQty] = useState("");
  const [sellOpen, setSellOpen] = useState(false);
  const [sellPrice, setSellPrice] = useState("");
  const [sellQty, setSellQty] = useState("");
  useEffect(() => { setNoteOpen(false); setNoteText(""); setBuyOpen(false); setSellOpen(false); }, [n.id]);

  const openBuy = () => { setBuyPrice(String(p.currentPrice)); setBuyQty(String(unitQty(p))); setBuyOpen(true); };
  const buyPriceN = parseFloat(String(buyPrice).replace(/[^0-9.]/g, "")) || 0;
  const buyQtyN = Math.max(0, parseInt(String(buyQty).replace(/[^0-9]/g, ""), 10) || 0);
  const confirmBuy = () => { if (buyPriceN > 0 && buyQtyN > 0) doBuy(n, { price: buyPriceN, qty: buyQtyN }); setBuyOpen(false); };

  const sellUnit = Math.min(unitQty(p), p.totalShares || 0) || unitQty(p);
  const openSell = () => { setSellPrice(String(p.currentPrice)); setSellQty(String(sellUnit)); setSellOpen(true); };
  const sellPriceN = parseFloat(String(sellPrice).replace(/[^0-9.]/g, "")) || 0;
  const sellQtyN = Math.max(0, parseInt(String(sellQty).replace(/[^0-9]/g, ""), 10) || 0);
  const confirmSell = () => { if (sellPriceN > 0 && sellQtyN > 0) doSell(n, { price: sellPriceN, qty: sellQtyN }); setSellOpen(false); };

  const submitNote = (prefix: string | null) => {
    const body = (prefix ? prefix + (noteText.trim() ? ": " + noteText.trim() : "") : noteText.trim());
    if (!body) return;
    logNote(n, "[" + (n.rule ? n.rule.name[lang] : (n.title || (ko ? "알림" : "Alert"))) + "] " + body);
    setNoteOpen(false); setNoteText("");
  };

  // 전략 실행 상태 스트립 노출 조건 (source verbatim)
  const showStrat = !!(p.execId && p.status !== "closed" && EXEC_STRATEGIES.some((s) => s.id === p.execId));
  // 메타의 closed 전략칩
  const closedEg = p.status === "closed" ? EXEC_STRATEGIES.find((s) => s.id === p.execId) : null;
  // 청산 요약(closed)
  const co = p.status === "closed" ? closeoutSummary(p) : null;
  const coTone = co ? (co.realized >= 0 ? "pos" : "neg") : "pos";

  // 액션 영역: 액션 종류 판정 (source IIFE)
  const act = n.action || (n.type === "buy" ? "buy" : n.type === "sell" ? "sell" : null);
  const canSell = act === "sell" && p.status !== "closed" && (p.totalShares || 0) > 0;
  const canClose = act === "sell" && p.status !== "closing" && p.status !== "closed";
  const showActions = act === "buy" || canSell || canClose;

  return (
    <div className="ibx-reader">
      <div className="ibx-reader-head">
        <span className="ibx-ic lg" style={{ background: m.soft }}><Lic name={m.icon} size={16} cls="icon-sm" color={m.color} /></span>
        <h2>{n.rule ? n.rule.name[lang] : n.title}</h2>
        <button className="jr-rd-open" onClick={() => onOpen(p, n.type === "info" ? "activity" : "executions")}>{t.ibx_openPlan}<Lic name="arrow-up-right" size={13} cls="icon-sm" color="currentColor" /></button>
      </div>
      <div className="ibx-reader-meta">
        <span className="ibx-rm-tk mono">{p.ticker}</span>
        <span className="ibx-rm-dot">·</span>
        <span className="ibx-rm-name">{p.name[lang]}</span>
        {closedEg && (
          <Fragment>
            <span className="ibx-rm-dot">·</span>
            <span className="ibx-rm-strat"><Lic name={closedEg.icon || "git-branch"} size={12} cls="icon-sm" color={closedEg.color} />{closedEg.name[lang]}</span>
          </Fragment>
        )}
        <span className="ibx-rm-time">{fmtRel(n.time, lang)}</span>
      </div>

      <div className="ibx-whenthen">
        {n.rule ? (
          <Fragment>
            <div className="ibx-wt-row"><span className="ibx-wt-k">{t.ibx_when}</span><span className="ibx-wt-v">{n.rule.when[lang]}</span></div>
            <div className="ibx-wt-arrow"><Lic name="arrow-down" size={13} cls="icon-sm" color="var(--fg-4)" /></div>
            <div className="ibx-wt-row"><span className="ibx-wt-k">{t.ibx_then}</span><span className="ibx-wt-v">{n.rule.then[lang]}</span></div>
          </Fragment>
        ) : (
          <div className="ibx-wt-row"><span className="ibx-wt-v" style={{ lineHeight: 1.55 }}>{n.body}</span></div>
        )}
      </div>

      {hasScen && (
        <div className="ibx-gauge">
          <div className="ibx-gauge-cap">{ko ? "시나리오 범위" : "Scenario range"}</div>
          <ScenarioGauge plan={p} lang={lang} />
        </div>
      )}

      {showStrat && (
        <div className="ibx-gauge">
          <div className="ibx-gauge-cap">{ko ? "전략" : "Strategy"}</div>
          <StrategyStrip plan={p} lang={lang} />
        </div>
      )}

      {co && (
        <div className={"ibx-closeout " + coTone}>
          <div className="ibx-closeout-top">
            <div className="ibx-closeout-head">
              <span className="ibx-closeout-cap">{ko ? "청산 요약" : "Closeout"}</span>
              <span className="ibx-closeout-sub mono">{co.avgBuy != null ? fmtCompact(co.avgBuy, p.cur) : "—"}{co.avgSell != null ? " → " + fmtCompact(co.avgSell, p.cur) : ""}</span>
            </div>
            <div className="ibx-closeout-pl">
              <span className={"ibx-closeout-rate " + coTone}>{co.realizedPct == null ? "—" : (co.realizedPct >= 0 ? "+" : "") + co.realizedPct.toFixed(1) + "%"}</span>
              <span className={"ibx-closeout-amt mono " + coTone}>{(co.realized >= 0 ? "+" : "−") + fmtCompact(Math.abs(co.realized), p.cur)}</span>
            </div>
          </div>
          <div className="ibx-closeout-stats">
            <div className="ibx-co-cell"><span className="ibx-co-lab">{ko ? "총 투입" : "Invested"}</span><span className="ibx-co-val mono">{fmtCompact(co.invested, p.cur)}</span></div>
            <div className="ibx-co-cell"><span className="ibx-co-lab">{ko ? "총 매수" : "Bought"}</span><span className="ibx-co-val mono">{co.buyQty.toLocaleString("en-US")}{ko ? "주" : " sh"}</span></div>
            {co.holdDays != null && <div className="ibx-co-cell"><span className="ibx-co-lab">{ko ? "보유 기간" : "Held"}</span><span className="ibx-co-val mono">{co.holdDays}{ko ? "일" : "d"}</span></div>}
          </div>
        </div>
      )}

      {showActions && (
        <div className="ibx-actions">
          {act === "buy" && (buyOpen ? (
            <div className="ibx-buyform">
              <div className="ibx-buyform-grid">
                <label className="ibx-bf-field">
                  <span className="ibx-bf-lab">{ko ? "체결 단가" : "Fill price"}</span>
                  <input className="ibx-bf-input mono" value={buyPrice} inputMode="decimal" autoFocus onChange={(e) => setBuyPrice(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") confirmBuy(); if (e.key === "Escape") setBuyOpen(false); }} />
                </label>
                <label className="ibx-bf-field">
                  <span className="ibx-bf-lab">{ko ? "수량" : "Qty"}</span>
                  <input className="ibx-bf-input mono" value={buyQty} inputMode="numeric" onChange={(e) => setBuyQty(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") confirmBuy(); if (e.key === "Escape") setBuyOpen(false); }} />
                </label>
                <div className="ibx-bf-field">
                  <span className="ibx-bf-lab">{ko ? "합계" : "Total"}</span>
                  <span className="ibx-bf-total mono">{fmtCompact(buyPriceN * buyQtyN, p.cur)}</span>
                </div>
              </div>
              <div className="ibx-bf-acts">
                <span className="ibx-bf-note"><Lic name="info" size={12} cls="icon-sm" color="var(--fg-4)" />{ko ? "실제 체결 내역을 입력하세요 — 위 값은 추정치입니다" : "Enter your actual fill — values above are estimates"}</span>
                <button className="note-cancel" onClick={() => setBuyOpen(false)}>{ko ? "취소" : "Cancel"}</button>
                <button className="v-btn v-btn--primary note-save" onClick={confirmBuy} disabled={!(buyPriceN > 0 && buyQtyN > 0)}>{ko ? "체결 기록" : "Record fill"}</button>
              </div>
            </div>
          ) : (
            <button className="v-btn v-btn--primary ibx-act" onClick={openBuy}>
              <Lic name="plus" size={14} cls="icon-sm" color="currentColor" />{ko ? "매수 체결 입력" : "Record buy"}
              <span className="ibx-act-hint">{ko ? "예상" : "est."} {unitQty(p).toLocaleString("en-US")}{ko ? "주" : "sh"} · {fmtCompact(p.currentPrice * unitQty(p), p.cur)}</span>
            </button>
          ))}
          {canSell && (sellOpen ? (
            <div className="ibx-buyform is-sell">
              <div className="ibx-buyform-grid">
                <label className="ibx-bf-field">
                  <span className="ibx-bf-lab">{ko ? "체결 단가" : "Fill price"}</span>
                  <input className="ibx-bf-input mono" value={sellPrice} inputMode="decimal" autoFocus onChange={(e) => setSellPrice(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") confirmSell(); if (e.key === "Escape") setSellOpen(false); }} />
                </label>
                <label className="ibx-bf-field">
                  <span className="ibx-bf-lab">{ko ? `수량 (보유 ${(p.totalShares || 0).toLocaleString("en-US")})` : `Qty (held ${(p.totalShares || 0).toLocaleString("en-US")})`}</span>
                  <input className="ibx-bf-input mono" value={sellQty} inputMode="numeric" onChange={(e) => setSellQty(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") confirmSell(); if (e.key === "Escape") setSellOpen(false); }} />
                </label>
                <div className="ibx-bf-field">
                  <span className="ibx-bf-lab">{ko ? "합계" : "Total"}</span>
                  <span className="ibx-bf-total mono">{fmtCompact(sellPriceN * sellQtyN, p.cur)}</span>
                </div>
              </div>
              <div className="ibx-bf-acts">
                <span className="ibx-bf-note"><Lic name="info" size={12} cls="icon-sm" color="var(--fg-4)" />{ko ? "부분 매도예요 — 보유가 0이 되면 자동으로 청산중 전환" : "Partial sell — auto-moves to Closing when shares reach 0"}</span>
                <button className="note-cancel" onClick={() => setSellOpen(false)}>{ko ? "취소" : "Cancel"}</button>
                <button className="v-btn v-btn--primary note-save" onClick={confirmSell} disabled={!(sellPriceN > 0 && sellQtyN > 0)}>{ko ? "매도 기록" : "Record sell"}</button>
              </div>
            </div>
          ) : (
            <button className="v-btn v-btn--primary ibx-act" onClick={openSell}>
              <Lic name="minus" size={14} cls="icon-sm" color="currentColor" />{ko ? "매도 체결 입력" : "Record sell"}
              <span className="ibx-act-hint">{ko ? "예상" : "est."} {sellUnit.toLocaleString("en-US")}{ko ? "주" : "sh"} · {fmtCompact(p.currentPrice * sellUnit, p.cur)}</span>
            </button>
          ))}
          {canClose && !sellOpen && (
            <button className="ibx-close-ghost" onClick={() => doClose(n)}>
              <Lic name="flag" size={13} cls="icon-sm" color="currentColor" />{t.ibx_toClosing}
            </button>
          )}
        </div>
      )}

      {/* triage bar — resolve / mute / log decision (the surface's true verbs) */}
      <div className="ibx-triage">
        <button className="ibx-tg-btn" onClick={() => resolve(n)}><Lic name="check-circle" size={14} cls="icon-sm" color="currentColor" />{ko ? "처리완료" : "Resolve"}</button>
        <button className="ibx-tg-btn" onClick={() => mute(n)}><Lic name="bell-off" size={14} cls="icon-sm" color="currentColor" />{ko ? "이 알림 음소거" : "Mute"}</button>
        <button className={"ibx-tg-btn" + (noteOpen ? " on" : "")} style={{ marginLeft: "auto" }} onClick={() => setNoteOpen((v) => !v)}><Lic name="pencil" size={14} cls="icon-sm" color="currentColor" />{ko ? "기록 남기기" : "Log"}</button>
      </div>

      {noteOpen && (
        <div className="ibx-logbox">
          <div className="ibx-log-quick">
            <button className="ibx-log-chip" onClick={() => submitNote(ko ? "실행함" : "Acted")}><Lic name="check" size={12} cls="icon-sm" color="var(--pos)" />{ko ? "실행함" : "Acted"}</button>
            <button className="ibx-log-chip" onClick={() => submitNote(ko ? "건너뜀" : "Skipped")}><Lic name="x" size={12} cls="icon-sm" color="var(--fg-3)" />{ko ? "건너뜀" : "Skipped"}</button>
            <span className="ibx-log-hint">{ko ? "이유를 적으면 일지에 남아요" : "Add a reason — saved to the journal"}</span>
          </div>
          <textarea className="note-input" rows={2} autoFocus value={noteText} placeholder={ko ? "왜 이 결정을 했는지(선택)…" : "Why this decision (optional)…"}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitNote(null); if (e.key === "Escape") setNoteOpen(false); }} />
          <div className="note-edit-acts">
            <button className="note-cancel" onClick={() => setNoteOpen(false)}>{ko ? "취소" : "Cancel"}</button>
            <button className="v-btn v-btn--primary note-save" onClick={() => submitNote(null)}>{ko ? "기록" : "Log"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
