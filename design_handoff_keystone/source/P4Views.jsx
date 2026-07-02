// P4Views.jsx — optional sidebar destinations: Watchlist, Simulator (standalone),
// Scenarios monitor, Archive, Trash + Customize-sidebar modal.

/* ---- Watchlist (watched securities) ---- */
function watchViewLoad() { try { return JSON.parse(localStorage.getItem("keystone-watch-view") || "{}"); } catch (e) { return {}; } }
function WatchlistView({ t, lang, plans, onOpenSecurity, panel, setPanel, filterAnchor }) {
  const ko = lang === "ko";
  const saved = React.useRef(watchViewLoad()).current;
  const [wF, setWF] = React.useState({});
  const [sort, setSort] = React.useState(saved.sort || "default");
  const [grp, setGrp] = React.useState(saved.grp || "none");
  const persist = (s, g) => { try { localStorage.setItem("keystone-watch-view", JSON.stringify({ sort: s, grp: g })); } catch (e) {} };
  const setSort1 = (s) => { setSort(s); persist(s, grp); };
  const setGrp1 = (g) => { setGrp(g); persist(sort, g); };
  const wToggle = (type, value) => setWF(prev => { const cur = prev[type] || []; const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]; const out = { ...prev }; if (next.length) out[type] = next; else delete out[type]; return out; });

  const watched = SECURITIES.filter(s => s.watched);
  const sectorsPresent = [...new Map(watched.map(s => [(s.gics || s.sector).en, (s.gics || s.sector)])).values()];
  const gicsCount = {}; watched.forEach(s => { const k = (s.gics || s.sector).en; gicsCount[k] = (gicsCount[k] || 0) + 1; });
  const cats = [
    { type: "market", label: ko ? "시장" : "Market", axis: "globe", options: MARKETS.map(m => ({ value: m.key, label: (m.label[lang] || m.label), icon: <Flag market={m.key} size={12} /> })) },
    { type: "sector", label: ko ? "섹터" : "Sector", axis: "shapes", options: GICS_SECTORS.map(g => ({ value: g.en, label: g[lang], n: gicsCount[g.en] || 0, icon: <Lic name="shapes" size={13} cls="icon-sm" color="var(--fg-3)" /> })) },
    { type: "plans", label: ko ? "플랜" : "Plans", axis: "square-pen", options: [{ value: "has", label: ko ? "플랜 있음" : "Has plans", icon: <Lic name="square-pen" size={13} cls="icon-sm" color="var(--fg-3)" /> }, { value: "none", label: ko ? "관심만" : "Watch only", icon: <Lic name="star" size={13} cls="icon-sm" color="var(--r-base)" /> }] },
    { type: "change", label: ko ? "등락" : "Change", axis: "trending-up", options: [{ value: "up", label: ko ? "상승" : "Up", icon: <Lic name="trending-up" size={13} cls="icon-sm" color="var(--pos)" /> }, { value: "down", label: ko ? "하락" : "Down", icon: <Lic name="trending-down" size={13} cls="icon-sm" color="var(--neg)" /> }] },
  ];
  const wMatch = (s) => Object.entries(wF).every(([type, vals]) => {
    if (!vals || !vals.length) return true;
    if (type === "market") return vals.includes(s.market);
    if (type === "sector") return vals.includes((s.gics || s.sector).en);
    if (type === "plans") { const has = plansForTicker(plans, s.ticker).length > 0; return (vals.includes("has") && has) || (vals.includes("none") && !has); }
    if (type === "change") return (vals.includes("up") && s.change >= 0) || (vals.includes("down") && s.change < 0);
    return true;
  });
  let list = watched.filter(wMatch);
  if (sort === "change") list = [...list].sort((a, b) => b.change - a.change);
  else if (sort === "name") list = [...list].sort((a, b) => a.name[lang].localeCompare(b.name[lang]));
  const nF = Object.keys(wF).length;
  const chipTypeLabel = { market: ko ? "시장" : "Market", sector: ko ? "섹터" : "Sector", plans: ko ? "플랜" : "Plans", change: ko ? "등락" : "Change" };
  const chipValLabel = (type, v) => {
    if (type === "market") { const m = MARKETS.find(x => x.key === v); return m ? (m.label[lang] || m.label) : v; }
    if (type === "sector") { const sec = GICS_SECTORS.find(x => x.en === v) || sectorsPresent.find(x => x.en === v); return sec ? sec[lang] : v; }
    if (type === "plans") return v === "has" ? (ko ? "플랜 있음" : "Has plans") : (ko ? "관심만" : "Watch only");
    if (type === "change") return v === "up" ? (ko ? "상승" : "Up") : (ko ? "하락" : "Down");
    return v;
  };

  const mini = (s) => {
    const sp = s.spark.slice(-18); const min = Math.min(...sp), max = Math.max(...sp);
    const pts = sp.map((v, i) => `${(i / (sp.length - 1) * 64).toFixed(1)},${(18 - (v - min) / (max - min || 1) * 15 - 1).toFixed(1)}`).join(" ");
    return <svg width="64" height="18" style={{ flex: "none" }}><polyline points={pts} fill="none" stroke={s.change >= 0 ? "var(--pos)" : "var(--neg)"} strokeWidth="1.5" /></svg>;
  };
  const rowEl = (s) => {
    const up = s.change >= 0;
    return (
      <div className="plan-row" key={s.ticker} onClick={() => onOpenSecurity(s.ticker)}>
        <Lic name="star" size={14} cls="icon-sm" color="var(--r-base)" />
        <span className="mono" style={{ width: 64, color: "var(--fg-4)", fontSize: 12 }}>{s.ticker}</span>
        <span className="pr-tk" style={{ width: 220 }}>
          <span className="pr-name"><Flag market={s.market} size={14} /> {s.name[lang]}</span>
          <span className="pr-ticker">{s.sector[lang]}</span>
        </span>
        <span className="pr-spacer" />
        <NPlansBadge plans={plans} ticker={s.ticker} lang={lang} t={t} />
        {mini(s)}
        <span className="mono" style={{ width: 96, textAlign: "right", color: "var(--fg)" }}>{fmtCompact(s.price, s.cur)}</span>
        <span className={"mono " + (up ? "pos" : "neg")} style={{ width: 70, textAlign: "right", fontWeight: 600 }}>{up ? "+" : ""}{s.change.toFixed(2)}%</span>
      </div>
    );
  };
  let groups = null;
  if (grp === "market") groups = MARKETS.filter(m => list.some(s => s.market === m.key)).map(m => ({ key: m.key, headIcon: <Flag market={m.key} size={13} />, title: (m.label[lang] || m.label), items: list.filter(s => s.market === m.key) }));
  else if (grp === "sector") groups = sectorsPresent.filter(sec => list.some(s => (s.gics || s.sector).en === sec.en)).map(sec => ({ key: sec.en, headIcon: <Lic name="shapes" size={13} cls="icon-sm" color="var(--fg-3)" />, title: sec[lang], items: list.filter(s => (s.gics || s.sector).en === sec.en) }));

  const wRow = s => ({ name: s.name[lang], flag: <Flag market={s.market} size={11} />, val: (s.change >= 0 ? "+" : "") + s.change.toFixed(2) + "%", tone: s.change >= 0 ? "pos" : "neg" });
  const byChg = [...list].sort((a, b) => b.change - a.change);
  const upList = list.filter(s => s.change >= 0), downList = list.filter(s => s.change < 0);
  const avgChg = list.length ? list.reduce((a, s) => a + s.change, 0) / list.length : null;
  const krList = list.filter(s => s.market === "KR"), usList = list.filter(s => s.market === "US");

  return (
    <div className="body-main">
      {list.length > 0 && <div className="dash-headline" style={{ padding: "16px 20px", margin: 0 }}>
        <DashStat lab={ko ? "종목" : "Securities"} val={String(list.length)} tip={byChg.map(wRow)} />
        <DashStat lab={ko ? "상승" : "Up"} val={String(upList.length)} tone={upList.length ? "pos" : undefined} tip={[...upList].sort((a, b) => b.change - a.change).map(wRow)} />
        <DashStat lab={ko ? "하락" : "Down"} val={String(downList.length)} tone={downList.length ? "neg" : undefined} tip={[...downList].sort((a, b) => a.change - b.change).map(wRow)} />
        {avgChg != null && <DashStat lab={ko ? "평균 등락" : "Avg change"} val={(avgChg >= 0 ? "+" : "") + avgChg.toFixed(2) + "%"} tone={avgChg >= 0 ? "pos" : "neg"} tip={byChg.map(wRow)} />}
        <DashStat lab={ko ? "한국 / 미국" : "KR / US"} val={krList.length + " / " + usList.length} tip={[...krList, ...usList].map(wRow)} />
      </div>}
      {nF > 0 && <div className="filterbar" style={{ borderTop: 0 }}>
        {Object.entries(wF).map(([type, vals]) => (
          <div className="filter-chip" key={type}>
            <span className="fc-seg fc-key">{chipTypeLabel[type]}</span>
            <span className="fc-seg">{vals.map(v => chipValLabel(type, v)).join(", ")}</span>
            <span className="fc-x" onClick={() => setWF(prev => { const o = { ...prev }; delete o[type]; return o; })}><Lic name="x" size={12} cls="icon-sm" color="inherit" /></span>
          </div>
        ))}
        <span style={{ font: "var(--fw-medium) 12px var(--font-sans)", color: "var(--fg-4)" }}>{list.length} / {watched.length}</span>
        <div className="right"><span className="linklike" onClick={() => setWF({})}>{t.clear}</span></div>
      </div>}
      {!watched.length ? <div className="empty-state"><Lic name="star" size={26} color="var(--fg-4)" /><div className="es-title">{t.emptyWatch}</div></div>
        : !list.length ? <div className="empty-state"><Lic name="star" size={26} color="var(--fg-4)" /><div className="es-title">{ko ? "조건에 맞는 종목 없음" : "No securities match"}</div><div className="linklike" style={{ marginTop: 8 }} onClick={() => setWF({})}>{t.clear}</div></div>
        : groups ? groups.map(g => <div key={g.key}><div className="grp-head">{g.headIcon}<span className="grp-title">{g.title}</span><span className="grp-count">{g.items.length}</span></div>{g.items.map(rowEl)}</div>)
        : list.map(rowEl)}
      {panel === "filter" && <FilterPanel t={t} lang={lang} filters={wF} onToggle={wToggle} onClose={() => setPanel(null)} anchor={filterAnchor} cats={cats} />}
      {panel === "display" && <React.Fragment>
        <div className="overlay" onClick={() => setPanel(null)} />
        <div className="panel" style={{ position: "fixed", top: 84, right: 52, width: 300, zIndex: 45, padding: 8 }}>
          <div className="disp-segrow"><span className="disp-segrow-lab">{t.order}</span>
            <div className="rb-modebar" style={{ margin: 0 }}>
              {[["default", ko ? "기본" : "Default"], ["change", ko ? "등락률" : "Change"], ["name", ko ? "이름" : "Name"]].map(([v, lab]) => <div key={v} className={"rb-mode" + (sort === v ? " on" : "")} onClick={() => setSort1(v)}>{lab}</div>)}
            </div>
          </div>
          <div className="disp-segrow"><span className="disp-segrow-lab">{t.group}</span>
            <div className="rb-modebar" style={{ margin: 0 }}>
              {[["none", t.none], ["market", ko ? "시장" : "Market"], ["sector", ko ? "섹터" : "Sector"]].map(([v, lab]) => <div key={v} className={"rb-mode" + (grp === v ? " on" : "")} onClick={() => setGrp1(v)}>{lab}</div>)}
            </div>
          </div>
        </div>
      </React.Fragment>}
    </div>
  );
}

/* ---- 재무제표 브라우저 (옵션 섹션) — 종목 검색·선택 → 그 종목 재무제표 ---- */
function makeSimPlan(tk) {
  const p = (typeof PLANS !== "undefined" ? PLANS : []).find(x => x.ticker === tk && x.fin);
  if (p) return p;
  const s = securityOf(tk);
  const fin = (typeof finOf !== "undefined") ? finOf(tk, s.price, s.eps, s.sharesOut) : null;
  return { id: "SIM-" + tk, ticker: tk, currentPrice: s.price, eps: s.eps, sharesOut: s.sharesOut, cur: s.cur, fin };
}
function StatementsBrowser({ t, lang, plans, onOpenSecurity }) {
  const ko = lang === "ko";
  const [tk, setTk] = React.useState(SECURITIES[0].ticker);
  const s = securityOf(tk);
  // 해당 종목의 플랜이 있으면 그 fin을 쓰고, 없으면 SIM pseudo-plan으로 합성
  const realPlan = plansForTicker(plans, tk).find(p => p.fin) || makeSimPlan(tk);
  const plan = realPlan;
  return (
    <div className="body-main">
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "24px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
          <SecurityPicker ticker={tk} lang={lang} t={t} onPick={setTk} width={360} />
          <span className="stmt-basis">{s.cur === "USD" ? "US-GAAP" : "K-IFRS"} · {ko ? "연결" : "Consolidated"}</span>
        </div>
        {plan.fin ? <FinancialsTab plan={plan} t={t} lang={lang} />
          : <div className="empty-state"><Lic name="file-text" size={26} color="var(--fg-4)" /><div className="es-title">{ko ? "재무 데이터 없음" : "No financials"}</div></div>}
      </div>
    </div>
  );
}

