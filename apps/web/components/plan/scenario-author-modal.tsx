// source/P5Scenarios.jsx ScenarioAuthor(53~104) 이식 — plan-scoped 이므로 SecurityPicker 는 제외
// (종목은 이미 plan 으로 고정). 케이스 세그 + 목표가 입력 + 함의수익률/PER 프리뷰 + 근거.
// 저장 = addPlanScenario 서버액션 insert. status/label/color 는 서버에서 case_t 로부터 파생.
// ⚠ SWC 파서: JSX 안 제네릭 캐스트 없음 — 파생값은 본문 const 로 hoist.
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I18N } from "@keystone/core/i18n";
import { scLabel } from "@keystone/core/analytics";
import { fmtCompact } from "@keystone/core/format";
import { Lic } from "@/components/icons";
import { usePrefs } from "@/components/shell/prefs";
import type { UIPlan } from "@/lib/plan-mapper";
import { addPlanScenario } from "@/app/(shell)/plans/[id]/actions";

const SC_CASES: { key: "bull" | "base" | "bear"; enKey: "Bull" | "Base" | "Bear"; color: string }[] = [
  { key: "bull", enKey: "Bull", color: "var(--r-bull)" },
  { key: "base", enKey: "Base", color: "var(--r-base)" },
  { key: "bear", enKey: "Bear", color: "var(--r-bear)" },
];

export function ScenarioAuthorModal({ plan, onClose }: { plan: UIPlan; onClose: () => void }) {
  const { lang } = usePrefs();
  const t = I18N[lang];
  const router = useRouter();
  const [caseT, setCaseT] = useState<"bull" | "base" | "bear">("base");
  const [target, setTarget] = useState("");
  const [thesis, setThesis] = useState("");
  const [saving, startSaving] = useTransition();

  const active = SC_CASES.find((c) => c.key === caseT)!;
  const tgtNum = Number(String(target).replace(/[^0-9.]/g, "")) || 0;
  const ret = tgtNum ? (tgtNum / plan.currentPrice - 1) * 100 : null;
  const per = tgtNum && plan.eps && plan.eps > 0 ? tgtNum / plan.eps : null;

  const save = () => {
    if (!tgtNum) return;
    startSaving(async () => {
      await addPlanScenario(plan.dbId, { caseT, target: tgtNum, thesis });
      router.refresh();
      onClose();
    });
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 480 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <Lic name="target" size={17} color="var(--accent)" />
          <span style={{ font: "var(--fw-semi) 15px var(--font-sans)", color: "var(--fg)" }}>{t.newScenario}</span>
          <span style={{ marginLeft: "auto" }} className="iconbtn" onClick={onClose}><Lic name="x" size={16} /></span>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <label className="form-label">{t.scLabel}</label>
            <div className="rb-modebar" style={{ margin: 0 }}>
              {SC_CASES.map((c) => (
                <div key={c.key} className={"rb-mode" + (caseT === c.key ? " on" : "")}
                  onClick={() => setCaseT(c.key)} style={caseT === c.key ? { color: c.color } : {}}>
                  {scLabel(c.enKey, lang)}
                </div>
              ))}
            </div>
          </div>
          <div className="form-row">
            <label className="form-label">{t.targetPrice} {plan.cur ? `(${plan.cur})` : ""}</label>
            <input className="form-input mono" placeholder={fmtCompact(Math.round(plan.currentPrice * 1.2), plan.cur)}
              value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
          {ret != null && (
            <div className="sim-out" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 16 }}>
              <div className="sim-out-cell">
                <div className="sim-out-lab">{t.impliedRet}</div>
                <div className="sim-out-val" style={{ color: ret >= 0 ? "var(--pos)" : "var(--neg)" }}>{ret >= 0 ? "+" : ""}{ret.toFixed(1)}%</div>
              </div>
              <div className="sim-out-cell">
                <div className="sim-out-lab">{t.impliedPer}</div>
                <div className="sim-out-val">{per ? per.toFixed(1) + "×" : "—"}</div>
              </div>
            </div>
          )}
          <div className="form-row">
            <label className="form-label">{lang === "ko" ? "근거" : "Thesis"}</label>
            <textarea className="form-input form-textarea" placeholder={t.scThesisPh}
              value={thesis} onChange={(e) => setThesis(e.target.value)} />
          </div>
        </div>
        <div className="modal-foot">
          <span className="spacer" />
          <button className="v-btn" onClick={onClose}>{t.cancel}</button>
          <button className="v-btn v-btn--primary" onClick={save} disabled={!tgtNum || saving}>
            <Lic name="check" size={14} cls="icon-sm" color="var(--fg-on-accent)" />{t.saveScenario}
          </button>
        </div>
      </div>
    </div>
  );
}
