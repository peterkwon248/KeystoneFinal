// source/P5Scenarios.jsx ScenarioAuthor(53~104) 이식 — 두 모드:
//  · plan 모드({plan}): 종목은 plan으로 고정, SecurityPicker 없음. addPlanScenario insert.
//  · adhoc 모드({adhoc:{securities,initialTicker?}}): SecurityPicker로 종목 선택(플랜 없이). addSecurityScenario insert(S2).
// 케이스 세그 + 목표가 + 함의수익률/PER 프리뷰 + 근거. label/color/status는 서버에서 case_t로부터 파생.
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
import type { UISecurity } from "@/lib/security-mapper";
import { SecurityPicker } from "@/components/securities/security-picker";
import { addPlanScenario } from "@/app/(shell)/plans/[id]/actions";
import { addSecurityScenario } from "@/app/(shell)/scenarios/actions";

const SC_CASES: { key: "bull" | "base" | "bear"; enKey: "Bull" | "Base" | "Bear"; color: string }[] = [
  { key: "bull", enKey: "Bull", color: "var(--r-bull)" },
  { key: "base", enKey: "Base", color: "var(--r-base)" },
  { key: "bear", enKey: "Bear", color: "var(--r-bear)" },
];

export function ScenarioAuthorModal({ plan, adhoc, onClose }: {
  plan?: UIPlan;
  // adhoc: 종목 선택형(picker). lockTicker=true면 종목 고정(종목상세에서 진입 — picker 숨김).
  adhoc?: { securities: UISecurity[]; initialTicker?: string | null; lockTicker?: boolean };
  onClose: () => void;
}) {
  const { lang } = usePrefs();
  const t = I18N[lang];
  const router = useRouter();
  const [caseT, setCaseT] = useState<"bull" | "base" | "bear">("base");
  const [target, setTarget] = useState("");
  const [thesis, setThesis] = useState("");
  const [saving, startSaving] = useTransition();
  // adhoc 모드 종목 선택 상태(plan 모드에선 미사용).
  const [ticker, setTicker] = useState<string | null>(adhoc?.initialTicker ?? null);

  // 모드별 종목/가격/EPS/통화 통합 — 이후 로직은 동일.
  const sec = adhoc ? (adhoc.securities.find((x) => x.ticker === ticker) ?? null) : null;
  const curPrice = plan ? plan.currentPrice : (sec ? sec.price : 0);
  const epsN = plan ? plan.eps : (sec && sec.eps != null ? sec.eps : 0);
  const cur = plan ? plan.cur : (sec ? sec.cur : "");
  const activeTicker = plan ? plan.ticker : ticker;

  const tgtNum = Number(String(target).replace(/[^0-9.]/g, "")) || 0;
  const ret = tgtNum && curPrice > 0 ? (tgtNum / curPrice - 1) * 100 : null;
  const per = tgtNum && epsN > 0 ? tgtNum / epsN : null;
  const canSave = !!tgtNum && (plan ? true : !!activeTicker);

  const save = () => {
    if (!canSave) return;
    startSaving(async () => {
      if (plan) await addPlanScenario(plan.dbId, { caseT, target: tgtNum, thesis });
      else if (activeTicker) await addSecurityScenario({ ticker: activeTicker, caseT, target: tgtNum, thesis });
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
          {adhoc && !adhoc.lockTicker && (
            <div className="form-row">
              <label className="form-label">{t.ticker}</label>
              <SecurityPicker securities={adhoc.securities} ticker={ticker} lang={lang} t={t} onPick={setTicker} width={420} />
            </div>
          )}
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
            <label className="form-label">{t.targetPrice} {cur ? `(${cur})` : ""}</label>
            <input className="form-input mono" placeholder={curPrice > 0 ? fmtCompact(Math.round(curPrice * 1.2), cur) : "—"}
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
          <button className="v-btn v-btn--primary" onClick={save} disabled={!canSave || saving}>
            <Lic name="check" size={14} cls="icon-sm" color="var(--fg-on-accent)" />{t.saveScenario}
          </button>
        </div>
      </div>
    </div>
  );
}