/* ---- Framework Screener — apply a framework's grade rules across the universe ---- */
const SCV_VERDICT = {
  pass:  { ko: "통과", en: "Pass",  color: "var(--pos)" },
  watch: { ko: "관찰", en: "Watch", color: "var(--r-base)" },
  fail:  { ko: "탈락", en: "Fail",  color: "var(--neg)" },
};
const SCV_ORDER = ["pass", "watch", "fail"];
// GICS 11 sectors — canonical, API-ready taxonomy (maps both KR/US universes). Securities carry s.gics; s.sector stays as the finer industry sub-label shown under the row name.
const GICS_SECTORS = [
  { en: "Energy", ko: "에너지" },
  { en: "Materials", ko: "소재" },
  { en: "Industrials", ko: "산업재" },
  { en: "Consumer Discretionary", ko: "경기소비재" },
  { en: "Consumer Staples", ko: "필수소비재" },
  { en: "Health Care", ko: "헬스케어" },
  { en: "Financials", ko: "금융" },
  { en: "Information Technology", ko: "정보기술" },
  { en: "Communication Services", ko: "커뮤니케이션" },
  { en: "Utilities", ko: "유틸리티" },
  { en: "Real Estate", ko: "부동산" },
];
// value verdict — mean-reversion to the security's own 5yr PER band midpoint
const SCV_VAL = { under: { ko: "저평가", en: "Undervalued", color: "var(--pos)" }, fair: { ko: "적정", en: "Fairly valued", color: "var(--r-base)" }, over: { ko: "고평가", en: "Overvalued", color: "var(--neg)" } };
const SCV_VAL_ORDER = ["under", "fair", "over"];
const SCV_INDLAB = (k, ko) => ({
  PER: "PER", PBR: "PBR", PSR: "PSR", PCR: "PCR", EVEB: "EV/EBITDA", PEG: "PEG", ROE: "ROE", ROA: "ROA",
  OPM: ko ? "영업이익률" : "Op. margin", NPM: ko ? "순이익률" : "Net margin", GPM: ko ? "매출총이익률" : "Gross margin",
  REVG: ko ? "매출성장" : "Rev growth", OPG: ko ? "영업이익성장" : "OP growth", NPG: ko ? "순이익성장" : "NI growth",
  DEBT: ko ? "부채비율" : "Debt", CURR: ko ? "유동비율" : "Current", INTCOV: ko ? "이자보상" : "Int cov",
  DIVY: ko ? "배당수익률" : "Div yield", PAYOUT: ko ? "배당성향" : "Payout", DIVG: ko ? "배당성장" : "Div growth",
}[k] || k);
const SCV_INDLAB_SHORT = (k, ko) => !ko ? SCV_INDLAB(k, ko) : ({ OPM: "영업익", NPM: "순익", GPM: "매출총익", REVG: "매출성장", OPG: "영업성장", NPG: "순익성장", DEBT: "부채", CURR: "유동", INTCOV: "이자보상", DIVY: "배당", PAYOUT: "배당성향", DIVG: "배당성장" }[k] || SCV_INDLAB(k, ko));
// Financial-statement flags — boolean/trend conditions that ratios can't express.
// Computed from the IS / BS / CF time series (works identically once real DART/EDGAR data lands).
const FIN_FLAG_DEFS = [
  { key: "fcf_pos",    ko: "FCF 흑자",          en: "FCF positive",     tip: { ko: "최근 회계연도 잉여현금흐름(영업CF−CapEx) > 0", en: "Latest-FY free cash flow (OCF−CapEx) > 0" } },
  { key: "fcf_streak", ko: "FCF 3년 연속 흑자",  en: "FCF 3yr positive", tip: { ko: "최근 3개 회계연도 모두 잉여현금흐름 흑자", en: "Free cash flow positive in each of the last 3 FYs" } },
  { key: "op_turn",    ko: "영업익 흑자전환",    en: "Op. turnaround",   tip: { ko: "직전 연도 영업적자 → 최근 연도 영업흑자", en: "Operating loss last year → operating profit this year" } },
  { key: "rev_streak", ko: "매출 3년 연속 성장", en: "Revenue 3yr ↑",    tip: { ko: "최근 3개 연도 매출이 매년 증가", en: "Revenue rose every year over the last 3 FYs" } },
  { key: "op_streak",  ko: "영업익 3년 연속 증가", en: "Op. income 3yr ↑", tip: { ko: "최근 3개 연도 영업이익이 매년 증가", en: "Operating income rose every year over the last 3 FYs" } },
  { key: "net_cash",   ko: "순현금·저부채",      en: "Net cash / low debt", tip: { ko: "부채가 자본의 30% 미만 — 사실상 순현금 우량 재무구조", en: "Total liabilities under 30% of equity — net-cash-like balance sheet" } },
];
function finFlags(fin) {
  if (!fin) return {};
  const is = fin.is || [], cf = fin.cf || [], bs = fin.bs || [];
  const n = is.length, f = {};
  const L = is[n - 1] || {}, P = is[n - 2] || {};
  const cfL = cf[cf.length - 1] || {};
  const lb = bs[bs.length - 1] || {};
  f.fcf_pos = cfL.fcf > 0;
  f.fcf_streak = cf.length >= 3 && cf.slice(-3).every(c => c.fcf > 0);
  f.op_profit = L.op > 0;
  f.op_turn = P.op != null && P.op <= 0 && L.op > 0;
  f.rev_streak = n >= 3 && is[n - 3].rev < is[n - 2].rev && is[n - 2].rev < is[n - 1].rev;
  f.op_streak = n >= 3 && is[n - 3].op < is[n - 2].op && is[n - 2].op < is[n - 1].op;
  f.net_cash = lb.liab != null && lb.equity > 0 && lb.liab < lb.equity * 0.3;
  return f;
}
const scvToneCol = tn => tn === "good" ? "var(--pos)" : tn === "bad" ? "var(--neg)" : tn === "mid" ? "var(--r-base)" : "var(--fg-4)";
const scvFmtV = (m, ko) => (!m || m.v == null || !isFinite(m.v)) ? "—" : m.fmt === "x" ? m.v.toFixed(1) + (ko ? "배" : "×") : m.v.toFixed(1) + "%";
// 브라우즈 행 추세 스파크 (SecurityView mini와 동일 비주얼)
function ScvSpark({ spark, up }) {
  const sp = (spark || []).slice(-16);
  if (sp.length < 2) return null;
  const min = Math.min(...sp), max = Math.max(...sp), W = 54, H = 16;
  const pts = sp.map((v, i) => `${(i / (sp.length - 1) * W).toFixed(1)},${(H - (v - min) / (max - min || 1) * (H - 3) - 1.5).toFixed(1)}`).join(" ");
  return <svg className="scv-spark" width={W} height={H} aria-hidden="true"><polyline points={pts} fill="none" stroke={up ? "var(--pos)" : "var(--neg)"} strokeWidth="1.5" /></svg>;
}
// 플랜 카운트 배지 + 호버 시 실제 플랜 리스트 (.fin-tip 호버카드 재사용)
function NPlansBadge({ plans, ticker, lang, t, onOpenPlan }) {
  const list = (typeof plansForTicker !== "undefined") ? plansForTicker(plans, ticker) : [];
  if (!list.length) return null;
  const ko = lang === "ko";
  return (
    <span className="sec-nplans fin-term nplb">{list.length}
      <span className="fin-tip nplb-tip">
        <span className="nplb-tip-h">{ko ? "이 종목의 플랜" : "Plans on this security"}<span className="nplb-tip-n">{list.length}</span></span>
        {list.map(p => {
          const ret = (typeof planReturn !== "undefined") ? planReturn(p) : null;
          return (
            <span className="nplb-row" key={p.id} onClick={onOpenPlan ? (e) => { e.stopPropagation(); onOpenPlan(p); } : undefined}>
              <StatusIcon status={p.status} size={12} />
              <span className="nplb-nm">{p.name ? p.name[lang] : p.id}</span>
              {ret ? <span className={"nplb-ret mono " + (ret.rate >= 0 ? "pos" : "neg")}>{(ret.rate >= 0 ? "+" : "") + ret.rate.toFixed(1) + "%"}</span>
                : <span className="nplb-st">{t ? t["s_" + p.status] : p.status}</span>}
            </span>
          );
        })}
      </span>
    </span>
  );
}
// ── verdict explainer: data-driven from the active lens's gradeFocus + IND_THRESH (zero per-lens code) ──
const SCV_PCT_KEYS = ["ROE", "ROA", "OPM", "NPM", "GPM", "REVG", "OPG", "NPG", "DEBT", "CURR", "DIVY", "PAYOUT", "DIVG"];
const scvUnit = (k, ko) => SCV_PCT_KEYS.includes(k) ? "%" : (ko ? "배" : "\u00d7");
const SCV_TONE = { good: { ko: "우수", en: "Strong", pt: 2 }, mid: { ko: "보통", en: "Fair", pt: 1 }, bad: { ko: "미달", en: "Weak", pt: 0 } };
function scvThreshTxt(key, tone, ko, fwId) {
  const th = (typeof lensThreshOf !== "undefined") ? lensThreshOf(fwId, key) : ((typeof IND_THRESH !== "undefined") ? IND_THRESH[key] : null);
  if (!th) return "";
  const u = scvUnit(key, ko), lo = th.dir === "low";
  if (tone === "good") return (lo ? "≤" : "≥") + th.good + u;
  if (tone === "bad") return (lo ? "≥" : "≤") + th.warn + u;
  return (lo ? th.good + "~" + th.warn : th.warn + "~" + th.good) + u;
}
function MetricCell({ m, ko, fwId, bare }) {
  const ref = React.useRef(null);
  const [pos, setPos] = React.useState(null);
  const open = () => { const el = ref.current; if (!el) return; const r = el.getBoundingClientRect(); const left = Math.max(8, Math.min(r.left, window.innerWidth - 262)); const below = r.bottom + 6; const top = (below + 172 > window.innerHeight) ? Math.max(8, r.top - 178) : below; setPos({ left, top }); };
  const dict = (typeof KS_METRIC_DICT !== "undefined") ? KS_METRIC_DICT(ko) : {};
  const fml = (typeof KS_METRIC_FORMULA !== "undefined") ? KS_METRIC_FORMULA : {};
  const d = dict[m.key] || [SCV_INDLAB(m.key, ko), ""];
  const th = (typeof lensThreshOf !== "undefined") ? lensThreshOf(fwId, m.key) : ((typeof IND_THRESH !== "undefined") ? IND_THRESH[m.key] : null);
  const dir = th ? (th.dir === "high" ? (ko ? " 높을수록 좋습니다." : " Higher is better.") : (ko ? " 낮을수록 좋습니다." : " Lower is better.")) : "";
  let band = null;
  if (th && m.v != null && isFinite(m.v)) {
    const unit = m.fmt === "x" ? (ko ? "배" : "×") : "%";
    const goodTxt = (th.dir === "low" ? "≤" : "≥") + th.good + unit;
    const warnTxt = (th.dir === "low" ? "≥" : "≤") + th.warn + unit;
    const col = scvToneCol(m.tone);
    const zone = m.tone === "good" ? (ko ? "우수 구간" : "Good zone") : m.tone === "bad" ? (ko ? "주의 구간" : "Watch zone") : (ko ? "보통 구간" : "Fair zone");
    band = <span className="fin-tip-grade"><span className="fin-tip-grade-now">{ko ? "현재 " : ""}<b>{scvFmtV(m, ko)}</b> · <b style={{ color: col }}>{zone}</b></span><span className="fin-tip-grade-sc"><span className="ftg-good">{ko ? "우수" : "Good"} {goodTxt}</span><span className="ftg-sep">·</span><span className="ftg-bad">{ko ? "주의" : "Watch"} {warnTxt}</span></span></span>;
  }
  return (
    <span ref={ref} className={"scv-ind scv-ind-tip" + (bare ? " scv-ind-bare" : "")} onMouseEnter={open} onMouseLeave={() => setPos(null)}>
      {!bare && <span className="scv-ind-lab">{SCV_INDLAB(m.key, ko)}</span>}
      <span className="scv-ind-v mono" style={{ color: scvToneCol(m.tone) }}>{scvFmtV(m, ko)}</span>
      {pos && <span className="fin-tip scv-mtip" style={{ position: "fixed", left: pos.left, top: pos.top, opacity: 1, marginTop: 0 }}><b>{d[0]}</b><span className="fin-tip-def">{d[1]}<span className="fin-tip-dir">{dir}</span></span>{fml[m.key] && <span className="fin-tip-f">{fml[m.key]}</span>}{band}</span>}
    </span>
  );
}
function ScvPips({ r, cls, color }) {
  const col = color || (SCV_VERDICT[r.verdict] || {}).color || "var(--fg-4)";
  const n = r.max || 0, on = r.sc || 0, cells = [];
  for (let i = 0; i < n; i++) cells.push(<span key={i} className={"scv-pip" + (i < on ? " on" : "")} style={i < on ? { background: col } : undefined} />);
  return <span className={"scv-pips" + (cls ? " " + cls : "")} aria-label={on + "/" + n}>{cells}</span>;
}
function VerdictTip({ r, ko, cls, fwId }) {  if (!r || !r.inds || !r.inds.length) return null;
  const vl = SCV_VERDICT[r.verdict], pct = Math.round(r.ratio * 100);
  return (
    <span className={"fin-tip scv-vtip" + (cls ? " " + cls : "")}>
      <b className="scv-vtip-head">{ko ? "왜 " : ""}<span style={{ color: vl.color }}>{vl[ko ? "ko" : "en"]}</span>{ko ? "인가" : ""} · {r.sc}/{r.max} ({pct}%)</b>
      <span className="scv-vtip-rows">
        {r.inds.map(m => {
          const tn = SCV_TONE[m.tone] || SCV_TONE.bad, col = scvToneCol(m.tone);
          return (
            <span className="scv-vtip-row" key={m.key}>
              <span className="scv-vtip-k">{SCV_INDLAB(m.key, ko)}</span>
              <span className="scv-vtip-v mono" style={{ color: col }}>{scvFmtV(m, ko)}</span>
              <span className="scv-vtip-j" style={{ color: col }}>{tn[ko ? "ko" : "en"]} <span className="scv-vtip-th mono">{scvThreshTxt(m.key, m.tone, ko, fwId)}</span></span>
              <span className="scv-vtip-pt mono" style={{ color: col }}>+{tn.pt}</span>
            </span>
          );
        })}
      </span>
      <span className="scv-vtip-foot">{ko ? "합계 " + r.sc + "/" + r.max + " · 통과 ≥80% · 관찰 50~80% · 탈락 <50%" : "Total " + r.sc + "/" + r.max + " · Pass ≥80% · Watch 50–80% · Fail <50%"}</span>
    </span>
  );
}
function ValueTip({ r, ko }) {
  if (r.valUp == null) return null;
  const vl = SCV_VAL[r.valV], cur = r.s.cur;
  const rows = [
    [ko ? "현재가" : "Price", fmtCompact(r.s.price, cur), null],
    [ko ? "적정가" : "Fair", fmtCompact(Math.round(r.fair), cur), vl.color],
    [ko ? "괴리율" : "Gap", (r.valUp >= 0 ? "+" : "") + r.valUp.toFixed(0) + "%", vl.color],
  ];
  return (
    <span className="fin-tip scv-vtip scv-valtip">
      <b className="scv-vtip-head">{ko ? "괴리 · " : "Value · "}<span style={{ color: vl.color }}>{vl[ko ? "ko" : "en"]}</span></b>
      <span className="scv-vtip-rows">
        {rows.map((rw, i) => (
          <span className="scv-valtip-row" key={i}>
            <span className="scv-valtip-k">{rw[0]}</span>
            <span className="scv-valtip-v mono" style={rw[2] ? { color: rw[2] } : null}>{rw[1]}</span>
          </span>
        ))}
      </span>
      <span className="scv-vtip-foot">{ko
        ? `적정가 = EPS ${fmtCompact(r.s.eps, cur)} × 5년 PER 밴드 중앙값 ${r.midPer ? r.midPer.toFixed(1) + "배" : "—"}. +면 저평가 · −면 고평가.`
        : `Fair = EPS × mid of the 5yr P/E band. + = undervalued.`}</span>
    </span>
  );
}
function SummaryTip({ v, focus, ko }) {
  const vl = SCV_VERDICT[v];
  const band = { pass: ko ? "80% 이상" : "≥80%", watch: ko ? "50~80%" : "50–80%", fail: ko ? "50% 미만" : "<50%" }[v];
  const metr = (focus || []).map(k => SCV_INDLAB(k, ko)).join(" · ");
  return (
    <span className="fin-tip scv-stip">
      <b><span style={{ color: vl.color }}>{vl[ko ? "ko" : "en"]}</span></b>
      <span className="scv-stip-def">{ko ? `현재 관점의 등급 점수가 만점의 ${band}인 종목.` : `Securities scoring ${band} of the lens's grade points.`}</span>
      {metr && <span className="scv-stip-metr">{ko ? "채점 지표" : "Metrics"}: {metr}<span className="scv-stip-dim"> · {ko ? "각 우수 2·보통 1·미달 0점" : "each Strong2·Fair1·Weak0"}</span></span>}
      {v === "fail" && <span className="scv-stip-dim">{ko ? "클릭하면 제외 목록을 펼칩니다." : "Click to expand the excluded list."}</span>}
      <span className="scv-vtip-foot">{ko ? "통과 ≥80% · 관찰 50~80% · 탈락 <50%" : "Pass ≥80% · Watch 50–80% · Fail <50%"}</span>
    </span>
  );
}

