// P5Scenarios.jsx — reusable security picker (search + KR/US), scenario author modal,
// scenarios section for security detail. Implements 안1(security-scoped) + 안2(standalone authoring).

/* ---- security picker: a button that opens a searchable popup with KR/US toggle ---- */
function SecurityPicker({ ticker, lang, t, onPick, width = 300 }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [mkt, setMkt] = React.useState("all");
  const s = securityOf(ticker);
  const ql = q.toLowerCase();
  const list = SECURITIES.filter(x => (mkt === "all" || x.market === mkt) &&
    (!q || x.ticker.toLowerCase().includes(ql) || x.name.en.toLowerCase().includes(ql) || x.name.ko.includes(q)));
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span className="rb-select" style={{ height: 36 }} onClick={() => setOpen(o => !o)}>
        {s ? <><Flag market={s.market} size={15} /><span className="mono" style={{ fontSize: 12, color: "var(--fg-3)" }}>{s.ticker}</span><b style={{ color: "var(--fg)" }}>{s.name[lang]}</b></> : <span style={{ color: "var(--fg-4)" }}>{t.pickSecurity}</span>}
        <span className="chev"><Lic name="chevron-down" size={13} cls="icon-sm" color="inherit" /></span>
      </span>
      {open && <>
        <div className="overlay" onClick={() => setOpen(false)} />
        <div className="v-menu" style={{ position: "absolute", top: 40, left: 0, width, zIndex: 62, padding: 0, overflow: "hidden" }}>
          <div className="cmd-input-row" style={{ padding: "10px 12px" }}>
            <Lic name="search" size={15} color="var(--fg-4)" />
            <input autoFocus className="cmd-input" style={{ fontSize: 13 }} placeholder={t.searchSec} value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 2, padding: "8px 10px 4px" }}>
            {[["all", { en: "All", ko: "전체" }], ...MARKETS.map(m => [m.key, m.label])].map(([k, lab]) => (
              <div key={k} className={"mt-seg" + (mkt === k ? " on" : "")} onClick={() => setMkt(k)}>{lab[lang] || lab}</div>
            ))}
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto", padding: "4px 6px 6px" }}>
            {list.map(x => (
              <div className="v-menu-item" key={x.ticker} onClick={() => { onPick(x.ticker); setOpen(false); setQ(""); }}>
                <Flag market={x.market} size={12} /><span className="mono" style={{ fontSize: 11, color: "var(--fg-4)", width: 54 }}>{x.ticker}</span>
                <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.name[lang]}</span>
                {x.ticker === ticker && <span className="check"><Lic name="check" size={14} cls="icon-sm" color="var(--accent)" /></span>}
              </div>
            ))}
            {!list.length && <div style={{ padding: 16, textAlign: "center", color: "var(--fg-4)", font: "var(--fw-medium) 12px var(--font-sans)" }}>{lang === "ko" ? "결과 없음" : "No results"}</div>}
          </div>
        </div>
      </>}
    </span>
  );
}

/* ---- scenario author modal (안2): pick security + case + target + thesis ---- */
const SC_CASES = [
  { key: "Bull", color: "var(--r-bull)" },
  { key: "Base", color: "var(--r-base)" },
  { key: "Bear", color: "var(--r-bear)" },
];
function ScenarioAuthor({ t, lang, initialTicker, onClose, onSaved }) {
  const [ticker, setTicker] = React.useState(initialTicker || SECURITIES[0].ticker);
  const [label, setLabel] = React.useState("Base");
  const [target, setTarget] = React.useState("");
  const [thesis, setThesis] = React.useState("");
  const s = securityOf(ticker);
  const caseColor = (SC_CASES.find(c => c.key === label) || {}).color;
  const tgtNum = Number(String(target).replace(/[^0-9.]/g, "")) || 0;
  const ret = s && tgtNum ? (tgtNum / s.price - 1) * 100 : null;
  const per = s && tgtNum && s.eps > 0 ? tgtNum / s.eps : null;
  const save = () => {
    if (!s || !tgtNum) return;
    const sc = { id: "scx" + Date.now(), ticker, label: { en: label, ko: scLabel(label, "ko") }, color: caseColor, target: tgtNum, status: "tracking", createdAt: "now", thesis: { en: thesis || "—", ko: thesis || "—" } };
    SECURITY_SCENARIOS.unshift(sc);
    onSaved && onSaved(sc);
    onClose();
  };
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 480 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <Lic name="target" size={17} color="var(--accent)" /><span style={{ font: "var(--fw-semi) 15px var(--font-sans)", color: "var(--fg)" }}>{t.newScenario}</span>
          <span style={{ marginLeft: "auto" }} className="iconbtn" onClick={onClose}><Lic name="x" size={16} /></span>
        </div>
        <div className="modal-body">
          <div className="form-row"><label className="form-label">{t.ticker}</label>
            <SecurityPicker ticker={ticker} lang={lang} t={t} onPick={setTicker} width={420} />
          </div>
          <div className="form-row"><label className="form-label">{t.scLabel}</label>
            <div className="rb-modebar" style={{ margin: 0 }}>
              {SC_CASES.map(c => <div key={c.key} className={"rb-mode" + (label === c.key ? " on" : "")} onClick={() => setLabel(c.key)} style={label === c.key ? { color: c.color } : {}}>{scLabel(c.key, lang)}</div>)}
            </div>
          </div>
          <div className="form-row"><label className="form-label">{t.targetPrice} {s ? `(${s.cur})` : ""}</label>
            <input className="form-input mono" placeholder={s ? fmtCompact(Math.round(s.price * 1.2), s.cur) : "—"} value={target} onChange={e => setTarget(e.target.value)} />
          </div>
          {ret != null && <div className="sim-out" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 16 }}>
            <div className="sim-out-cell"><div className="sim-out-lab">{t.impliedRet}</div><div className="sim-out-val" style={{ color: ret >= 0 ? "var(--pos)" : "var(--neg)" }}>{ret >= 0 ? "+" : ""}{ret.toFixed(1)}%</div></div>
            <div className="sim-out-cell"><div className="sim-out-lab">{t.impliedPer}</div><div className="sim-out-val">{per ? per.toFixed(1) + "×" : "—"}</div></div>
          </div>}
          <div className="form-row"><label className="form-label">{lang === "ko" ? "근거" : "Thesis"}</label>
            <textarea className="form-input form-textarea" placeholder={t.scThesisPh} value={thesis} onChange={e => setThesis(e.target.value)} />
          </div>
        </div>
        <div className="modal-foot">
          <span className="spacer" />
          <button className="v-btn" onClick={onClose}>{t.cancel}</button>
          <button className="v-btn v-btn--primary" onClick={save} disabled={!tgtNum}><Lic name="check" size={14} cls="icon-sm" color="var(--fg-on-accent)" />{t.saveScenario}</button>
        </div>
      </div>
    </div>
  );
}

