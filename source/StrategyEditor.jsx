// StrategyEditor.jsx — Strategy create/edit: Overview / Fields / Rules / Preview

const STRAT_COLORS = ["#4C8DFF", "#BB6BD9", "#4CB782", "#F2994A", "#2D9CDB", "#EB5757", "#F2C94C"];
const STRAT_ICONS = ["repeat-2", "activity", "scale", "trending-up", "target", "layers", "zap"];

const FIELD_TYPE_LABEL = { Number: { en: "Number", ko: "숫자" }, Percent: { en: "Percent", ko: "퍼센트" }, Currency: { en: "Currency", ko: "통화" }, Text: { en: "Text", ko: "텍스트" }, Select: { en: "Select", ko: "선택" }, Date: { en: "Date", ko: "날짜" }, Toggle: { en: "Toggle", ko: "토글" } };

const AUTO_FORMULA = {
  vr_vline: { ko: "목표 가치선 V — 진입 자본의 절반에서 시작해 연 성장률만큼 매일 복리로 커집니다. 평가액을 이 선에 맞춰 덜고 담습니다.", en: "Target value line — starts at half the entry capital and compounds daily by the annual growth rate." },
  loc_price: { ko: "평단가 × (1 − LOC 기준 %). LOC 기준을 바꾸면 자동으로 다시 계산됩니다.", en: "Avg cost × (1 − LOC %)." },
  unit_buy: { ko: "총 투자금 ÷ 분할 수. 1회당 매수 금액입니다.", en: "Capital ÷ divisions." },
  round: { ko: "지금까지 입력된 매수 체결 횟수에서 자동 집계됩니다.", en: "Counted from logged buy fills." },
  avg_cost: { ko: "전체 매수 체결의 가중 평균 단가입니다.", en: "Weighted average of all buy fills." },
  net_debt: { ko: "총차입금 − 현금성자산. 재무제표에서 자동 계산됩니다.", en: "Total debt − cash & equivalents, from the statements." },
  DEBT: { ko: "총부채 ÷ 자기자본 × 100. 재무제표에서 자동 계산됩니다.", en: "Total liabilities ÷ equity × 100, from the statements." },
  FCF: { ko: "영업현금흐름 − 자본적지출(CAPEX). 재무제표에서 자동 계산됩니다.", en: "Operating cash flow − capex." },
};
const autoFormula = (key, lang) => { const f = AUTO_FORMULA[key]; return f ? f[lang] : (lang === "ko" ? "재무제표·체결 데이터에서 자동으로 계산되는 값입니다. 직접 입력하지 않습니다." : "Computed automatically from statement/fill data."); };
const FIELD_DESC = {
  divisions: { ko: "전체 투자금을 몇 번에 나눠 매수할지(분할 횟수)입니다. 무한매수법의 핵심 — 예: 40이면 40회로 나눠 상니다.", en: "How many splits to divide your capital into for buying." },
  loc_pct: { ko: "LOC = 장 마감가(종가)로 자동 매수하는 주문이에요. 이 값은 그 매수 기준선 — 현재가가 이 % 만큼 빠지면 매수 신호가 떠요 (보통 음수, 예: −5%).", en: "LOC = auto-buy at the close. This is the trigger line — buy when price drops this % (usually negative)." },
  unit_buy: { ko: "1회당 매수 금액입니다. 보통 투자금 ÷ 분할 수로 자동 계산됩니다.", en: "Amount to buy per round (capital ÷ splits)." },
  tp_pct: { ko: "익절 기준 수익률 — 평단가 대비 이 % 이상이면 매도(익절) 신호를 냅니다.", en: "Take-profit threshold vs average cost." },
  round: { ko: "현재까지 진행한 매수 회차입니다. 체결이 쌓이면 자동으로 증가합니다.", en: "Current buy round; auto-increments on fills." },
  loc_price: { ko: "‘LOC 기준 %’로 자동 계산된 매수 기준가예요. 직접 못 바꾸고, % 를 바꾸면 따라 움직여요.", en: "Auto-calculated buy price from the 'LOC %'. Read-only — change the %." },
};
const TYPE_DESC = {
  Number: { ko: "숫자 값입니다 (예: 분할 수, 회차).", en: "A plain number." },
  Percent: { ko: "퍼센트 값입니다 (예: −5%, 10%).", en: "A percentage." },
  Currency: { ko: "금액입니다 (표시 통화 기준).", en: "A money amount." },
  Text: { ko: "자유 텍스트입니다.", en: "Free text." },
  Select: { ko: "정해진 보기 중 하나를 고릅니다.", en: "Pick from options." },
};

// Preset rules per strategy (for the editor's Rules + Preview)
const STRAT_RULES = {
  st1: [
    { n: "R1", when: { en: "Price ≤ LOC price", ko: "현재가 ≤ LOC 가격" }, then: { en: "Buy alert + show unit buy", ko: "매수 알림 + 1회 매수금 표시" } },
    { n: "R2", when: { en: "Buy execution added", ko: "매수 체결 입력됨" }, then: { en: "Round +1, recompute avg, new LOC", ko: "회차 +1, 평단가 재계산, 새 LOC 산출" } },
    { n: "R3", when: { en: "Return ≥ take-profit", ko: "수익률 ≥ 익절 기준" }, then: { en: "Alert + propose Closing", ko: "익절 알림 + 상태 → Closing 제안" } },
    { n: "R4", when: { en: "Round = divisions", ko: "회차 = 분할수" }, then: { en: "\"Complete\" badge + wait mode", ko: "\"매수 완료\" 뱃지 + 대기 모드" } },
  ],
  st2: [
    { n: "R1", when: { en: "Entry signal fires", ko: "진입 신호 발생" }, then: { en: "Entry alert", ko: "진입 알림" } },
    { n: "R2", when: { en: "Price ≤ stop line", ko: "현재가 ≤ 손절 라인" }, then: { en: "Stop-loss alert + Closing", ko: "손절 알림 + Closing" } },
    { n: "R3", when: { en: "Drawdown ≥ trailing stop", ko: "고점대비 하락 ≥ 트레일링 스탑" }, then: { en: "Trailing-stop sell alert", ko: "트레일링 스탑 매도 알림" } },
  ],
  st3: [
    { n: "R1", when: { en: "Price ≤ band low", ko: "현재가 ≤ 밴드 하한" }, then: { en: "Buy to target weight", ko: "목표 비중까지 매수" } },
    { n: "R2", when: { en: "Price ≥ band high", ko: "현재가 ≥ 밴드 상한" }, then: { en: "Trim to target weight", ko: "목표 비중까지 매도" } },
    { n: "R3", when: { en: "Rebalance cycle elapsed", ko: "리밸런싱 주기 경과" }, then: { en: "Rebalance reminder", ko: "리밸런싱 알림" } },
  ],
  st4: [
    { n: "R1", when: { en: "Interval reached", ko: "매수 주기 도래" }, then: { en: "Fixed-amount buy alert", ko: "정액 매수 알림" } },
    { n: "R2", when: { en: "Buy execution added", ko: "매수 체결 입력됨" }, then: { en: "Tranche +1, recompute avg", ko: "회차 +1, 평단가 재계산" } },
    { n: "R3", when: { en: "Tranche = total", ko: "회차 = 총 횟수" }, then: { en: "\"Complete\" badge + hold", ko: "\"완료\" 뱃지 + 보유 모드" } },
  ],
  st5: [
    { n: "R1", when: { en: "Interval reached", ko: "점검 주기 도래" }, then: { en: "Recompute target value path", ko: "목표 가치경로 재계산" } },
    { n: "R2", when: { en: "Value < target path", ko: "평가액 < 목표 경로" }, then: { en: "Buy gap to path", ko: "부족분만큼 매수 알림" } },
    { n: "R3", when: { en: "Value > target path", ko: "평가액 > 목표 경로" }, then: { en: "Trim excess to path", ko: "초과분만큼 매도 알림" } },
  ],
  st6: [
    { n: "R1", when: { en: "Price crosses grid down", ko: "현재가 격자 하향 돌파" }, then: { en: "Buy one grid lot", ko: "격자 1칸 매수" } },
    { n: "R2", when: { en: "Price crosses grid up", ko: "현재가 격자 상향 돌파" }, then: { en: "Sell one grid lot", ko: "격자 1칸 매도" } },
    { n: "R3", when: { en: "Price exits range", ko: "현재가 구간 이탈" }, then: { en: "Pause + alert", ko: "그리드 정지 + 알림" } },
  ],
  st7: [
    { n: "R1", when: { en: "Check cycle elapsed", ko: "점검 주기 경과" }, then: { en: "Compute current weight", ko: "현재 비중 산출" } },
    { n: "R2", when: { en: "Drift > band", ko: "이탈 > 허용치" }, then: { en: "Rebalance to target", ko: "목표 비중까지 리밸런싱" } },
  ],
};
// 실행 전략(ex)·프레임워크(fw) 키로 별칭 매핑 (의미 기준)
Object.assign(STRAT_RULES, {
  ex1: STRAT_RULES.st1, ex2: STRAT_RULES.st4, ex3: STRAT_RULES.st5, ex4: STRAT_RULES.st6, ex5: STRAT_RULES.st3, ex6: STRAT_RULES.st7, ex7: STRAT_RULES.st2,
});