// heatmap tile fill — quality score (ratio 0..1): red → amber → green (solid hue, dark text)
function scvHeatScore(ratio) {
  const lerp = (a, b, tt) => Math.round(a + (b - a) * tt);
  let c1, c2, tt;
  if (ratio < 0.5) { c1 = [235, 87, 87]; c2 = [242, 201, 76]; tt = ratio / 0.5; }
  else { c1 = [242, 201, 76]; c2 = [39, 174, 96]; tt = (ratio - 0.5) / 0.5; }
  return "rgb(" + lerp(c1[0], c2[0], tt) + "," + lerp(c1[1], c2[1], tt) + "," + lerp(c1[2], c2[2], tt) + ")";
}
// heatmap tile fill — daily change %: translucent red/green on dark bg, clamped ±4%
function scvHeatChange(chg) {
  const m = Math.max(-1, Math.min(1, chg / 4));
  const a = (0.16 + Math.abs(m) * 0.64).toFixed(2);
  return m >= 0 ? "rgba(39,174,96," + a + ")" : "rgba(235,87,87," + a + ")";
}

function ScreenerView({ t, lang, plans, onOpenSecurity, panel, setPanel, filterAnchor, setFilterAnchor }) {
  const ko = lang === "ko";
  const fws = (typeof STRATEGIES !== "undefined" ? STRATEGIES : []).filter(s => s.model);
  const LSK = "keystone-screener-v1";
  const saved = React.useRef((() => { try { return JSON.parse(localStorage.getItem(LSK)) || {}; } catch (e) { return {}; } })()).current;
  const [fwId, setFwId] = React.useState(saved.fwId === "none" || (saved.fwId && fws.find(f => f.id === saved.fwId)) ? saved.fwId : (fws[0] ? fws[0].id : null));
  const [filters, setFilters] = React.useState(() => { const sf = saved.filters || {}; return { verdict: (sf.verdict || []).filter(v => v !== "fail"), market: sf.market || [], sector: sf.sector || [], universe: sf.universe || [], finflag: sf.finflag || [], value: sf.value || [], num: sf.num || [] }; });
  const [sortKey, setSortKey] = React.useState(saved.sortKey || "score");
  const [groupBy, setGroupBy] = React.useState(saved.groupBy || "verdict");
  const [cols, setCols] = React.useState(saved.cols || null); // null = all focus indicators
  const [layout, setLayout] = React.useState(saved.layout || "list"); // list | board | heatmap
  const [heatMode, setHeatMode] = React.useState(saved.heatMode || "score"); // score | change
  const [fltOpen, setFltOpen] = React.useState(null); // category whose flyout is open
  const [showExcl, setShowExcl] = React.useState(false); // expand the collapsed "excluded (fail)" section
  React.useEffect(() => { try { localStorage.setItem(LSK, JSON.stringify({ fwId, filters, sortKey, groupBy, cols, layout, heatMode })); } catch (e) {} }, [fwId, filters, sortKey, groupBy, cols, layout, heatMode]);
  const [numQuery, setNumQuery] = React.useState(""); // metric-search box inside the 지표 조건 flyout
  React.useEffect(() => { setNumQuery(""); }, [fltOpen]);
  // saved screens — named snapshots of the full screener config
  const SAVE_LSK = "keystone-screener-saves-v1";
  const [saves, setSaves] = React.useState(() => { try { return JSON.parse(localStorage.getItem(SAVE_LSK)) || []; } catch (e) { return []; } });
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [saveName, setSaveName] = React.useState("");
  const persistSaves = (next) => { setSaves(next); try { localStorage.setItem(SAVE_LSK, JSON.stringify(next)); } catch (e) {} };
  const applySave = (sv) => { const c = sv.cfg || {}; if (c.fwId) setFwId(c.fwId); if (c.filters) setFilters(c.filters); if (c.sortKey) setSortKey(c.sortKey); if (c.groupBy) setGroupBy(c.groupBy); setCols(c.cols != null ? c.cols : null); if (c.layout) setLayout(c.layout); if (c.heatMode) setHeatMode(c.heatMode); setSaveOpen(false); };
  const addSave = () => { const nm = saveName.trim(); if (!nm) return; persistSaves([...saves, { id: "scr" + Date.now(), name: nm, cfg: { fwId, filters, sortKey, groupBy, cols, layout, heatMode } }]); setSaveName(""); setSaveOpen(false); };
  const delSave = (id) => persistSaves(saves.filter(x => x.id !== id));

  const noLens = fwId === "none";
  const fw = noLens ? null : (fws.find(s => s.id === fwId) || fws[0]);
  const focus = (fw && fw.gradeFocus) || [];
  const shownCols = cols ? focus.filter(k => cols.includes(k)) : focus;
  // no-lens mode = pure raw-filter screening: drop the quality-only layouts/sorts/groups
  React.useEffect(() => {
    if (!noLens) return;
    if (layout === "quadrant") setLayout("list");
    if (sortKey === "score") setSortKey("value");
    if (groupBy === "verdict") setGroupBy("none");
    if (heatMode === "score") setHeatMode("value");
  }, [noLens]);

  const sectors = React.useMemo(() => {
    const cnt = {};
    SECURITIES.forEach(s => { const k = (s.gics || s.sector).en; cnt[k] = (cnt[k] || 0) + 1; });
    return GICS_SECTORS.map(g => ({ value: g.en, label: g[lang], n: cnt[g.en] || 0 }));
  }, [lang]);

  // score the full universe — memoized so it only recomputes on lens / plans / focus-metric change
  // (not on every filter keystroke, hover, or layout toggle). Safe at thousands of rows.
  const scored = React.useMemo(() => SECURITIES.map(s => {
    const fin = finOf(s.ticker, s.price, s.eps, s.sharesOut);
    if (!fin) return null;
    const vals = {}; fin.indicators.forEach(m => { vals[m.key] = m.v; });
    // value axis (lens-independent): fair = EPS × geometric-mean of the security's 5yr PER band
    const midPer = (s.perLo > 0 && s.perHi > 0) ? Math.sqrt(s.perLo * s.perHi) : null;
    const fair = (midPer && s.eps > 0) ? s.eps * midPer : null;
    const valUp = fair ? (fair / s.price - 1) * 100 : null;   // + = 저평가 · − = 고평가
    const valV = valUp == null ? null : valUp >= 15 ? "under" : valUp <= -15 ? "over" : "fair";
    const base = { s, vals, midPer, fair, valUp, valV, flags: finFlags(fin), n: plansForTicker(plans, s.ticker).length };
    if (noLens) return { ...base, inds: [], sc: null, max: null, ratio: null, verdict: null };
    const inds = focus.map(k => fin.indicators.find(x => x.key === k)).filter(Boolean)
      .map(m => { const tone = (typeof gradeWithFw !== "undefined") ? gradeWithFw(fwId, m.key, m.v) : m.tone; return tone === m.tone ? m : { ...m, tone }; });
    const sc = inds.reduce((a, m) => a + (m.tone === "good" ? 2 : m.tone === "mid" ? 1 : 0), 0);
    const max = inds.length * 2 || 1;
    const ratio = sc / max;
    const verdict = ratio >= 0.8 ? "pass" : ratio >= 0.5 ? "watch" : "fail";
    return { ...base, inds, sc, max, ratio, verdict };
  }).filter(Boolean), [fwId, plans, focus.join(",")]);

  const fmatch = (r) => {
    if (filters.market.length && !filters.market.includes(r.s.market)) return false;
    if (filters.sector.length && !filters.sector.includes((r.s.gics || r.s.sector).en)) return false;
    if (filters.universe.includes("watched") && !r.s.watched) return false;
    if (filters.finflag.length && !filters.finflag.every(k => r.flags[k])) return false; // AND across flags
    if (filters.value.length && !filters.value.includes(r.valV)) return false;
    for (const nf of (filters.num || [])) {
      if (nf.val === "" || nf.val == null) continue;
      const v = r.vals[nf.key];
      if (v == null || !isFinite(v)) return false;       // missing data → can't satisfy → excluded
      if (nf.op === "lte" && !(v <= nf.val)) return false;
      if (nf.op === "gte" && !(v >= nf.val)) return false;
    }
    return true;
  };
  const matched = scored.filter(fmatch);
  // (B) summary bar counts the FILTERED survivors, so the bar agrees with the list below
  // (통과+관찰 = 후보, 탈락 = 제외). Also the scalable shape: with a real API you filter
  // server-side first, then grade only the survivors — same flow.
  const counts = { pass: 0, watch: 0, fail: 0 };
  matched.forEach(r => { if (r.verdict) counts[r.verdict]++; });
  const vFocus = (filters.verdict || []).filter(v => v !== "fail");
  const failRows = noLens ? [] : matched.filter(r => r.verdict === "fail");
  let rows = noLens ? matched.slice() : matched.filter(r => r.verdict !== "fail" && (!vFocus.length || vFocus.includes(r.verdict)));
  const sorters = {
    score: (a, b) => b.ratio - a.ratio || b.sc - a.sc,
    value: (a, b) => (b.valUp == null ? -1e9 : b.valUp) - (a.valUp == null ? -1e9 : a.valUp),
    change: (a, b) => b.s.change - a.s.change,
    name: (a, b) => a.s.name[lang].localeCompare(b.s.name[lang]),
  };
  rows = rows.slice().sort(sorters[sortKey] || sorters.score);
  // quadrant uses quality as the Y axis (scatter shows the full candidate set, fails included)
  const quadRows = matched;

  let groups;
  const gb = noLens && groupBy === "verdict" ? "none" : groupBy;
  if (gb === "sector") {
    groups = sectors.map(sec => ({ key: sec.value, head: { label: sec.label, dot: "var(--fg-3)" }, items: rows.filter(r => (r.s.gics || r.s.sector).en === sec.value) })).filter(g => g.items.length);
  } else if (gb === "none") {
    groups = [{ key: "all", head: null, items: rows }];
  } else {
    groups = SCV_ORDER.map(v => ({ key: v, head: { label: SCV_VERDICT[v][lang], dot: SCV_VERDICT[v].color }, items: rows.filter(r => r.verdict === v) })).filter(g => g.items.length);
  }

  const chips = [];
  filters.market.forEach(v => chips.push({ type: "market", value: v, label: v === "KR" ? (ko ? "한국" : "Korea") : v === "US" ? (ko ? "미국" : "US") : v }));
  filters.sector.forEach(v => chips.push({ type: "sector", value: v, label: (sectors.find(x => x.value === v) || { label: v }).label }));
  filters.finflag.forEach(v => { const d = FIN_FLAG_DEFS.find(x => x.key === v); if (d) chips.push({ type: "finflag", value: v, label: d[lang] }); });
  filters.value.forEach(v => chips.push({ type: "value", value: v, label: SCV_VAL[v][lang], dot: SCV_VAL[v].color }));
  if (filters.universe.includes("watched")) chips.push({ type: "universe", value: "watched", label: ko ? "관심종목만" : "Watched only" });

  const toggle = (type, value) => setFilters(prev => { const cur = prev[type] || []; return { ...prev, [type]: cur.includes(value) ? cur.filter(x => x !== value) : [...cur, value] }; });
  const clearAll = () => setFilters({ verdict: [], market: [], sector: [], universe: [], finflag: [], value: [], num: [] });
  const toggleCol = (k) => setCols(prev => { const c = prev || focus.slice(); const nx = c.includes(k) ? c.filter(x => x !== k) : [...c, k]; return nx.length ? nx : c; });
  // numeric metric filters — the raw-screening "floor" beneath the framework lens
  // 지표 조건 — grouped exactly like the 투자지표 cards (밸류에이션/수익성/성장성/안정성/배당) so filter == cards
  const NUM_CATS = [
    { cat: "value",     label: ko ? "\ubc38\ub958\uc5d0\uc774\uc158" : "Valuation",     keys: ["PER", "PBR", "PSR", "PCR", "EVEB", "PEG"] },
    { cat: "profit",    label: ko ? "\uc218\uc775\uc131" : "Profitability", keys: ["ROE", "ROA", "OPM", "NPM", "GPM"] },
    { cat: "growth",    label: ko ? "\uc131\uc7a5\uc131" : "Growth",        keys: ["REVG", "OPG", "NPG"] },
    { cat: "stability", label: ko ? "\uc548\uc815\uc131" : "Stability",     keys: ["DEBT", "CURR", "INTCOV"] },
    { cat: "dividend",  label: ko ? "\ubc30\ub2f9" : "Dividend",        keys: ["DIVY", "PAYOUT", "DIVG"] },
  ];
  const NUM_INDS = NUM_CATS.flatMap(g => g.keys);
  const NUM_PCT = ["ROE", "ROA", "OPM", "NPM", "GPM", "REVG", "OPG", "NPG", "DEBT", "CURR", "DIVY", "PAYOUT", "DIVG"];
  const NUM_UNIT = (k) => NUM_PCT.includes(k) ? "%" : (ko ? "배" : "\u00d7");
  // 충돌 감지: 필터가 현재 관점의 핵심 지표이면서, 관점이 선호하는 좋은-구간과 반대 방향을 요구할 때
  const numConflict = (nf) => { if (noLens || !focus.includes(nf.key) || nf.val === "" || nf.val == null) return null; const th = (typeof lensThreshOf !== "undefined") ? lensThreshOf(fwId, nf.key) : null; if (!th) return null; const v = +nf.val; if (th.dir === "low" && nf.op === "gte" && v > th.good) return th; if (th.dir === "high" && nf.op === "lte" && v < th.good) return th; return null; };
  const addNum = (key) => { if ((filters.num || []).some(n => n.key === key)) return; const th = (typeof lensThreshOf !== "undefined") ? lensThreshOf(fwId, key) : ((typeof IND_THRESH !== "undefined") ? IND_THRESH[key] : null); const op = th && th.dir === "low" ? "lte" : "gte"; const val = th ? th.good : 0; setFilters(p => ({ ...p, num: [...(p.num || []), { key, op, val }] })); };
  const setNum = (key, patch) => setFilters(p => ({ ...p, num: (p.num || []).map(n => n.key === key ? { ...n, ...patch } : n) }));
  const delNum = (key) => setFilters(p => ({ ...p, num: (p.num || []).filter(n => n.key !== key) }));
  // 플랜 필터와 동일한 '묶음(카테고리)' 선택 — 그룹 헤더 클릭 시 그룹 내 옵션 전체 토글
  const fltGroupOn = (type, options) => { const vals = options.map(o => o.value); return type === "num" ? vals.every(k => (filters.num || []).some(n => n.key === k)) : vals.every(v => (filters[type] || []).includes(v)); };
  const toggleFltGroup = (type, options) => { const vals = options.map(o => o.value);
    if (type === "num") { setFilters(p => { const num = p.num || []; const allOn = vals.every(k => num.some(n => n.key === k)); if (allOn) return { ...p, num: num.filter(n => !vals.includes(n.key)) }; const have = new Set(num.map(n => n.key)); const add = vals.filter(k => !have.has(k)).map(k => { const th = (typeof lensThreshOf !== "undefined") ? lensThreshOf(fwId, k) : null; return { key: k, op: th && th.dir === "low" ? "lte" : "gte", val: th ? th.good : 0 }; }); return { ...p, num: [...num, ...add] }; }); }
    else { setFilters(p => { const set = new Set(p[type] || []); const allOn = vals.every(v => set.has(v)); vals.forEach(v => allOn ? set.delete(v) : set.add(v)); return { ...p, [type]: [...set] }; }); } };

  const ruleTxt = k => { const th = (typeof lensThreshOf !== "undefined") ? lensThreshOf(fwId, k) : ((typeof IND_THRESH !== "undefined") ? IND_THRESH[k] : null); if (!th) return SCV_INDLAB(k, ko); return SCV_INDLAB(k, ko) + " " + (th.dir === "low" ? "≤" : "≥") + th.good + (["ROE","ROA","OPM","NPM","GPM","REVG","OPG","NPG","DEBT","CURR","DIVY","PAYOUT","DIVG"].includes(k) ? "%" : ""); };
  const close = () => setPanel(null);

  return (
    <div className="body-main">
      <div className="scv-toolbar">
        <LensPicker variant="toolbar" value={fwId} onPick={(v) => setFwId(v)} lang={lang} width={232} />
        <div className="scv-saves">
          <button className={"scv-saves-btn" + (saveOpen ? " on" : "")} onClick={() => setSaveOpen(o => !o)} title={t.scv_saved}>
            <Lic name="bookmark" size={13} cls="icon-sm" color="var(--fg-3)" />
            {saves.length > 0 && <span className="scv-saves-n">{saves.length}</span>}
            <Lic name="chevron-down" size={12} cls="icon-sm" color="var(--fg-4)" />
          </button>
          {saveOpen && <>
            <div className="overlay" onClick={() => setSaveOpen(false)} />
            <div className="scv-saves-menu">
              <div className="flt-head">{t.scv_saved}</div>
              {saves.length === 0 && <div className="scv-saves-empty">{t.scv_noSaves}</div>}
              {saves.map(sv => (
                <div className="v-menu-item scv-save-row" key={sv.id} onClick={() => applySave(sv)}>
                  <Lic name="bookmark" size={13} cls="icon-sm" color="var(--accent)" />
                  <span className="scv-save-nm">{sv.name}</span>
                  <span className="scv-save-x" onClick={(e) => { e.stopPropagation(); delSave(sv.id); }}><Lic name="x" size={12} cls="icon-sm" color="currentColor" /></span>
                </div>
              ))}
              <div className="flt-head-sep" />
              <div className="scv-save-cap">{t.scv_saveCur}</div>
              <div className="scv-save-add">
                <input className="scv-save-inp" placeholder={t.scv_screenName} value={saveName} onChange={e => setSaveName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addSave(); }} />
                <button className="scv-save-go" onClick={addSave} disabled={!saveName.trim()}>{ko ? "저장" : "Save"}</button>
              </div>
            </div>
          </>}
        </div>
        <span className="scv-tb-spacer" />
        {noLens && <span className="scv-nolens-note">{ko ? "숫자 필터로 거르는 중 · 품질 채점 없음" : "Raw filters only · no grading"}</span>}
        {!noLens && <span className="scv-summary">
          {SCV_ORDER.map(v => {
            const on = v === "fail" ? showExcl : (filters.verdict || []).includes(v);
            const zero = counts[v] === 0;
            return (
            <span className={"scv-sum scv-sum-tip" + (on ? " on" : "") + (v === "fail" ? " scv-sum-fail" : "") + (zero ? " scv-sum-zero" : "")} key={v}
              onClick={() => {
                if (v === "fail") { setShowExcl(x => !x); return; }
                setFilters(prev => { const cur = (prev.verdict || []).filter(x => x !== "fail"); const only = cur.length === 1 && cur[0] === v; return { ...prev, verdict: only ? [] : [v] }; });
              }}>
              <span className="scsum-dot" style={{ background: SCV_VERDICT[v].color }} />{SCV_VERDICT[v][lang]} <b>{counts[v]}</b>
              <SummaryTip v={v} focus={focus} ko={ko} />
            </span>
            );
          })}
        </span>}
      </div>

      {fw && <div className="scv-rulebar">
        <span className="scv-rule-lab"><Lic name="sliders-horizontal" size={13} cls="icon-sm" color={fw.color} />{ko ? "등급 룰" : "Grade rule"}</span>
        <span className="scv-rule-chips">{focus.map(k => <span className="scv-rule-chip mono" key={k}>{ruleTxt(k)}</span>)}</span>
      </div>}

      <div className="scv-filterbar">
        <span className="scv-fb-count"><b>{rows.length}</b> {ko ? "후보" : "candidates"}{failRows.length ? <span className="scv-fb-excl"> · {failRows.length} {ko ? "제외" : "excluded"}</span> : null}</span>
        {chips.map(c => (
          <span className="scv-chip" key={c.type + ":" + c.value}>
            {c.dot && <span className="scsum-dot" style={{ background: c.dot }} />}
            <span className="scv-chip-lab">{c.label}</span>
            <span className="scv-chip-x" onClick={() => toggle(c.type, c.value)}><Lic name="x" size={11} cls="icon-sm" color="currentColor" /></span>
          </span>
        ))}
        {(filters.num || []).map(nf => { const cf = numConflict(nf); return (
          <span className={"scv-numchip" + (cf ? " scv-numchip--warn" : "")} key={"num:" + nf.key}>
            <span className="scv-numchip-k mono">{SCV_INDLAB(nf.key, ko)}</span>
            <button className="scv-numchip-op mono" onClick={() => setNum(nf.key, { op: nf.op === "lte" ? "gte" : "lte" })} title={ko ? "이하/이상 전환" : "Toggle ≤/≥"}>{nf.op === "lte" ? "≤" : "≥"}</button>
            <input className="scv-numchip-v mono" type="number" value={nf.val} onChange={e => setNum(nf.key, { val: e.target.value === "" ? "" : +e.target.value })} onClick={e => e.stopPropagation()} />
            <span className="scv-numchip-u mono">{NUM_UNIT(nf.key)}</span>
            {cf && <span className="scv-numchip-warn" tabIndex={0}><Lic name="triangle-alert" size={11} cls="icon-sm" color="currentColor" /><span className="fin-tip scv-warntip"><b>{ko ? "관점과 반대 방향" : "Opposite to lens"}</b><span className="fin-tip-def">{ko ? `‘${fw.name.ko}’ 관점은 ${SCV_INDLAB(nf.key, ko)} ${cf.dir === "low" ? "낮을" : "높을"}수록 우수로 채점해요(우수 ${cf.dir === "low" ? "≤" : "≥"}${cf.good}${NUM_UNIT(nf.key)}). 지금 필터는 반대로 ${nf.op === "lte" ? "≤" : "≥"}${nf.val}${NUM_UNIT(nf.key)}를 요구해 관점이 선호하는 종목을 걸러낼 수 있어요.` : `'${fw.name.en}' rewards ${cf.dir === "low" ? "lower" : "higher"} ${SCV_INDLAB(nf.key, ko)} (good ${cf.dir === "low" ? "≤" : "≥"}${cf.good}${NUM_UNIT(nf.key)}); this filter requires the opposite.`}</span></span></span>}
            <span className="scv-chip-x" onClick={() => delNum(nf.key)}><Lic name="x" size={11} cls="icon-sm" color="currentColor" /></span>
          </span>
        ); })}
        <button className="iconbtn" style={{ width: 24, height: 24 }} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setFilterAnchor && setFilterAnchor({ left: Math.max(8, Math.min(r.left, window.innerWidth - 470)), top: r.bottom + 6 }); setPanel("filter"); }} title={ko ? "필터 추가" : "Add filter"}><Lic name="plus" size={14} /></button>
        {(chips.length > 0 || (filters.num || []).length > 0) && <span className="scv-fb-right">
          <span className="linklike" onClick={clearAll}>{ko ? "전체 해제" : "Clear all"}</span>
        </span>}
      </div>

      {!groups.length ? <div className="empty-state"><Lic name="filter" size={26} color="var(--fg-4)" /><div className="es-title">{ko ? "해당 조건의 종목이 없습니다" : "No securities match"}</div><div className="es-sub">{ko ? "필터를 넓혀보세요" : "Try widening the filter"}</div></div>
        : layout === "board" ? <div className="scv-board">{groups.map(g => (
          <div className="scv-bcol" key={g.key}>
            <div className="scv-bcol-head">
              {g.head ? <><span className="scsum-dot" style={{ background: g.head.dot }} /><span className="scv-bcol-lab">{g.head.label}</span></> : <span className="scv-bcol-lab">{ko ? "전체" : "All"}</span>}
              <span className="scv-bcol-n">{g.items.length}</span>
            </div>
            <div className="scv-bcol-body">{g.items.map(r => {
              const up = r.s.change >= 0;
              return (
                <div className="scv-card" key={r.s.ticker} onClick={() => onOpenSecurity(r.s.ticker)}>
                  <div className="scv-card-top">
                    <Flag market={r.s.market} size={14} />
                    <span className="mono scv-card-tk">{r.s.ticker}</span>
                    {!noLens && <span className="mono scv-card-score" style={{ color: SCV_VERDICT[r.verdict].color }}>{r.sc}/{r.max}</span>}
                  </div>
                  <div className="scv-card-name">{r.s.name[lang]}</div>
                  {!noLens && <span className="scv-card-meterwrap">
                    <ScvPips r={r} />
                    <VerdictTip r={r} ko={ko} cls="scv-vtip-card" fwId={fwId} />
                  </span>}
                  {r.valUp != null && <div className="scv-card-val" style={{ color: SCV_VAL[r.valV].color }}>{SCV_VAL[r.valV][lang]} {(r.valUp >= 0 ? "+" : "") + r.valUp.toFixed(0)}%</div>}
                  <div className="scv-card-foot">
                    <span className="scv-card-sec">{r.s.sector[lang]}</span>
                    <span className="mono scv-card-price">{fmtCompact(r.s.price, r.s.cur)}</span>
                    <span className={"mono scv-card-chg " + (up ? "pos" : "neg")}>{up ? "+" : ""}{r.s.change.toFixed(2)}%</span>
                  </div>
                </div>
              );
            })}</div>
          </div>
        ))}</div>
        : layout === "heatmap" ? <div className="scv-heat">
          <div className="scv-heat-legend">
            {heatMode === "change"
              ? <><span>{ko ? "하락" : "Down"}</span><span className="scv-leg-bar scv-leg-chg" /><span>{ko ? "상승" : "Up"}</span><span className="scv-leg-note">{ko ? "· 당일 등락" : "· daily change"}</span></>
              : heatMode === "value"
              ? <><span>{ko ? "고평가" : "Pricey"}</span><span className="scv-leg-bar scv-leg-score" /><span>{ko ? "저평가" : "Cheap"}</span><span className="scv-leg-note">{ko ? "· 적정가 대비" : "· vs fair value"}</span></>
              : <><span>{ko ? "낮음" : "Low"}</span><span className="scv-leg-bar scv-leg-score" /><span>{ko ? "높음" : "High"}</span><span className="scv-leg-note">{ko ? "· " + (fw ? fw.name[lang] : "") + " 품질점수" : "· quality score"}</span></>}
          </div>
          {groups.map(g => (
            <div className="scv-heat-grp" key={g.key}>
              {g.head && <div className="grp-head">
                <span className="scsum-dot" style={{ background: g.head.dot }} />
                <span className="grp-title">{g.head.label}</span><span className="grp-count">{g.items.length}</span>
              </div>}
              <div className="scv-heat-grid">{g.items.map(r => {
                const up = r.s.change >= 0;
                const dark = heatMode !== "change";
                const bg = heatMode === "change" ? scvHeatChange(r.s.change) : heatMode === "value" ? (r.valUp == null ? "var(--bg-elevated-2)" : scvHeatScore(Math.max(0, Math.min(1, (r.valUp + 30) / 60)))) : scvHeatScore(r.ratio);
                return (
                  <div className="scv-tile" key={r.s.ticker} onClick={() => onOpenSecurity(r.s.ticker)}
                    style={{ background: bg, color: dark ? "#0B0C0D" : "var(--fg)" }}
                    title={r.s.name[lang] + " · " + r.sc + "/" + r.max + " · " + (up ? "+" : "") + r.s.change.toFixed(2) + "%"}>
                    <div className="scv-tile-top">
                      <span className="mono scv-tile-tk">{r.s.ticker}</span>
                      <Flag market={r.s.market} size={12} />
                    </div>
                    <div className="scv-tile-nm">{r.s.name[lang]}</div>
                    <div className="scv-tile-val mono">{heatMode === "value" ? (r.valUp == null ? "\u2014" : (r.valUp >= 0 ? "+" : "") + r.valUp.toFixed(0) + "%") : heatMode === "score" ? (r.sc == null ? "\u2014" : r.sc + "/" + r.max) : (up ? "+" : "") + r.s.change.toFixed(2) + "%"}</div>
                  </div>
                );
              })}</div>
            </div>
          ))}</div>
        : (layout === "quadrant" && !noLens) ? (() => {
          const xOf = (v) => v == null ? 0.5 : (40 - Math.max(-40, Math.min(40, v))) / 80;
          const laid = quadRows.map(r => { const seed = r.s.ticker.split("").reduce((a, c) => a + c.charCodeAt(0), 0); return { r, x: Math.max(5, Math.min(95, xOf(r.valUp) * 100 + ((seed % 7) - 3) * 1.1)), y: Math.max(5, Math.min(95, (1 - r.ratio) * 100 + ((seed % 5) - 2) * 2.4)) }; });
          for (let it = 0; it < 60; it++) { let moved = false; for (let i = 0; i < laid.length; i++) for (let j = i + 1; j < laid.length; j++) { const a = laid[i], b = laid[j]; let dx = (b.x - a.x) * 1.05, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy); const minD = 7; if (d === 0) { a.x -= 0.6; a.y -= 0.6; b.x += 0.6; b.y += 0.6; moved = true; } else if (d < minD) { const p = (minD - d) / 2, ux = dx / d, uy = dy / d; a.x -= ux * p / 1.05; a.y -= uy * p; b.x += ux * p / 1.05; b.y += uy * p; moved = true; } } laid.forEach(o => { o.x = Math.max(5, Math.min(95, o.x)); o.y = Math.max(5, Math.min(95, o.y)); }); if (!moved) break; }
          return <div className="scv-quad">
            <div className="scv-quad-yax"><span>{ko ? "좋음" : "Strong"}</span><span>{ko ? "약함" : "Weak"}</span></div>
            <div className="scv-quad-main">
              <div className="scv-quad-plot">
                <div className="scv-quad-cell tl"><span className="scv-quad-tag pos">{t.scv_buyzone}</span></div>
                <div className="scv-quad-cell tr"><span className="scv-quad-tag">{ko ? "좋지만 비쌈" : "Strong but pricey"}</span></div>
                <div className="scv-quad-cell bl"><span className="scv-quad-tag">{ko ? "싸지만 약함" : "Cheap but weak"}</span></div>
                <div className="scv-quad-cell br"><span className="scv-quad-tag neg">{ko ? "비싸고 약함" : "Pricey & weak"}</span></div>
                <div className="scv-quad-vline" /><div className="scv-quad-hline" />
                {laid.map(({ r, x, y }) => {
                  const tx = x > 62 ? { right: 0, left: "auto" } : x < 38 ? { left: 0, right: "auto" } : { left: "50%", transform: "translateX(-50%)" };
                  const ty = y < 45 ? { top: "calc(100% + 9px)" } : { bottom: "calc(100% + 9px)" };
                  const vTone = r.valUp == null ? "var(--fg)" : r.valUp >= 0 ? "var(--pos)" : "var(--neg)";
                  return (
                    <div className={"scv-dot" + (x > 55 ? " scv-dot--l" : "")} key={r.s.ticker} style={{ left: x + "%", top: y + "%" }}
                      onClick={() => onOpenSecurity(r.s.ticker)}>
                      <span className="scv-dot-pt" style={{ background: SCV_VERDICT[r.verdict].color }} />
                      <span className="scv-dot-lab">{r.s.ticker}</span>
                      <div className="scv-dot-tip" style={{ ...tx, ...ty }}>
                        <div className="gap-tip-q" style={{ display: "flex", alignItems: "center", gap: 6 }}><Flag market={r.s.market} size={13} /><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.s.name[lang]}</span></div>
                        <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: SCV_VERDICT[r.verdict].color }} />{ko ? "등급" : "Verdict"} <b style={{ color: SCV_VERDICT[r.verdict].color }}>{SCV_VERDICT[r.verdict][lang]}</b></div>
                        <div className="gap-tip-row">{ko ? "품질" : "Quality"} <b>{r.sc}/{r.max}</b></div>
                        <div className="gap-tip-row">{ko ? "적정가 대비" : "vs fair"} <b style={{ color: vTone }}>{r.valUp == null ? "—" : (r.valUp >= 0 ? (ko ? "저평가 " : "") : (ko ? "고평가 " : "")) + (r.valUp >= 0 ? "+" : "") + r.valUp.toFixed(0) + "%"}</b></div>
                        <div style={{ font: "var(--fw-medium) 10px var(--font-mono)", color: "var(--fg-4)", marginTop: 3, paddingTop: 5, borderTop: "1px solid var(--border)" }}>{r.s.ticker} · {(r.s.gics || r.s.sector)[lang]}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="scv-quad-xax"><span>{ko ? "저평가" : "Cheap"}</span><span className="scv-quad-xmid">{ko ? "적정가" : "Fair"}</span><span>{ko ? "고평가" : "Pricey"}</span></div>
            </div>
          </div>;
        })()
        : (() => {
          return <div className="scv-list scv-list-row">
          {groups.map(g => (
          <div key={g.key}>
            {g.head && <div className="grp-head">
              <span className="scsum-dot" style={{ background: g.head.dot }} />
              <span className="grp-title">{g.head.label}</span><span className="grp-count">{g.items.length}</span>
            </div>}
            {g.items.map(r => {
              const up = r.s.change >= 0;
              const vk = r.verdict, vlab = vk ? SCV_VERDICT[vk] : null;
              const lensOn = !noLens && !!vlab;
              const numKeys = [...new Set((filters.num || []).map(n => n.key))];
              const evalKeys = noLens ? numKeys : shownCols;
              const mcap = r.s.price * (r.s.sharesOut || 0) * 1e6;
              return (
                <div className={"plan-row scv-frow" + (lensOn ? " scv-frow-graded" : "")} key={r.s.ticker} onClick={() => onOpenSecurity(r.s.ticker)} style={lensOn ? { boxShadow: "inset 3px 0 0 " + vlab.color } : undefined}>
                  <Flag market={r.s.market} size={15} />
                  <span className="scv-frow-name">{r.s.name[lang]}</span>
                  <span className="scv-frow-ident">
                    <span className="scv-ident-sec">{r.s.sector ? r.s.sector[lang] : "—"}</span>
                    <span className="scv-ident-dot">·</span>
                    <span className="scv-ident-cap mono">{fmtMktCap(mcap, r.s.cur)}</span>
                    <ScvSpark spark={r.s.spark} up={up} />
                  </span>
                  <span className="scv-frow-spacer" />
                  {evalKeys.length > 0 && <span className="scv-frow-eval">
                    {lensOn && <span className="scv-frow-pips"><ScvPips r={r} /><VerdictTip r={r} ko={ko} fwId={fwId} /></span>}
                    {evalKeys.map(k => {
                      const m = noLens ? { key: k, v: r.vals[k], fmt: SCV_PCT_KEYS.includes(k) ? "%" : "x" } : r.inds.find(x => x.key === k);
                      const col = noLens ? "var(--fg-2)" : (m ? scvToneCol(m.tone) : "var(--fg-4)");
                      return <span className="scv-fmet" key={k}>{SCV_INDLAB_SHORT(k, ko)}<b className="mono" style={{ color: col }}>{m && m.v != null ? scvFmtV(m, ko) : "—"}</b></span>;
                    })}
                  </span>}
                  {r.valUp != null && <span className="scv-frow-val mono" style={{ color: SCV_VAL[r.valV].color, position: "relative" }}>{(r.valUp >= 0 ? "+" : "") + r.valUp.toFixed(0) + "%"} <span className="scv-frow-valv">{SCV_VAL[r.valV][lang]}</span><ValueTip r={r} ko={ko} /></span>}
                  {r.n > 0 && <NPlansBadge plans={plans} ticker={r.s.ticker} lang={lang} t={t} />}
                  <span className="mono scv-frow-price">{fmtCompact(r.s.price, r.s.cur)}</span>
                  <span className={"mono scv-frow-chg " + (up ? "pos" : "neg")}>{up ? "▲" : "▼"}{Math.abs(r.s.change).toFixed(2)}%</span>
                </div>
              );
            })}
          </div>
        ))}</div>;
        })()}

      {layout !== "quadrant" && failRows.length > 0 && <div className="scv-excl">
        <button className={"scv-excl-head" + (showExcl ? " open" : "")} onClick={() => setShowExcl(x => !x)}>
          <Lic name={showExcl ? "chevron-down" : "chevron-right"} size={15} cls="icon-sm" color="var(--fg-4)" />
          <span className="scv-excl-n mono">{failRows.length}</span>
          <span className="scv-excl-lab">{ko ? "제외됨" : "Excluded"}</span>
          <span className="scv-excl-why">{ko ? (fw ? fw.name[lang] : "") + " 기준 미달" : "below grade rule"}</span>
        </button>
        {showExcl && <div className="scv-excl-body">
          {failRows.slice().sort(sorters[sortKey] || sorters.score).slice(0, 60).map(r => {
            const up = r.s.change >= 0;
            return (
              <div className="scv-excl-row" key={r.s.ticker} onClick={() => onOpenSecurity(r.s.ticker)}>
                <Flag market={r.s.market} size={13} />
                <span className="mono scv-excl-tk">{r.s.ticker}</span>
                <span className="scv-excl-nm">{r.s.name[lang]}</span>
                <span className="scv-excl-meterwrap"><ScvPips r={r} color={SCV_VERDICT.fail.color} /><VerdictTip r={r} ko={ko} fwId={fwId} /></span>
                {r.valUp != null && <span className="mono scv-excl-val" style={{ color: SCV_VAL[r.valV].color }}>{(r.valUp >= 0 ? "+" : "") + r.valUp.toFixed(0) + "%"}</span>}
                <span className={"mono scv-excl-chg " + (up ? "pos" : "neg")}>{up ? "+" : ""}{r.s.change.toFixed(2)}%</span>
              </div>
            );
          })}
          {failRows.length > 60 && <div className="scv-excl-more">{ko ? "+" + (failRows.length - 60) + "개 더 — 필터로 좁혀보세요" : "+" + (failRows.length - 60) + " more — narrow with filters"}</div>}
        </div>}
      </div>}

      {panel === "filter" && (() => {
        const fltCats = [
          { type: "num", label: ko ? "지표 조건" : "Metrics", icon: "sliders-horizontal", searchable: true, groups: NUM_CATS.map(g => ({ label: g.label, options: g.keys.map(k => ({ value: k, label: SCV_INDLAB(k, ko) })) })) },
          { type: "value", label: t.scv_value, icon: "tag", options: SCV_VAL_ORDER.map(v => ({ value: v, label: SCV_VAL[v][lang], icon: <span className="scsum-dot" style={{ background: SCV_VAL[v].color }} /> })) },
          { type: "market", label: ko ? "시장" : "Market", icon: "globe", options: MARKETS.map(m => ({ value: m.key, label: (m.label[lang] || m.label), icon: <Flag market={m.key} size={12} /> })) },
          { type: "sector", label: ko ? "섹터" : "Sector", icon: "layers", options: sectors.map(s => ({ value: s.value, label: s.label, dim: s.n === 0, count: s.n })) },
          { type: "finflag", label: ko ? "재무 조건" : "Financials", icon: "file-text", options: FIN_FLAG_DEFS.map(d => ({ value: d.key, label: d[lang], tip: d.tip[lang] })) },
          { type: "universe", label: ko ? "관심" : "Universe", icon: "star", options: [{ value: "watched", label: ko ? "관심종목만" : "Watched only", icon: <Lic name="star" size={14} cls="icon-sm" color="var(--fg-3)" /> }] },
        ];
        const FItem = ({ type, o }) => { const sel = type === "num" ? (filters.num || []).some(n => n.key === o.value) : (filters[type] || []).includes(o.value); return (
          <div className={"v-menu-item" + (o.dim ? " flt-dim" : "")} title={o.tip || ""} onClick={(e) => { e.stopPropagation(); type === "num" ? (sel ? delNum(o.value) : addNum(o.value)) : toggle(type, o.value); }}>
            {o.icon}<span>{o.label}</span>
            {o.count != null && !sel && <span className="flt-opt-n">{o.count}</span>}
            {sel && <span className="check"><Lic name="check" size={14} cls="icon-sm" color="var(--accent)" /></span>}
          </div>
        ); };
        return <>
          <div className="overlay" onClick={() => { setFltOpen(null); close(); }} />
          <div className={"panel flt-menu" + (filterAnchor ? " anchored" : "") + (filterAnchor && filterAnchor.flyout === "left" ? " fly-left" : "")} style={filterAnchor ? { position: "fixed", left: filterAnchor.left, top: filterAnchor.top, width: 230, zIndex: 45 } : { top: 84, right: 52, width: 230, zIndex: 45 }} onMouseLeave={() => setFltOpen(null)}>
            <div className="flt-head">{ko ? "필터 추가…" : "Add filter…"}<span className="flt-kbd">F</span></div>
            {fltCats.map(cat => {
              const on = fltOpen === cat.type;
              const cnt = (filters[cat.type] || []).length;
              return (
                <div className={"v-menu-item flt-axis" + (on ? " hot" : "")} key={cat.type} onMouseEnter={() => setFltOpen(cat.type)}>
                  <Lic name={cat.icon} size={14} cls="icon-sm" color="var(--fg-3)" />
                  <span>{cat.label}</span>
                  {cnt > 0 && <span className="flt-count">{cnt}</span>}
                  <Lic name="chevron-right" size={14} cls="icon-sm" color="var(--fg-4)" />
                  {on && (
                    <div className="flt-flyout" onMouseEnter={() => setFltOpen(cat.type)}>
                      {(() => {
                        const totalOpts = cat.groups ? cat.groups.reduce((a, g) => a + g.options.length, 0) : (cat.options || []).length;
                        const showSearch = totalOpts >= 8;
                        const q = showSearch ? numQuery.trim().toLowerCase() : "";
                        const match = o => !q || o.label.toLowerCase().includes(q) || (o.value || "").toLowerCase().includes(q);
                        const searchRow = showSearch ? <div className="flt-search" onClick={(e) => e.stopPropagation()}><Lic name="search" size={13} cls="icon-sm" color="var(--fg-4)" /><input autoFocus value={numQuery} onChange={(e) => setNumQuery(e.target.value)} placeholder={ko ? "검색…" : "Search…"} /></div> : null;
                        if (cat.groups) {
                          const grps = cat.groups.map(g => ({ label: g.label, options: g.options.filter(match) })).filter(g => g.options.length);
                          return <React.Fragment>
                            {searchRow}
                            {grps.length ? grps.map(g => <div className="flt-group" key={g.label}><div className="flt-group-head" onClick={(e) => { e.stopPropagation(); toggleFltGroup(cat.type, g.options); }}><span>{g.label}</span><span className="flt-group-hint">{ko ? "묶음" : "all"}</span>{fltGroupOn(cat.type, g.options) && <span className="check"><Lic name="check" size={14} cls="icon-sm" color="var(--accent)" /></span>}</div>{g.options.map(o => <FItem key={o.value} type={cat.type} o={o} />)}</div>) : <div className="flt-empty">{ko ? "일치하는 항목 없음" : "No match"}</div>}
                          </React.Fragment>;
                        }
                        const opts = (cat.options || []).filter(match);
                        return <React.Fragment>{searchRow}{opts.length ? opts.map(o => <FItem key={o.value} type={cat.type} o={o} />) : <div className="flt-empty">{ko ? "일치하는 항목 없음" : "No match"}</div>}</React.Fragment>;
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="scv-flt-foot">
              <span className="linklike" onClick={clearAll}>{ko ? "전체 해제" : "Clear all"}</span>
            </div>
          </div>
        </>;
      })()}

      {panel === "display" && <>
        <div className="overlay" onClick={close} />
        <div className="panel" style={{ top: 84, right: 52, width: 300, zIndex: 45, padding: 8 }}>
          <div className="disp-segrow"><span className="disp-segrow-lab">{ko ? "레이아웃" : "Layout"}</span>
            <div className="rb-modebar" style={{ margin: 0 }}>
              {[["list", ko ? "리스트" : "List"], ["board", ko ? "보드" : "Board"], ["heatmap", ko ? "히트맵" : "Heatmap"], ...(noLens ? [] : [["quadrant", t.scv_quadrant]])].map(([v, lab]) =>
                <div key={v} className={"rb-mode" + (layout === v ? " on" : "")} onClick={() => setLayout(v)}>{lab}</div>)}
            </div>
          </div>
          <div className="disp-segrow"><span className="disp-segrow-lab">{ko ? "정렬" : "Sort"}</span>
            <div className="rb-modebar" style={{ margin: 0 }}>
              {[...(noLens ? [] : [["score", ko ? "점수" : "Score"]]), ["value", t.scv_value], ["change", ko ? "등락" : "Change"], ["name", ko ? "이름" : "Name"]].map(([v, lab]) =>
                <div key={v} className={"rb-mode" + (sortKey === v ? " on" : "")} onClick={() => setSortKey(v)}>{lab}</div>)}
            </div>
          </div>
          <div className="disp-segrow"><span className="disp-segrow-lab">{ko ? "묶음" : "Group"}</span>
            <div className="rb-modebar" style={{ margin: 0 }}>
              {[...(noLens ? [] : [["verdict", ko ? "등급" : "Verdict"]]), ["sector", ko ? "섹터" : "Sector"], ["none", ko ? "없음" : "None"]].map(([v, lab]) =>
                <div key={v} className={"rb-mode" + (groupBy === v ? " on" : "")} onClick={() => setGroupBy(v)}>{lab}</div>)}
            </div>
          </div>
          {layout === "heatmap" && <div className="disp-segrow"><span className="disp-segrow-lab">{ko ? "색상" : "Color"}</span>
            <div className="rb-modebar" style={{ margin: 0 }}>
              {[...(noLens ? [] : [["score", ko ? "품질" : "Quality"]]), ["value", t.scv_value], ["change", ko ? "등락" : "Change"]].map(([v, lab]) =>
                <div key={v} className={"rb-mode" + (heatMode === v ? " on" : "")} onClick={() => setHeatMode(v)}>{lab}</div>)}
            </div>
          </div>}
          <div style={{ height: 1, background: "var(--border)", margin: "6px 4px" }} />
          {layout === "list" ? (noLens ? <div className="side-cap" style={{ padding: "4px 8px", margin: 0, color: "var(--fg-4)" }}>{ko ? "관점 없음 — 숫자 필터로 거릅니다" : "No lens — screen by metrics"}</div> : <>
          <div className="side-cap" style={{ padding: "4px 8px", margin: 0 }}>{ko ? "지표 컬럼" : "Indicator columns"}</div>
          {focus.map(k => (
            <div className="v-menu-item" key={k} onClick={() => toggleCol(k)}>
              <span>{SCV_INDLAB(k, ko)}</span>
              <span className={"toggle" + ((cols ? cols.includes(k) : true) ? " on" : "")} style={{ marginLeft: "auto" }} />
            </div>
          ))}
          </>) : layout === "board" ? <div className="side-cap" style={{ padding: "4px 8px", margin: 0, color: "var(--fg-4)", whiteSpace: "normal" }}>{ko ? "보드는 묶음 기준으로 컬럼을 나눕니다" : "Board splits columns by group"}</div>
          : layout === "quadrant" ? <div className="side-cap" style={{ padding: "4px 8px", margin: 0, color: "var(--fg-4)", whiteSpace: "normal" }}>{ko ? "세로=품질 · 가로=밸류(적정가 대비). 등급 필터는 무시됩니다." : "Y = quality · X = value. Verdict filter ignored."}</div>
          : <div className="side-cap" style={{ padding: "4px 8px", margin: 0, color: "var(--fg-4)", whiteSpace: "normal" }}>{ko ? "타일 색은 위 기준, 구획은 묶음 기준을 따릅니다" : "Tile color follows the metric above; sections follow Group"}</div>}
        </div>
      </>}
    </div>
  );
}

/* ---- Research browser (종목 리서치) — recent + picker → opens the security detail,
   which already carries 개요·재무제표·투자지표·밸류에이션 tabs. Reuses SecurityPicker,
   getSecRecents, securityOf, Flag, fmtCompact, .sec-planrow (zero new UI). ---- */
function ResearchBrowser({ t, lang, plans, onOpenSecurity }) {
  const ko = lang === "ko";
  const recents = (typeof getSecRecents === "function" ? getSecRecents() : []).map(securityOf).filter(Boolean);
  const recentSet = new Set(recents.map(s => s.ticker));
  const watched = SECURITIES.filter(s => s.watched && !recentSet.has(s.ticker));
  const row = (s) => {
    const up = (s.change || 0) >= 0;
    const hasPlan = (typeof plansForTicker === "function" ? plansForTicker(plans, s.ticker) : []).length > 0;
    return (
      <div className="sec-planrow" key={s.ticker} onClick={() => onOpenSecurity(s.ticker)}>
        <Flag market={s.market} size={13} />
        <span className="mono" style={{ color: "var(--fg-4)", fontSize: 12, width: 62 }}>{s.ticker}</span>
        <span style={{ flex: 1, minWidth: 0, font: "var(--fw-medium) 13px var(--font-sans)", color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name[lang]}</span>
        {hasPlan && <span className="fl-auto" style={{ fontSize: 10.5 }}>{ko ? "플랜" : "Plan"}</span>}
        <span className="mono" style={{ fontSize: 12.5, color: "var(--fg-2)", width: 92, textAlign: "right" }}>{fmtCompact(s.price, s.cur)}</span>
        <span className={"mono " + (up ? "pos" : "neg")} style={{ fontSize: 12.5, width: 58, textAlign: "right", fontWeight: 600 }}>{up ? "+" : ""}{(s.change || 0).toFixed(1)}%</span>
      </div>
    );
  };
  return (
    <div className="body-main">
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 32px" }}>
        <h2 className="se-h">{t.research}</h2>
        <p className="se-sub">{t.researchHint}</p>
        <div style={{ margin: "16px 0 26px" }}>
          <SecurityPicker ticker={null} lang={lang} t={t} onPick={onOpenSecurity} width={420} />
        </div>
        {recents.length > 0 && <React.Fragment>
          <div className="side-cap" style={{ margin: "0 0 6px" }}>{t.recentlyViewed}</div>
          <div style={{ marginBottom: watched.length ? 24 : 0 }}>{recents.map(row)}</div>
        </React.Fragment>}
        {watched.length > 0 && <React.Fragment>
          <div className="side-cap" style={{ margin: "0 0 6px" }}>{t.watchlist}</div>
          <div>{watched.map(row)}</div>
        </React.Fragment>}
      </div>
    </div>
  );
}

/* ---- Scenarios monitor (cross-plan; filter by security/case/status/source, flexible grouping) ---- */
const SCEN_ORDER = ["approaching", "realized", "tracking", "invalidated"];
const SC_CASE_ORDER = [["Bull", "var(--r-bull)"], ["Base", "var(--r-base)"], ["Bear", "var(--r-bear)"]];
const SC_CASE_LAB = { Bull: { ko: "상단", en: "Bull" }, Base: { ko: "중간", en: "Base" }, Bear: { ko: "하단", en: "Bear" } };
const scCaseLabel = (k, lang) => (SC_CASE_LAB[k] || { ko: k, en: k })[lang] || k;
function scenGroupLoad() { try { return localStorage.getItem("keystone-scen-group") || "status"; } catch (e) { return "status"; } }
function ScenariosMonitor({ t, lang, plans, onOpenPlan, onNewScenario, panel, setPanel, filterAnchor }) {
  const ko = lang === "ko";
  const [scF, setScF] = React.useState({});
  const [grp, setGrp] = React.useState(scenGroupLoad);
  const setGrp1 = (g) => { setGrp(g); try { localStorage.setItem("keystone-scen-group", g); } catch (e) {} };
  const scToggle = (type, value) => setScF(prev => { const cur = prev[type] || []; const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]; const out = { ...prev }; if (next.length) out[type] = next; else delete out[type]; return out; });

  const rows = [];
  plans.forEach(p => p.scenarios.forEach(sc => rows.push({ plan: p, sc, ticker: p.ticker, cur: p.cur, price: p.currentPrice, name: p.tickerName, adhoc: false })));
  SECURITY_SCENARIOS.forEach(sc => { const s = securityOf(sc.ticker); if (s) rows.push({ plan: null, sc, ticker: sc.ticker, cur: s.cur, price: s.price, name: s.name, adhoc: true }); });
  rows.forEach(r => { r.st = scAutoStatus(r.plan || { currentPrice: r.price }, r.sc.target); r.kase = r.sc.label.en; });

  const tickersPresent = [...new Set(rows.map(r => r.ticker))];
  const cats = [
    { type: "ticker", label: ko ? "종목" : "Security", axis: "chart-line", options: tickersPresent.map(tk => { const s = securityOf(tk); return { value: tk, label: s ? s.name[lang] : tk, icon: s ? <Flag market={s.market} size={12} /> : <span className="scsum-dot" style={{ background: "var(--fg-4)" }} /> }; }) },
    { type: "kase", label: ko ? "케이스" : "Case", axis: "target", options: SC_CASE_ORDER.map(([k, c]) => ({ value: k, label: scCaseLabel(k, lang), icon: <span className="scsum-dot" style={{ background: c }} /> })) },
    { type: "scstatus", label: t.scenStatus, axis: "circle-dot", options: SCEN_ORDER.map(st => ({ value: st, label: t["sc_" + st], icon: <span className="scsum-dot" style={{ background: SC_STATUS_COLOR[st].fg }} /> })) },
    { type: "source", label: ko ? "출처" : "Source", axis: "git-branch", options: [{ value: "plan", label: ko ? "플랜" : "Plan", icon: <Lic name="square-pen" size={13} cls="icon-sm" color="var(--fg-3)" /> }, { value: "adhoc", label: t.adhoc, icon: <Lic name="zap" size={13} cls="icon-sm" color="var(--accent)" /> }] },
  ];
  const scMatch = (r) => Object.entries(scF).every(([type, vals]) => {
    if (!vals || !vals.length) return true;
    if (type === "ticker") return vals.includes(r.ticker);
    if (type === "kase") return vals.includes(r.kase);
    if (type === "scstatus") return vals.includes(r.st);
    if (type === "source") return vals.includes(r.adhoc ? "adhoc" : "plan");
    return true;
  });
  const filtered = rows.filter(scMatch);
  const nF = Object.keys(scF).length;
  const chipTypeLabel = { ticker: ko ? "종목" : "Security", kase: ko ? "케이스" : "Case", scstatus: t.scenStatus, source: ko ? "출처" : "Source" };
  const chipValLabel = (type, v) => { if (type === "ticker") { const s = securityOf(v); return s ? s.name[lang] : v; } if (type === "kase") return scCaseLabel(v, lang); if (type === "scstatus") return t["sc_" + v]; if (type === "source") return v === "adhoc" ? t.adhoc : (ko ? "플랜" : "Plan"); return v; };

  let groups;
  if (grp === "ticker") groups = tickersPresent.filter(tk => filtered.some(r => r.ticker === tk)).map(tk => { const s = securityOf(tk); return { key: tk, headIcon: s ? <Flag market={s.market} size={13} /> : <span className="scsum-dot" style={{ background: "var(--fg-4)" }} />, title: s ? s.name[lang] : tk, items: filtered.filter(r => r.ticker === tk) }; });
  else if (grp === "kase") groups = SC_CASE_ORDER.map(([k, c]) => ({ key: k, headIcon: <span className="scsum-dot" style={{ background: c }} />, title: scCaseLabel(k, lang), items: filtered.filter(r => r.kase === k) })).filter(g => g.items.length);
  else if (grp === "none") groups = [{ key: "all", headIcon: <Lic name="target" size={13} cls="icon-sm" color="var(--fg-3)" />, title: ko ? "모든 시나리오" : "All scenarios", items: filtered }];
  else groups = SCEN_ORDER.map(st => ({ key: st, headIcon: <span className="scsum-dot" style={{ background: SC_STATUS_COLOR[st].fg }} />, title: t["sc_" + st], items: filtered.filter(r => r.st === st) })).filter(g => g.items.length);

  const stCount = (st) => filtered.filter(r => r.st === st).length;
  const avgGap = filtered.length ? filtered.reduce((a, r) => a + Math.abs(r.sc.target / r.price - 1) * 100, 0) / filtered.length : null;
  const scRow = (r) => { const g = (r.sc.target / r.price - 1) * 100; return { name: r.name[lang] + " · " + r.sc.label[lang], flag: <Flag market={r.cur === "KRW" ? "KR" : "US"} size={11} />, val: (g >= 0 ? "+" : "") + g.toFixed(0) + "%", tone: g >= 0 ? "pos" : "neg" }; };
  const scTip = (st) => filtered.filter(r => r.st === st).map(scRow);

  return (
    <div className="body-main">
      {filtered.length > 0 && <div className="dash-headline" style={{ padding: "16px 20px", margin: 0 }}>
        <DashStat lab={t.sc_tracking} val={String(stCount("tracking"))} tip={scTip("tracking")} />
        <DashStat lab={t.sc_approaching} val={String(stCount("approaching"))} tone={stCount("approaching") ? "warn" : undefined} tip={scTip("approaching")} />
        <DashStat lab={t.sc_realized} val={String(stCount("realized"))} tip={scTip("realized")} />
        <DashStat lab={t.sc_invalidated} val={String(stCount("invalidated"))} tip={scTip("invalidated")} />
        {avgGap != null && <DashStat lab={ko ? "평균 괴리" : "Avg gap"} val={avgGap.toFixed(0) + "%"} tip={[...filtered].sort((a, b) => Math.abs(b.sc.target / b.price - 1) - Math.abs(a.sc.target / a.price - 1)).map(scRow)} />}
      </div>}
      <div className="filterbar" style={{ borderTop: 0 }}>
        <span style={{ font: "var(--fw-medium) 12px var(--font-sans)", color: "var(--fg-3)" }}>{ko ? "플랜·종목의 모든 시나리오" : "Every scenario across plans & securities"} · <b className="mono" style={{ color: "var(--fg)" }}>{nF ? filtered.length + " / " + rows.length : rows.length}</b></span>
        <div className="right"><button className="v-btn v-btn--primary" style={{ height: 28 }} onClick={onNewScenario}><Lic name="plus" size={14} cls="icon-sm" color="var(--fg-on-accent)" />{t.newScenario}</button></div>
      </div>
      {nF > 0 && <div className="filterbar" style={{ borderTop: 0 }}>
        {Object.entries(scF).map(([type, vals]) => (
          <div className="filter-chip" key={type}>
            <span className="fc-seg fc-key">{chipTypeLabel[type]}</span>
            <span className="fc-seg">{vals.map(v => chipValLabel(type, v)).join(", ")}</span>
            <span className="fc-x" onClick={() => setScF(prev => { const o = { ...prev }; delete o[type]; return o; })}><Lic name="x" size={12} cls="icon-sm" color="inherit" /></span>
          </div>
        ))}
        <div className="right"><span className="linklike" onClick={() => setScF({})}>{t.clear}</span></div>
      </div>}
      {groups.length && filtered.length ? groups.map(g => (
        <div key={g.key}>
          <div className="grp-head">
            {g.headIcon}
            <span className="grp-title">{g.title}</span><span className="grp-count">{g.items.length}</span>
          </div>
          {g.items.map((r, i) => {
            const gap = (r.sc.target / r.price - 1) * 100;
            return (
              <div className="plan-row" key={i} onClick={() => r.plan ? onOpenPlan(r.plan) : onNewScenario(r.ticker)}>
                <span className="scsum-dot" style={{ background: r.sc.color }} />
                <span className="mono" style={{ width: 64, color: "var(--fg-4)", fontSize: 12 }}>{r.ticker}</span>
                <span style={{ flex: 1, font: "var(--fw-medium) 13px var(--font-sans)", color: "var(--fg)" }}>{r.name[lang]} · <b style={{ color: r.sc.color }}>{r.sc.label[lang]}</b></span>
                <span className="scn-tag">{r.adhoc ? <span className="fl-auto" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>{t.adhoc}</span> : <span className="fl-auto">{r.plan.id}</span>}</span>
                <span className="mono" style={{ width: 110, textAlign: "right", color: "var(--fg-2)" }}>{fmtCompact(r.sc.target, r.cur)}</span>
                <span className={"mono " + (gap >= 0 ? "pos" : "neg")} style={{ width: 70, textAlign: "right", fontWeight: 600 }}>{gap >= 0 ? "+" : ""}{gap.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      )) : <div className="empty-state"><Lic name="target" size={26} color="var(--fg-4)" /><div className="es-title">{nF ? (ko ? "조건에 맞는 시나리오 없음" : "No scenarios match") : t.emptyScen}</div>{nF > 0 && <div className="linklike" style={{ marginTop: 8 }} onClick={() => setScF({})}>{t.clear}</div>}</div>}
      {panel === "filter" && <FilterPanel t={t} lang={lang} filters={scF} onToggle={scToggle} onClose={() => setPanel(null)} anchor={filterAnchor} cats={cats} />}
      {panel === "display" && <React.Fragment>
        <div className="overlay" onClick={() => setPanel(null)} />
        <div className="panel" style={{ position: "fixed", top: 84, right: 52, width: 300, zIndex: 45, padding: 8 }}>
          <div className="disp-segrow"><span className="disp-segrow-lab">{ko ? "그룹" : "Group"}</span>
            <div className="rb-modebar" style={{ margin: 0 }}>
              {[["status", t.status], ["ticker", ko ? "종목" : "Security"], ["kase", ko ? "케이스" : "Case"], ["none", t.none]].map(([v, lab]) => <div key={v} className={"rb-mode" + (grp === v ? " on" : "")} onClick={() => setGrp1(v)}>{lab}</div>)}
            </div>
          </div>
        </div>
      </React.Fragment>}
    </div>
  );
}

/* ---- Archive (closed plans) — search + reuse plan FilterPanel/matchesFilters ---- */
function ArchiveView({ t, lang, plans, onOpenPlan, onRestore, panel, setPanel, filterAnchor }) {
  const ko = lang === "ko";
  const [q, setQ] = React.useState("");
  const [aF, setAF] = React.useState({});
  const [sort, setSort] = React.useState("recent");
  const aToggle = (type, value) => setAF(prev => { const cur = prev[type] || []; const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]; const out = { ...prev }; if (next.length) out[type] = next; else delete out[type]; return out; });
  const closed = plans.filter(p => p.status === "closed");
  const cats = filterCats(t, lang).filter(c => ["portfolio", "strategy", "return"].includes(c.type));
  const ql = q.trim().toLowerCase();
  let list = closed.filter(p => matchesFilters(p, aF) && (!ql || (p.name[lang] || "").toLowerCase().includes(ql) || (p.ticker || "").toLowerCase().includes(ql) || (p.id || "").toLowerCase().includes(ql)));
  if (sort === "return") list = [...list].sort((a, b) => { const ra = planReturn(a), rb = planReturn(b); return (rb ? rb.rate : -999) - (ra ? ra.rate : -999); });
  else if (sort === "name") list = [...list].sort((a, b) => a.name[lang].localeCompare(b.name[lang]));
  const nF = Object.keys(aF).length, activeAny = nF > 0 || !!ql;
  const chipTypeLabel = (type) => FILTER_TYPE_LABEL(type, t, lang);
  return (
    <div className="body-main">
      <div className="filterbar" style={{ borderTop: 0, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 10px", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", minWidth: 210 }}>
          <Lic name="search" size={13} cls="icon-sm" color="var(--fg-4)" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={ko ? "보관함 검색…" : "Search archive…"} style={{ border: "none", background: "transparent", outline: "none", color: "var(--fg)", font: "var(--fw-medium) 12px var(--font-sans)", width: "100%" }} />
        </span>
        {Object.entries(aF).map(([type, vals]) => (
          <div className="filter-chip" key={type}>
            <span className="fc-seg fc-key">{chipTypeLabel(type)}</span>
            <span className="fc-seg">{vals.map(v => filterValueLabel(type, v, t, lang)).join(", ")}</span>
            <span className="fc-x" onClick={() => setAF(prev => { const o = { ...prev }; delete o[type]; return o; })}><Lic name="x" size={12} cls="icon-sm" color="inherit" /></span>
          </div>
        ))}
        <span style={{ font: "var(--fw-medium) 12px var(--font-sans)", color: "var(--fg-4)" }}>{activeAny ? list.length + " / " + closed.length : closed.length}</span>
        {activeAny && <div className="right"><span className="linklike" onClick={() => { setAF({}); setQ(""); }}>{t.clear}</span></div>}
      </div>
      {closed.length === 0 ? <div className="empty-state"><Lic name="archive" size={26} color="var(--fg-4)" /><div className="es-title">{t.emptyArchive}</div></div>
        : !list.length ? <div className="empty-state"><Lic name="archive" size={26} color="var(--fg-4)" /><div className="es-title">{ko ? "결과 없음" : "No results"}</div><div className="linklike" style={{ marginTop: 8 }} onClick={() => { setAF({}); setQ(""); }}>{t.clear}</div></div>
        : list.map(p => {
          return (
            <div className="plan-row" key={p.id} onClick={() => onOpenPlan(p)}>
              <StatusIcon status="closed" size={14} />
              <span className="mono" style={{ width: 64, color: "var(--fg-4)", fontSize: 12 }}>{p.id}</span>
              <span style={{ flex: 1, font: "var(--fw-medium) 13px var(--font-sans)", color: "var(--fg)" }}>{p.name[lang]}</span>
              {p.realizedPL && <span className="mono pos" style={{ width: 80, textAlign: "right" }}>+{fmtCompact(p.realizedPL, p.cur)}</span>}
              <button className="watch-btn" style={{ height: 26, padding: "0 10px" }} onClick={(e) => { e.stopPropagation(); onRestore(p.id); }}><Lic name="rotate-ccw" size={13} cls="icon-sm" color="inherit" />{t.restore}</button>
            </div>
          );
        })}
      {panel === "filter" && <FilterPanel t={t} lang={lang} filters={aF} onToggle={aToggle} onClose={() => setPanel(null)} anchor={filterAnchor} cats={cats} />}
      {panel === "display" && <React.Fragment>
        <div className="overlay" onClick={() => setPanel(null)} />
        <div className="panel" style={{ position: "fixed", top: 84, right: 52, width: 300, zIndex: 45, padding: 8 }}>
          <div className="disp-segrow"><span className="disp-segrow-lab">{t.order}</span>
            <div className="rb-modebar" style={{ margin: 0 }}>
              {[["recent", ko ? "최근" : "Recent"], ["return", ko ? "수익률" : "Return"], ["name", ko ? "이름" : "Name"]].map(([v, lab]) => <div key={v} className={"rb-mode" + (sort === v ? " on" : "")} onClick={() => setSort(v)}>{lab}</div>)}
            </div>
          </div>
        </div>
      </React.Fragment>}
    </div>
  );
}

/* ---- Trash (soft-deleted plans) ---- */
function TrashView({ t, lang, trash, onRestore, onDeleteForever }) {
  return (
    <div className="body-main">
      {trash.length ? trash.map(p => (
        <div className="plan-row" key={p.id}>
          <Lic name="trash-2" size={14} cls="icon-sm" color="var(--fg-4)" />
          <span className="mono" style={{ width: 64, color: "var(--fg-4)", fontSize: 12 }}>{p.id}</span>
          <span style={{ flex: 1, font: "var(--fw-medium) 13px var(--font-sans)", color: "var(--fg-2)" }}>{p.name[lang]}</span>
          <button className="watch-btn" style={{ height: 26, padding: "0 10px" }} onClick={() => onRestore(p.id)}><Lic name="rotate-ccw" size={13} cls="icon-sm" color="inherit" />{t.restore}</button>
          <button className="watch-btn" style={{ height: 26, padding: "0 10px", color: "var(--neg)", borderColor: "rgba(235,87,87,.4)" }} onClick={() => onDeleteForever(p.id)}><Lic name="trash-2" size={13} cls="icon-sm" color="var(--neg)" />{t.deleteForever}</button>
        </div>
      )) : <div className="empty-state"><Lic name="trash-2" size={26} color="var(--fg-4)" /><div className="es-title">{t.emptyTrash}</div></div>}
    </div>
  );
}

/* ---- Customize sidebar modal ---- */
const OPTIONAL_DESTS = [
  { key: "watchlist", icon: "star", labelKey: "watchlist" },
  { key: "insights", icon: "chart-line", labelKey: "insights" },
  { key: "research", icon: "book-open", labelKey: "research" },
  { key: "scenarios", icon: "target", labelKey: "scenariosMon" },
  { key: "screener", icon: "filter", labelKey: "screenerNav" },
  { key: "archive", icon: "archive", labelKey: "archiveNav" },
  { key: "trash", icon: "trash-2", labelKey: "trash" },
];
function CustomizeModal({ t, lang, cfg, setCfg, order, setOrder, pinned = [], setPinned, onClose }) {
  const [drag, setDrag] = React.useState(null);
  const [over, setOver] = React.useState(null);
  const keys = (() => { const base = OPTIONAL_DESTS.map(d => d.key); if (!order) return base; const merged = order.filter(k => base.includes(k)); base.forEach((k, i) => { if (!merged.includes(k)) merged.splice(Math.min(i, merged.length), 0, k); }); return merged; })();
  const reorder = (from, to) => {
    if (from === to) return;
    const arr = keys.slice();
    const fi = arr.indexOf(from), ti = arr.indexOf(to);
    arr.splice(fi, 1); arr.splice(ti, 0, from);
    setOrder(arr);
  };
  const stateOf = (k) => !cfg[k] ? "hide" : (pinned.includes(k) ? "top" : "tools");
  const setState = (k, s) => {
    if (s === "top") { setCfg(p => ({ ...p, [k]: true })); setPinned && setPinned(p => p.includes(k) ? p : [...p, k]); }
    else if (s === "tools") { setCfg(p => ({ ...p, [k]: true })); setPinned && setPinned(p => p.filter(x => x !== k)); }
    else { setCfg(p => ({ ...p, [k]: false })); setPinned && setPinned(p => p.filter(x => x !== k)); }
  };
  const SEG = [["hide", lang === "ko" ? "숨김" : "Hide"], ["tools", lang === "ko" ? "도구" : "Tools"], ["top", lang === "ko" ? "상단" : "Top"]];
  const isOn = (k) => !!cfg[k];
  const isPinned = (k) => pinned.includes(k);
  const toggleShow = (k) => { setCfg(p => ({ ...p, [k]: !p[k] })); if (isPinned(k)) setPinned && setPinned(p => p.filter(x => x !== k)); };
  const togglePin = (k) => { if (!isOn(k)) return; setPinned && setPinned(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k]); };
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 440 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <Lic name="panel-left" size={17} color="var(--fg-2)" /><span style={{ font: "var(--fw-semi) 15px var(--font-sans)", color: "var(--fg)" }}>{t.customizeSidebar}</span>
          <span style={{ marginLeft: "auto" }} className="iconbtn" onClick={onClose}><Lic name="x" size={16} /></span>
        </div>
        <div className="modal-body">
          <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
            <div className="side-cap" style={{ margin: 0 }}>{t.optionalDest}</div>
            <button onClick={() => { if (!window.confirm(lang === "ko" ? "사이드바를 기본값으로 되돌릴까요?" : "Reset sidebar to defaults?")) return; try { localStorage.removeItem("keystone-sidebar-v2"); } catch (e) {} location.reload(); }} style={{ marginLeft: "auto", font: "var(--fw-semi) 11px var(--font-sans)", color: "var(--fg-2)", background: "var(--bg-elevated-2)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-pill)", cursor: "pointer", padding: "3px 11px" }}>{lang === "ko" ? "기본값으로" : "Reset"}</button>
          </div>
          <p style={{ font: "var(--fw-regular) 12px var(--font-sans)", color: "var(--fg-4)", margin: "0 0 12px" }}>{lang === "ko" ? "도구를 켰고 끌 수 있어요. 핀을 누르면 사이드바 상단(인박스·일지·플랜 옆)으로 올라가요. 드래그로 순서 변경." : "Turn tools on or off. Pin lifts one to the top, beside Inbox / Journal / Plans. Drag to reorder."}</p>
          {keys.map(k => OPTIONAL_DESTS.find(d => d.key === k)).filter(Boolean).map(d => (
            <div className={"set-row cz-row" + (over === d.key ? " dragover" : "") + (drag === d.key ? " dragging" : "")} key={d.key}
              draggable onDragStart={() => setDrag(d.key)} onDragEnd={() => { setDrag(null); setOver(null); }}
              onDragOver={(e) => { e.preventDefault(); setOver(d.key); }}
              onDrop={(e) => { e.preventDefault(); if (drag) reorder(drag, d.key); setDrag(null); setOver(null); }}>
              <span className="cz-grip" title={lang === "ko" ? "드래그하여 순서 변경" : "Drag to reorder"}><Lic name="grip-vertical" size={15} cls="icon-sm" color="var(--fg-4)" /></span>
              <span className="set-lab" style={{ display: "flex", alignItems: "center", gap: 9, flex: 1 }}><Lic name={d.icon} size={15} cls="icon-sm" color="var(--fg-3)" />{t[d.labelKey]}</span>
              <span className={"cz-pin" + (isPinned(d.key) ? " on" : "") + (isOn(d.key) ? "" : " cz-pin-off")} onClick={() => togglePin(d.key)} title={isPinned(d.key) ? (lang === "ko" ? "상단 고정 해제" : "Unpin from top") : (lang === "ko" ? "상단에 고정" : "Pin to top")}><Lic name="arrow-up-to-line" size={15} cls="icon-sm" color={isPinned(d.key) ? "var(--accent)" : "var(--fg-4)"} /></span>
              <span className={"toggle" + (isOn(d.key) ? " on" : "")} onClick={() => toggleShow(d.key)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WatchlistView, ResearchBrowser, ScenariosMonitor, ArchiveView, TrashView, CustomizeModal, OPTIONAL_DESTS, ScreenerView });
