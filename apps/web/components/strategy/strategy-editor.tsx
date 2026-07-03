// StrategyEditor (screens/05-strategy-editor.png) 이식 — 읽기전용 카탈로그 뷰어.
// 원본: design_handoff_keystone/source/StrategyEditor.jsx (Overview / Fields / Rules / Preview 4탭).
//
// ⚠️ 읽기전용(LIBRARY_LOCKED=true): .se-body 에 se-readonly → CSS 가 편집 컨트롤 pointer-events 차단.
//   시각 충실도를 위해 편집 UI(입력/드롭다운/픽커)는 그대로 렌더하되, 편집 핸들러는 발화하지 않는다.
//   ⚠️ strategy 는 core 프리셋 객체(@keystone/core/reference) — 절대 직접 mutate 금지.
//   원본이 strategy.cat=/strategy.fields=/strategy.thresholds= 등으로 직접 변형하던 것을
//   전부 로컬 state(프리셋에서 초기화·딥클론)로 대체했다. 편집 핸들러는 로컬 state 만 갱신하거나 no-op.
"use client";
import { Fragment, useEffect, useReducer, useState } from "react";
import type { I18nDict, Lang, L10n, Strategy, ExecStrategy, StrategyField, Threshold } from "@keystone/core/types";
import { EXEC_CATS, STRATEGIES } from "@keystone/core/reference";
import { IND_THRESH } from "@keystone/core/screener";
import { planReturn } from "@keystone/core/analytics";
import { I18N } from "@keystone/core/i18n";
import { Lic, StatusIcon } from "@/components/icons";
import { MiniDropdown } from "@/components/plan/mini-dropdown";
import { usePrefs } from "@/components/shell/prefs";
import type { UIPlan } from "@/lib/plan-mapper";
import {
  STRAT_COLORS, STRAT_ICONS, FIELD_TYPE_LABEL, autoFormula, FIELD_DESC,
  STRAT_RULES, TRIGGER_REF, ACTION_REF, METRIC_DEFS, FIELD_PRESETS, metricLabel,
  type FieldTypeKey,
} from "@/lib/strategy-editor-ref";

const LIBRARY_LOCKED = true;

// 관점(Strategy)·전략(ExecStrategy) 공용 프리셋 — 라우트가 [...STRATEGIES, ...EXEC_STRATEGIES] 로 해석.
type Preset = Strategy | ExecStrategy;

// L10n(또는 부분값)에서 lang 키를 안전하게 뽑는 헬퍼 — JSX 안 제네릭 캐스트(<L10n>)를 피하려고
// 본문 함수로 분리(SWC 파서가 JSX 자식의 as Partial<L10n> 을 태그로 오인하는 문제 회피, NEXT-ACTION 경고).
function l10nAt(v: Partial<L10n> | undefined, lang: Lang): string {
  return (v && v[lang]) || "";
}
// Select 옵션 라벨: 매칭 옵션의 lang 값, 없으면 default 원문.
function selectLabel(options: L10n[] | undefined, def: string, lang: Lang): string {
  const o = options?.find((x) => x.en === def);
  return o ? o[lang] : def;
}
// 매수 주기 라벨(한국어) — 원본 cyc 인라인 맵.
const CYC_KO: Record<string, string> = { Weekly: "매주", Daily: "매일", Monthly: "매월", Biweekly: "격주", Quarterly: "분기마다", Yearly: "매년" };

export function StrategyEditor({ strategy, plans }: { strategy: Preset; plans: UIPlan[] }) {
  const { lang }: { lang: Lang } = usePrefs();
  return <StrategyEditorInner key={strategy.id + ":" + lang} strategy={strategy} plans={plans} lang={lang} />;
}

