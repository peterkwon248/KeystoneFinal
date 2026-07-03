// source/icons.jsx ScenarioGauge 이식본 — Bear↔Bull 범위 + 현재가 마커 ("킬러 컬럼").
// 어댑테이션: window.__gaugeClose 싱글턴 → 모듈 변수, gaugeData/planActionLines/포맷터는 core import.
"use client";
import { useEffect, useRef, useState } from "react";
import type { Lang, Plan } from "@keystone/core/types";
import { gaugeData, planActionLines } from "@keystone/core/analytics";
import { fmtCompact, fmtMoney } from "@keystone/core/format";
import { I18N } from "@keystone/core/i18n";
import { Flag, Lic } from "@/components/icons";

// singleton: 게이지 툴팁은 앱 전체에서 하나만 열린다
let gaugeCloseSingleton: (() => void) | null = null;

export function ScenarioGauge({ plan, lang = "ko", compact }: { plan: Plan; lang?: Lang; compact?: boolean }) {
  const g = gaugeData(plan);
  const rootRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; above: boolean } | null>(null);
  const closeRef = useRef<() => void>(() => {});
  closeRef.current = () => setTip(null);
  useEffect(() => {
    if (!tip) return;
    const el = rootRef.current;
    const sc = el && (el.closest(".body-main") || el.closest(".peek-body"));
    const clear = () => setTip(null);
    if (sc) sc.addEventListener("scroll", clear, { passive: true });
    window.addEventListener("wheel", clear, { passive: true });
    return () => { if (sc) sc.removeEventListener("scroll", clear); window.removeEventListener("wheel", clear); };
  }, [tip]);
  useEffect(() => () => { if (gaugeCloseSingleton === closeRef.current) gaugeCloseSingleton = null; }, []);
  if (!g) return <div className="gauge" />;
  const t = I18N[lang];
  const bearT = plan.scenarios.find((s) => s.label.en === "Bear")!.target;
  const bullT = plan.scenarios.find((s) => s.label.en === "Bull")!.target;
  const num = (v: number) => fmtCompact(v, plan.cur).replace(/^[₩$]/, "");
  const money = (v: number) => fmtMoney(v, plan.cur);
  const cur = plan.currentPrice;
  const lines = planActionLines(plan);
  const pct = (v: number, base: number) => { const r = (v / base - 1) * 100; return (r >= 0 ? "+" : "") + r.toFixed(1) + "%"; };
  const scOrder = ["Bull", "Base", "Bear"] as const;
  const scIcon: Record<string, string> = { Bull: "trending-up", Base: "minus", Bear: "trending-down" };
  const tipRows: { icon: string; color: string; label: string; val: number; ret: string }[] = [];
  scOrder.forEach((k) => {
    const sc = plan.scenarios.find((s) => s.label.en === k);
    if (sc) tipRows.push({ icon: scIcon[k], color: sc.color, label: sc.label[lang], val: sc.target, ret: pct(sc.target, cur) });
  });
  const onEnter = () => {
    if (gaugeCloseSingleton && gaugeCloseSingleton !== closeRef.current) gaugeCloseSingleton();
    gaugeCloseSingleton = closeRef.current;
    const el = rootRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const need = 210, gap = 9, vh = window.innerHeight;
    const roomAbove = r.top, roomBelow = vh - r.bottom;
    // default: open ABOVE; flip down only when above would clip and below has more room
    const above = roomAbove >= need || roomAbove >= roomBelow;
    setTip({ x: r.left + r.width / 2, y: above ? r.top - gap : r.bottom + gap, above });
  };
  const onLeave = () => { setTip(null); if (gaugeCloseSingleton === closeRef.current) gaugeCloseSingleton = null; };
  const bar = (
    <div className="gauge-bar">
      <div className="gauge-track" />
      <div className="gauge-range" style={{ left: g.bearPos + "%", right: (100 - g.bullPos) + "%" }} />
      <div className="gauge-node bear" style={{ left: g.bearPos + "%" }} />
      <div className="gauge-node base" style={{ left: g.basePos + "%" }} />
      <div className="gauge-node bull" style={{ left: g.bullPos + "%" }} />
      {g.avgPos != null && <div className="gauge-avg" style={{ left: g.avgPos + "%" }} />}
      <div className={"gauge-marker" + (g.isExit ? " exit" : "")} style={{ left: g.pos + "%" }} />
    </div>
  );
  if (compact) {
    return <div className={"gauge gauge-compact" + (g.dim ? " gauge-dim" : "")}>{bar}</div>;
  }
  return (
    <div className={"gauge" + (g.dim ? " gauge-dim" : "")} ref={rootRef} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {bar}
      <div className="gauge-labels">
        <span className="gl bear">{num(bearT)}</span>
        <span className="gl now">{num(g.primary)}</span>
        <span className="gl bull">{num(bullT)}</span>
      </div>
      {tip && <div className={"gauge-tip-fixed" + (tip.above ? " above" : " below")} style={{ left: tip.x + "px", top: tip.y + "px" }}>
        <div className="gtip-head"><Flag market={plan.cur === "KRW" ? "KR" : "US"} size={12} />{plan.tickerName[lang]}<span className="gtip-id">{plan.ticker}</span></div>
        {tipRows.map((r, i) => (
          <div className="gtip-row" key={i}>
            <Lic name={r.icon} size={13} cls="icon-sm" color={r.color} />
            <span className="gtip-lab">{r.label} {t.target}</span>
            <span className="gtip-val">{money(r.val)}</span>
            <span className={"gtip-ret " + (parseFloat(r.ret) >= 0 ? "pos" : "neg")}>{r.ret}</span>
          </div>
        ))}
        <div className="gtip-sep" />
        <div className="gtip-row">
          <span className="gtip-dot now" />
          <span className="gtip-lab">{g.isExit ? t.exitL : t.current}</span>
          <span className="gtip-val">{money(g.primary)}</span>
          <span className="gtip-ret" />
        </div>
        {g.avgPrice != null && <div className="gtip-row">
          <span className="gtip-dot avg" />
          <span className="gtip-lab">{t.avg}</span>
          <span className="gtip-val">{money(g.avgPrice)}</span>
          <span className={"gtip-ret " + ((cur / g.avgPrice - 1) >= 0 ? "pos" : "neg")}>{pct(cur, g.avgPrice)}</span>
        </div>}
        {lines.tp != null && <div className="gtip-row">
          <span className="gtip-tick tp" />
          <span className="gtip-lab">{t.takeProfit}</span>
          <span className="gtip-val">{money(lines.tp)}</span>
          <span className="gtip-ret pos">{pct(lines.tp, cur)}</span>
        </div>}
        {lines.sl != null && <div className="gtip-row">
          <span className="gtip-tick sl" />
          <span className="gtip-lab">{t.stopLoss}</span>
          <span className="gtip-val">{money(lines.sl)}</span>
          <span className={"gtip-ret " + ((lines.sl / cur - 1) >= 0 ? "pos" : "neg")}>{pct(lines.sl, cur)}</span>
        </div>}
      </div>}
    </div>
  );
}