const TRIGGER_REF = [
  { cat: { en: "Price", ko: "가격" }, items: [{ l: { en: "Price ≤ / ≥", ko: "현재가 ≤ / ≥" }, d: { ko: "현재 주가가 정한 값 이하(≤)·이상(≥)이 되면 발동해요.", en: "Fires when price is at/below or at/above a value." } }] },
  { cat: { en: "Return", ko: "수익" }, items: [{ l: { en: "Return ≤ / ≥", ko: "수익률 ≤ / ≥" }, d: { ko: "평단가 대비 수익률이 정한 %에 도달하면 발동해요.", en: "Fires when return vs avg cost reaches a %." } }] },
  { cat: { en: "Event", ko: "이벤트" }, items: [{ l: { en: "Execution added", ko: "체결 입력됨" }, d: { ko: "매수·매도 체결이 기록될 때마다 발동해요.", en: "Fires whenever a fill is logged." } }] },
  { cat: { en: "Field", ko: "필드" }, items: [{ l: { en: "Field = / ≥", ko: "Field 값 = / ≥" }, d: { ko: "전략 필드(예: 회차, LOC 가격)의 값이 특정 값과 같거나(=)·이상(≥)이면 발동해요. 예: ‘회차 = 분할수’면 분할 매수를 다 채웠을 때.", en: "Fires when a strategy field's value equals (=) or is at least (≥) a target. e.g. round = divisions." } }] },
  { cat: { en: "Time", ko: "시간" }, items: [{ l: { en: "Elapsed ≥ / daily at", ko: "경과 시간 ≥ / 매일 특정 시각" }, d: { ko: "보유 경과 시간이 일정 이상이거나, 매일 정해진 시각에 발동해요.", en: "Fires after an elapsed time, or daily at a set time." } }] },
];
const ACTION_REF = [
  { en: "Send notification", ko: "알림 보내기", d: { ko: "푸시·인앱 알림을 보냅니다.", en: "Sends a notification." } },
  { en: "Status transition", ko: "상태 전이", d: { ko: "플랜 상태를 바꿉니다 (예: 진행중 → 청산 검토).", en: "Changes the plan status." } },
  { en: "Update field", ko: "Field 업데이트", d: { ko: "전략 필드 값을 바꿉니다 (예: 회차 +1).", en: "Updates a strategy field (e.g. round +1)." } },
  { en: "Recompute field", ko: "Field 재계산", d: { ko: "자동 필드를 다시 계산합니다 (예: 평단가, LOC 가격).", en: "Recomputes auto fields (e.g. avg cost, LOC price)." } },
  { en: "Show badge", ko: "뱃지 표시", d: { ko: "카드에 상태 뱃지를 표시합니다 (예: ‘매수 완료’).", en: "Shows a status badge on the card." } },
];