// lang·strategy.id 변화 시 로컬 state 를 프리셋에서 재초기화하기 위해 key 로 리마운트한다
// (원본은 useEffect 로 재동기화했으나, 읽기전용이라 key 리마운트가 더 단순하고 안전).
function StrategyEditorInner({ strategy, plans, lang }: { strategy: Preset; plans: UIPlan[]; lang: Lang }) {
  const { toggleLang } = usePrefs();
  const t: I18nDict = I18N[lang];
  const ko = lang === "ko";
  const isFw = "model" in strategy && !!(strategy as Strategy).model;

  const [nav, setNav] = useState<"overview" | "fields" | "rules" | "preview">("overview");
  const [showApplied, setShowApplied] = useState(false);
  const [appLimit, setAppLimit] = useState(40);
  useEffect(() => { setShowApplied(false); setAppLimit(40); }, [strategy.id]);

  // ── 로컬 state (프리셋에서 초기화 — core 객체는 절대 변형하지 않음) ──
  const [name, setName] = useState(strategy.name[lang]);
  const [desc, setDesc] = useState((strategy.desc || { en: "", ko: "" })[lang]);
  const [color, setColor] = useState(strategy.color);
  const [icon, setIcon] = useState(strategy.icon);
  const [cat, setCat] = useState<string>((strategy as { cat?: string }).cat || "accum");
  const [ruleMode, setRuleMode] = useState<"gui" | "expr">("gui");
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [thMkt, setThMkt] = useState<"common" | "KR" | "US">("common");

  // 프리셋 fields 딥클론(로컬 편집 대상) — core 배열/객체 참조를 직접 쓰지 않는다.
  const [fields] = useState<StrategyField[]>(() => strategy.fields.map((f) => ({ ...f, label: { ...f.label }, options: f.options ? f.options.map((o) => ({ ...o })) : undefined })));

  // 관점(Strategy)의 등급 룰 상태 — thresholds/marketTh/gradeFocus 딥클론.
  const fw = strategy as Strategy;
  const [thresholds] = useState<Record<string, Threshold>>(() => (isFw ? Object.fromEntries(Object.entries(fw.thresholds || {}).map(([k, v]) => [k, { ...v }])) : {}));
  const [marketTh] = useState<{ KR: Record<string, Partial<Threshold>>; US: Record<string, Partial<Threshold>> }>(() => ({ KR: {}, US: {} }));
  const [gradeFocus] = useState<string[]>(() => (isFw ? [...(fw.gradeFocus || [])] : []));

  const CAT_DEF: [string, string][] = EXEC_CATS.map((c) => [c.id, c.label[lang]]);
  const FW_CAT_DEF: [string, string][] = [["multiple", ko ? "멀티플" : "Multiple"], ["intrinsic", ko ? "내재가치" : "Intrinsic"], ["asset", ko ? "자산" : "Asset"]];
  const catOptions: [string, string][] = isFw ? FW_CAT_DEF : CAT_DEF;

  const rules = STRAT_RULES[strategy.id] || [];
  const reqFields = fields.filter((f) => !f.auto);
  const optFields = fields.filter((f) => f.auto);
  const appliedPlans = (plans || []).filter((p) => (p.strategyId === strategy.id || p.execId === strategy.id) && p.status === "active");
  const appliedCount = appliedPlans.length;
  const FW_MODEL_LABEL: Record<string, string> = { PER: "PER", PBR: "PBR", PSR: "PSR", EV: "EV/EBITDA", DCF: "DCF", DDM: "DDM" };

  // 읽기전용: 편집 핸들러는 se-readonly(pointer-events) 로 발화 안 함. 로컬 state setter 만 두어
  // 만에 하나 발화해도 core 객체는 건드리지 않는다.
  const navItems: [typeof nav, string, string][] = [
    ["overview", "info", t.overview],
    ["fields", "table-properties", t.fields],
    ["rules", isFw ? "gauge" : "zap", isFw ? (ko ? "등급 룰" : "Grade rules") : t.rulesNav],
    ["preview", "eye", t.preview],
  ];

  return (
    <div className="se-wrap">
      <div className="se-nav">
        <div className="se-nav-cap">{t.editStrategy}</div>
        {navItems.map(([k, ic, lab]) => (
          <div key={k} className={"se-nav-item" + (nav === k ? " active" : "")} onClick={() => setNav(k)}>
            <Lic name={ic} size={15} cls="icon-sm" color="inherit" /><span>{lab}</span>
          </div>
        ))}
        {/* 읽기전용 카탈로그라 편집 저장이 없으므로 언어 토글만 제공(픽셀 참조엔 없으나 KO/EN 확인용) */}
        <div className="se-nav-item" onClick={toggleLang} style={{ marginTop: "auto" }}>
          <Lic name="languages" size={15} cls="icon-sm" color="inherit" /><span>{lang === "ko" ? "English" : "한국어"}</span>
        </div>
      </div>
      <div className={"se-body" + (LIBRARY_LOCKED ? " se-readonly" : "")}>
        <div className="se-inner">
          {LIBRARY_LOCKED && <div className="se-lockbar"><Lic name="lock" size={13} cls="icon-sm" color="var(--fg-4)" />{ko ? "읽기 전용 · 전략·관점은 고정된 카탈로그입니다 (수익화·API 연동 후 편집 가능)" : "Read-only — strategies & frameworks are a fixed catalog (editable after API integration)"}</div>}

          {nav === "overview" && <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
              <span className="st-badge" style={{ width: 38, height: 38, borderRadius: 9, background: "color-mix(in srgb," + color + " 18%, transparent)" }}><Lic name={icon} size={20} color={color} /></span>
              <div style={{ flex: 1, minWidth: 0 }}><h2 className="se-h" style={{ marginBottom: 2 }}>{name}</h2><p className="se-sub" style={{ margin: 0 }}>{strategy.isPreset ? (ko ? "빌트인 프리셋" : "Built-in preset") : (ko ? "커스텀 전략" : "Custom strategy")}</p></div>
            </div>
            <div className="form-row"><label className="form-label">{t.stratName}</label><input className="form-input" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="form-row"><label className="form-label">{t.stratDesc}</label><textarea className="form-input form-textarea" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
            <div className="form-row"><label className="form-label">{t.stratCat}</label>
              <div className="cat-pills">
                {catOptions.map(([v, lab]) => <span key={v} className={"cat-pill" + (cat === v ? " on" : "")} style={cat === v ? { color: color, borderColor: color, background: "color-mix(in srgb, " + color + " 12%, transparent)" } : undefined} onClick={() => setCat(v)}>{lab}</span>)}
                {!isFw && <span className="cat-pill cat-pill-add"><Lic name="plus" size={12} color="currentColor" />{t.newCat}</span>}
              </div>
            </div>
            <div className="form-row"><label className="form-label">{t.themeColor}</label>
              <div className="color-swatches">{STRAT_COLORS.map((c) => <span key={c} className={"color-sw" + (color === c ? " on" : "")} style={{ background: c }} onClick={() => setColor(c)} />)}</div>
            </div>
            <div className="form-row"><label className="form-label">{t.icon}</label>
              <div className="icon-swatches">{STRAT_ICONS.map((ic) => <span key={ic} className={"icon-sw" + (icon === ic ? " on" : "")} onClick={() => setIcon(ic)}><Lic name={ic} size={17} color="inherit" /></span>)}</div>
            </div>
          </>}

          {nav === "fields" && <>
            <h2 className="se-h">{t.fields}</h2>
            <p className="se-sub">{ko ? (isFw ? "이 관점이 평가에 사용하는 지표·입력 값입니다." : "이 전략이 요구하는 Field 세트입니다. 드래그로 순서를 바꿀 수 있습니다.") : (isFw ? "Metrics and inputs this framework evaluates with." : "The field schema this strategy requires. Drag to reorder.")}</p>
            {fields.map((f) => (
              <div className="fielddef" key={f.key}>
                <span className="fd-drag"><Lic name="grip-vertical" size={15} cls="icon-sm" color="inherit" /></span>
                <span className="fd-main"><MiniDropdown width={210} trigger={<span className="fd-label fd-label-pick">{f.label[lang]}<Lic name="chevron-down" size={10} cls="icon-sm" color="var(--fg-4)" /></span>} items={FIELD_PRESETS.map((p) => ({ value: p.key, label: p.label[lang], on: f.key === p.key }))} onPick={() => {}} /> <span className="fd-key">{`{${f.key}}`}</span><span className="fin-term fd-help"><span className="ind-q">?</span><span className="fin-tip"><b>{f.label[lang]}</b><span className="fin-tip-def">{l10nAt(FIELD_DESC[f.key], lang) || (ko ? "이 전략이 사용하는 값입니다." : "A value this strategy uses.")}</span></span></span></span>
                <MiniDropdown width={130} trigger={<span className="fd-type fd-type-pick">{FIELD_TYPE_LABEL[f.type as FieldTypeKey][lang]}<Lic name="chevron-down" size={10} cls="icon-sm" color="var(--fg-4)" /></span>} items={Object.keys(FIELD_TYPE_LABEL).map((ty) => ({ value: ty, label: FIELD_TYPE_LABEL[ty as FieldTypeKey][lang], on: f.type === ty }))} onPick={() => {}} />
                <span className="fd-default">{(f.type === "Number" || f.type === "Currency" || f.type === "Percent") ? (
                  <span className="fd-valrow">
                    <MiniDropdown width={120} trigger={<span className="fd-mode">{f.auto ? (ko ? "자동" : "Auto") : (ko ? "수동" : "Manual")}<Lic name="chevron-down" size={10} cls="icon-sm" color="var(--fg-4)" /></span>} items={[{ value: "manual", label: ko ? "수동 입력" : "Manual", on: !f.auto }, { value: "auto", label: ko ? "자동 계산" : "Auto-computed", on: !!f.auto }]} onPick={() => {}} />
                    {f.auto ? <span className="fl-auto fin-term">auto<span className="ind-q" style={{ marginLeft: 3 }}>?</span><span className="fin-tip fin-tip-r"><b>{ko ? "자동 계산" : "Auto-computed"}</b><span className="fin-tip-def">{autoFormula(f.key, lang)}</span></span></span> : f.type === "Percent" ? <span className="fd-pct-wrap"><input className="fd-def-inp mono" value={String(f.default).replace(/[^0-9.\-]/g, "")} readOnly /><span className="fd-pct-suffix">%</span></span> : <input className="fd-def-inp mono" value={f.default} readOnly />}
                  </span>
                ) : (f.type === "Select" && f.options && f.options.length) ? <MiniDropdown width={150} trigger={<span className="fd-type fd-type-pick">{selectLabel(f.options, f.default, lang)}<Lic name="chevron-down" size={10} cls="icon-sm" color="var(--fg-4)" /></span>} items={f.options.map((o) => ({ value: o.en, label: o[lang], on: o.en === f.default }))} onPick={() => {}} /> : <input className="fd-def-inp mono" value={f.default} readOnly />}</span>
                <button className="iconbtn fd-del" title={t.delete}><Lic name="x" size={14} cls="icon-sm" color="currentColor" /></button>
              </div>
            ))}
            <MiniDropdown width={230} trigger={<span className="add-row" style={{ marginTop: 4, width: "100%", cursor: "pointer" }}><Lic name="plus" size={15} color="var(--fg-4)" />{t.addField}</span>} items={isFw
              ? [...METRIC_DEFS.filter((m) => !fields.some((f) => f.key === m.key)).map((m) => ({ value: "m:" + m.key, label: m[lang], icon: <span className="fd-pre-type">{ko ? "지표" : "Metric"}</span> })), { value: "__custom", label: ko ? "직접 만들기 (빈 필드)" : "Custom (blank)", icon: <Lic name="pencil" size={13} cls="icon-sm" color="var(--fg-4)" /> }]
              : [...FIELD_PRESETS.filter((p) => !fields.some((f) => f.key === p.key)).map((p) => ({ value: p.key, label: p.label[lang], icon: <span className="fd-pre-type">{FIELD_TYPE_LABEL[p.type][lang]}</span> })), { value: "__custom", label: ko ? "직접 만들기 (빈 필드)" : "Custom (blank)", icon: <Lic name="pencil" size={13} cls="icon-sm" color="var(--fg-4)" /> }]
            } onPick={() => {}} />
          </>}

          {nav === "rules" && isFw && (() => {
            const thBase: Record<string, Threshold> = IND_THRESH;
            const rows = gradeFocus;
            const unit = (k: string) => ["PER", "PBR", "PSR", "EVEB", "PEG", "PCR"].includes(k) ? (ko ? "배" : "×") : "%";
            const mkt = thMkt;
            const common = (k: string): Threshold => thresholds[k] || thBase[k] || { dir: "high", good: 0, warn: 0 };
            const get = (k: string): Threshold => mkt === "common" ? common(k) : { ...common(k), ...(marketTh[mkt][k] || {}) };
            const overridden = (k: string) => mkt !== "common" && marketTh[mkt][k] && (marketTh[mkt][k].good != null || marketTh[mkt][k].warn != null || marketTh[mkt][k].dir != null);
            return (
              <>
                <h2 className="se-h">{ko ? "등급 룰" : "Grade rules"}</h2>
                <p className="se-sub">{ko ? "이 관점이 종목을 우수/보통/주의로 채점하는 기준입니다. 투자지표 탭이 이 임계값으로 등급을 매깁니다." : "Thresholds this framework uses to grade a security. The Metrics tab grades by these."}</p>
                <div className="seg-toggle" style={{ marginBottom: 14 }}>
                  {([["common", ko ? "공통" : "Common"], ["KR", ko ? "한국" : "Korea"], ["US", ko ? "미국" : "US"]] as [typeof thMkt, string][]).map(([v, l]) => <div key={v} className={"st" + (thMkt === v ? " active" : "")} onClick={() => setThMkt(v)}>{l}</div>)}
                </div>
                {mkt !== "common" && <p className="se-sub" style={{ color: "var(--fg-4)", marginTop: -6 }}>{ko ? "이 시장 종목에만 적용되는 임계값입니다. 미설정 항목은 공통값을 따릅니다." : "Applies only to this market; unset rows inherit Common."}</p>}
                {rows.map((k) => { const th = get(k); return (
                  <div className="gr-row" key={k}>
                    <span className="gr-metric">{metricLabel(k, lang)}{overridden(k) && <span className="gr-ovr">●</span>}</span>
                    <MiniDropdown width={150} trigger={<span className="gr-dir">{th.dir === "low" ? (ko ? "낮을수록 좋음" : "Lower better") : (ko ? "높을수록 좋음" : "Higher better")}<Lic name="chevron-down" size={10} cls="icon-sm" color="var(--fg-4)" /></span>}
                      items={[{ value: "high", label: ko ? "높을수록 좋음" : "Higher better", on: th.dir === "high" }, { value: "low", label: ko ? "낮을수록 좋음" : "Lower better", on: th.dir === "low" }]} onPick={() => {}} />
                    <span className="gr-th"><label className="gr-th-lab gr-good">{ko ? "우수" : "Good"}</label><input className="gr-inp mono" value={th.good} readOnly /><span className="gr-unit">{unit(k)}</span></span>
                    <span className="gr-th"><label className="gr-th-lab gr-warn">{ko ? "주의" : "Watch"}</label><input className="gr-inp mono" value={th.warn} readOnly /><span className="gr-unit">{unit(k)}</span></span>
                    <button className="iconbtn fd-del" title={t.delete}><Lic name="x" size={14} cls="icon-sm" color="currentColor" /></button>
                  </div>
                ); })}
                {!rows.length && <p className="se-sub" style={{ color: "var(--fg-4)" }}>{ko ? "지정된 등급 지표가 없습니다." : "No grade metrics set."}</p>}
                <MiniDropdown width={200} trigger={<span className="add-row" style={{ marginTop: 8, width: "100%", cursor: "pointer" }}><Lic name="plus" size={15} color="var(--fg-4)" />{ko ? "등급 지표 추가" : "Add grade metric"}</span>} items={METRIC_DEFS.filter((m) => !rows.includes(m.key)).map((m) => ({ value: m.key, label: m[lang] }))} onPick={() => {}} />
                <div className="ab-note" style={{ marginTop: 14, display: "flex", gap: 10, padding: "11px 13px", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}><Lic name="info" size={15} cls="icon-sm" color="var(--fg-4)" /><span className="se-sub" style={{ margin: 0 }}>{ko ? "투자지표 탭이 종목 시장(한국/미국)에 맞는 임계값으로 채점합니다. 데이터가 없는 지표는 채점에서 제외됩니다." : "The Metrics tab grades by the security's market profile. Metrics without data are excluded."}</span></div>
              </>
            );
          })()}

          {nav === "rules" && !isFw && <>
            <h2 className="se-h">{t.rulesNav}</h2>
            <p className="se-sub">{ko ? "조건 → 액션 자동화 규칙입니다." : "WHEN → THEN automation rules."}</p>
            <div className="rb-modebar">
              <div className={"rb-mode" + (ruleMode === "gui" ? " on" : "")} onClick={() => setRuleMode("gui")}>{t.guiMode}</div>
              <div className={"rb-mode" + (ruleMode === "expr" ? " on" : "")} onClick={() => setRuleMode("expr")}>{t.exprMode}</div>
            </div>
            {ruleMode === "gui" ? <>
              {rules.map((r, i) => (
                <div className="rb-card" key={i}>
                  <button className="rule-del rb-del" title={t.delete}><Lic name="x" size={13} color="currentColor" /></button>
                  <div className="rb-block-row">
                    <span className="rb-tag when">{t.when}</span>
                    <MiniDropdown width={210} trigger={<span className="rb-select">{r.when[lang]}<span className="chev"><Lic name="chevron-down" size={12} cls="icon-sm" color="inherit" /></span></span>} items={TRIGGER_REF.map((g) => ({ value: g.items[0].l.en, label: g.items[0].l[lang], on: r.when.en === g.items[0].l.en }))} onPick={() => {}} />
                  </div>
                  <div className="rb-block-row">
                    <span className="rb-tag then">{t.then}</span>
                    <MiniDropdown width={180} trigger={<span className="rb-select">{r.then[lang]}<span className="chev"><Lic name="chevron-down" size={12} cls="icon-sm" color="inherit" /></span></span>} items={ACTION_REF.map((a) => ({ value: a.en, label: a[lang], on: r.then.en === a.en }))} onPick={() => {}} />
                  </div>
                </div>
              ))}
              <button className="add-row" style={{ width: "100%" }}><Lic name="plus" size={15} color="var(--fg-4)" />{t.addRule}</button>
            </> : <>
              <div className="rb-expr" dangerouslySetInnerHTML={{ __html: rules.map(() =>
                `<span class="tok-kw">when</span> <span class="tok-field">{price}</span> <span class="tok-kw">&le;</span> <span class="tok-field">{loc_price}</span> <span class="tok-kw">then</span> <span class="tok-fn">notify</span>(<span class="tok-num">"buy"</span>)`
              ).join("<br>") }} />
            </>}
            <div className="rb-ref">
              <div className="rb-ref-panel">
                <div className="rb-ref-h">{t.availTriggers}</div>
                {TRIGGER_REF.map((g, i) => <div className="rb-ref-item fin-term" key={i}><Lic name="circle-dot" size={13} cls="icon-sm" color="var(--accent)" /><span>{g.items[0].l[lang]}</span><span className="mono">{g.cat[lang]}</span><span className="fin-tip"><b>{g.items[0].l[lang]}</b><span className="fin-tip-def">{l10nAt(g.items[0].d, lang)}</span></span></div>)}
              </div>
              <div className="rb-ref-panel">
                <div className="rb-ref-h">{t.availActions}</div>
                {ACTION_REF.map((a, i) => <div className="rb-ref-item fin-term" key={i}><Lic name="zap" size={13} cls="icon-sm" color="var(--r-bull)" /><span>{a[lang]}</span><span className="fin-tip"><b>{a[lang]}</b><span className="fin-tip-def">{l10nAt(a.d, lang)}</span></span></div>)}
              </div>
            </div>
          </>}

          {nav === "preview" && <>
            <h2 className="se-h">{t.preview}</h2>
            <p className="se-sub">{ko ? (isFw ? "이 관점이 종목을 평가하는 방식입니다." : "이 전략을 플랜에 적용할 때의 시뮬레이션입니다.") : (isFw ? "How this framework evaluates a security." : "Simulation of applying this strategy to a plan.")}</p>
            {isFw ? (() => {
              const focus = gradeFocus;
              return <div className="prev-card"><div className="prev-card-h">{ko ? "한 줄 정의" : "In one line"}</div><div style={{ font: "var(--fw-medium) 13.5px var(--font-sans)", lineHeight: 1.6, color: "var(--fg-2)" }}>{ko ? "주요 모델 " : "Uses "}<b style={{ color: "var(--fg)" }}>{FW_MODEL_LABEL[fw.model] || fw.model}</b>{ko ? "을 기준으로, " : " as the lens, grading "}{focus.length ? <b style={{ color: "var(--fg)" }}>{focus.join(", ")}</b> : <span style={{ color: "var(--fg-4)" }}>{ko ? "핵심 지표" : "key metrics"}</span>}{ko ? " 지표를 우수·보통·주의로 채점합니다." : " as good/fair/watch."}</div></div>;
            })() : (() => {
              const nf = (k: string, d: number) => { const f = fields.find((x) => x.key === k); const n = f ? parseFloat(String(f.default).replace(/[^0-9.-]/g, "")) : NaN; return isNaN(n) ? d : n; };
              const wrap = (body: React.ReactNode) => <div className="prev-card"><div className="prev-card-h">{ko ? "한 줄 정의" : "In one line"}</div><div style={{ font: "var(--fw-medium) 13.5px var(--font-sans)", lineHeight: 1.6, color: "var(--fg-2)" }}>{body}</div></div>;
              if (fields.some((f) => f.key === "divisions")) {
                const dv = Math.round(nf("divisions", 40)), lp = Math.abs(nf("loc_pct", -5)), tp = nf("tp_pct", 10);
                const steps = Math.min(Math.max(dv, 2), 6);
                const W = 320, H = 132, padL = 14, padR = 14, padT = 16, padB = 26;
                const iw = W - padL - padR, ih = H - padT - padB;
                const pts: [number, number][] = [];
                for (let i = 0; i < steps; i++) { const x = padL + (steps === 1 ? 0 : i / (steps - 1) * iw); const y = padT + (steps === 1 ? 0 : i / (steps - 1) * ih); pts.push([x, y]); }
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
                return <Fragment>{wrap(<Fragment>{ko ? "현재가가 " : "Buy on each "}<b style={{ color: "var(--fg)" }}>{"-" + lp + "%"}</b>{ko ? " 빠질 때마다 " : " dip, "}<b style={{ color: "var(--fg)" }}>{dv + (ko ? "회" : "x")}</b>{ko ? "로 분할 매수하고, 평단 대비 " : " splits; profit at "}<b style={{ color: "var(--pos)" }}>{"+" + tp + "%"}</b>{ko ? "에서 익절합니다." : " over avg."}</Fragment>)}{diagram}</Fragment>;
              }
              const has = (k: string) => fields.some((f) => f.key === k);
              const hl = (s: React.ReactNode) => <b style={{ color: "var(--fg)" }}>{s}</b>;
              const txt = (k: string) => { const f = fields.find((x) => x.key === k); return f ? String(f.default).trim() : ""; };
              const cyc = (v: string, k2: boolean) => k2 ? (CYC_KO[v] || v) : v;
              const vizWrap = (children: React.ReactNode, cap: React.ReactNode) => <div className="prev-card stratviz"><div className="prev-card-h">{ko ? "작동 원리" : "How it works"}</div><svg viewBox="0 0 320 132" style={{ width: "100%", height: "auto", display: "block" }}>{children}</svg><div className="stratviz-cap">{cap}</div></div>;
              const BUY = "var(--r-active, #4C8DFF)", SELL = "var(--pos)";
              const fr = (defn: React.ReactNode, diag: React.ReactNode) => <Fragment>{wrap(defn)}{diag}</Fragment>;
              if (has("amount") && has("interval")) {
                const xs = [30, 78, 126, 174, 222, 270];
                const diag = vizWrap(<g>
                  <line x1="14" x2="306" y1="80" y2="80" stroke="var(--border-strong)" strokeWidth="1" />
                  {xs.map((x, i) => <g key={i}><line x1={x} x2={x} y1="80" y2={80 - 26} stroke="var(--fg-4)" strokeWidth="1" /><circle cx={x} cy={80 - 26} r="4.5" fill={BUY} stroke="var(--bg-app)" strokeWidth="1.5" /></g>)}
                  <text x="160" y="104" textAnchor="middle" style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 9.5px var(--font-sans)" }}>{ko ? "→ 시간 (정해진 주기)" : "→ time (fixed cycle)"}</text>
                </g>, <Fragment>{ko ? "주가와 무관하게 " : ""}<b style={{ color: "var(--fg-2)" }}>{cyc(txt("interval"), ko)}</b>{ko ? " 똑같은 금액을 기계적으로 매수 → 고점·저점 평균에 자연스럽게 분산됩니다." : " buy the same amount each cycle, averaging across highs and lows."}</Fragment>);
                return fr(<Fragment>{hl(cyc(txt("interval"), ko))}{ko ? " 일정 금액을 꼬박꼬박 매수해 평단가를 낮추고 매수 시점을 분산합니다." : " buy a fixed amount to lower your average cost and spread out timing."}</Fragment>, diag);
              }
              if (has("target_path")) {
                const diag = vizWrap(<g>
                  <line x1="20" y1="96" x2="300" y2="34" stroke="var(--fg-3)" strokeWidth="1.5" strokeDasharray="4 3" />
                  <text x="300" y="28" textAnchor="end" style={{ fill: "var(--fg-3)", font: "var(--fw-semi) 9.5px var(--font-sans)" }}>{ko ? "목표 경로" : "Target path"}</text>
                  <path d="M20 100 Q 80 118 120 96 T 220 70 T 300 50" fill="none" stroke="var(--fg)" strokeWidth="1.8" />
                  <circle cx="120" cy="96" r="4.5" fill={BUY} stroke="var(--bg-app)" strokeWidth="1.5" /><text x="120" y="114" textAnchor="middle" style={{ fill: BUY, font: "var(--fw-semi) 8.5px var(--font-sans)" }}>{ko ? "더 매수" : "buy+"}</text>
                  <circle cx="220" cy="70" r="4.5" fill={SELL} stroke="var(--bg-app)" strokeWidth="1.5" /><text x="220" y="62" textAnchor="middle" style={{ fill: SELL, font: "var(--fw-semi) 8.5px var(--font-sans)" }}>{ko ? "덜 매수" : "buy−"}</text>
                </g>, <Fragment>{ko ? "실제 자산이 " : ""}<b style={{ color: "var(--fg-2)" }}>{ko ? "목표 경로" : "the target path"}</b>{ko ? "보다 아래면 더 사고, 위면 덜 사서 정해진 성장 곡선을 따라가게 맞춥니다." : " — buy more below it, less above."}</Fragment>);
                return fr(<Fragment>{ko ? "자산이 " : "Keep assets on a "}{hl(ko ? "목표 성장 경로" : "target growth path")}{ko ? "를 따라가도록, 경로보다 모자라면 더 사고 앞서면 덜 삽니다." : " — buy more when behind, less when ahead."}</Fragment>, diag);
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
                </g>, <Fragment>{ko ? "가격 구간을 여러 칸으로 나눠 " : ""}<b style={{ color: BUY }}>{ko ? "한 칸 내리면 사고" : "buy on a step down"}</b>{ko ? " " : ", "}<b style={{ color: SELL }}>{ko ? "한 칸 오르면 팔아" : "sell on a step up"}</b>{ko ? " 잔잔한 등락에서 차익을 쌓습니다." : "."}</Fragment>);
                return fr(<Fragment>{hl(nf("lower", 0).toLocaleString("en-US"))}{ko ? " ~ " : " – "}{hl(nf("upper", 0).toLocaleString("en-US"))}{ko ? " 가격 구간을 " : " price band into "}{hl(Math.round(nf("grids", 20)) + (ko ? "칸" : ""))}{ko ? "으로 잘게 나눠, 가격이 한 칸 내리면 사고 한 칸 오르면 팔아 자잘한 등락에서 수익을 냅니다." : " steps; buy a step down, sell a step up."}</Fragment>, diag);
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
                </g>, <Fragment>{ko ? "평가액이 매년 " : "A value line growing "}<b style={{ color: "var(--accent)" }}>{ko ? `${gr}% 커지는 가치선` : `${gr}%/yr`}</b>{ko ? `을 따라가도록 — 상단(+${up}%) 넘으면 매도, 하단(−${lo}%) 이탈하면 현금풀(한도 ${pool}%)로 매수합니다.` : ` — trim above +${up}%, add below −${lo}% via the cash pool.`}</Fragment>);
                return fr(<Fragment>{ko ? "매년 " : "Track a value line growing "}{hl(ko ? `${gr}% 성장하는 목표 가치선` : `${gr}%/yr`)}{ko ? "를 따라 — 상단을 넘으면 매도, 하단을 이탈하면 매수해 평가액을 맞춥니다." : "; trim/add at the bands using a cash pool."}</Fragment>, diag);
              }
              if (has("equity_w")) {
                const ew = nf("equity_w", 60); const split = 40 + (ew / 100) * 240;
                const diag = vizWrap(<g>
                  <rect x="40" y="52" width={split - 40} height="26" rx="3" fill={BUY} opacity="0.85" />
                  <rect x={split} y="52" width={280 - split} height="26" rx="3" fill="var(--fg-3)" opacity="0.7" />
                  <text x={(40 + split) / 2} y="69" textAnchor="middle" style={{ fill: "#fff", font: "var(--fw-semi) 10px var(--font-sans)" }}>{ko ? `주식 ${ew}%` : `${ew}%`}</text>
                  <text x={(split + 280) / 2} y="69" textAnchor="middle" style={{ fill: "var(--bg-app)", font: "var(--fw-semi) 10px var(--font-sans)" }}>{100 - ew}%</text>
                  <text x="160" y="100" textAnchor="middle" style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 9px var(--font-sans)" }}>{ko ? "주기마다 이 비율로 되돌림" : "rebalance to this split each cycle"}</text>
                </g>, <Fragment><b style={{ color: BUY }}>{ko ? `주식 ${ew}%` : `${ew}% equity`}</b>{ko ? " / " : " / "}<b style={{ color: "var(--fg-2)" }}>{ko ? `방어자산 ${100 - ew}%` : `${100 - ew}% defensive`}</b>{ko ? "를 정해진 주기마다 다시 맞춰 위험을 분산합니다." : " rebalanced each cycle."}</Fragment>);
                return fr(<Fragment>{ko ? "주식 " : "Equity "}{hl(nf("equity_w", 60) + "%")}{ko ? " / 방어자산 " : " / defensive "}{hl((100 - nf("equity_w", 60)) + "%")}{ko ? " 비중을 " : " weight, rebalanced "}{hl(cyc(txt("rebal"), ko))}{ko ? " 리밸런싱합니다." : "."}</Fragment>, diag);
              }
              if (has("lookback") && has("stop")) {
                const st = Math.abs(nf("stop", 15));
                const diag = vizWrap(<g>
                  <path d="M20 100 L 70 86 L 120 92 L 170 64 L 220 72 L 270 40" fill="none" stroke="var(--fg)" strokeWidth="1.8" />
                  <path d="M20 112 L 70 98 L 120 104 L 170 76 L 220 84 L 270 52" fill="none" stroke={SELL} strokeWidth="1.2" strokeDasharray="4 3" opacity="0.8" />
                  <text x="270" y="34" textAnchor="end" style={{ fill: "var(--fg-2)", font: "var(--fw-semi) 9px var(--font-sans)" }}>{ko ? "강세 추종" : "ride trend"}</text>
                  <text x="270" y="64" textAnchor="end" style={{ fill: SELL, font: "var(--fw-semi) 8.5px var(--font-sans)" }}>{ko ? `−${st}% 스탑` : `−${st}% stop`}</text>
                  <text x="160" y="124" textAnchor="middle" style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 9px var(--font-sans)" }}>{ko ? "고점 따라 스탑선이 같이 올라감" : "stop trails the peak up"}</text>
                </g>, <Fragment>{ko ? "오르는 종목을 따라 타다가, " : ""}<b style={{ color: SELL }}>{ko ? `고점 대비 −${st}%` : `−${st}% from peak`}</b>{ko ? " 떨어지면 자동으로 빠져나옵니다. 스탑선은 고점을 따라 올라갑니다." : " → exit. The stop trails the high up."}</Fragment>);
                return fr(<Fragment>{ko ? "최근 " : "Ride recent "}{hl(txt("lookback"))}{ko ? " 동안 많이 오른 강한 종목을 따라 사고, 고점 대비 " : " winners and sell if they fall "}{hl(st + "%")}{ko ? " 떨어지면 자동으로 파는 추세 추종 방식입니다." : " from their peak."}</Fragment>, diag);
              }
              return strategy.desc ? wrap(strategy.desc[lang]) : null;
            })()}
            <div className="prev-step">
              <span className="prev-num">1</span>
              <div className="prev-body">
                <div className="prev-title">{t.stepFields} · {ko ? `필수 ${reqFields.length}개 + 선택 ${optFields.length}개` : `${reqFields.length} required + ${optFields.length} auto`}</div>
                <div className="prev-chips">{fields.map((f) => <span className="prev-chip" key={f.key}>{f.label[lang]}{f.auto && <span className="fl-auto">auto</span>}</span>)}</div>
              </div>
            </div>
            <div className="prev-step">
              <span className="prev-num">2</span>
              <div className="prev-body">
                <div className="prev-title">{t.stepDefaults}</div>
                <div className="prev-chips">{reqFields.map((f) => { const dv = (f.type === "Select" && f.options) ? selectLabel(f.options, f.default, lang) : f.default; return <span className="prev-chip" key={f.key}>{f.label[lang]} <b className="mono" style={{ color: "var(--fg)" }}>{dv}</b></span>; })}</div>
              </div>
            </div>
            <div className="prev-step">
              <span className="prev-num">3</span>
              <div className="prev-body">
                <div className="prev-title">{t.stepRules} · {rules.length}{ko ? "개" : ""}</div>
                <div className="prev-chips">{rules.map((r, i) => <span className="prev-chip" key={i}><span className="rb-tag when" style={{ padding: "1px 6px" }}>{r.n}</span>{r.when[lang]}</span>)}</div>
              </div>
            </div>
            <div style={{ marginTop: 28 }}>
              <div className="se-meta" style={{ marginTop: 0, cursor: appliedCount ? "pointer" : "default", borderBottomLeftRadius: showApplied && appliedCount ? 0 : undefined, borderBottomRightRadius: showApplied && appliedCount ? 0 : undefined }} onClick={appliedCount ? () => setShowApplied((v) => !v) : undefined}>
                <Lic name="info" size={14} cls="icon-sm" color="var(--fg-4)" />
                <span>{t.appliedTo}: <b style={{ color: "var(--fg)" }}>{appliedCount} {t.activePlans}</b></span>
                {appliedCount > 0 && <Lic name={showApplied ? "chevron-up" : "chevron-down"} size={15} cls="icon-sm" color="var(--fg-4)" style={{ marginLeft: "auto" }} />}
              </div>
              {showApplied && appliedCount > 0 && <div className="se-applied-list">
                {appliedPlans.slice(0, appLimit).map((p) => { const ret = planReturn(p); const st = STRATEGIES.find((x) => x.id === p.strategyId); return (
                  <div className="sec-planrow" key={p.id}>
                    <StatusIcon status={p.status} size={14} />
                    <span className="mono" style={{ color: "var(--fg-4)", fontSize: 12, width: 58 }}>{p.id}</span>
                    <span style={{ flex: 1, minWidth: 0, font: "var(--fw-medium) 13px var(--font-sans)", color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name[lang]}</span>
                    {st && <span className="strat-dot" style={{ background: st.color }} />}
                    <span className={"mono " + (ret ? (ret.rate >= 0 ? "pos" : "neg") : "")} style={{ fontSize: 13, width: 60, textAlign: "right" }}>{ret ? (ret.rate >= 0 ? "+" : "") + ret.rate.toFixed(1) + "%" : "—"}</span>
                  </div>
                ); })}
                {appliedCount > appLimit && <button className="note-more" style={{ margin: "4px 0 8px" }} onClick={() => setAppLimit((l) => l + 40)}>{ko ? `더 보기 (${appliedCount - appLimit}개 남음)` : `Show more (${appliedCount - appLimit} left)`}</button>}
              </div>}
            </div>
          </>}
        </div>
      </div>
    </div>
  );
}