/* ---- scenarios section for a security (안1): lists ad-hoc + plan scenarios ---- */
function SecurityScenarios({ security, plans, t, lang, onAdd, onOpenPlan }) {
  const [scLimit, setScLimit] = React.useState(40);
  const adhoc = adhocScenariosForTicker(security.ticker);
  const linkedPlans = plansForTicker(plans, security.ticker);
  const planScens = [];
  linkedPlans.forEach(p => p.scenarios.forEach(sc => planScens.push({ sc, plan: p })));
  if (!adhoc.length && !planScens.length) {
    return (
      <div style={{ marginTop: 8 }}>
        <div className="se-section-h">{t.scenarioOn}</div>
        <div className="sc-add" style={{ minHeight: 72 }} onClick={onAdd}><Lic name="plus" size={16} color="var(--fg-4)" />{t.addScenarioHere}</div>
      </div>
    );
  }
  const row = (sc, plan, k) => {
    const ret = (sc.target / security.price - 1) * 100;
    const clickable = !!(plan && onOpenPlan);
    return (
      <div className={"scn-row" + (clickable ? " scn-row-click" : "")} key={k} onClick={clickable ? () => onOpenPlan(plan, "scenarios") : undefined} title={clickable ? (lang === "ko" ? plan.id + " 시나리오 열기" : "Open " + plan.id + " scenarios") : undefined}>
        <span className="scsum-dot" style={{ background: sc.color }} />
        <span style={{ font: "var(--fw-semi) 13px var(--font-sans)", color: "var(--fg)", width: 46 }}>{sc.label[lang]}</span>
        <span className="scn-thesis">{sc.thesis[lang]}</span>
        <span className="scn-tag">{plan ? <span className="fl-auto">{plan.id}</span> : <span className="fl-auto" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>{t.adhoc}</span>}</span>
        <span className="mono" style={{ width: 92, textAlign: "right", color: "var(--fg-2)" }}>{fmtCompact(sc.target, security.cur)}</span>
        <span className={"mono " + (ret >= 0 ? "pos" : "neg")} style={{ width: 56, textAlign: "right", fontWeight: 600 }}>{ret >= 0 ? "+" : ""}{ret.toFixed(0)}%</span>
      </div>
    );
  };
  return (
    <div style={{ marginTop: 8 }}>
      <div className="se-section-h" style={{ display: "flex", alignItems: "center" }}>{t.scenarioOn} <span className="grp-count" style={{ marginLeft: 6 }}>{adhoc.length + planScens.length}</span>
        <button className="v-btn" style={{ marginLeft: "auto", height: 26, padding: "0 9px" }} onClick={onAdd}><Lic name="plus" size={13} cls="icon-sm" color="inherit" />{t.addScenarioHere}</button>
      </div>
      {[...planScens.map((x, i) => ({ sc: x.sc, plan: x.plan, k: x.plan.id + ":" + i })), ...adhoc.map((sc, i) => ({ sc, plan: null, k: "adhoc:" + (sc.id != null ? sc.id : i) }))].slice(0, scLimit).map(it => row(it.sc, it.plan, it.k))}
      {(planScens.length + adhoc.length) > scLimit && <button className="note-more" style={{ margin: "6px 0 4px" }} onClick={() => setScLimit(l => l + 40)}>{lang === "ko" ? `더 보기 (${planScens.length + adhoc.length - scLimit}개 남음)` : `Show more (${planScens.length + adhoc.length - scLimit} left)`}</button>}
    </div>
  );
}

Object.assign(window, { SecurityPicker, ScenarioAuthor, SecurityScenarios, SC_CASES });