const METRIC_DEFS = [
  { key: "PER", en: "PER", ko: "PER" }, { key: "PBR", en: "PBR", ko: "PBR" }, { key: "PSR", en: "PSR", ko: "PSR" },
  { key: "EVEB", en: "EV/EBITDA", ko: "EV/EBITDA" }, { key: "ROE", en: "ROE", ko: "ROE" },
  { key: "OPM", en: "Op. margin", ko: "영업이익률" }, { key: "NPM", en: "Net margin", ko: "순이익률" },
  { key: "GPM", en: "Gross margin", ko: "매출총이익률" }, { key: "REVG", en: "Rev. growth", ko: "매출성장률" },
  { key: "DEBT", en: "Debt ratio", ko: "부채비율" }, { key: "DIVY", en: "Div. yield", ko: "배당수익률" },
  { key: "FCF", en: "FCF yield", ko: "FCF 수익률" }, { key: "DCF", en: "DCF value", ko: "DCF 가치" },
];
const metricLabel = (k, lang) => { const m = METRIC_DEFS.find(x => x.key === k); return m ? m[lang] : k; };
const FIELD_PRESETS = [
  { key: "divisions", label: { en: "Divisions", ko: "분할 수" }, type: "Number", default: "40", auto: false },
  { key: "loc_pct", label: { en: "LOC %", ko: "LOC 기준" }, type: "Percent", default: "-5", auto: false },
  { key: "unit_buy", label: { en: "Per-round buy", ko: "1회 매수금" }, type: "Currency", default: "0", auto: true },
  { key: "tp_pct", label: { en: "Take-profit %", ko: "익절 기준" }, type: "Percent", default: "10", auto: false },
  { key: "round", label: { en: "Current round", ko: "현재 회차" }, type: "Number", default: "0", auto: true },
  { key: "loc_price", label: { en: "LOC price", ko: "LOC 가격" }, type: "Currency", default: "0", auto: true },
  { key: "avg_cost", label: { en: "Avg cost", ko: "평단가" }, type: "Currency", default: "0", auto: true },
  { key: "target", label: { en: "Target price", ko: "목표가" }, type: "Currency", default: "0", auto: false },
  { key: "hold_days", label: { en: "Target hold days", ko: "목표 보유일" }, type: "Number", default: "0", auto: false },
];
function StrategyEditor({ strategy, t, lang, plans, onOpenPlan }) {
  const [nav, setNav] = React.useState("overview");
  const [showApplied, setShowApplied] = React.useState(false);
  const [appLimit, setAppLimit] = React.useState(40);
  React.useEffect(() => { setShowApplied(false); setAppLimit(40); }, [strategy.id]);
  const [name, setName] = React.useState(strategy.name[lang]);
  const [desc, setDesc] = React.useState((strategy.desc || { en: "", ko: "" })[lang]);
  const [color, setColor] = React.useState(strategy.color);
  const [icon, setIcon] = React.useState(strategy.icon);
  const [cat, setCat] = React.useState(strategy.cat || "accum");
  const [ruleMode, setRuleMode] = React.useState("gui");
  const [, force] = React.useReducer(x => x + 1, 0);
  const [capital, setCapital] = React.useState(10000000);
  const [slPct, setSlPct] = React.useState(15);
  const [thMkt, setThMkt] = React.useState("common");
  const [rounds, setRounds] = React.useState(40);
  const updateRules = (fn) => { const cur = (STRAT_RULES[strategy.id] || []).slice(); fn(cur); STRAT_RULES[strategy.id] = cur; force(); };
  React.useEffect(() => { setName(strategy.name[lang]); setDesc((strategy.desc || { en: "", ko: "" })[lang]); setColor(strategy.color); setIcon(strategy.icon); setCat(strategy.cat || "accum"); }, [strategy.id, lang]);
  const CAT_DEF = (typeof EXEC_CATS !== "undefined" ? EXEC_CATS.map(c => [c.id, c.label[lang]]) : [["accum", t.cat_accum], ["rebal", t.cat_rebal], ["signal", t.cat_signal]]);
  const FW_CAT_DEF = [["multiple", lang === "ko" ? "\uba40\ud2f0\ud50c" : "Multiple"], ["intrinsic", lang === "ko" ? "\ub0b4\uc7ac\uac00\uce58" : "Intrinsic"], ["asset", lang === "ko" ? "\uc790\uc0b0" : "Asset"]];
  const catOptions = (strategy.model ? FW_CAT_DEF : CAT_DEF);
  const CAT_ICON = { accum: "layers", rebal: "scale", signal: "radio", multiple: "x", intrinsic: "git-commit-horizontal", asset: "boxes" };
  const rules = STRAT_RULES[strategy.id] || [];
  const reqFields = strategy.fields.filter(f => !f.auto);
  const optFields = strategy.fields.filter(f => f.auto);
  const appliedPlans = (plans || PLANS).filter(p => (p.strategyId === strategy.id || p.execId === strategy.id) && p.status === "active");
  const appliedCount = appliedPlans.length;
  const isFw = !!strategy.model;
  const FW_MODEL_LABEL = { PER: "PER", PBR: "PBR", PSR: "PSR", EV: "EV/EBITDA", DCF: "DCF", DDM: "DDM" };

  return (
    <div className="se-wrap">
      <div className="se-nav">
        <div className="se-nav-cap">{t.editStrategy}</div>
        {[["overview", "info", t.overview], ["fields", "table-properties", t.fields], ["rules", isFw ? "gauge" : "zap", isFw ? (lang === "ko" ? "등급 룰" : "Grade rules") : t.rulesNav], ["preview", "eye", t.preview]].map(([k, ic, lab]) => (
          <div key={k} className={"se-nav-item" + (nav === k ? " active" : "")} onClick={() => setNav(k)}>
            <Lic name={ic} size={15} cls="icon-sm" color="inherit" /><span>{lab}</span>
          </div>
        ))}
      </div>
      <div className={"se-body" + (LIBRARY_LOCKED ? " se-readonly" : "")}>
        <div className="se-inner">
          {LIBRARY_LOCKED && <div className="se-lockbar"><Lic name="lock" size={13} cls="icon-sm" color="var(--fg-4)" />{lang === "ko" ? "읽기 전용 · 전략·관점은 고정된 카탈로그입니다 (수익화·API 연동 후 편집 가능)" : "Read-only — strategies & frameworks are a fixed catalog (editable after API integration)"}</div>}
          {nav === "overview" && <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
              <span className="st-badge" style={{ width: 38, height: 38, borderRadius: 9, background: "color-mix(in srgb," + color + " 18%, transparent)" }}><Lic name={icon} size={20} color={color} /></span>
              <div style={{ flex: 1, minWidth: 0 }}><h2 className="se-h" style={{ marginBottom: 2 }}>{name}</h2><p className="se-sub" style={{ margin: 0 }}>{strategy.isPreset ? (lang === "ko" ? "빌트인 프리셋" : "Built-in preset") : (lang === "ko" ? "커스텀 전략" : "Custom strategy")}</p></div>
            </div>
            <div className="form-row"><label className="form-label">{t.stratName}</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="form-row"><label className="form-label">{t.stratDesc}</label><textarea className="form-input form-textarea" value={desc} onChange={e => setDesc(e.target.value)} /></div>
            <div className="form-row"><label className="form-label">{t.stratCat}</label>
              <div className="cat-pills">
                {catOptions.map(([v, lab]) => <span key={v} className={"cat-pill" + (cat === v ? " on" : "")} style={cat === v ? { color: color, borderColor: color, background: "color-mix(in srgb, " + color + " 12%, transparent)" } : null} onClick={() => { setCat(v); strategy.cat = v; }}>{lab}</span>)}
                {!strategy.model && <span className="cat-pill cat-pill-add" onClick={() => { const nv = window.prompt(lang === "ko" ? "\uc0c8 \uce74\ud14c\uace0\ub9ac \uc774\ub984" : "New category name"); if (nv && nv.trim()) { setCat(nv.trim()); strategy.cat = nv.trim(); } }}><Lic name="plus" size={12} color="currentColor" />{t.newCat}</span>}
              </div>
            </div>
            <div className="form-row"><label className="form-label">{t.themeColor}</label>
              <div className="color-swatches">{STRAT_COLORS.map(c => <span key={c} className={"color-sw" + (color === c ? " on" : "")} style={{ background: c }} onClick={() => setColor(c)} />)}</div>
            </div>
            <div className="form-row"><label className="form-label">{t.icon}</label>
              <div className="icon-swatches">{STRAT_ICONS.map(ic => <span key={ic} className={"icon-sw" + (icon === ic ? " on" : "")} onClick={() => setIcon(ic)}><Lic name={ic} size={17} color="inherit" /></span>)}</div>
            </div>
          </>}

          {nav === "fields" && <>
            <h2 className="se-h">{t.fields}</h2>
            <p className="se-sub">{lang === "ko" ? (isFw ? "이 관점이 평가에 사용하는 지표·입력 값입니다." : "이 전략이 요구하는 Field 세트입니다. 드래그로 순서를 바꿀 수 있습니다.") : (isFw ? "Metrics and inputs this framework evaluates with." : "The field schema this strategy requires. Drag to reorder.")}</p>
            {strategy.fields.map(f => (
              <div className="fielddef" key={f.key}>
                <span className="fd-drag"><Lic name="grip-vertical" size={15} cls="icon-sm" color="inherit" /></span>
                <span className="fd-main"><MiniDropdown width={210} trigger={<span className="fd-label fd-label-pick">{f.label[lang]}<Lic name="chevron-down" size={10} cls="icon-sm" color="var(--fg-4)" /></span>} items={FIELD_PRESETS.map(p => ({ value: p.key, label: p.label[lang], on: f.key === p.key }))} onPick={(v) => { const p = FIELD_PRESETS.find(x => x.key === v); if (!p) return; f.key = p.key; f.label = { ...p.label }; f.type = p.type; f.default = p.default; f.auto = p.auto; force(); }} /> <span className="fd-key">{`{${f.key}}`}</span><span className="fin-term fd-help"><span className="ind-q">?</span><span className="fin-tip"><b>{f.label[lang]}</b><span className="fin-tip-def">{(FIELD_DESC[f.key] || {})[lang] || (lang === "ko" ? "이 전략이 사용하는 값입니다." : "A value this strategy uses.")}</span></span></span></span>
                <MiniDropdown width={130} trigger={<span className="fd-type fd-type-pick">{FIELD_TYPE_LABEL[f.type][lang]}<Lic name="chevron-down" size={10} cls="icon-sm" color="var(--fg-4)" /></span>} items={Object.keys(FIELD_TYPE_LABEL).map(ty => ({ value: ty, label: FIELD_TYPE_LABEL[ty][lang], on: f.type === ty }))} onPick={(v) => { f.type = v; force(); }} />
                <span className="fd-default">{(f.type === "Number" || f.type === "Currency" || f.type === "Percent") ? (
                  <span className="fd-valrow">
                    <MiniDropdown width={120} trigger={<span className="fd-mode">{f.auto ? (lang === "ko" ? "자동" : "Auto") : (lang === "ko" ? "수동" : "Manual")}<Lic name="chevron-down" size={10} cls="icon-sm" color="var(--fg-4)" /></span>} items={[{ value: "manual", label: lang === "ko" ? "수동 입력" : "Manual", on: !f.auto }, { value: "auto", label: lang === "ko" ? "자동 계산" : "Auto-computed", on: !!f.auto }]} onPick={(v) => { f.auto = v === "auto"; if (f.auto) f.default = "auto"; else if (f.default === "auto" || f.default == null) f.default = "0"; force(); }} />
                    {f.auto ? <span className="fl-auto fin-term">auto<span className="ind-q" style={{ marginLeft: 3 }}>?</span><span className="fin-tip fin-tip-r"><b>{lang === "ko" ? "자동 계산" : "Auto-computed"}</b><span className="fin-tip-def">{autoFormula(f.key, lang)}</span></span></span> : f.type === "Percent" ? <span className="fd-pct-wrap"><input className="fd-def-inp mono" value={String(f.default).replace(/[^0-9.\-]/g, "")} onChange={e => { f.default = e.target.value.replace(/[^0-9.\-]/g, ""); force(); }} /><span className="fd-pct-suffix">%</span></span> : <input className="fd-def-inp mono" value={f.default} onChange={e => { f.default = e.target.value; force(); }} />}
                  </span>
                ) : (f.type === "Select" && f.options && f.options.length) ? <MiniDropdown width={150} trigger={<span className="fd-type fd-type-pick">{(f.options.find(o => o.en === f.default) || { [lang]: f.default })[lang]}<Lic name="chevron-down" size={10} cls="icon-sm" color="var(--fg-4)" /></span>} items={f.options.map(o => ({ value: o.en, label: o[lang], on: o.en === f.default }))} onPick={(v) => { f.default = v; force(); }} /> : <input className="fd-def-inp mono" value={f.default} onChange={e => { f.default = e.target.value; force(); }} />}</span>
                <button className="iconbtn fd-del" title={t.delete} onClick={() => { strategy.fields = strategy.fields.filter(x => x.key !== f.key); force(); }}><Lic name="x" size={14} cls="icon-sm" color="currentColor" /></button>
              </div>
            ))}
            <MiniDropdown width={230} trigger={<span className="add-row" style={{ marginTop: 4, width: "100%", cursor: "pointer" }}><Lic name="plus" size={15} color="var(--fg-4)" />{t.addField}</span>} items={isFw
              ? [...METRIC_DEFS.filter(m => !strategy.fields.some(f => f.key === m.key)).map(m => ({ value: "m:" + m.key, label: m[lang], icon: <span className="fd-pre-type">{lang === "ko" ? "지표" : "Metric"}</span> })), { value: "__custom", label: lang === "ko" ? "직접 만들기 (빈 필드)" : "Custom (blank)", icon: <Lic name="pencil" size={13} cls="icon-sm" color="var(--fg-4)" /> }]
              : [...FIELD_PRESETS.filter(p => !strategy.fields.some(f => f.key === p.key)).map(p => ({ value: p.key, label: p.label[lang], icon: <span className="fd-pre-type">{FIELD_TYPE_LABEL[p.type][lang]}</span> })), { value: "__custom", label: lang === "ko" ? "직접 만들기 (빈 필드)" : "Custom (blank)", icon: <Lic name="pencil" size={13} cls="icon-sm" color="var(--fg-4)" /> }]
            } onPick={(v) => { let nf; if (v === "__custom") { nf = { key: "f_" + Date.now().toString(36).slice(-4), label: { en: "New field", ko: "새 필드" }, type: "Number", default: "0", auto: false }; } else if (v.startsWith("m:")) { const mk = v.slice(2); const m = METRIC_DEFS.find(x => x.key === mk); nf = { key: mk, label: { en: m.en, ko: m.ko }, type: "Number", default: "0", auto: false }; } else { const p = FIELD_PRESETS.find(x => x.key === v); nf = { key: p.key, label: { ...p.label }, type: p.type, default: p.default, auto: p.auto }; } strategy.fields = [...strategy.fields, nf]; force(); }} />
          </>}

          {nav === "rules" && isFw && <>
            <h2 className="se-h">{lang === "ko" ? "등급 룰" : "Grade rules"}</h2>
            <p className="se-sub">{lang === "ko" ? "이 관점이 종목을 우수/보통/주의로 채점하는 기준입니다. 투자지표 탭이 이 임계값으로 등급을 매깁니다." : "Thresholds this framework uses to grade a security. The Metrics tab grades by these."}</p>
            {(() => {
              const thBase = (typeof IND_THRESH !== "undefined") ? IND_THRESH : {};
              if (!strategy.thresholds) strategy.thresholds = {};
              if (!strategy.marketTh) strategy.marketTh = { KR: {}, US: {} };
              const rows = strategy.gradeFocus || [];
              const unit = k => ["PER","PBR","PSR","EVEB","PEG","PCR"].includes(k) ? (lang === "ko" ? "배" : "×") : "%";
              const mkt = thMkt; // "common" | "KR" | "US"
              const common = k => strategy.thresholds[k] || thBase[k] || { dir: "high", good: 0, warn: 0 };
              const get = k => mkt === "common" ? common(k) : { ...common(k), ...(strategy.marketTh[mkt][k] || {}) };
              const set = (k, patch) => { if (mkt === "common") { strategy.thresholds[k] = { ...common(k), ...patch }; } else { strategy.marketTh[mkt][k] = { ...get(k), ...patch }; } force(); };
              const overridden = k => mkt !== "common" && strategy.marketTh[mkt][k] && (strategy.marketTh[mkt][k].good != null || strategy.marketTh[mkt][k].warn != null || strategy.marketTh[mkt][k].dir != null);
              return <>
                <div className="seg-toggle" style={{ marginBottom: 14 }}>
                  {[["common", lang === "ko" ? "공통" : "Common"], ["KR", lang === "ko" ? "한국" : "Korea"], ["US", lang === "ko" ? "미국" : "US"]].map(([v, l]) => <div key={v} className={"st" + (thMkt === v ? " active" : "")} onClick={() => setThMkt(v)}>{l}</div>)}
                </div>
                {mkt !== "common" && <p className="se-sub" style={{ color: "var(--fg-4)", marginTop: -6 }}>{lang === "ko" ? "이 시장 종목에만 적용되는 임계값입니다. 미설정 항목은 공통값을 따릅니다." : "Applies only to this market; unset rows inherit Common."}</p>}
                {rows.map((k) => { const th = get(k); return (
                  <div className="gr-row" key={k}>
                    <span className="gr-metric">{metricLabel(k, lang)}{overridden(k) && <span className="gr-ovr">●</span>}</span>
                    <MiniDropdown width={150} trigger={<span className="gr-dir">{th.dir === "low" ? (lang === "ko" ? "낮을수록 좋음" : "Lower better") : (lang === "ko" ? "높을수록 좋음" : "Higher better")}<Lic name="chevron-down" size={10} cls="icon-sm" color="var(--fg-4)" /></span>}
                      items={[{ value: "high", label: lang === "ko" ? "높을수록 좋음" : "Higher better", on: th.dir === "high" }, { value: "low", label: lang === "ko" ? "낮을수록 좋음" : "Lower better", on: th.dir === "low" }]} onPick={(v) => set(k, { dir: v })} />
                    <span className="gr-th"><label className="gr-th-lab gr-good">{lang === "ko" ? "우수" : "Good"}</label><input className="gr-inp mono" value={th.good} onChange={e => set(k, { good: e.target.value.replace(/[^0-9.\-]/g, "") })} /><span className="gr-unit">{unit(k)}</span></span>
                    <span className="gr-th"><label className="gr-th-lab gr-warn">{lang === "ko" ? "주의" : "Watch"}</label><input className="gr-inp mono" value={th.warn} onChange={e => set(k, { warn: e.target.value.replace(/[^0-9.\-]/g, "") })} /><span className="gr-unit">{unit(k)}</span></span>
                    <button className="iconbtn fd-del" title={t.delete} onClick={() => { strategy.gradeFocus = rows.filter(x => x !== k); force(); }}><Lic name="x" size={14} cls="icon-sm" color="currentColor" /></button>
                  </div>
                ); })}
                {!rows.length && <p className="se-sub" style={{ color: "var(--fg-4)" }}>{lang === "ko" ? "지정된 등급 지표가 없습니다." : "No grade metrics set."}</p>}
                <MiniDropdown width={200} trigger={<span className="add-row" style={{ marginTop: 8, width: "100%", cursor: "pointer" }}><Lic name="plus" size={15} color="var(--fg-4)" />{lang === "ko" ? "등급 지표 추가" : "Add grade metric"}</span>} items={METRIC_DEFS.filter(m => !rows.includes(m.key)).map(m => ({ value: m.key, label: m[lang] }))} onPick={(v) => { strategy.gradeFocus = [...rows, v]; if (!strategy.thresholds[v] && thBase[v]) strategy.thresholds[v] = { ...thBase[v] }; force(); }} />
                <div className="ab-note" style={{ marginTop: 14, display: "flex", gap: 10, padding: "11px 13px", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}><Lic name="info" size={15} cls="icon-sm" color="var(--fg-4)" /><span className="se-sub" style={{ margin: 0 }}>{lang === "ko" ? "투자지표 탭이 종목 시장(한국/미국)에 맞는 임계값으로 채점합니다. 데이터가 없는 지표는 채점에서 제외됩니다." : "The Metrics tab grades by the security's market profile. Metrics without data are excluded."}</span></div>
              </>;
            })()}
          </>}
          {nav === "rules" && !isFw && <>
            <h2 className="se-h">{t.rulesNav}</h2>
            <p className="se-sub">{lang === "ko" ? "조건 → 액션 자동화 규칙입니다." : "WHEN → THEN automation rules."}</p>
            <div className="rb-modebar">
              <div className={"rb-mode" + (ruleMode === "gui" ? " on" : "")} onClick={() => setRuleMode("gui")}>{t.guiMode}</div>
              <div className={"rb-mode" + (ruleMode === "expr" ? " on" : "")} onClick={() => setRuleMode("expr")}>{t.exprMode}</div>
            </div>
            {ruleMode === "gui" ? <>
              {rules.map((r, i) => (
                <div className="rb-card" key={i}>
                  <button className="rule-del rb-del" title={t.delete} onClick={() => updateRules(rs => rs.splice(i, 1))}><Lic name="x" size={13} color="currentColor" /></button>
                  <div className="rb-block-row">
                    <span className="rb-tag when">{t.when}</span>
                    <MiniDropdown width={210} trigger={<span className="rb-select">{r.when[lang]}<span className="chev"><Lic name="chevron-down" size={12} cls="icon-sm" color="inherit" /></span></span>} items={TRIGGER_REF.map(g => ({ value: g.items[0].l.en, label: g.items[0].l[lang], on: r.when.en === g.items[0].l.en }))} onPick={(v) => updateRules(rs => { const it = TRIGGER_REF.find(g => g.items[0].l.en === v); rs[i] = { ...rs[i], when: { en: it.items[0].l.en, ko: it.items[0].l.ko } }; })} />
                  </div>
                  <div className="rb-block-row">
                    <span className="rb-tag then">{t.then}</span>
                    <MiniDropdown width={180} trigger={<span className="rb-select">{r.then[lang]}<span className="chev"><Lic name="chevron-down" size={12} cls="icon-sm" color="inherit" /></span></span>} items={ACTION_REF.map(a => ({ value: a.en, label: a[lang], on: r.then.en === a.en }))} onPick={(v) => updateRules(rs => { const a = ACTION_REF.find(x => x.en === v); rs[i] = { ...rs[i], then: { en: a.en, ko: a.ko } }; })} />
                  </div>
                </div>
              ))}
              <button className="add-row" style={{ width: "100%" }} onClick={() => updateRules(rs => rs.push({ when: { en: TRIGGER_REF[0].items[0].l.en, ko: TRIGGER_REF[0].items[0].l.ko }, then: { en: ACTION_REF[0].en, ko: ACTION_REF[0].ko } }))}><Lic name="plus" size={15} color="var(--fg-4)" />{t.addRule}</button>
            </> : <>
              <div className="rb-expr" dangerouslySetInnerHTML={{ __html: rules.map(r =>
                `<span class="tok-kw">when</span> <span class="tok-field">{price}</span> <span class="tok-kw">&le;</span> <span class="tok-field">{loc_price}</span> <span class="tok-kw">then</span> <span class="tok-fn">notify</span>(<span class="tok-num">"buy"</span>)`
              ).join("<br>") }} />
            </>}
            <div className="rb-ref">
              <div className="rb-ref-panel">
                <div className="rb-ref-h">{t.availTriggers}</div>
                {TRIGGER_REF.map((g, i) => <div className="rb-ref-item fin-term" key={i}><Lic name="circle-dot" size={13} cls="icon-sm" color="var(--accent)" /><span>{g.items[0].l[lang]}</span><span className="mono">{g.cat[lang]}</span><span className="fin-tip"><b>{g.items[0].l[lang]}</b><span className="fin-tip-def">{(g.items[0].d || {})[lang] || ""}</span></span></div>)}
              </div>
              <div className="rb-ref-panel">
                <div className="rb-ref-h">{t.availActions}</div>
                {ACTION_REF.map((a, i) => <div className="rb-ref-item fin-term" key={i}><Lic name="zap" size={13} cls="icon-sm" color="var(--r-bull)" /><span>{a[lang]}</span><span className="fin-tip"><b>{a[lang]}</b><span className="fin-tip-def">{(a.d || {})[lang] || ""}</span></span></div>)}
              </div>
            </div>
          </>}

          {nav === "preview" && <>
            <h2 className="se-h">{t.preview}</h2>
            <p className="se-sub">{lang === "ko" ? (isFw ? "이 관점이 종목을 평가하는 방식입니다." : "이 전략을 플랜에 적용할 때의 시뮬레이션입니다.") : (isFw ? "How this framework evaluates a security." : "Simulation of applying this strategy to a plan.")}</p>
            {isFw ? (() => {
              const ko = lang === "ko";
              const focus = strategy.gradeFocus || [];
              return <div className="prev-card"><div className="prev-card-h">{ko ? "한 줄 정의" : "In one line"}</div><div style={{ font: "var(--fw-medium) 13.5px var(--font-sans)", lineHeight: 1.6, color: "var(--fg-2)" }}>{ko ? "주요 모델 " : "Uses "}<b style={{ color: "var(--fg)" }}>{(FW_MODEL_LABEL[strategy.model] || strategy.model)}</b>{ko ? "을 기준으로, " : " as the lens, grading "}{focus.length ? <b style={{ color: "var(--fg)" }}>{focus.join(", ")}</b> : <span style={{ color: "var(--fg-4)" }}>{ko ? "핵심 지표" : "key metrics"}</span>}{ko ? " 지표를 우수·보통·주의로 채점합니다." : " as good/fair/watch."}</div></div>;
            })() : (() => {
              const ko = lang === "ko";
              const nf = (k, d) => { const f = strategy.fields.find(x => x.key === k); const n = f ? parseFloat(String(f.default).replace(/[^0-9.-]/g, "")) : NaN; return isNaN(n) ? d : n; };
              const wrap = (body) => <div className="prev-card"><div className="prev-card-h">{ko ? "한 줄 정의" : "In one line"}</div><div style={{ font: "var(--fw-medium) 13.5px var(--font-sans)", lineHeight: 1.6, color: "var(--fg-2)" }}>{body}</div></div>;
              if (strategy.fields.some(f => f.key === "divisions")) {
                const dv = Math.round(nf("divisions", 40)), lp = Math.abs(nf("loc_pct", -5)), tp = nf("tp_pct", 10);
                const steps = Math.min(Math.max(dv, 2), 6);
                const W = 320, H = 132, padL = 14, padR = 14, padT = 16, padB = 26;
                const iw = W - padL - padR, ih = H - padT - padB;
                const pts = []; for (let i = 0; i < steps; i++) { const x = padL + (steps === 1 ? 0 : i / (steps - 1) * iw); const y = padT + (steps === 1 ? 0 : i / (steps - 1) * ih); pts.push([x, y]); }
                const stepPath = pts.map((p, i) => { if (i === 0) return `M ${p[0]} ${p[1]}`; const prev = pts[i - 1]; return `L ${prev[0]} ${p[1]} L ${p[0]} ${p[1]}`; }).join(" ");
                const avgY = padT + ih * 0.52, tpY = padT + ih * 0.2;
                const diagram = (
                  <div className="prev-card stratviz">
                    <div className="prev-card-h">{ko ? "작동 원리" : "How it works"}</div>
                    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
                      <line x1={padL} x2={W - padR} y1={tpY} y2={tpY} stroke="var(--pos)" strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
                      <text x={W - padR} y={tpY - 5} textAnchor="end" style={{ fill: "var(--pos)", font: "var(--fw-semi) 9.5px var(--font-sans)" }}>{ko ? `익절 +${tp}%` : `TP +${tp}%`}</text>
                      <line x1={padL} x2={W - padR} y1={avgY} y2={avgY} stroke="var(--fg-3)" strokeWidth="1" strokeDasharray="3 3" />
                      <text x={W - padR} y={avgY - 5} textAnchor="end" style={{ fill: "var(--fg-3)", font: "var(--fw-semi) 9.5px var(--font-sans)" }}>{ko ? "평단가 ↓" : "Avg ↓"}</text>
                      <path d={stepPath} fill="none" stroke="var(--fg-4)" strokeWidth="1.5" strokeLinejoin="round" />
                      {pts.map((p, i) => <g key={i}><circle cx={p[0]} cy={p[1]} r="4.5" fill="var(--r-active, #4C8DFF)" stroke="var(--bg-app)" strokeWidth="1.5" /></g>)}
                      {pts.length > 1 && <text x={(pts[0][0] + pts[1][0]) / 2} y={pts[1][1] + 14} textAnchor="middle" style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 9px var(--font-mono)" }}>{`-${lp}%`}</text>}
                    </svg>
                    <div className="stratviz-cap">{ko ? `가격이 ` : `Each `}<b style={{ color: "var(--fg-2)" }}>{`-${lp}%`}</b>{ko ? ` 빠질 때마다 파란 점에서 한 번씩 분할 매수 → 살수록 평단가가 내려가고, 평단 +${tp}%에 닿으면 익절 알림.` : ` dip → buy once (blue dots); avg cost drops; alert at +${tp}% over avg.`}</div>
                  </div>
                );
                return <React.Fragment>{wrap(<React.Fragment>{ko ? "현재가가 " : "Buy on each "}<b style={{ color: "var(--fg)" }}>{"-" + lp + "%"}</b>{ko ? " 빠질 때마다 " : " dip, "}<b style={{ color: "var(--fg)" }}>{dv + (ko ? "회" : "x")}</b>{ko ? "로 분할 매수하고, 평단 대비 " : " splits; profit at "}<b style={{ color: "var(--pos)" }}>{"+" + tp + "%"}</b>{ko ? "에서 익절합니다." : " over avg."}</React.Fragment>)}{diagram}</React.Fragment>;
              }
              const has = k => strategy.fields.some(f => f.key === k);
              const hl = (s) => <b style={{ color: "var(--fg)" }}>{s}</b>;
              const txt = k => { const f = strategy.fields.find(x => x.key === k); return f ? String(f.default).trim() : ""; };
              const cyc = (v, k2) => k2 ? ({ Weekly: "매주", Daily: "매일", Monthly: "매월", Biweekly: "격주", Quarterly: "분기마다", Yearly: "매년" }[v] || v) : v;
              const vizWrap = (children, cap) => <div className="prev-card stratviz"><div className="prev-card-h">{ko ? "작동 원리" : "How it works"}</div><svg viewBox="0 0 320 132" style={{ width: "100%", height: "auto", display: "block" }}>{children}</svg><div className="stratviz-cap">{cap}</div></div>;
              const BUY = "var(--r-active, #4C8DFF)", SELL = "var(--pos)";
              const fr = (defn, diag) => <React.Fragment>{wrap(defn)}{diag}</React.Fragment>;
              if (has("amount") && has("interval")) {
                const xs = [30, 78, 126, 174, 222, 270];
                const diag = vizWrap(<g>
                  <line x1="14" x2="306" y1="80" y2="80" stroke="var(--border-strong)" strokeWidth="1" />
                  {xs.map((x, i) => <g key={i}><line x1={x} x2={x} y1="80" y2={80 - 26} stroke="var(--fg-4)" strokeWidth="1" /><circle cx={x} cy={80 - 26} r="4.5" fill={BUY} stroke="var(--bg-app)" strokeWidth="1.5" /></g>)}
                  <text x="160" y="104" textAnchor="middle" style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 9.5px var(--font-sans)" }}>{ko ? "→ 시간 (정해진 주기)" : "→ time (fixed cycle)"}</text>
                </g>, <React.Fragment>{ko ? "주가와 무관하게 " : ""}<b style={{ color: "var(--fg-2)" }}>{cyc(txt("interval"), ko)}</b>{ko ? " 똑같은 금액을 기계적으로 매수 → 고점·저점 평균에 자연스럽게 분산됩니다." : " buy the same amount each cycle, averaging across highs and lows."}</React.Fragment>);
                return fr(<React.Fragment>{hl(cyc(txt("interval"), ko))}{ko ? " 일정 금액을 꼬박꼬박 매수해 평단가를 낮추고 매수 시점을 분산합니다." : " buy a fixed amount to lower your average cost and spread out timing."}</React.Fragment>, diag);
              }
              if (has("target_path")) {
                const diag = vizWrap(<g>
                  <line x1="20" y1="96" x2="300" y2="34" stroke="var(--fg-3)" strokeWidth="1.5" strokeDasharray="4 3" />
                  <text x="300" y="28" textAnchor="end" style={{ fill: "var(--fg-3)", font: "var(--fw-semi) 9.5px var(--font-sans)" }}>{ko ? "목표 경로" : "Target path"}</text>
                  <path d="M20 100 Q 80 118 120 96 T 220 70 T 300 50" fill="none" stroke="var(--fg)" strokeWidth="1.8" />
                  <circle cx="120" cy="96" r="4.5" fill={BUY} stroke="var(--bg-app)" strokeWidth="1.5" /><text x="120" y="114" textAnchor="middle" style={{ fill: BUY, font: "var(--fw-semi) 8.5px var(--font-sans)" }}>{ko ? "더 매수" : "buy+"}</text>
                  <circle cx="220" cy="70" r="4.5" fill={SELL} stroke="var(--bg-app)" strokeWidth="1.5" /><text x="220" y="62" textAnchor="middle" style={{ fill: SELL, font: "var(--fw-semi) 8.5px var(--font-sans)" }}>{ko ? "덜 매수" : "buy−"}</text>
                </g>, <React.Fragment>{ko ? "실제 자산이 " : ""}<b style={{ color: "var(--fg-2)" }}>{ko ? "목표 경로" : "the target path"}</b>{ko ? "보다 아래면 더 사고, 위면 덜 사서 정해진 성장 곡선을 따라가게 맞춥니다." : " — buy more below it, less above."}</React.Fragment>);
                return fr(<React.Fragment>{ko ? "자산이 " : "Keep assets on a "}{hl(ko ? "목표 성장 경로" : "target growth path")}{ko ? "를 따라가도록, 경로보다 모자라면 더 사고 앞서면 덜 삽니다." : " — buy more when behind, less when ahead."}</React.Fragment>, diag);
              }
              if (has("upper") && has("lower")) {
                const gl = [40, 58, 76, 94]; 
                const diag = vizWrap(<g>
                  {gl.map((y, i) => <line key={i} x1="40" x2="280" y1={y} y2={y} stroke="var(--border)" strokeWidth="1" />)}
                  <text x="286" y="44" style={{ fill: SELL, font: "var(--fw-semi) 9px var(--font-sans)" }}>{ko ? "상단" : "high"}</text>
                  <text x="286" y="98" style={{ fill: BUY, font: "var(--fw-semi) 9px var(--font-sans)" }}>{ko ? "하단" : "low"}</text>
                  <path d="M40 94 L 90 76 L 140 94 L 190 58 L 240 76 L 280 40" fill="none" stroke="var(--fg)" strokeWidth="1.6" />
                  <circle cx="90" cy="76" r="4" fill={BUY} stroke="var(--bg-app)" strokeWidth="1.5" /><circle cx="140" cy="94" r="4" fill={BUY} stroke="var(--bg-app)" strokeWidth="1.5" />
                  <circle cx="190" cy="58" r="4" fill={SELL} stroke="var(--bg-app)" strokeWidth="1.5" /><circle cx="280" cy="40" r="4" fill={SELL} stroke="var(--bg-app)" strokeWidth="1.5" />
                  <text x="160" y="118" textAnchor="middle" style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 9px var(--font-sans)" }}>{ko ? "한 칸 ↓ 매수 · 한 칸 ↑ 매도" : "step down buy · step up sell"}</text>
                </g>, <React.Fragment>{ko ? "가격 구간을 여러 칸으로 나눠 " : ""}<b style={{ color: BUY }}>{ko ? "한 칸 내리면 사고" : "buy on a step down"}</b>{ko ? " " : ", "}<b style={{ color: SELL }}>{ko ? "한 칸 오르면 팔아" : "sell on a step up"}</b>{ko ? " 잔잔한 등락에서 차익을 쌓습니다." : "."}</React.Fragment>);
                return fr(<React.Fragment>{hl(nf("lower", 0).toLocaleString("en-US"))}{ko ? " ~ " : " – "}{hl(nf("upper", 0).toLocaleString("en-US"))}{ko ? " 가격 구간을 " : " price band into "}{hl(Math.round(nf("grids", 20)) + (ko ? "칸" : ""))}{ko ? "으로 잘게 나눠, 가격이 한 칸 내리면 사고 한 칸 오르면 팔아 자잘한 등락에서 수익을 냅니다." : " steps; buy a step down, sell a step up."}</React.Fragment>, diag);
              }
              if (has("vr_vline")) {
                const up = Math.abs(nf("vr_upper", 15)), lo = Math.abs(nf("vr_lower", 15)), gr = nf("vr_growth", 15), pool = Math.abs(nf("vr_pool", 25));
                const diag = vizWrap(<g>
                  <line x1="24" y1="92" x2="296" y2="44" stroke="var(--accent)" strokeWidth="1.8" />
                  <text x="24" y="22" textAnchor="start" style={{ fill: "var(--accent)", font: "var(--fw-semi) 9px var(--font-sans)" }}>{ko ? `가치선 V (연 +${gr}%)` : `V (+${gr}%/yr)`}</text>
                  <line x1="24" y1="78" x2="296" y2="30" stroke={SELL} strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
                  <line x1="24" y1="106" x2="296" y2="58" stroke={BUY} strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
                  <path d="M24 96 Q 70 70 110 84 T 190 66 Q 230 40 270 64 L 296 50" fill="none" stroke="var(--fg)" strokeWidth="1.6" />
                  <circle cx="110" cy="84" r="4.5" fill={BUY} stroke="var(--bg-app)" strokeWidth="1.5" /><text x="110" y="100" textAnchor="middle" style={{ fill: BUY, font: "var(--fw-semi) 8.5px var(--font-sans)" }}>{ko ? "매수" : "buy"}</text>
                  <circle cx="230" cy="40" r="4.5" fill={SELL} stroke="var(--bg-app)" strokeWidth="1.5" /><text x="230" y="34" textAnchor="middle" style={{ fill: SELL, font: "var(--fw-semi) 8.5px var(--font-sans)" }}>{ko ? "매도" : "sell"}</text>
                </g>, <React.Fragment>{ko ? "평가액이 매년 " : "A value line growing "}<b style={{ color: "var(--accent)" }}>{ko ? `${gr}% 커지는 가치선` : `${gr}%/yr`}</b>{ko ? `을 따라가도록 — 상단(+${up}%) 넘으면 매도, 하단(−${lo}%) 이탈하면 현금풀(한도 ${pool}%)로 매수합니다.` : ` — trim above +${up}%, add below −${lo}% via the cash pool.`}</React.Fragment>);
                return fr(<React.Fragment>{ko ? "매년 " : "Track a value line growing "}{hl((ko ? `${gr}% 성장하는 목표 가치선` : `${gr}%/yr`))}{ko ? "를 따라 — 상단을 넘으면 매도, 하단을 이탈하면 매수해 평가액을 맞춥니다." : "; trim/add at the bands using a cash pool."}</React.Fragment>, diag);
              }
              if (has("equity_w")) {
                const ew = nf("equity_w", 60); const split = 40 + (ew / 100) * 240;
                const diag = vizWrap(<g>
                  <rect x="40" y="52" width={split - 40} height="26" rx="3" fill={BUY} opacity="0.85" />
                  <rect x={split} y="52" width={280 - split} height="26" rx="3" fill="var(--fg-3)" opacity="0.7" />
                  <text x={(40 + split) / 2} y="69" textAnchor="middle" style={{ fill: "#fff", font: "var(--fw-semi) 10px var(--font-sans)" }}>{ko ? `주식 ${ew}%` : `${ew}%`}</text>
                  <text x={(split + 280) / 2} y="69" textAnchor="middle" style={{ fill: "var(--bg-app)", font: "var(--fw-semi) 10px var(--font-sans)" }}>{100 - ew}%</text>
                  <text x="160" y="100" textAnchor="middle" style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 9px var(--font-sans)" }}>{ko ? "주기마다 이 비율로 되돌림" : "rebalance to this split each cycle"}</text>
                </g>, <React.Fragment><b style={{ color: BUY }}>{ko ? `주식 ${ew}%` : `${ew}% equity`}</b>{ko ? " / " : " / "}<b style={{ color: "var(--fg-2)" }}>{ko ? `방어자산 ${100 - ew}%` : `${100 - ew}% defensive`}</b>{ko ? "를 정해진 주기마다 다시 맞춰 위험을 분산합니다." : " rebalanced each cycle."}</React.Fragment>);
                return fr(<React.Fragment>{ko ? "주식 " : "Equity "}{hl(nf("equity_w", 60) + "%")}{ko ? " / 방어자산 " : " / defensive "}{hl((100 - nf("equity_w", 60)) + "%")}{ko ? " 비중을 " : " weight, rebalanced "}{hl(cyc(txt("rebal"), ko))}{ko ? " 리밸런싱합니다." : "."}</React.Fragment>, diag);
              }
              if (has("lookback") && has("stop")) {
                const st = Math.abs(nf("stop", 15));
                const diag = vizWrap(<g>
                  <path d="M20 100 L 70 86 L 120 92 L 170 64 L 220 72 L 270 40" fill="none" stroke="var(--fg)" strokeWidth="1.8" />
                  <path d="M20 112 L 70 98 L 120 104 L 170 76 L 220 84 L 270 52" fill="none" stroke={SELL} strokeWidth="1.2" strokeDasharray="4 3" opacity="0.8" />
                  <text x="270" y="34" textAnchor="end" style={{ fill: "var(--fg-2)", font: "var(--fw-semi) 9px var(--font-sans)" }}>{ko ? "강세 추종" : "ride trend"}</text>
                  <text x="270" y="64" textAnchor="end" style={{ fill: SELL, font: "var(--fw-semi) 8.5px var(--font-sans)" }}>{ko ? `−${st}% 스탑` : `−${st}% stop`}</text>
                  <text x="160" y="124" textAnchor="middle" style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 9px var(--font-sans)" }}>{ko ? "고점 따라 스탑선이 같이 올라감" : "stop trails the peak up"}</text>
                </g>, <React.Fragment>{ko ? "오르는 종목을 따라 타다가, " : ""}<b style={{ color: SELL }}>{ko ? `고점 대비 −${st}%` : `−${st}% from peak`}</b>{ko ? " 떨어지면 자동으로 빠져나옵니다. 스탑선은 고점을 따라 올라갑니다." : " → exit. The stop trails the high up."}</React.Fragment>);
                return fr(<React.Fragment>{ko ? "최근 " : "Ride recent "}{hl(txt("lookback"))}{ko ? " 동안 많이 오른 강한 종목을 따라 사고, 고점 대비 " : " winners and sell if they fall "}{hl(st + "%")}{ko ? " 떨어지면 자동으로 파는 추세 추종 방식입니다." : " from their peak."}</React.Fragment>, diag);
              }
              return strategy.desc ? wrap(strategy.desc[lang]) : null;
            })()}
            <div className="prev-step">
              <span className="prev-num">1</span>
              <div className="prev-body">
                <div className="prev-title">{t.stepFields} · {lang === "ko" ? `필수 ${reqFields.length}개 + 선택 ${optFields.length}개` : `${reqFields.length} required + ${optFields.length} auto`}</div>
                <div className="prev-chips">{strategy.fields.map(f => <span className="prev-chip" key={f.key}>{f.label[lang]}{f.auto && <span className="fl-auto">auto</span>}</span>)}</div>
              </div>
            </div>
            <div className="prev-step">
              <span className="prev-num">2</span>
              <div className="prev-body">
                <div className="prev-title">{t.stepDefaults}</div>
                <div className="prev-chips">{reqFields.map(f => { const dv = (f.type === "Select" && f.options) ? ((f.options.find(o => o.en === f.default) || { [lang]: f.default })[lang]) : f.default; return <span className="prev-chip" key={f.key}>{f.label[lang]} <b className="mono" style={{ color: "var(--fg)" }}>{dv}</b></span>; })}</div>
              </div>
            </div>
            <div className="prev-step">
              <span className="prev-num">3</span>
              <div className="prev-body">
                <div className="prev-title">{t.stepRules} · {rules.length}{lang === "ko" ? "개" : ""}</div>
                <div className="prev-chips">{rules.map((r, i) => <span className="prev-chip" key={i}><span className="rb-tag when" style={{ padding: "1px 6px" }}>{r.n}</span>{r.when[lang]}</span>)}</div>
              </div>
            </div>
            <div style={{ marginTop: 28 }}>
              <div className="se-meta" style={{ marginTop: 0, cursor: appliedCount ? "pointer" : "default", borderBottomLeftRadius: showApplied && appliedCount ? 0 : undefined, borderBottomRightRadius: showApplied && appliedCount ? 0 : undefined }} onClick={appliedCount ? () => setShowApplied(v => !v) : undefined}>
                <Lic name="info" size={14} cls="icon-sm" color="var(--fg-4)" />
                <span>{t.appliedTo}: <b style={{ color: "var(--fg)" }}>{appliedCount} {t.activePlans}</b></span>
                {appliedCount > 0 && <Lic name={showApplied ? "chevron-up" : "chevron-down"} size={15} cls="icon-sm" color="var(--fg-4)" style={{ marginLeft: "auto" }} />}
              </div>
              {showApplied && appliedCount > 0 && <div className="se-applied-list">
                {appliedPlans.slice(0, appLimit).map(p => { const ret = planReturn(p); const st = STRATEGIES.find(x => x.id === p.strategyId); return (
                  <div className="sec-planrow" key={p.id} onClick={() => onOpenPlan && onOpenPlan(p)}>
                    <StatusIcon status={p.status} size={14} />
                    <span className="mono" style={{ color: "var(--fg-4)", fontSize: 12, width: 58 }}>{p.id}</span>
                    <span style={{ flex: 1, minWidth: 0, font: "var(--fw-medium) 13px var(--font-sans)", color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name[lang]}</span>
                    {st && <span className="strat-dot" style={{ background: st.color }} />}
                    <span className={"mono " + (ret ? (ret.rate >= 0 ? "pos" : "neg") : "")} style={{ fontSize: 13, width: 60, textAlign: "right" }}>{ret ? (ret.rate >= 0 ? "+" : "") + ret.rate.toFixed(1) + "%" : "—"}</span>
                  </div>
                ); })}
                {appliedCount > appLimit && <button className="note-more" style={{ margin: "4px 0 8px" }} onClick={() => setAppLimit(l => l + 40)}>{lang === "ko" ? `더 보기 (${appliedCount - appLimit}개 남음)` : `Show more (${appliedCount - appLimit} left)`}</button>}
              </div>}
            </div>
          </>}
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { StrategyEditor });
