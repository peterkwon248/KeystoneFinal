// source/DetailView.jsx StrategyTab(642~1112) 이식 — 실행 전략 콕핏 + 규칙 자동화.
// 실데이터: plan.rules(condition/action/last_fired 디코드), plan.goal(custom_fields.goal), execId→EXEC_STRATEGIES.
//   콕핏 6개 오버레이(isTime/isVR/isWeight/isGrid/isMomentum/isPrice)·자금배치·통계·타임라인·실시간 규칙평가·규칙카드 전부 재현.
//   순수 로직(evalRule/ruleWarn/RULE_*/locStratVal/FIELD_TIPS)은 @keystone/core, 뷰 헬퍼(ruleDesc/locLast/MON3)만 로컬.
// 동작 상태:
//   ✅ 실연결(서버 액션): 규칙 on/off 토글, 목표(수익률/가격) 설정·삭제,
//      규칙 추가/편집/삭제(인라인 트리거-제약 폼 — 편집 시 edited=true로 재생성에서 보존).
// stratDiagram(rules-viz) 블록은 프로토타입에서 정의되지 않은 dead guard라 이식 제외.
"use client";
import { Fragment, useState, type ReactNode } from "react";
import type { I18nDict, Lang } from "@keystone/core/types";
import { EXEC_STRATEGIES, RULE_TRIGS, RULE_ACTS, RULE_LEGACY_DESC, RULE_STATE_LABEL, FIELD_TIPS, locStratVal } from "@keystone/core/reference";
import { ruleWarn } from "@keystone/core/analytics";
import { fmtMoney, toDispCur, getFxRate } from "@keystone/core/format";
import { Lic } from "@/components/icons";
import { evalRuleV2 } from "@/lib/rule-eval-v2";
import { findTrig } from "@/lib/rule-trigs-v2";
import type { UIPlan } from "@/lib/plan-mapper";
import type { PlanGoal, RuleInput } from "@/app/(shell)/plans/[id]/actions";

// 다음-액션 카드 / 통계 / 오버레이 마커의 동적 형태 — 프로토타입이 형태를 자유롭게 조립하므로 완화 타입 사용.
interface NextAct { tone: string; icon: string; label: string; detail: string }
interface StatTip { h: string; rows: [string, string][]; note?: string }
interface StatItem { k: string; v: string; sub?: string; tone?: string; tip?: StatTip }

