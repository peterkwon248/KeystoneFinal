// design_handoff_keystone/source/Inbox.jsx InboxProps 이식 — 인박스 우측 읽기전용 속성.
// 플랜 상세 PropsSidebar 의 read-only 거울: 같은 섹션·순서, 편집 없음.
// 포지션/청산요약/sysProps/전략필드/시나리오요약. 순수·포맷은 @keystone/core, 청산요약은 lib/closeout.
// 어댑테이션: 웹 PfLite.name 은 string(프로토타입 pf.name[lang] 과 달리 언어중립) → 그대로 렌더.
"use client";
import type { I18nDict, Lang, StrategyField } from "@keystone/core/types";
import { fmtCompact, fmtDate, fmtRel } from "@keystone/core/format";
import { STRATEGIES } from "@keystone/core/reference";
import { Flag, StatusIcon } from "@/components/icons";
import type { PfLite } from "@/lib/pf-palette";
import type { UIPlan } from "@/lib/plan-mapper";
import { closeoutSummary } from "@/lib/closeout";
import type { InboxNote } from "@/lib/inbox";

const IBX_STRAT_VAL_KO: Record<string, string> = { Monthly: "매월", Quarterly: "분기별", Weekly: "매주", Daily: "매일", Annually: "연 1회", Yearly: "연 1회" };
function ibxStratVal(v: string, lang: Lang): string {
  if (v === "auto") return "—";
  if (lang === "ko" && IBX_STRAT_VAL_KO[v]) return IBX_STRAT_VAL_KO[v];
  return v;
}

export function InboxProps({ n, t, lang, portfolios }: {
  n: InboxNote;
  t: I18nDict;
  lang: Lang;
  portfolios: PfLite[];
}) {
  const p: UIPlan = n.plan;
  const strat = STRATEGIES.find((s) => s.id === p.strategyId) ?? null;
  const pf = portfolios.find((x) => x.id === p.portfolioId) ?? null;
  const fields: StrategyField[] = strat ? (strat.fields || []) : [];
  const hasPos = p.totalShares > 0 || p.totalInvested > 0;
  const co = (!hasPos && p.status === "closed") ? closeoutSummary(p) : null;

  return (
    <div className="inbox-props">
      {hasPos && (
        <div className="side-group">
          <div className="side-cap">{lang === "ko" ? "포지션" : "Position"}</div>
          <div className="prop-line"><span className="pl-label">{t.invested}</span><span className="pl-value mono">{fmtCompact(p.totalInvested, p.cur)}</span></div>
          <div className="prop-line"><span className="pl-label">{t.shares}</span><span className="pl-value mono">{(p.totalShares || 0).toLocaleString("en-US")}</span></div>
          <div className="prop-line"><span className="pl-label">{t.dash_value}</span><span className="pl-value mono">{fmtCompact(p.currentPrice * (p.totalShares || 0), p.cur)}</span></div>
        </div>
      )}

      {co && (
        <div className="side-group">
          <div className="side-cap">{lang === "ko" ? "청산 요약" : "Closeout"}</div>
          <div className="prop-line"><span className="pl-label">{t.realizedPL}</span><span className={"pl-value mono " + (co.realized >= 0 ? "pos" : "neg")}>{(co.realized >= 0 ? "+" : "") + fmtCompact(co.realized, p.cur)}{co.realizedPct != null ? "  " + (co.realizedPct >= 0 ? "+" : "") + co.realizedPct.toFixed(1) + "%" : ""}</span></div>
          <div className="prop-line"><span className="pl-label">{t.totalInvestedLab}</span><span className="pl-value mono">{fmtCompact(co.invested, p.cur)}</span></div>
          <div className="prop-line"><span className="pl-label">{t.avgBuySell}</span><span className="pl-value mono">{fmtCompact(co.avgBuy, p.cur)}{co.avgSell != null ? " → " + fmtCompact(co.avgSell, p.cur) : ""}</span></div>
          {co.holdDays != null && <div className="prop-line"><span className="pl-label">{t.holdPeriod}</span><span className="pl-value mono">{co.holdDays}{lang === "ko" ? "일" : "d"}</span></div>}
        </div>
      )}

      <div className="side-group">
        <div className="side-cap">{t.sysProps}</div>
        <div className="prop-line"><span className="pl-label">{t.status}</span><span className="pl-value ibx-pv-ic"><StatusIcon status={p.status} size={14} />{t["s_" + p.status]}</span></div>
        <div className="prop-line"><span className="pl-label">{t.portfolio}</span><span className="pl-value ibx-pv-ic">{pf ? <><span className="pf-dot" style={{ background: pf.color }} />{pf.name}</> : "—"}</span></div>
        <div className="prop-line"><span className="pl-label">{t.strategy}</span><span className="pl-value ibx-pv-ic">{strat ? <><span className="strat-dot" style={{ background: strat.color }} />{strat.name[lang]}</> : <span style={{ color: "var(--fg-4)" }}>{t.noStrategy}</span>}</span></div>
        <div className="prop-line"><span className="pl-label">{t.ticker}</span><span className="pl-value"><Flag market={p.cur === "KRW" ? "KR" : "US"} size={14} /> <span className="mono">{p.ticker}</span></span></div>
        <div className="prop-line"><span className="pl-label">{t.created}</span><span className="pl-value" style={{ color: "var(--fg-3)" }}>{fmtDate(p.createdAt, lang)}</span></div>
        {p.updatedAt && <div className="prop-line"><span className="pl-label">{t.updated}</span><span className="pl-value" style={{ color: "var(--fg-3)" }}>{fmtRel(p.updatedAt, lang)}</span></div>}
      </div>

      {fields.length > 0 && (
        <div className="side-group">
          <div className="side-cap">{t.stratFields}</div>
          {fields.map((f) => {
            let val = f.default;
            if (f.key === "round_cur") val = String(p.round ?? 0);
            if (f.key === "buy_unit" && p.totalInvested) val = fmtCompact(p.totalInvested / (p.round || 1), p.cur);
            if (f.key === "loc_price") val = fmtCompact(p.currentPrice * 0.95, p.cur);
            val = ibxStratVal(val, lang);
            return (
              <div className="field-line" key={f.key}>
                <span className="fl-key">{f.label[lang]}{f.auto && <span className="fl-auto">auto</span>}</span>
                <span className="fl-val">{val}</span>
              </div>
            );
          })}
        </div>
      )}

      {p.scenarios && p.scenarios.length >= 1 && (
        <div className="side-group">
          <div className="side-cap">{t.scSummary}</div>
          {p.scenarios.map((s, i) => {
            const gap = (s.target / p.currentPrice - 1) * 100;
            return (
              <div className="scsum-row" key={i}>
                <span className="scsum-dot" style={{ background: s.color }} />
                <span className="scsum-lab">{s.label[lang]} · <span className="mono">{fmtCompact(s.target, p.cur)}</span></span>
                <span className={"scsum-pct " + (gap >= 0 ? "pos" : "neg")}>{gap >= 0 ? "+" : ""}{gap.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
