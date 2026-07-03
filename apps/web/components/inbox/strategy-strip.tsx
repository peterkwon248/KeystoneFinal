// design_handoff_keystone/source/icons.jsx StrategyStrip 이식 — 플랜의 두 번째 축(실행 상태).
// 시나리오(가격 판단) 아래에 실행 상태(회차·다음 매수)를 카드로 보여준다.
// 주의: 전략은 plan.execId → EXEC_STRATEGIES (plan.strategyId는 '관점'이라 사용 안 함).
// 순수 로직(planExecState/metricDef)은 @keystone/core. 뷰만 로컬. CSS: reticle.css strat-card.
"use client";
import type { CSSProperties } from "react";
import type { Lang, L10n } from "@keystone/core/types";
import { planExecState, metricDef } from "@keystone/core/analytics";
import { fmtCompact } from "@keystone/core/format";
import { Lic } from "@/components/icons";
import type { UIPlan } from "@/lib/plan-mapper";

// L10n | string | number → 표시 문자열 (source L 헬퍼)
function loc(o: L10n | string | number | undefined, lang: Lang): string {
  if (o == null) return "";
  if (typeof o === "string") return o;
  if (typeof o === "number") return String(o);
  return o[lang] || o.en || "";
}

export function StrategyStrip({ plan, lang = "ko" }: { plan: UIPlan; lang?: Lang }) {
  const st = planExecState(plan);
  const ex = st ? st.ex : null;
  if (!ex || !st) return null;
  const money = (v: number) => fmtCompact(v, plan.cur);
  const h = st.hero;
  const heroTone = h ? (h.tone || "neutral") : "neutral";
  const heroColor = !h ? "var(--fg)"
    : h.tone === "pos" ? "var(--pos)"
    : h.tone === "neg" ? "var(--neg)"
    : h.tone === "accent" ? ex.color : "var(--fg)";
  const heroText = (() => {
    if (!h) return "";
    if (h.kind === "money") return money(h.value as number);
    if (h.kind === "text") return loc(h.value, lang);
    const sign = h.sign != null ? h.sign : (h.tone === "pos" ? "+" : h.tone === "neg" ? "−" : "");
    return sign + Math.abs(h.value as number).toFixed(h.dp != null ? h.dp : 0) + "%";
  })();
  const cellVal = (c: (typeof st.cells)[number]) =>
    c.isText ? loc(c.value, lang) : (c.isMoney ? money(c.value as number) : (c.value as number));
  const progress = st.progress;
  const heroDef = h ? metricDef(h.tip) : null;
  // SWC 함정 회피: 제네릭 캐스트 없이 스타일 객체를 statement 로 hoist.
  const cardStyle: CSSProperties = { ["--strat-accent" as string]: ex.color };
  return (
    <div className={"strat-card tone-" + heroTone} style={cardStyle}>
      <div className="strat-card-top">
        <div className="strat-card-head">
          <span className="strat-card-name"><Lic name={ex.icon || "git-branch"} size={14} cls="icon-sm" color={ex.color} />{ex.name[lang]}</span>
          {st.tagline && <span className="strat-card-tag">{loc(st.tagline, lang)}</span>}
        </div>
        {h && <div className="strat-card-hero">
          <span className="strat-card-val" style={{ color: heroColor }}>{heroText}</span>
          {h.sub && (heroDef
            ? <span className="strat-card-herosub mlab">{loc(h.sub, lang)}<span className="mtip">{loc(heroDef, lang)}</span></span>
            : <span className="strat-card-herosub">{loc(h.sub, lang)}</span>)}
        </div>}
      </div>
      {progress && <div className="strat-card-bar"><div className="strat-card-fill" style={{ width: progress.pct + "%", background: ex.color }} /></div>}
      {st.cells.length > 0 && <div className="strat-card-stats">
        {st.cells.map((c, i) => {
          const def = metricDef(c.tip);
          return (
            <div className="strat-card-cell" key={i}>
              <span className="strat-card-clab">{c.dir ? <span className={"strat-card-tick " + c.dir} /> : null}
                {def ? <span className="mlab">{loc(c.label, lang)}<span className="mtip">{loc(def, lang)}</span></span> : loc(c.label, lang)}
              </span>
              <span className="strat-card-cval mono">{cellVal(c)}</span>
            </div>
          );
        })}
      </div>}
    </div>
  );
}