export function StrategyTab({ plan, t, lang, onToggleRule, onSetGoal, onCreateRule, onUpdateRule, onDeleteRule }: {
  plan: UIPlan; t: I18nDict; lang: Lang;
  onToggleRule: (ruleId: string, enabled: boolean) => void;
  onSetGoal: (goal: PlanGoal | null) => void;
  onCreateRule: (input: RuleInput) => void;
  onUpdateRule: (ruleId: string, input: RuleInput) => void;
  onDeleteRule: (ruleId: string) => void;
}) {
  const ko = lang === "ko";
  const CORE_TRIG_IDS = new Set(RULE_TRIGS.map((x) => x.id));
  const ex = (typeof EXEC_STRATEGIES !== "undefined") ? EXEC_STRATEGIES.find((s) => s.id === plan.execId) : null;
  const goalDispCur = toDispCur(1, plan.cur).cur;
  const goalFromDisp = (v: number) => goalDispCur === plan.cur ? v : (plan.cur === "KRW" ? v * getFxRate() : v / getFxRate());
  const goalToDisp = (v: number) => goalDispCur === plan.cur ? v : (plan.cur === "KRW" ? v / getFxRate() : v * getFxRate());
  const [goalEdit, setGoalEdit] = useState(false);
  const [gType, setGType] = useState<"return" | "price">(plan.goal ? (plan.goal.type as "return" | "price") : "return");
  const [gVal, setGVal] = useState(plan.goal ? String(plan.goal.type === "price" ? Math.round(goalToDisp(plan.goal.value) * (goalDispCur === "USD" ? 100 : 1)) / (goalDispCur === "USD" ? 100 : 1) : plan.goal.value) : "");
  const openGoalEdit = (type: "return" | "price", nativeVal: number | null) => { setGType(type); setGVal(nativeVal == null ? "" : String(type === "price" ? Math.round(goalToDisp(nativeVal) * (goalDispCur === "USD" ? 100 : 1)) / (goalDispCur === "USD" ? 100 : 1) : nativeVal)); setGoalEdit(true); };
  const saveGoal = () => { const raw = parseFloat(String(gVal).replace(/[^0-9.\-]/g, "")); if (!isFinite(raw)) return; const v = gType === "price" ? goalFromDisp(raw) : raw; onSetGoal({ type: gType, value: v }); setGoalEdit(false); };
  const removeGoal = () => { onSetGoal(null); setGoalEdit(false); };
  // 규칙 편집/추가 인라인 폼. editId = 편집 중 ruleId, "new" = 추가 폼, null = 없음.
  const [ruleEditId, setRuleEditId] = useState<string | null>(null);
  const [eTrig, setETrig] = useState("price_le");
  const [eVal, setEVal] = useState("");
  const [eAct, setEAct] = useState("notify");
  const openRuleEdit = (r: UIPlan["rules"][number]) => { setETrig(r.trig || "price_le"); setEVal(r.trigVal ?? ""); setEAct(r.act || "notify"); setRuleEditId(r.id); };
  const openRuleNew = () => { setETrig("price_le"); setEVal(""); setEAct("notify"); setRuleEditId("new"); };
  const saveRule = () => { const input: RuleInput = { trig: eTrig, trigVal: eVal, act: eAct }; if (ruleEditId === "new") onCreateRule(input); else if (ruleEditId) onUpdateRule(ruleEditId, input); setRuleEditId(null); };
  const stratName = ex ? ex.name[lang] : (ko ? "전략" : "Strategy");
  const diverged = plan.rules.some((r) => !r.custom && (r.edited || !r.on));
  // 뷰 헬퍼(순수 로직 아님) — ruleDesc/locLast/MON3.
  const ruleDesc = (r: UIPlan["rules"][number]) => {
    if (r.custom) { const tt = findTrig(r.trig), aa = RULE_ACTS.find((x) => x.id === r.act); return [tt ? (ko ? tt.descKo : tt.descEn) : "", aa ? (ko ? aa.descKo : aa.descEn) : ""].filter(Boolean).join(" "); }
    const d = RULE_LEGACY_DESC[r.name.ko] || RULE_LEGACY_DESC[r.name.en]; return d ? (ko ? d.ko : d.en) : (ko ? "이 규칙의 조건이 충족되면 지정한 동작을 실행합니다." : "Runs the action when the condition is met.");
  };
  const MON3: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
  const locLast = (s: string) => { if (s === "Never") return t.never; if (!ko) return s; let r = s.replace("Today", "오늘"); r = r.replace(/([A-Z][a-z]{2})\s+(\d+)/, (m, mon, d) => MON3[mon] ? `${MON3[mon]}월 ${d}일` : m); return r; };
  // 규칙 추가/편집 인라인 폼 — RULE_TRIGS/RULE_ACTS 드롭다운 + trigVal(hasValue일 때만).
  const ruleEditor = (isNew: boolean) => {
    const trigDef = RULE_TRIGS.find((x) => x.id === eTrig);
    return (
      <div className="rule-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="rule-flow" style={{ flexWrap: "wrap", gap: 8 }}>
          <span className="rule-blk when">{t.when}</span>
          <select className="mono" value={eTrig} onChange={(e) => setETrig(e.target.value)} style={{ font: "var(--fw-medium) 12px var(--font-sans)", padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg-2)", color: "var(--fg-1)" }}>
            {RULE_TRIGS.map((x) => <option key={x.id} value={x.id}>{ko ? x.ko : x.en}</option>)}
          </select>
          {trigDef?.hasValue && <span className="rule-blk cond rule-valblk" style={{ padding: 0 }}><input className="mono" value={eVal} onChange={(e) => setEVal(e.target.value)} placeholder="0" style={{ width: 64, font: "var(--fw-medium) 12px var(--font-sans)", padding: "4px 6px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg-2)", color: "var(--fg-1)", textAlign: "right" }} />{trigDef.unit && <span style={{ marginLeft: 4, color: "var(--fg-3)" }}>{trigDef.unit}</span>}</span>}
          <span className="rule-arrow"><Lic name="arrow-right" size={15} cls="icon-sm" color="var(--fg-4)" /></span>
          <span className="rule-blk then">{t.then}</span>
          <select className="mono" value={eAct} onChange={(e) => setEAct(e.target.value)} style={{ font: "var(--fw-medium) 12px var(--font-sans)", padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg-2)", color: "var(--fg-1)" }}>
            {RULE_ACTS.map((x) => <option key={x.id} value={x.id}>{ko ? x.ko : x.en}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="sc-goal-cancel" onClick={() => setRuleEditId(null)}>{ko ? "취소" : "Cancel"}</button>
          <button className="v-btn v-btn--primary" onClick={saveRule}>{ko ? "저장" : "Save"}</button>
        </div>
      </div>
    );
  };

  return (
    <div>
      {ex && <div className="rules-stratbar">
        <span className="strat-dot" style={{ background: ex.color }} />
        <span className="rules-strat-name">{stratName}</span>
        {diverged && <span className="rules-mod">{ko ? "수정됨" : "Modified"}</span>}
        <span className="rules-strat-hint">{ko ? "전략 규칙은 끌 수 있고, 내 규칙은 자유롭게 추가·삭제됩니다" : "Strategy rules can be toggled; your own rules can be added or removed."}</span>
      </div>}
      {ex && (() => {
        const fnum = (k: string, d: number | null): number | null => { const f = ex.fields ? ex.fields.find((x) => x.key === k) : null; const n = f ? parseFloat(String(f.default).replace(/[^0-9.\-]/g, "")) : NaN; return isNaN(n) ? d : n; };
        const div = plan.divisions, round = plan.round || 0, avg = plan.avgPrice || 0, px = plan.currentPrice;
        const locP = fnum("loc_pct", null), tpP = fnum("tp_pct", null);
        const locPx = (avg > 0 && locP != null) ? avg * (1 + locP / 100) : null;
        const tpPx = (avg > 0 && tpP != null) ? avg * (1 + tpP / 100) : null;
        const ret = avg > 0 ? (px - avg) / avg * 100 : null;
        const deployed = div ? Math.round(round / div * 100) : null;
        let act: NextAct | null = null;
        if (locPx != null) {
          if (px <= locPx) act = { tone: "buy", icon: "arrow-down-left", label: ko ? "지금 매수 신호" : "Buy signal", detail: ko ? `현재가가 LOC ${fmtMoney(locPx, plan.cur)} 이하 — ${div ? `${round + 1}/${div}회차 매수 알림` : "분할 매수 알림"}` : `Price at/below LOC ${fmtMoney(locPx, plan.cur)}` };
          else { const gap = (px - locPx) / px * 100; act = { tone: "wait", icon: "clock", label: ko ? "다음 매수 대기" : "Next buy armed", detail: ko ? `${fmtMoney(locPx, plan.cur)}까지 ${gap.toFixed(1)}% 더 내리면 ${div ? `${round + 1}/${div}회차 ` : ""}매수 알림` : `${gap.toFixed(1)}% lower → buy alert` }; }
        }
        if (tpPx != null && ret != null && tpP != null && ret >= tpP) act = { tone: "sell", icon: "arrow-up-right", label: ko ? "익절 신호" : "Take-profit", detail: ko ? `수익률 ${ret.toFixed(1)}% ≥ 목표 ${tpP}% — 청산 검토 알림` : `Return ${ret.toFixed(1)}% ≥ target ${tpP}%` };
        if (!act) act = { tone: "wait", icon: "activity", label: ko ? "조건 대기 중" : "Armed", detail: ko ? "발동 조건에 도달하면 알림이 옵니다." : "Waiting for a trigger." };
        const sc = plan.scenarios || [];
        const tOf = (en: string) => { const s = sc.find((x) => x.label && x.label.en === en); return s ? s.target : null; };
        const bull = tOf("Bull"), bear = tOf("Bear");
        const hasGrid = (ex.fields || []).some((f) => f.key === "grids");
        const hasMom = (ex.fields || []).some((f) => f.key === "stop") && (ex.fields || []).some((f) => f.key === "lookback");
        const isPrice = !hasGrid && !hasMom && (locPx != null || (ex.fields || []).some((f) => ["upper", "lower", "target_path"].includes(f.key)));
        const isGrid = hasGrid;
        const isMomentum = hasMom;
        const isVR = (ex.fields || []).some((f) => f.key === "vr_vline") && !isPrice;
        const wField = (ex.fields || []).find((f) => f.key === "target_w" || f.key === "equity_w");
        const isWeight = !!wField && !isPrice && !isVR;
        const isTime = !isPrice && !isVR && !isWeight && (ex.fields || []).some((f) => f.key === "interval") && (ex.fields || []).some((f) => f.key === "amount");
        let overlay: ReactNode = null;
        let timeInfo: { nextLabel: string; countdown: number; buyCount: number; intKo: string } | null = null;
        if (isTime) {
          const intDays: Record<string, number> = { Daily: 1, Weekly: 7, Biweekly: 14, Monthly: 30 };
          const intF = (ex.fields || []).find((f) => f.key === "interval");
          const intVal = intF ? intF.default : "Weekly";
          const stepD = intDays[intVal] || 7;
          const intKo = intF && intF.options ? ((intF.options.find((o) => o.en === intVal) || { ko: intVal }).ko || intVal) : intVal;
          const amtF = (ex.fields || []).find((f) => f.key === "amount");
          const amtStr = amtF ? String(amtF.default).replace(/[^0-9.,]/g, "") : "";
          const MENJS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const parseD = (s: string) => { const m = (s || "").match(/([A-Za-z]{3})\s*(\d+)/); return (m && MON3[m[1]]) ? new Date(2025, MON3[m[1]] - 1, +m[2]) : null; };
          const fmtMD = (d: Date) => ko ? `${d.getMonth() + 1}월 ${d.getDate()}일` : `${MENJS[d.getMonth()]} ${d.getDate()}`;
          const DAY = 86400000;
          const buys = (plan.executions || []).filter((e) => e.side === "buy").map((e) => ({ ...e, d: parseD(e.date) })).filter((e): e is typeof e & { d: Date } => !!e.d).sort((a, b) => a.d.getTime() - b.d.getTime());
          if (buys.length) {
            const last = buys[buys.length - 1].d;
            const nextBuy = new Date(last.getTime() + stepD * DAY);
            const today = new Date(last.getTime() + Math.round(stepD * 0.6) * DAY);
            const countdown = Math.max(0, Math.round((nextBuy.getTime() - today.getTime()) / DAY));
            const start = new Date(Math.min(buys[0].d.getTime(), last.getTime() - stepD * DAY));
            const end = new Date(nextBuy.getTime() + stepD * 0.5 * DAY);
            const span = (end.getTime() - start.getTime()) || 1;
            const xp = (d: Date) => Math.max(0, Math.min(100, (d.getTime() - start.getTime()) / span * 100));
            let _tq = 0, _tc = 0; const bcum = buys.map((b) => { _tq += b.qty; _tc += b.qty * b.price; return { q: _tq, inv: _tc, avg: _tc / _tq }; });
            timeInfo = { nextLabel: fmtMD(nextBuy), countdown, buyCount: buys.length, intKo };
            act = { tone: "wait", icon: "calendar-clock", label: ko ? "다음 매수 예정" : "Next buy scheduled", detail: ko ? `${fmtMD(nextBuy)} · 회당 ${amtStr ? fmtMoney(parseFloat(amtStr.replace(/,/g, "")), plan.cur) : "정액"} 매수 알림 (${countdown}일 후)` : `${fmtMD(nextBuy)} · in ${countdown}d` };
            overlay = (
              <div className="sc-axis-card">
                <div className="sc-axis-cap">{ko ? "매수 주기 타임라인" : "Buy schedule"}<span className="sc-waxis-zone wait">{ko ? `${intKo} 적립` : intVal}</span></div>
                <div className="sc-taxis">
                  <div className="sc-taxis-track" />
                  <div className="sc-taxis-fill" style={{ left: 0, width: xp(today) + "%" }} />
                  {buys.map((b, i) => <div key={i} className="sc-taxis-buy" style={{ left: xp(b.d) + "%" }}><span className="sc-taxis-dot" /><span className="sc-axis-tip sc-waxis-tip"><b>{ko ? `${i + 1}회차 매수` : `Buy #${i + 1}`} · {fmtMD(b.d)}</b><span className="sc-axis-tip-row"><span>{ko ? "체결가" : "Price"}</span><b className="mono">{fmtMoney(b.price, plan.cur)}</b></span><span className="sc-axis-tip-row"><span>{ko ? "수량" : "Qty"}</span><b className="mono">{b.qty}{ko ? "주" : ""}</b></span><span className="sc-axis-tip-row"><span>{ko ? "누적 수량" : "Position"}</span><b className="mono">{Math.round(bcum[i].q)}{ko ? "주" : ""}</b></span><span className="sc-axis-tip-row"><span>{ko ? "누적 투입" : "Invested"}</span><b className="mono">{fmtMoney(bcum[i].inv, plan.cur)}</b></span><span className="sc-axis-tip-row"><span>{ko ? "체결 후 평단" : "Avg cost"}</span><b className="mono">{fmtMoney(bcum[i].avg, plan.cur)}</b></span></span></div>)}
                  <div className="sc-taxis-today" style={{ left: xp(today) + "%" }}><span className="sc-taxis-today-lab">{ko ? "오늘" : "Now"}</span></div>
                  <div className="sc-taxis-next" style={{ left: xp(nextBuy) + "%" }}><span className="sc-taxis-next-dot" /><span className="sc-taxis-next-lab">{ko ? "다음 " : "Next "}{fmtMD(nextBuy)}</span><span className="sc-axis-tip sc-waxis-tip"><b>{ko ? "다음 매수 예정" : "Next buy"} · {fmtMD(nextBuy)}</b><span className="sc-axis-tip-row"><span>{ko ? "예정 금액" : "Amount"}</span><b className="mono">{amtStr ? fmtMoney(parseFloat(amtStr.replace(/,/g, "")), plan.cur) : (ko ? "정액" : "fixed")}</b></span><span className="sc-axis-tip-row"><span>{ko ? "남은 기간" : "Countdown"}</span><b className="mono">{ko ? `${countdown}일 후` : `in ${countdown}d`}</b></span><span className="sc-axis-tip-note">{ko ? `${intKo} 주기에 따라 가격과 무관하게 자동 매수합니다.` : "Fixed amount, regardless of price."}</span></span></div>
                </div>
                <div className="sc-waxis-foot">{ko ? `${intKo} 같은 금액을 매수합니다 — 가격과 무관하게 ${countdown}일 후 다음 알림. 누적 ${buys.length}회 매수.` : `Buys a fixed amount on schedule — next alert in ${countdown}d · ${buys.length} buys so far.`}</div>
              </div>
            );
          } else {
            act = { tone: "wait", icon: "calendar-clock", label: ko ? "적립 대기" : "Scheduled", detail: ko ? `진입하면 ${intKo} 회당 ${amtStr ? fmtMoney(parseFloat(amtStr.replace(/,/g, "")), plan.cur) : "정액"} 매수가 시작됩니다.` : "Starts on entry." };
            overlay = (
              <div className="sc-axis-card">
                <div className="sc-axis-cap">{ko ? "매수 주기 타임라인" : "Buy schedule"}<span className="sc-waxis-zone wait">{ko ? "진입 전" : "Not started"}</span></div>
                <div className="sc-taxis"><div className="sc-taxis-track" /><div className="sc-taxis-next" style={{ left: "14%" }}><span className="sc-taxis-next-dot" /><span className="sc-taxis-next-lab">{ko ? "첫 매수" : "First buy"}</span></div></div>
                <div className="sc-waxis-foot">{ko ? `아직 진입 전입니다. 진입하면 ${intKo} 같은 금액을 자동 적립합니다.` : "Not started. Buys begin on entry."}</div>
              </div>
            );
          }
        } else if (isVR) {
          const up = Math.abs(fnum("vr_upper", 15)!), lo = Math.abs(fnum("vr_lower", 15)!), gr = fnum("vr_growth", 15)!;
          const loB = 100 - lo, hiB = 100 + up;
          const curV = avg > 0 ? px / avg * 100 : null;   // 평가액 지수 (가치선 V = 100)
          const axMin = 100 - lo * 2.2, axMax = 100 + up * 2.2, axSp = (axMax - axMin) || 1;
          const wp = (v: number) => Math.max(0, Math.min(100, (v - axMin) / axSp * 100));
          const drift = curV != null ? curV - 100 : null;
          const zone = curV == null ? "pre" : (curV > hiB ? "trim" : curV < loB ? "add" : "in");
          const zoneLab = { pre: ko ? "진입 전" : "Not started", in: ko ? "밴드 안 · 유지" : "In band · hold", trim: ko ? "상단 초과 · 매도" : "Above · sell", add: ko ? "하단 이탈 · 매수" : "Below · buy" }[zone];
          const zoneTone = { pre: "wait", in: "hold", trim: "sell", add: "buy" }[zone];
          // concrete won values: V = cost basis (invested); value = shares × price
          const vW = (plan.totalInvested || (avg * (plan.totalShares || 0))) || null;
          const valW = (plan.totalShares || 0) * px;
          const hiW = vW != null ? vW * (1 + up / 100) : null;
          const loW = vW != null ? vW * (1 - lo / 100) : null;
          const gapToHi = hiW != null ? (valW - hiW) : null;
          const gapToLo = loW != null ? (valW - loW) : null;
          const mkTip = (h: string, rows: [string, string, string?][], note: string, _tone?: string) => <span className="sc-axis-tip sc-waxis-tip"><b>{h}</b>{rows.map((r, j) => <span className="sc-axis-tip-row" key={j}><span>{r[0]}</span><b className={"mono" + (r[2] ? " " + r[2] : "")}>{r[1]}</b></span>)}{note && <span className="sc-axis-tip-note">{note}</span>}</span>;
          overlay = (
            <div className="sc-axis-card">
              <div className="sc-axis-cap">{ko ? "가치선 대비 현재 평가액" : "Value vs target line"}<span className={"sc-waxis-zone " + zoneTone}>{zoneLab}</span></div>
              <div className="sc-waxis">
                <div className="sc-waxis-track" />
                <div className="sc-waxis-band" style={{ left: wp(loB) + "%", width: (wp(hiB) - wp(loB)) + "%" }} />
                <div className="sc-waxis-target" style={{ left: wp(100) + "%" }}><span className="sc-waxis-target-lab"><span className="wx-word">{ko ? "가치선 V" : "Line V"}</span>{vW != null && <span className="wx-val">{fmtMoney(vW, plan.cur)}</span>}</span>{vW != null && mkTip(ko ? "목표 가치선 V" : "Value line V", [[ko ? "현재 V (원가 기준)" : "V (cost basis)", fmtMoney(vW, plan.cur)], [ko ? "성장 속도" : "Growth", (ko ? "연 " : "") + gr + "%" + (ko ? "" : "/yr")]], ko ? "기준 자본선. 매일 조금씩 상승하며, 평가액을 이 선에 맞춰 매수·매도합니다." : "Baseline that compounds daily; you trade your value back toward it.")}</div>
                <div className="sc-waxis-tick add" style={{ left: wp(loB) + "%" }}><span className="sc-waxis-tick-lab"><span className="wx-word">{ko ? "하단" : "Lower"}</span><span className="wx-val">−{lo}%</span></span>{loW != null && gapToLo != null && mkTip(ko ? `하단 밴드 −${lo}%` : `Lower −${lo}%`, [[ko ? "하단 밴드" : "Lower band", fmtMoney(loW, plan.cur)], [ko ? "= V ×" : "= V ×", (1 - lo / 100).toFixed(2)], [ko ? "현재 평가액과" : "vs value", (gapToLo >= 0 ? "+" : "") + fmtMoney(gapToLo, plan.cur), gapToLo >= 0 ? "" : "neg"]], ko ? "평가액이 이 선 아래로 내려가면 현금풀로 매수해 가치선까지 끌어올립니다." : "Below this, buy from the cash pool back up to V.")}</div>
                <div className="sc-waxis-tick trim" style={{ left: wp(hiB) + "%" }}><span className="sc-waxis-tick-lab"><span className="wx-word">{ko ? "상단" : "Upper"}</span><span className="wx-val">+{up}%</span></span>{hiW != null && gapToHi != null && mkTip(ko ? `상단 밴드 +${up}%` : `Upper +${up}%`, [[ko ? "상단 밴드" : "Upper band", fmtMoney(hiW, plan.cur)], [ko ? "= V ×" : "= V ×", (1 + up / 100).toFixed(2)], [ko ? "현재 평가액과" : "vs value", (gapToHi >= 0 ? "+" : "") + fmtMoney(gapToHi, plan.cur), gapToHi >= 0 ? "pos" : ""]], ko ? "평가액이 이 선 위로 올라가면 초과분을 매도해 가치선으로 되돌립니다." : "Above this, sell the excess back down to V.")}</div>
                {curV != null && drift != null && <div className={"sc-waxis-now " + zoneTone} style={{ left: wp(curV) + "%" }}><span className="sc-waxis-now-dot" /><span className="sc-waxis-now-lab mono">{drift >= 0 ? "+" : ""}{drift.toFixed(1)}%</span>{mkTip(ko ? "현재 평가액" : "Current value", [[ko ? "평가액" : "Value", fmtMoney(valW, plan.cur)], [ko ? "현재가" : "Price", fmtMoney(px, plan.cur)], [ko ? "가치선 대비" : "vs V", (drift >= 0 ? "+" : "") + drift.toFixed(1) + "%", drift >= 0 ? "pos" : "neg"], [ko ? "현재 상태" : "Zone", zoneLab]], zone === "trim" ? (ko ? "상단 밴드를 넘었습니다 — 매도 구간." : "Above upper band — sell zone.") : zone === "add" ? (ko ? "하단 밴드 아래입니다 — 매수 구간." : "Below lower band — buy zone.") : (ko ? "밴드 안 — 매매 없이 유지합니다." : "Inside band — hold."))}</div>}
              </div>
              <div className="sc-waxis-foot">{curV == null
                ? (ko ? "아직 진입 전입니다. 진입하면 평가액이 여기 표시되고, 밴드를 벗어나면 매수·매도 알림이 옵니다." : "Not started. Once you enter, your position value appears here.")
                : (ko ? `← 하단 이탈 시 현금풀로 매수 · 상단 초과 시 매도 →  가치선은 연 ${gr}% 성장` : `← add below · trim above →  value line grows ${gr}%/yr`)}</div>
            </div>
          );
        } else if (isWeight) {
          const tw = fnum(wField!.key, 20)!;
          const bandF = fnum("band", null);
          const band = bandF != null ? Math.abs(bandF) : Math.max(3, Math.round(tw * 0.25));
          const loB = Math.max(0, tw - band), hiB = tw + band;
          const curW = avg > 0 ? Math.max(0, Math.min(tw * 2.2, tw * (px / avg))) : null;
          const axMin = Math.max(0, tw - band * 2.4), axMax = tw + band * 2.4, axSp = (axMax - axMin) || 1;
          const wp = (v: number) => Math.max(0, Math.min(100, (v - axMin) / axSp * 100));
          const drift = curW != null ? curW - tw : null;
          const zone = curW == null ? "pre" : (curW > hiB ? "trim" : curW < loB ? "add" : "in");
          const zoneLab = { pre: ko ? "진입 전" : "Not started", in: ko ? "밴드 안 · 유지" : "In band · hold", trim: ko ? "상한 초과 · 매도" : "Above · sell", add: ko ? "하한 미만 · 매수" : "Below · buy" }[zone];
          const zoneTone = { pre: "wait", in: "hold", trim: "sell", add: "buy" }[zone];
          const mkTip = (h: string, rows: [string, string, string?][], note: string) => <span className="sc-axis-tip sc-waxis-tip"><b>{h}</b>{rows.map((r, j) => <span className="sc-axis-tip-row" key={j}><span>{r[0]}</span><b className={"mono" + (r[2] ? " " + r[2] : "")}>{r[1]}</b></span>)}{note && <span className="sc-axis-tip-note">{note}</span>}</span>;
          overlay = (
            <div className="sc-axis-card">
              <div className="sc-axis-cap">{ko ? "목표 비중 위 현재 위치" : "Weight vs target band"}<span className={"sc-waxis-zone " + zoneTone}>{zoneLab}</span></div>
              <div className="sc-waxis">
                <div className="sc-waxis-track" />
                <div className="sc-waxis-band" style={{ left: wp(loB) + "%", width: (wp(hiB) - wp(loB)) + "%" }} />
                <div className="sc-waxis-target" style={{ left: wp(tw) + "%" }} title={(ko ? "목표 비중 " : "Target ") + tw + "%"}><span className="sc-waxis-target-lab"><span className="wx-word">{ko ? "목표" : "Target"}</span><span className="wx-val">{tw}%</span></span></div>
                <div className="sc-waxis-tick add" style={{ left: wp(loB) + "%" }} title={(ko ? "하한 밴드 " : "Lower ") + loB + "%"}><span className="sc-waxis-tick-lab"><span className="wx-word">{ko ? "하한" : "Lower"}</span><span className="wx-val">{loB}%</span></span></div>
                <div className="sc-waxis-tick trim" style={{ left: wp(hiB) + "%" }} title={(ko ? "상한 밴드 " : "Upper ") + hiB + "%"}><span className="sc-waxis-tick-lab"><span className="wx-word">{ko ? "상한" : "Upper"}</span><span className="wx-val">{hiB}%</span></span></div>
                {curW != null && <div className={"sc-waxis-now " + zoneTone} style={{ left: wp(curW) + "%" }}><span className="sc-waxis-now-dot" /><span className="sc-waxis-now-lab mono">{curW.toFixed(1)}%{drift != null ? ` (${drift >= 0 ? "+" : ""}${drift.toFixed(1)})` : ""}</span>{mkTip(ko ? "현재 비중" : "Current weight", [[ko ? "현재 비중" : "Weight", curW.toFixed(1) + "%"], [ko ? "목표 대비" : "vs target", (drift! >= 0 ? "+" : "") + (drift || 0).toFixed(1) + "%p", drift! >= 0 ? "pos" : "neg"], [ko ? "현재가" : "Price", fmtMoney(px, plan.cur)], [ko ? "현재 상태" : "Zone", zoneLab]], zone === "trim" ? (ko ? "상한 초과 — 일부 매도 구간." : "Above band — trim.") : zone === "add" ? (ko ? "하한 미만 — 매수 구간." : "Below band — buy.") : (ko ? "밴드 안 — 유지." : "In band — hold."))}</div>}
              </div>
              <div className="sc-waxis-foot">{curW == null
                ? (ko ? "아직 진입 전입니다. 진입하면 현재 비중이 여기 표시되고, 밴드를 벗어나면 매수·매도 알림이 옵니다." : "Not started. Once you enter, your weight appears here.")
                : (ko ? `← 하한 미만이면 매수 · 상한 초과면 매도 →  목표 ${tw}% ±${band}%p 유지` : `← add below · trim above →  hold ${tw}% ±${band}%p`)}</div>
            </div>
          );
        } else if (isGrid) {
          const gLo = fnum("lower", null)!, gHi = fnum("upper", null)!, gN = Math.max(2, Math.round(fnum("grids", 20)!));
          const span = (gHi - gLo) || 1, step = span / gN;
          const pad = span * 0.08, axMin = gLo - pad, axMax = gHi + pad, axSp = (axMax - axMin) || 1;
          const wp = (v: number) => Math.max(0, Math.min(100, (v - axMin) / axSp * 100));
          const below = Math.max(0, Math.min(gN, Math.round((px - gLo) / step)));
          const zone = px < gLo ? "add" : px > gHi ? "trim" : "in";
          const zoneLab = { in: ko ? "구간 안 · 격자 매매" : "In grid", add: ko ? "하단 이탈" : "Below grid", trim: ko ? "상단 돌파" : "Above grid" }[zone];
          const zoneTone = { in: "hold", add: "buy", trim: "sell" }[zone];
          const lines = Array.from({ length: gN + 1 }, (_, i) => gLo + i * step);
          const mkTip = (h: string, rows: [string, string, string?][], note: string) => <span className="sc-axis-tip sc-waxis-tip"><b>{h}</b>{rows.map((r, j) => <span className="sc-axis-tip-row" key={j}><span>{r[0]}</span><b className={"mono" + (r[2] ? " " + r[2] : "")}>{r[1]}</b></span>)}{note && <span className="sc-axis-tip-note">{note}</span>}</span>;
          act = { tone: zoneTone === "hold" ? "wait" : zoneTone, icon: zone === "add" ? "arrow-down-left" : zone === "trim" ? "arrow-up-right" : "grid-3x3",
            label: zone === "in" ? (ko ? "격자 매매 중" : "Grid active") : zone === "add" ? (ko ? "하단 이탈" : "Below range") : (ko ? "상단 돌파" : "Above range"),
            detail: zone === "in" ? (ko ? `현재가 ${fmtMoney(px, plan.cur)} — 한 칸(${fmtMoney(step, plan.cur)}) 내리면 매수 · 오르면 매도` : `Step ${fmtMoney(step, plan.cur)}`) : zone === "add" ? (ko ? `하단 ${fmtMoney(gLo, plan.cur)} 아래 — 격자 소진(전량 보유)` : "Below grid") : (ko ? `상단 ${fmtMoney(gHi, plan.cur)} 위 — 격자 청산(현금)` : "Above grid") };
          overlay = (
            <div className="sc-axis-card">
              <div className="sc-axis-cap">{ko ? "가격 구간 위 현재가" : "Price in grid"}<span className={"sc-waxis-zone " + zoneTone}>{zoneLab}</span></div>
              <div className="sc-waxis">
                <div className="sc-waxis-track" />
                <div className="sc-waxis-band" style={{ left: wp(gLo) + "%", width: (wp(gHi) - wp(gLo)) + "%" }} />
                {lines.map((lv, i) => <div key={i} className="sc-grid-line" style={{ left: wp(lv) + "%" }} />)}
                <div className="sc-waxis-tick add" style={{ left: wp(gLo) + "%" }}><span className="sc-waxis-tick-lab"><span className="wx-word">{ko ? "하단" : "Lower"}</span><span className="wx-val">{fmtMoney(gLo, plan.cur)}</span></span>{mkTip(ko ? "하단" : "Lower", [[ko ? "하단 가격" : "Lower", fmtMoney(gLo, plan.cur)], [ko ? "이탈 시" : "If below", ko ? "격자 소진" : "all bought"]], ko ? "여기까지 내려오며 칸마다 매수합니다." : "Buys ladder down to here.")}</div>
                <div className="sc-waxis-tick trim" style={{ left: wp(gHi) + "%" }}><span className="sc-waxis-tick-lab"><span className="wx-word">{ko ? "상단" : "Upper"}</span><span className="wx-val">{fmtMoney(gHi, plan.cur)}</span></span>{mkTip(ko ? "상단" : "Upper", [[ko ? "상단 가격" : "Upper", fmtMoney(gHi, plan.cur)], [ko ? "돌파 시" : "If above", ko ? "격자 청산" : "all sold"]], ko ? "여기까지 오르며 칸마다 매도합니다." : "Sells ladder up to here.")}</div>
                <div className={"sc-waxis-now " + zoneTone} style={{ left: wp(px) + "%" }}><span className="sc-waxis-now-dot" /><span className="sc-waxis-now-lab mono">{fmtMoney(px, plan.cur)}</span>{mkTip(ko ? "현재가" : "Price", [[ko ? "현재가" : "Price", fmtMoney(px, plan.cur)], [ko ? "채워진 칸" : "Rungs", `${below}/${gN}`], [ko ? "한 칸 간격" : "Step", fmtMoney(step, plan.cur)]], zone === "in" ? (ko ? "한 칸 내리면 매수, 오르면 매도." : "Buy a step down, sell a step up.") : zone === "add" ? (ko ? "하단 아래 — 격자를 다 매수한 상태." : "Below — fully bought.") : (ko ? "상단 위 — 격자를 다 매도한 상태." : "Above — fully sold."))}</div>
              </div>
              <div className="sc-waxis-foot">{ko ? `하단 ${fmtMoney(gLo, plan.cur)} ~ 상단 ${fmtMoney(gHi, plan.cur)}를 ${gN}칸으로 — 한 칸 내리면 매수 · 오르면 매도. 현재 ${below}/${gN}칸.` : `${gN} rungs from ${fmtMoney(gLo, plan.cur)} to ${fmtMoney(gHi, plan.cur)} — buy a step down, sell a step up.`}</div>
            </div>
          );
        } else if (isMomentum) {
          const stopPct = Math.abs(fnum("stop", 15)!);
          const lookF = (ex.fields || []).find((f) => f.key === "lookback");
          const lookStr = lookF ? lookF.default : "";
          const started = avg > 0;
          const refHigh = started ? Math.max(px, avg) : px;
          const stopLine = refHigh * (1 - stopPct / 100);
          const sp2 = (refHigh - stopLine) || (refHigh * 0.01);
          const axMin = stopLine - sp2 * 0.6, axMax = refHigh + sp2 * 0.45, axSp = (axMax - axMin) || 1;
          const wp = (v: number) => Math.max(0, Math.min(100, (v - axMin) / axSp * 100));
          const toStop = (px - stopLine) / px * 100;
          const zone = !started ? "pre" : (px <= stopLine ? "trim" : "hold");
          const zoneLab = { pre: ko ? "진입 대기" : "Armed", hold: ko ? "추세 보유 · 스탑 추적" : "Trend held", trim: ko ? "스탑 이탈 · 청산" : "Stop hit" }[zone];
          const zoneTone = { pre: "wait", hold: "hold", trim: "sell" }[zone];
          const mkTip = (h: string, rows: [string, string, string?][], note: string) => <span className="sc-axis-tip sc-waxis-tip"><b>{h}</b>{rows.map((r, j) => <span className="sc-axis-tip-row" key={j}><span>{r[0]}</span><b className={"mono" + (r[2] ? " " + r[2] : "")}>{r[1]}</b></span>)}{note && <span className="sc-axis-tip-note">{note}</span>}</span>;
          act = { tone: zone === "trim" ? "sell" : "wait", icon: zone === "trim" ? "arrow-up-right" : "activity",
            label: zone === "pre" ? (ko ? "진입 신호 대기" : "Armed") : zone === "trim" ? (ko ? "트레일링 스탑 도달" : "Stop hit") : (ko ? "추세 보유 중" : "Trend held"),
            detail: zone === "pre" ? (ko ? `추세 상향 돌파(${lookStr || "모멘텀"}) 시 진입 — 이후 고점 대비 −${stopPct}%에서 청산` : `Enter on up-cross; trail −${stopPct}%`) : (ko ? `고점 ${fmtMoney(refHigh, plan.cur)} 대비 스탑 ${fmtMoney(stopLine, plan.cur)} — 현재가까지 ${toStop >= 0 ? "+" : ""}${toStop.toFixed(1)}% 여유` : `Stop ${fmtMoney(stopLine, plan.cur)} · ${toStop.toFixed(1)}% headroom`) };
          overlay = (
            <div className="sc-axis-card">
              <div className="sc-axis-cap">{ko ? "추세 위 현재가 · 트레일링 스탑" : "Trend & trailing stop"}<span className={"sc-waxis-zone " + zoneTone}>{zoneLab}</span></div>
              <div className="sc-waxis">
                <div className="sc-waxis-track" />
                <div className="sc-waxis-band" style={{ left: wp(stopLine) + "%", width: (wp(refHigh) - wp(stopLine)) + "%" }} />
                <div className="sc-waxis-tick add" style={{ left: wp(stopLine) + "%" }}><span className="sc-waxis-tick-lab"><span className="wx-word">{ko ? "스탑" : "Stop"}</span><span className="wx-val">−{stopPct}%</span></span>{mkTip(ko ? `트레일링 스탑 −${stopPct}%` : `Trailing stop −${stopPct}%`, [[ko ? "스탑 가격" : "Stop", fmtMoney(stopLine, plan.cur)], [ko ? "= 고점 ×" : "= peak ×", (1 - stopPct / 100).toFixed(2)], [ko ? "현재가까지" : "Headroom", (toStop >= 0 ? "+" : "") + toStop.toFixed(1) + "%", toStop >= 0 ? "pos" : "neg"]], ko ? "고점을 따라 같이 올라가는 청산선. 여기로 내려오면 추세 종료로 보고 청산합니다." : "Rises with the peak; exit if price falls to it.")}</div>
                <div className="sc-waxis-target" style={{ left: wp(refHigh) + "%" }}><span className="sc-waxis-target-lab"><span className="wx-word">{ko ? "고점" : "Peak"}</span><span className="wx-val">{fmtMoney(refHigh, plan.cur)}</span></span>{mkTip(ko ? "기준 고점" : "Reference peak", [[ko ? "고점" : "Peak", fmtMoney(refHigh, plan.cur)], [ko ? "조회 기간" : "Lookback", lookStr || "—"]], ko ? "진입 후 기록한 최고가(근사). 스탑선은 이 값의 −" + stopPct + "%입니다." : "Highest since entry; stop trails −" + stopPct + "%.")}</div>
                <div className={"sc-waxis-now " + zoneTone} style={{ left: wp(px) + "%" }}><span className="sc-waxis-now-dot" /><span className="sc-waxis-now-lab mono">{fmtMoney(px, plan.cur)}</span>{mkTip(ko ? "현재가" : "Price", [[ko ? "현재가" : "Price", fmtMoney(px, plan.cur)], [ko ? "스탑까지" : "To stop", (toStop >= 0 ? "+" : "") + toStop.toFixed(1) + "%", toStop >= 0 ? "pos" : "neg"], [ko ? "현재 상태" : "Zone", zoneLab]], zone === "pre" ? (ko ? "아직 진입 전 — 추세 상향 돌파 시 진입합니다." : "Armed — enters on an up-cross.") : zone === "trim" ? (ko ? "스탑 이탈 — 청산 신호." : "Stop hit — exit.") : (ko ? "추세 유지 중 — 스탑이 고점을 따라 올라갑니다." : "Holding — stop trails the peak."))}</div>
              </div>
              <div className="sc-waxis-foot">{ko ? `${started ? `고점 ${fmtMoney(refHigh, plan.cur)} 대비 −${stopPct}% 스탑 · 현재 ${toStop >= 0 ? "+" : ""}${toStop.toFixed(1)}% 여유` : `진입 후 고점 대비 −${stopPct}%에서 청산`} — 추세를 따라가다 꺾이면 빠집니다.` : `Trail −${stopPct}% below the peak — ride the trend, exit on reversal.`}</div>
            </div>
          );
        } else if (isPrice) {
          const pre = !(avg > 0);
          if (pre) {
            // 프로토타입은 plan.totalBudget/budget을 참조했으나 core Plan엔 없음 — 진입 전(pre) 분기라 0이면 firstAmt=null(원본 동치).
            const firstAmt = div ? ((plan.totalInvested || 0) / div) || null : null;
            act = { tone: "wait", icon: "flag", label: ko ? "진입 대기" : "Not started", detail: ko
              ? `아직 진입 전입니다. 진입하면 현재가 ${fmtMoney(px, plan.cur)} 부근에서 1회차${firstAmt ? ` 약 ${fmtMoney(firstAmt, plan.cur)}` : ""}를 매수하고, 이후 하락 시 분할 매수가 시작됩니다.`
              : `Not started. On entry you buy round 1 near ${fmtMoney(px, plan.cur)}${firstAmt ? ` (~${fmtMoney(firstAmt, plan.cur)})` : ""}; splits begin as price falls.` };
          }
          const marks: { p: number; lab: string; cls: string }[] = [];
          if (bear != null) marks.push({ p: bear, lab: ko ? "하단" : "Low", cls: "bear" });
          if (avg > 0) marks.push({ p: avg, lab: ko ? "평단" : "Avg", cls: "avg" });
          if (locPx != null && px > locPx) marks.push({ p: locPx, lab: ko ? "다음매수" : "Buy", cls: "buy" });
          if (tpPx != null) marks.push({ p: tpPx, lab: ko ? "익절" : "TP", cls: "tp" });
          if (bull != null) marks.push({ p: bull, lab: ko ? "상단" : "High", cls: "bull" });
          const all = marks.map((m) => m.p).concat([px]);
          const lo = Math.min(...all) * 0.93, hi = Math.max(...all) * 1.07, sp = (hi - lo) || 1;
          const xp = (v: number) => Math.max(0, Math.min(100, (v - lo) / sp * 100));
          overlay = (
            <div className="sc-axis-card">
              <div className="sc-axis-cap">{ko ? "가격 범위 위 전략 위치" : "Strategy on the price range"}{pre && <span className="sc-waxis-zone wait">{ko ? "진입 전" : "Not started"}</span>}</div>
              <div className="sc-axis">
                <div className="sc-axis-line" />
                {!pre && avg > 0 && <div className={"sc-axis-fill " + (px >= avg ? "pos" : "neg")} style={{ left: Math.min(xp(avg), xp(px)) + "%", width: Math.abs(xp(px) - xp(avg)) + "%" }} />}
                {marks.map((m, i) => {
                  const pri = m.cls === "avg" || m.cls === "buy";
                  const _xpv = xp(m.p);
                  const edge = _xpv < 24 ? " tip-l" : (_xpv > 76 ? " tip-r" : "");
                  const meaning = { bear: ko ? "밸류 하단 · 최대 분할 지점" : "Value floor · max splits", avg: ko ? "손익 분기 · 위는 수익, 아래는 손실" : "Breakeven · profit above, loss below", buy: ko ? "다음 분할 매수 트리거" : "Next split-buy trigger", tp: ko ? "익절가 · 도달 시 분할 매도" : "Take-profit · trim on reach", bull: ko ? "밸류 상단 · 비중 축소" : "Value ceiling · reduce" }[m.cls];
                  const mnote = { avg: ko ? "회차가 진행돼 평단이 바뀌면 이 선도 같이 움직여요." : "Moves as your avg cost changes each round.", buy: ko ? `평단 ${locP != null ? locP.toFixed(1) : "−5"}% 아래에 자동으로 걸리는 다음 분할가 — 평단 따라 이동해요.` : `Auto-set ${locP != null ? locP.toFixed(1) : "−5"}% below avg — moves with avg cost.`, tp: ko ? `전략이 평단 × (1 + 익절 ${tpP != null ? tpP.toFixed(0) : "10"}%)로 자동 계산 — 회차마다 평단 따라 이동해요.` : `Strategy auto-line: avg × (1 + TP ${tpP != null ? tpP.toFixed(0) : "10"}%) — moves with avg each round.` }[m.cls as "avg" | "buy" | "tp"];
                  let dlt: { txt: string; tone: string };
                  if (m.cls === "avg") { const d = avg > 0 ? (px / avg - 1) * 100 : 0; dlt = { txt: (ko ? "현재가 평단 " : "price vs avg ") + (d >= 0 ? "+" : "") + d.toFixed(1) + "%", tone: d >= 0 ? "pos" : "neg" }; }
                  else { const d = (m.p / px - 1) * 100; dlt = { txt: (ko ? "현재가 " : "price ") + (d >= 0 ? "+" : "") + d.toFixed(1) + (ko ? "% 지점" : "%"), tone: "" }; }
                  return <div key={i} className={"sc-axis-mark " + m.cls + (pri ? " pri" : "") + edge} style={{ left: xp(m.p) + "%" }}><span className="sc-axis-tick" /><span className="sc-axis-lab">{m.lab}</span><span className="sc-axis-num mono">{fmtMoney(m.p, plan.cur)}</span><span className="sc-axis-tip"><b>{meaning}</b><span className={"sc-axis-tip-d mono" + (dlt.tone ? " " + dlt.tone : "")}>{dlt.txt}</span>{mnote && <span className="sc-axis-tip-note">{mnote}</span>}</span></div>;
                })}
                <div className={"sc-axis-now" + (pre ? " pre" : "")} style={{ left: xp(px) + "%" }} title={(ko ? "현재가 " : "Price ") + fmtMoney(px, plan.cur)}><span className="sc-axis-now-tick" /><span className="sc-axis-now-lab mono">{fmtMoney(px, plan.cur)}{pre && <span className="sc-axis-now-pre">{ko ? " 진입 예정" : " entry"}</span>}</span></div>
              </div>
              {pre && <div className="sc-waxis-foot">{ko ? "현재가 마커가 1회차 매수 예상 지점입니다. 진입 후 하락하면 추가 분할이 채워집니다." : "The price marker is where round 1 would buy. Splits fill in as price falls after entry."}</div>}
            </div>
          );
        }
        const stats: StatItem[] = [];
        if ((plan.totalShares || 0) > 0) stats.push({ k: ko ? "평가액" : "Value", v: fmtMoney((plan.totalShares || 0) * px, plan.cur), sub: (plan.totalShares || 0).toLocaleString("en-US") + (ko ? "주" : ""), tip: { h: ko ? "평가액" : "Market value", rows: [[ko ? "보유 수량" : "Shares", (plan.totalShares || 0).toLocaleString("en-US") + (ko ? "주" : "")], [ko ? "× 현재가" : "× Price", fmtMoney(px, plan.cur)]], note: ko ? "현재가 × 보유 수량" : "Shares × current price" } });
        if (avg > 0) stats.push({ k: ko ? "평단가" : "Avg cost", v: fmtMoney(avg, plan.cur), tip: { h: ko ? "평단가" : "Avg cost", rows: [[ko ? "누적 투입" : "Deployed", fmtMoney((plan.totalInvested || avg * (plan.totalShares || 0)), plan.cur)], [ko ? "÷ 보유 수량" : "÷ Shares", (plan.totalShares || 0).toLocaleString("en-US") + (ko ? "주" : "")]], note: ko ? "누적 투입 ÷ 보유 수량" : "Deployed ÷ shares" } });
        if (ret != null) { const plAmt = (plan.totalShares || 0) * (px - avg); stats.push({ k: ko ? "평가손익" : "P/L", v: (plAmt >= 0 ? "+" : "") + fmtMoney(plAmt, plan.cur), sub: (ret >= 0 ? "+" : "") + ret.toFixed(1) + "%", tone: ret >= 0 ? "pos" : "neg", tip: { h: ko ? "평가손익" : "Unrealized P/L", rows: [[ko ? "현재가 − 평단" : "Price − avg", ((px - avg) >= 0 ? "+" : "") + fmtMoney(px - avg, plan.cur)], [ko ? "× 보유 수량" : "× Shares", (plan.totalShares || 0).toLocaleString("en-US") + (ko ? "주" : "")]], note: ko ? "(현재가 − 평단) × 보유 수량 · 매도 전 미실현" : "(price − avg) × shares · unrealized" } }); }
        if (locPx != null && px > locPx) stats.push({ k: ko ? "다음 매수가" : "Next buy", v: fmtMoney(locPx, plan.cur), tip: { h: ko ? "다음 매수가 (LOC)" : "Next buy (LOC)", rows: [[ko ? "현재 평단" : "Avg cost", fmtMoney(avg, plan.cur)], [ko ? "LOC 기준" : "LOC band", (locP != null ? (locP > 0 ? "+" : "") + locP.toFixed(1) + "%" : "")], [ko ? "현재가까지" : "From price", "−" + (((px - locPx) / px) * 100).toFixed(1) + "%"]], note: ko ? "평단 아래 LOC 기준만큼 내려간 지정가" : "Limit set LOC% below avg cost" } });
        else if (tpPx != null) stats.push({ k: ko ? "익절가" : "TP price", v: fmtMoney(tpPx, plan.cur), tone: "pos", tip: { h: ko ? "익절가" : "Take-profit", rows: [[ko ? "현재 평단" : "Avg cost", fmtMoney(avg, plan.cur)], [ko ? "익절 기준" : "TP band", (tpP != null ? (tpP > 0 ? "+" : "") + tpP.toFixed(1) + "%" : "")]], note: ko ? "평단 위 익절 기준만큼 올라간 목표가" : "Target set TP% above avg cost" } });
        if (isTime && timeInfo) { stats.unshift({ k: ko ? "누적 매수" : "Buys", v: timeInfo.buyCount + (ko ? "회" : ""), sub: timeInfo.intKo }); stats.push({ k: ko ? "다음 매수일" : "Next buy", v: timeInfo.nextLabel, sub: ko ? `${timeInfo.countdown}일 후` : `in ${timeInfo.countdown}d` }); }
        const _MONP: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
        const pdstr = (s: string) => { if (!s) return ""; const m = String(s).match(/([A-Za-z]{3})\s*(\d+)/); return m ? (ko ? `${_MONP[m[1]] + 1}월 ${m[2]}일` : `${m[1]} ${m[2]}`) : s; };
        const _bf = (plan.executions || []).filter((e) => e.side === "buy").slice().sort((a, b) => { const pa = String(a.date || "").match(/([A-Za-z]{3})\s*(\d+)/), pb = String(b.date || "").match(/([A-Za-z]{3})\s*(\d+)/); const va = pa ? _MONP[pa[1]] * 100 + +pa[2] : 0, vb = pb ? _MONP[pb[1]] * 100 + +pb[2] : 0; return va - vb; });
        let _pq = 0, _pc = 0; const progSnaps = _bf.map((e, i) => { _pq += e.qty; _pc += e.qty * e.price; return { n: i + 1, price: e.price, date: e.date, qAfter: _pq, invAfter: _pc, avg: _pc / _pq }; });
        // capital deployment (staged-buy strategies)
        const invested = plan.totalInvested || 0;
        const perRoundAvg = round > 0 ? invested / round : null;
        const plannedCap = (div && perRoundAvg) ? perRoundAvg * div : null;
        const remainingCap = plannedCap != null ? Math.max(0, plannedCap - invested) : null;
        const capPct = plannedCap ? Math.round(invested / plannedCap * 100) : null;
        const remainRounds = (div && round != null) ? Math.max(0, div - round) : null;
        const showCap = div && invested > 0 && plannedCap != null;
        // optional goal (목표가 / 목표수익률) — off by default
        const goal = plan.goal || null;
        let goalView: {
          kind: string; tgtLab: string; curLab: string; pct: number; reached: boolean; remainLab: string; tipNote: string;
        } | null = null;
        if (goal) {
          if (goal.type === "return") {
            const cur = ret, tgt = goal.value;
            const pct = cur != null && tgt ? Math.max(0, Math.min(100, (cur / tgt) * 100)) : 0;
            const reached = cur != null && cur >= tgt;
            goalView = { kind: "return", tgtLab: (tgt >= 0 ? "+" : "") + tgt + "%", curLab: cur != null ? ((cur >= 0 ? "+" : "") + cur.toFixed(1) + "%") : "—", pct, reached,
              remainLab: cur == null ? (ko ? "진입 전" : "Not started") : (reached ? (ko ? "달성" : "Reached") : ((ko ? "" : "+") + (tgt - cur).toFixed(1) + (ko ? "%p 남음" : "%p left"))),
              tipNote: ko ? "평단가 대비 평가수익률이 이 목표에 도달하면 알림이 옵니다 (회차 익절과는 별개)." : "Cumulative return on the whole position vs. avg cost (separate from per-round take-profit)." };
          } else {
            const tgt = goal.value, base = avg > 0 ? avg : px;
            const pct = Math.max(0, Math.min(100, ((px - base) / ((tgt - base) || 1)) * 100));
            const reached = px >= tgt, remainPct = (tgt - px) / px * 100;
            goalView = { kind: "price", tgtLab: fmtMoney(tgt, plan.cur), curLab: fmtMoney(px, plan.cur), pct, reached,
              remainLab: reached ? (ko ? "달성" : "Reached") : ((ko ? "" : "+") + remainPct.toFixed(1) + (ko ? "% 남음" : "% left")),
              tipNote: ko ? "현재가가 목표가에 도달하면 알림이 옵니다." : "Alerts when price hits the target." };
          }
        }
        return (
          <div className="sc-cockpit">
            <div className={"sc-next sc-next--" + act.tone}>
              <span className="sc-next-ic"><Lic name={act.icon} size={16} cls="icon-sm" color="currentColor" /></span>
              <div className="sc-next-body"><div className="sc-next-lab">{ko ? "다음 액션" : "Next action"}</div><div className="sc-next-title">{act.label}</div><div className="sc-next-detail">{act.detail}</div></div>
            </div>
            {overlay}
            {deployed != null && <div className="sc-prog"><div className="sc-prog-head"><span>{ko ? `${round} / ${div}회차 진행` : `${round} / ${div} rounds`}</span><span className="mono">{deployed}%</span></div><div className="sc-prog-track">{Array.from({ length: Math.min(div || 0, 40) }).map((_, i) => {
              const cnt = Math.min(div || 0, 40);
              const filled = i < round;
              const snap = filled ? progSnaps[i] : null;
              const align = i < 5 ? " tip-l" : (i > cnt - 6 ? " tip-r" : "");
              return <span key={i} className={"sc-prog-cell" + (filled ? " on" : "")}>{snap
                ? <span className={"sc-prog-tip" + align}>
                    <span className="sc-tl-tip-h">{ko ? `${snap.n}회차 매수 체결` : `Buy fill #${snap.n}`}{snap.date ? " · " + pdstr(snap.date) : ""}</span>
                    <span className="sc-tl-tip-row"><span>{ko ? "체결가" : "Price"}</span><b className="mono">{fmtMoney(snap.price, plan.cur)}</b></span>
                    <span className="sc-tl-tip-row"><span>{ko ? "체결 후 누적 수량" : "Position after"}</span><b className="mono">{Math.round(snap.qAfter).toLocaleString("en-US")}{ko ? "주" : ""}</b></span>
                    <span className="sc-tl-tip-row"><span>{ko ? "체결 후 누적 투입" : "Invested after"}</span><b className="mono">{fmtMoney(snap.invAfter, plan.cur)}</b></span>
                    <span className="sc-tl-tip-row"><span>{ko ? "체결 후 평단" : "Avg cost after"}</span><b className="mono">{fmtMoney(snap.avg, plan.cur)}</b></span>
                  </span>
                : <span className={"sc-prog-tip mini" + align}><span className="sc-tl-tip-h" style={{ borderBottom: "none", paddingBottom: 0 }}>{filled ? (ko ? `${i + 1}회차 · 매수 완료` : `Round ${i + 1} · filled`) : (ko ? `${i + 1}회차 · 미실행` : `Round ${i + 1} · pending`)}</span></span>}</span>;
            })}</div></div>}
            {showCap && <div className="sc-cap">
              <div className="sc-cap-head"><span>{ko ? "자금 배치" : "Capital deployment"}</span><span className="mono">{capPct}%{ko ? " 투입" : ""}</span></div>
              <div className="sc-cap-bar"><div className="sc-cap-fill" style={{ width: Math.min(100, capPct!) + "%" }} /></div>
              <div className="sc-cap-figs">
                <div className="sc-cap-fig">
                  <span className="sc-cap-k">{ko ? "계획" : "Planned"}</span><span className="sc-cap-v mono">{fmtMoney(plannedCap!, plan.cur)}</span>
                  <span className="sc-cap-tip tip-l"><span className="sc-tl-tip-h">{ko ? "계획 자본" : "Planned capital"}</span><span className="sc-tl-tip-row"><span>{ko ? "회당 평균 투입" : "Avg per round"}</span><b className="mono">{fmtMoney(perRoundAvg!, plan.cur)}</b></span><span className="sc-tl-tip-row"><span>{ko ? "× 분할 수" : "× divisions"}</span><b className="mono">{div}{ko ? "회" : ""}</b></span><span className="sc-cap-tipnote">{ko ? "현재 회차 평균으로 추정한 총 예산" : "Total budget est. from avg per round"}</span></span>
                </div>
                <div className="sc-cap-fig">
                  <span className="sc-cap-k">{ko ? "투입" : "Deployed"}</span><span className="sc-cap-v mono on">{fmtMoney(invested, plan.cur)}</span>
                  <span className="sc-cap-tip"><span className="sc-tl-tip-h">{ko ? "누적 투입" : "Deployed"}</span><span className="sc-tl-tip-row"><span>{ko ? "체결 누적 금액" : "Sum of fills"}</span><b className="mono">{fmtMoney(invested, plan.cur)}</b></span><span className="sc-tl-tip-row"><span>{ko ? "진행 회차" : "Rounds"}</span><b className="mono">{round}/{div}{ko ? "회" : ""}</b></span><span className="sc-tl-tip-row"><span>{ko ? "자본 기준 진행률" : "By capital"}</span><b className="mono">{capPct}%</b></span></span>
                </div>
                <div className="sc-cap-fig">
                  <span className="sc-cap-k">{ko ? "잔여" : "Remaining"}</span><span className="sc-cap-v mono">{fmtMoney(remainingCap!, plan.cur)}</span>
                  <span className="sc-cap-tip tip-r"><span className="sc-tl-tip-h">{ko ? "남은 실탄" : "Remaining"}</span><span className="sc-tl-tip-row"><span>{ko ? "계획 − 투입" : "Planned − deployed"}</span><b className="mono">{fmtMoney(remainingCap!, plan.cur)}</b></span><span className="sc-tl-tip-row"><span>{ko ? "남은 회차" : "Rounds left"}</span><b className="mono">{remainRounds}{ko ? "회" : ""}</b></span><span className="sc-cap-tipnote">{ko ? "추가 하락 시 분할 매수에 쓸 수 있는 자본" : "Capital available for further staged buys"}</span></span>
                </div>
              </div>
              <div className="sc-cap-foot">{ko ? `회당 평균 ${fmtMoney(perRoundAvg!, plan.cur)} · 남은 ${remainRounds}회` : `Avg ${fmtMoney(perRoundAvg!, plan.cur)}/round · ${remainRounds} left`}</div>
            </div>}
            {stats.length > 0 && <div className="sc-statline">{stats.map((s, i) => <div className={"sc-stat" + (s.tip ? " sc-stat--tip" : "")} key={i}><div className="sc-stat-k">{s.k}</div><div className={"sc-stat-v mono" + (s.tone ? " " + s.tone : "")}>{s.v}</div>{s.sub && <div className="sc-stat-sub mono">{s.sub}</div>}{s.tip && <span className={"sc-stat-tip" + (i === 0 ? " tip-l" : (i === stats.length - 1 ? " tip-r" : ""))}><span className="sc-tl-tip-h">{s.tip.h}</span>{s.tip.rows.map((r, j) => <span className="sc-tl-tip-row" key={j}><span>{r[0]}</span><b className="mono">{r[1]}</b></span>)}{s.tip.note && <span className="sc-cap-tipnote">{s.tip.note}</span>}</span>}</div>)}</div>}
            {goalEdit ? (
              <div className="sc-goal sc-goal--edit">
                <div className="sc-goal-seg">
                  <button className={"sc-goal-seg-b" + (gType === "return" ? " on" : "")} onClick={() => setGType("return")}>{ko ? "목표 수익률" : "Return"}</button>
                  <button className={"sc-goal-seg-b" + (gType === "price" ? " on" : "")} onClick={() => setGType("price")}>{ko ? "목표가" : "Price"}</button>
                </div>
                <div className="sc-goal-inwrap"><span className="sc-goal-unit">{gType === "return" ? "%" : (goalDispCur === "USD" ? "$" : "₩")}</span><input className="sc-goal-input mono" autoFocus value={gVal} onChange={(e) => setGVal(e.target.value)} placeholder={gType === "return" ? "20" : "0"} onKeyDown={(e) => { if (e.key === "Enter") saveGoal(); if (e.key === "Escape") setGoalEdit(false); }} /></div>
                <button className="v-btn v-btn--primary sc-goal-save" onClick={saveGoal}>{ko ? "저장" : "Save"}</button>
                <button className="sc-goal-cancel" onClick={() => setGoalEdit(false)}>{ko ? "취소" : "Cancel"}</button>
              </div>
            ) : goalView && goal ? (
              <div className="sc-goal" onClick={() => openGoalEdit(goal.type as "return" | "price", goal.value)}>
                <div className="sc-goal-head">
                  <span className="sc-goal-lab sc-goal-tipwrap" onClick={(e) => e.stopPropagation()}><Lic name="target" size={13} cls="icon-sm" color="var(--accent)" />{goal.type === "return" ? (ko ? "목표 수익률" : "Return goal") : (ko ? "목표가" : "Price goal")}<b className="mono">{goalView.tgtLab}</b><Lic name="help-circle" size={12} cls="icon-sm" color="var(--fg-4)" />
                    <span className="sc-cap-tip tip-l"><span className="sc-tl-tip-h">{goal.type === "return" ? (ko ? "목표 수익률" : "Return goal") : (ko ? "목표가" : "Price goal")}</span><span className="sc-tl-tip-row"><span>{ko ? "목표" : "Target"}</span><b className="mono">{goalView.tgtLab}</b></span><span className="sc-tl-tip-row"><span>{ko ? "현재" : "Now"}</span><b className="mono">{goalView.curLab}</b></span><span className="sc-tl-tip-row"><span>{ko ? "달성률" : "Progress"}</span><b className="mono">{goalView.reached ? (ko ? "달성" : "Reached") : Math.round(goalView.pct) + "%"}</b></span><span className="sc-cap-tipnote">{goalView.tipNote}</span></span>
                  </span>
                  <span className="sc-goal-actions">
                    <span className={"sc-goal-pct mono" + (goalView.reached ? " reached" : "")}>{goalView.reached ? (ko ? "달성 ✓" : "Reached ✓") : (ko ? "달성 " : "") + Math.round(goalView.pct) + "%"}</span>
                  </span>
                </div>
                <span className="sc-goal-edit-actions">
                  <button className="iconbtn sc-goal-mini" onClick={(e) => { e.stopPropagation(); openGoalEdit(goal.type as "return" | "price", goal.value); }} title={ko ? "수정" : "Edit"}><Lic name="pencil" size={12} /></button>
                  <button className="iconbtn sc-goal-mini" onClick={(e) => { e.stopPropagation(); removeGoal(); }} title={ko ? "삭제" : "Remove"}><Lic name="x" size={12} /></button>
                </span>
                <div className="sc-goal-bar"><div className={"sc-goal-fill" + (goalView.reached ? " reached" : "")} style={{ width: Math.min(100, goalView.pct) + "%" }} /></div>
                <div className="sc-goal-foot"><span>{ko ? "현재 " : "Now "}<b className="mono">{goalView.curLab}</b></span><span className="sc-goal-remain">{goalView.remainLab}</span></div>
              </div>
            ) : (
              <button className="sc-goal-add" onClick={() => openGoalEdit("return", null)}><Lic name="target" size={13} cls="icon-sm" color="currentColor" />{ko ? "목표 설정 (선택)" : "Set a goal (optional)"}</button>
            )}
          </div>
        );
      })()}
      {ex && (ex.fields || []).some((f) => !f.auto) && (() => {
        const fields = (ex.fields || []).filter((f) => !f.auto);
        if (!fields.length) return null;
        return (
          <div className="sc-fields-card">
            <div className="sc-fields-cap">{ko ? "전략 파라미터" : "Parameters"}</div>
            <div className="sc-fields-grid">{fields.map((f) => { const tip = FIELD_TIPS[f.key]; return <div className={"sc-field" + (tip ? " sc-field--tip" : "")} key={f.key}><span className="sc-field-k">{f.label[lang]}</span><span className="sc-field-v mono">{f.type === "Percent" ? String(f.default).replace(/[^0-9.\-]/g, "") + "%" : f.type === "Select" ? locStratVal(f.default, lang) : f.default}</span>{tip && <span className="sc-cap-tip"><span className="sc-tl-tip-h">{f.label[lang]}</span><span className="sc-cap-tipnote">{tip[lang] || tip.ko}</span></span>}</div>; })}</div>
          </div>
        );
      })()}
      {ex && plan.executions && plan.executions.filter((e) => e.side === "buy").length > 0 && (() => {
        const MON: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
        const fills = plan.executions.slice().sort((a, b) => { const pa = (a.date || "").match(/([A-Za-z]{3})\s*(\d+)/), pb = (b.date || "").match(/([A-Za-z]{3})\s*(\d+)/); const va = pa ? MON[pa[1]] * 100 + +pa[2] : 0, vb = pb ? MON[pb[1]] * 100 + +pb[2] : 0; return va - vb; });
        const dstr = (s: string) => { if (!s) return ""; const m = s.match(/([A-Za-z]{3})\s*(\d+)/); return m ? (ko ? `${MON[m[1]] + 1}월 ${m[2]}일` : `${m[1]} ${m[2]}`) : s; };
        let qcum = 0, ccum = 0, bn = 0; const rows: (typeof fills[number] & { n?: number; avg: number; qAfter: number; invAfter: number; sell?: boolean; realized?: number })[] = [];
        fills.forEach((e) => { if (e.side === "buy") { qcum += e.qty; ccum += e.qty * e.price; bn += 1; rows.push({ ...e, n: bn, avg: ccum / qcum, qAfter: qcum, invAfter: ccum }); } else { const avg = qcum > 0 ? ccum / qcum : 0; const realized = e.qty * (e.price - avg); ccum -= e.qty * avg; qcum -= e.qty; rows.push({ ...e, sell: true, avg: qcum > 0 ? ccum / qcum : 0, qAfter: qcum, invAfter: ccum, realized }); } });
        return (
          <div className="sc-tl-card">
            <div className="sc-tl-cap"><span>{ko ? "실행 타임라인" : "Execution timeline"}</span><span className="sc-tl-sub">{ko ? "회차별 매수 · 평단 변화" : "rounds & avg cost"}</span></div>
            {rows.slice().reverse().map((e, i) => (
              <div className="sc-tl-row" key={i}>
                <span className={"sc-tl-dot " + (e.sell ? "sell" : "buy")} />
                <span className="sc-tl-n">{e.sell ? (ko ? "매도" : "Sell") : (plan.divisions ? `${e.n}/${plan.divisions}${ko ? "회" : ""}` : `#${e.n}`)}</span>
                <span className="sc-tl-when">{dstr(e.date)}</span>
                <span className="sc-tl-price mono">{fmtMoney(e.price, plan.cur)}</span>
                <span className="sc-tl-qty mono">{e.qty}{ko ? "주" : ""}</span>
                <span className="sc-tl-avg mono">{ko ? "평단 " : "avg "}{fmtMoney(e.avg, plan.cur)}</span>
                <span className="sc-tl-tip">
                  <span className="sc-tl-tip-h">{e.sell ? (ko ? "매도 체결" : "Sell fill") : (ko ? `${e.n}회차 매수 체결` : `Buy fill #${e.n}`)} · {dstr(e.date)}</span>
                  <span className="sc-tl-tip-row"><span>{ko ? "체결가 × 수량" : "Price × qty"}</span><b className="mono">{fmtMoney(e.price, plan.cur)} × {e.qty}{ko ? "주" : ""}</b></span>
                  <span className="sc-tl-tip-row"><span>{ko ? "체결 후 누적 수량" : "Position after"}</span><b className="mono">{Math.round(e.qAfter).toLocaleString("en-US")}{ko ? "주" : ""}</b></span>
                  <span className="sc-tl-tip-row"><span>{ko ? "체결 후 누적 투입" : "Invested after"}</span><b className="mono">{fmtMoney(e.invAfter, plan.cur)}</b></span>
                  <span className="sc-tl-tip-row"><span>{ko ? "체결 후 평단" : "Avg cost after"}</span><b className="mono">{fmtMoney(e.avg, plan.cur)}</b></span>
                  {e.sell && e.realized != null && <span className="sc-tl-tip-row"><span>{ko ? "실현손익" : "Realized P/L"}</span><b className={"mono " + (e.realized >= 0 ? "pos" : "neg")}>{(e.realized >= 0 ? "+" : "") + fmtMoney(e.realized, plan.cur)}</b></span>}
                </span>
              </div>
            ))}
          </div>
        );
      })()}
      {/* stratDiagram(rules-viz) 블록은 프로토타입에서 정의되지 않은 dead guard라 이식 제외 (spec §45). */}
      {(() => { const live = plan.rules.filter((r) => r.on).map((r) => ({ r, e: evalRuleV2(plan, r, ko) })); const firing = live.filter((x) => x.e.state === "fired"); return (
        <div className="rules-live">
          <div className="rules-live-top"><span className={"rules-live-dot " + (firing.length ? "on" : "")} /><span className="rules-live-h">{ko ? "실시간 규칙 평가" : "Live rule check"}</span><span className="rules-live-sub">{ko ? `현재가 ${fmtMoney(plan.currentPrice, plan.cur)} 기준` : `at ${fmtMoney(plan.currentPrice, plan.cur)}`}</span></div>
          {firing.length > 0 ? <div className="rules-live-msg">{firing.map((x, i) => <span className="rules-live-chip fired" key={i}><Lic name="zap" size={12} cls="icon-sm" color="var(--pos)" />{x.r.name[lang]}</span>)}</div>
            : <div className="rules-live-msg none">{ko ? "지금 발동 중인 규칙이 없습니다 — 모두 조건 대기 중" : "No rules firing right now — all armed"}</div>}
          <div className="rules-live-foot">{ko ? "실제 시세 연동 전이라 플랜의 현재가 데이터로 판정합니다." : "Evaluated on the plan's current-price data (no live feed yet)."}</div>
        </div>
      ); })()}
      {plan.rules.map((r) => { const td = findTrig(r.trig); const ad = r.act ? RULE_ACTS.find((x) => x.id === r.act) : null; const ev = evalRuleV2(plan, r, ko);
        if (ruleEditId === r.id) return <div key={r.id}>{ruleEditor(false)}</div>;
        return (
        <div className="rule-card" key={r.id}>
          <div className="rule-head">
            {/* ✅ 실연결: on/off 토글은 서버 액션 */}
            <span className={"toggle" + (r.on ? " on" : "")} onClick={() => onToggleRule(r.id, !r.on)} />
            <span className="rule-name">{r.name[lang]}</span>
            <span className="fin-term rule-help"><span className="ind-q">?</span><span className="fin-tip"><b>{r.name[lang]}</b><span className="fin-tip-def">{ruleDesc(r)}</span></span></span>
            {r.on && <span className={"rule-state " + ev.state} title={ev.meta}><span className="rule-state-dot" />{RULE_STATE_LABEL[ev.state][lang]}</span>}
            {(() => { const w = ruleWarn(plan, r, ko); return w ? <span className="rule-warn fin-term"><Lic name="alert-triangle" size={12} cls="icon-sm" color="var(--r-paused)" /><span className="fin-tip fin-tip-r"><b>{ko ? "필드 누락" : "Missing field"}</b><span className="fin-tip-def">{w}</span></span></span> : null; })()}
            <span className={"rule-tag " + (r.custom ? "mine" : "strat")}>{r.custom ? (ko ? "내 규칙" : "Custom") : (ko ? "자동" : "Auto")}{!r.custom && r.edited ? " · " + (ko ? "수정" : "edited") : ""}</span>
            <span className="rule-last">{t.lastTriggered}: {locLast(r.last)}</span>
            <span className="rule-edit-actions" style={{ marginLeft: "auto", display: "inline-flex", gap: 4 }}>
              {CORE_TRIG_IDS.has(r.trig || "") && <button className="iconbtn" onClick={() => openRuleEdit(r)} title={ko ? "수정" : "Edit"}><Lic name="pencil" size={12} /></button>}
              {r.custom && <button className="iconbtn" onClick={() => onDeleteRule(r.id)} title={ko ? "삭제" : "Remove"}><Lic name="x" size={12} /></button>}
            </span>
          </div>
          <div className="rule-flow">
            <span className="rule-blk when">{t.when}</span>
            {td ? <Fragment>
              <span className="rule-blk cond">{ko ? td.ko : td.en}</span>
              {td.hasValue && <span className="rule-blk cond rule-valblk"><span className="mono">{r.trigVal ?? ""}</span>{td.unit}</span>}
              <span className="fin-term rule-help"><span className="ind-q">?</span><span className="fin-tip"><b>{ko ? td.ko : td.en}</b><span className="fin-tip-def">{ko ? td.descKo : td.descEn}</span></span></span>
            </Fragment> : <span className="rule-blk cond">{(r.when || {})[lang]}</span>}
            <span className="rule-arrow"><Lic name="arrow-right" size={15} cls="icon-sm" color="var(--fg-4)" /></span>
            <span className="rule-blk then">{t.then}</span>
            {ad ? <Fragment>
              <span className="rule-blk cond">{ko ? ad.ko : ad.en}</span>
              <span className="fin-term rule-help"><span className="ind-q">?</span><span className="fin-tip fin-tip-r"><b>{ko ? ad.ko : ad.en}</b><span className="fin-tip-def">{ko ? ad.descKo : ad.descEn}</span></span></span>
            </Fragment> : <span className="rule-blk cond">{(r.then || {})[lang]}</span>}
          </div>
        </div>
      ); })}
      {!plan.rules.length && <div style={{ padding: "32px 0", textAlign: "center", color: "var(--fg-4)", font: "var(--fw-medium) 13px var(--font-sans)" }}>{lang === "ko" ? "규칙이 없습니다" : "No rules"}</div>}
      {ruleEditId === "new"
        ? ruleEditor(true)
        : <button className="add-row" style={{ marginTop: 6, width: "100%" }} onClick={openRuleNew}><Lic name="plus" size={15} color="var(--fg-4)" />{t.addRule}</button>}
    </div>
  );
}
