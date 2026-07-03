// source/DetailView.jsx ExecutionsTab 이식 — 성과 궤적(PerfBand) + 회차별 장부(ExecutionLedger)
// + 빈 상태 + 체결 추가 폼. onAddExec 뮤테이션은 후속 서버 액션이라 이번엔 no-op(optional prop + 가드).
"use client";
import { useState } from "react";
import type { I18nDict, Lang } from "@keystone/core/types";
import { Lic } from "@/components/icons";
import type { UIPlan } from "@/lib/plan-mapper";
import { PerfBand } from "./perf-band";
import { ExecutionLedger } from "./execution-ledger";

interface NewExec { side: "buy" | "sell"; price: number; qty: number; date: string }

export function ExecutionsTab({ plan, t, lang, onAddExec }: {
  plan: UIPlan; t: I18nDict; lang: Lang;
  onAddExec?: (planId: string, exec: NewExec) => void;
}) {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const sym = plan.cur === "USD" ? "$" : "₩";
  const reset = () => { setPrice(""); setQty(""); setSide("buy"); };
  const submit = () => {
    const p = Number(price), q = Number(qty);
    if (!(p > 0) || !(q > 0)) return;
    onAddExec && onAddExec(plan.id, { side, price: p, qty: q, date: "now" });
    reset(); setOpen(false);
  };
  return (
    <div>
      {(plan.executions || []).length > 0 && <PerfBand plan={plan} lang={lang} t={t} />}
      <ExecutionLedger plan={plan} t={t} lang={lang} />
      {!plan.executions.length && <div style={{ padding: "32px 0", textAlign: "center", color: "var(--fg-4)", font: "var(--fw-medium) 13px var(--font-sans)" }}>{lang === "ko" ? "아직 체결이 없습니다" : "No executions yet"}</div>}
      {open ? (
        <div className="exec-form">
          <div className="exec-form-seg">
            <button className={"exec-side-btn buy" + (side === "buy" ? " on" : "")} onClick={() => setSide("buy")}>{t.buy}</button>
            <button className={"exec-side-btn sell" + (side === "sell" ? " on" : "")} onClick={() => setSide("sell")}>{t.sell}</button>
          </div>
          <label className="exec-field">
            <span className="exec-field-lab">{t.price}</span>
            <span className="exec-input-wrap"><span className="exec-cur">{sym}</span><input className="exec-input mono" type="number" autoFocus value={price} onChange={(e) => setPrice(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") setOpen(false); }} /></span>
          </label>
          <label className="exec-field">
            <span className="exec-field-lab">{t.qty}</span>
            <input className="exec-input mono" type="number" value={qty} onChange={(e) => setQty(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") setOpen(false); }} />
          </label>
          <div className="exec-form-actions">
            <button className="v-btn exec-cancel" onClick={() => { reset(); setOpen(false); }}>{t.cancel}</button>
            <button className="v-btn v-btn--primary exec-save" onClick={submit} disabled={!(Number(price) > 0 && Number(qty) > 0)}>{t.addExec}</button>
          </div>
        </div>
      ) : (
        <button className="add-row" style={{ marginTop: 6, width: "100%" }} onClick={() => setOpen(true)}><Lic name="plus" size={15} color="var(--fg-4)" />{t.addExec}</button>
      )}
    </div>
  );
}
