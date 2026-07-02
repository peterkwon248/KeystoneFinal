// SecurityView.jsx — Security detail (with placeholder price chart) + security search modal

/* ---- placeholder price chart (real data wires in later) ---- */
function SecurityChart({ security, height = 190 }) {
  const sp = security.spark || [];
  const n = sp.length;
  const min = Math.min(...sp), max = Math.max(...sp);
  const W = 800, H = 200, pad = 12;
  const x = (i) => (i / (n - 1)) * W;
  const y = (v) => H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
  const line = sp.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  const up = security.change >= 0;
  const col = up ? "var(--pos)" : "var(--neg)";
  return (
    <div className="sec-chart-wrap">
      <svg className="sec-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height }}>
        <defs>
          <linearGradient id="secfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity="0.20" />
            <stop offset="100%" stopColor={col} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(g => <line key={g} x1="0" y1={H * g} x2={W} y2={H * g} stroke="var(--border)" strokeWidth="1" />)}
        <path d={area} fill="url(#secfill)" />
        <path d={line} fill="none" stroke={col} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <circle cx={x(n - 1)} cy={y(sp[n - 1])} r="3.5" fill={col} stroke="var(--bg-app)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

/* ---- 월별 히트맵 — 연도×월, 지표 전환(흐름=계절성 / 수준=밸류에이션 이력). 티커 시드 deterministic.
   색: ValSensitivity의 tone() 램프(완화 재사용) + MultipleBandChart의 '과거 대비 백분위' 개념 재사용.
   피커: 앱 표준 드롭다운 어휘(.v-menu / .v-menu-item / .side-cap / .overlay / .check — ValPresetPick과 동일) ---- */
function seasMulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function seasHash(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; }
const SEAS_METRICS = [
  { id: "return", lab: { ko: "수익률", en: "Return" }, fam: "flow", kind: "div", unit: "%", cap: 12 },
  { id: "relative", lab: { ko: "상대강도", en: "Rel. strength" }, fam: "flow", kind: "div", unit: "%", cap: 9 },
  { id: "vol", lab: { ko: "변동성", en: "Volatility" }, fam: "flow", kind: "mono", unit: "%" },
  { id: "per", lab: { ko: "PER", en: "PER" }, fam: "level", kind: "pct", unit: "×" },
  { id: "pbr", lab: { ko: "PBR", en: "PBR" }, fam: "level", kind: "pct", unit: "×" },
  { id: "psr", lab: { ko: "PSR", en: "PSR" }, fam: "level", kind: "pct", unit: "×" },
];
function seasBuild(security, curYear, curMonth) {
  const ticker = security.ticker || "X";
  const years = [curYear - 4, curYear - 3, curYear - 2, curYear - 1, curYear];
  const N = years.length, M = 12;
  const active = (yi, m) => !(years[yi] === curYear && m > curMonth);
  const round1 = v => Math.round(v * 10) / 10;
  // 수익률: 강한 월별 계절 편향(세로 밴드) + 약한 노이즈 — 노이즈가 아니라 구조가 지배
  const rr = seasMulberry(seasHash(ticker + "ret"));
  const rBias = Array.from({ length: M }, () => (rr() - 0.5) * 9);
  const retGrid = years.map((yr, yi) => Array.from({ length: M }, (_, m) => active(yi, m) ? round1(rBias[m] + (rr() * 2 - 1) * 3) : null));
  // 시장(상대강도용): 자체 완만한 시리즈
  const mr = seasMulberry(seasHash((security.market || "MKT") + "mkt"));
  const mBias = Array.from({ length: M }, () => (mr() - 0.5) * 4);
  const mktGrid = years.map((yr, yi) => Array.from({ length: M }, (_, m) => active(yi, m) ? mBias[m] + (mr() * 2 - 1) * 2.2 : null));
  const relGrid = retGrid.map((row, yi) => row.map((v, m) => v == null ? null : round1(v - mktGrid[yi][m])));
  // 변동성: 양수·월별 편향(어떤 달은 더 출렁) — 단일 색조
  const vr = seasMulberry(seasHash(ticker + "vol"));
  const vBias = Array.from({ length: M }, () => 14 + vr() * 22);
  const volGrid = years.map((yr, yi) => Array.from({ length: M }, (_, m) => active(yi, m) ? Math.max(6, Math.round(vBias[m] + (vr() * 2 - 1) * 7)) : null));
  // PER/PBR/PSR: 현재값 기준 완만한 추세(계절성 없음, 천천히 등락) — 색은 백분위(싼/비싼)
  const perBase = (security.eps > 0 && security.price > 0) ? Math.max(5, Math.min(60, security.price / security.eps)) : 15;
  const lr = seasMulberry(seasHash(ticker + "lvl"));
  const roe = 0.08 + lr() * 0.10, mgn = 0.05 + lr() * 0.12;
  const mkLevel = (base) => {
    const freq = 1 + lr() * 1.4, phase = lr() * Math.PI * 2, amp = 0.16 + lr() * 0.16, noise = 0.05 + lr() * 0.05;
    return years.map((yr, yi) => Array.from({ length: M }, (_, m) => { if (!active(yi, m)) return null; const t = yi * M + m; return Math.round(base * (1 + amp * Math.sin(t / (N * M) * Math.PI * 2 * freq + phase) + noise * (lr() - 0.5) * 2) * 100) / 100; }));
  };
  const perGrid = mkLevel(perBase), pbrGrid = mkLevel(Math.max(0.4, perBase * roe)), psrGrid = mkLevel(Math.max(0.3, perBase * mgn));
  return { years, grids: { return: retGrid, relative: relGrid, vol: volGrid, per: perGrid, pbr: pbrGrid, psr: psrGrid } };
}
function SeasonalityHeatmap({ security, lang }) {
  const ko = lang === "ko";
  const [hotCol, setHotCol] = React.useState(null);
  const [metricId, setMetricId] = React.useState("return");
  const [pick, setPick] = React.useState(false);
  const curYear = 2026, curMonth = 5; // 앱 'now' ≈ 2026-06 (KS_REF 기준)
  const { years, grids } = React.useMemo(() => seasBuild(security, curYear, curMonth), [security.ticker, security.price, security.eps]);
  const metric = SEAS_METRICS.find(m => m.id === metricId) || SEAS_METRICS[0];
  const grid = grids[metricId];
  const isFlow = metric.fam === "flow", isDiv = metric.kind === "div", isMono = metric.kind === "mono", isPct = metric.kind === "pct";
  const monLab = ko ? ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monFull = ko ? monLab.map(m => m + "월") : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const cols = Array.from({ length: 12 }, (_, m) => grid.map(r => r[m]).filter(v => v != null));
  const allVals = []; grid.forEach(r => r.forEach(v => { if (v != null) allVals.push(v); }));
  const gmin = allVals.length ? Math.min(...allVals) : 0, gmax = allVals.length ? Math.max(...allVals) : 1;
  const sorted = allVals.slice().sort((a, b) => a - b);
  const pctRank = (v) => { if (!sorted.length) return 0.5; let c = 0; for (const x of sorted) { if (x < v) c++; else break; } return c / sorted.length; };
  const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  const avgRow = cols.map(mean), medRow = cols.map(median);
  const NY = years.length;
  const latest = grid[NY - 1] ? grid[NY - 1][curMonth] : null;
  const cell = (v) => v == null ? "" : isDiv ? ((v >= 0 ? "+" : "") + (Math.abs(v) >= 10 ? Math.round(v) : v.toFixed(1))) : isMono ? Math.round(v) : v.toFixed(1);
  const withU = (v) => v == null ? "—" : (isDiv ? ((v >= 0 ? "+" : "") + (Math.abs(v) >= 10 ? Math.round(v) : v.toFixed(1))) : isMono ? Math.round(v) : v.toFixed(1)) + metric.unit;
  const tone = (v) => {
    if (v == null) return "transparent";
    if (isDiv) { const cap = metric.cap; const a = Math.max(-cap, Math.min(cap, v)); const c = v >= 0 ? "var(--pos)" : "var(--neg)"; return "color-mix(in srgb, " + c + " " + (Math.abs(a) / cap * 40 + 4).toFixed(0) + "%, transparent)"; }
    if (isMono) { const f = gmax > gmin ? (v - gmin) / (gmax - gmin) : 0.5; return "color-mix(in srgb, var(--accent) " + (f * 42 + 4).toFixed(0) + "%, transparent)"; }
    const dev = pctRank(v) - 0.5; const c = dev <= 0 ? "var(--pos)" : "var(--neg)"; return "color-mix(in srgb, " + c + " " + (Math.abs(dev) * 84 + 5).toFixed(0) + "%, transparent)"; // 싼(낮음)=초록, 비싼(높음)=빨강
  };
  const posTone = (v) => (isDiv ? (v >= 0 ? "pos" : "neg") : "");
  const gridCols = "42px repeat(12, minmax(0, 1fr))";
  const swatch = (col, f) => "color-mix(in srgb, " + col + " " + (f * 74 + 20).toFixed(0) + "%, var(--bg-elevated-2))";
  return (
    <div className="seas-wrap">
      <div className="seas-head">
        <span className="seas-title"><Lic name="calendar-range" size={14} cls="icon-sm" color="var(--accent)" />{ko ? "월별 " : "Monthly "}
          <span style={{ position: "relative" }}>
            <button className="seas-metricpick" onClick={() => setPick(v => !v)}>{metric.lab[lang]}<Lic name="chevron-down" size={12} color="currentColor" /></button>
            {pick && <React.Fragment>
              <div className="overlay" onClick={() => setPick(false)} />
              <div className="v-menu" style={{ position: "absolute", top: 27, left: 0, zIndex: 50, minWidth: 176 }}>
                <div className="side-cap" style={{ padding: "2px 8px 5px" }}>{ko ? "흐름 · 계절성" : "Flow · seasonal"}</div>
                {SEAS_METRICS.filter(m => m.fam === "flow").map(m => (
                  <div className="v-menu-item" key={m.id} onClick={() => { setMetricId(m.id); setPick(false); setHotCol(null); }}><span>{m.lab[lang]}</span>{metricId === m.id && <span className="check"><Lic name="check" size={14} color="currentColor" /></span>}</div>
                ))}
                <div className="v-menu-sep" />
                <div className="side-cap" style={{ padding: "2px 8px 5px" }}>{ko ? "밸류에이션 · 이력" : "Valuation · history"}</div>
                {SEAS_METRICS.filter(m => m.fam === "level").map(m => (
                  <div className="v-menu-item" key={m.id} onClick={() => { setMetricId(m.id); setPick(false); setHotCol(null); }}><span>{m.lab[lang]}</span>{metricId === m.id && <span className="check"><Lic name="check" size={14} color="currentColor" /></span>}</div>
                ))}
              </div>
            </React.Fragment>}
          </span>
        </span>
        <span className="seas-sub">{isFlow ? (ko ? "최근 5년 · 월간" : "5y · monthly") : (ko ? "자기 과거 대비 · 최근 5년" : "vs own history · 5y")}</span>
      </div>
      <div className="seas-grid" style={{ gridTemplateColumns: gridCols }}>
        <div className="seas-corner" />
        {monLab.map((m, i) => (
          <div key={i} className={"seas-colh" + (hotCol === i ? " hot" : "")} onMouseEnter={() => setHotCol(i)} onMouseLeave={() => setHotCol(h => h === i ? null : h)}>
            {m}
            {hotCol === i && (() => {
              const c = cols[i]; const av = mean(c), md = median(c); const pos = c.filter(v => v >= 0).length;
              const best = c.length ? Math.max(...c) : null, worst = c.length ? Math.min(...c) : null;
              const bestYr = best != null ? years[grid.findIndex(r => r[i] === best)] : null;
              const worstYr = worst != null ? years[grid.findIndex(r => r[i] === worst)] : null;
              const cls = i <= 1 ? " edge-l" : i >= 10 ? " edge-r" : "";
              return (
                <div className={"seas-tip" + cls} onMouseEnter={() => setHotCol(i)}>
                  <span className="seas-tip-h">{monFull[i]}</span>
                  <span className="seas-tip-row"><span>{ko ? "평균" : "Avg"}</span><b className={posTone(av)}>{withU(av)}</b></span>
                  <span className="seas-tip-row"><span>{ko ? "중앙값" : "Median"}</span><b className={posTone(md)}>{withU(md)}</b></span>
                  {isDiv && <span className="seas-tip-row"><span>{ko ? "상승" : "Positive"}</span><b>{pos}/{c.length}{ko ? "년" : ""}</b></span>}
                  <span className="seas-tip-row"><span>{isPct ? (ko ? "최고(비쌈)" : "High") : (ko ? "최고" : "Best")}</span><b className={isDiv ? "pos" : ""}>{withU(best)} <span style={{ color: "var(--fg-4)", fontWeight: 400 }}>{("" + bestYr).slice(2)}</span></b></span>
                  <span className="seas-tip-row"><span>{isPct ? (ko ? "최저(저렴함)" : "Low") : (ko ? "최저" : "Worst")}</span><b className={isDiv ? "neg" : ""}>{withU(worst)} <span style={{ color: "var(--fg-4)", fontWeight: 400 }}>{("" + worstYr).slice(2)}</span></b></span>
                </div>
              );
            })()}
          </div>
        ))}
        {grid.map((r, ri) => (
          <React.Fragment key={ri}>
            <div className="seas-rowh">{years[ri]}</div>
            {r.map((v, ci) => (
              <div key={ci} className={"seas-cell" + (v == null ? " empty" : "") + (hotCol === ci ? " hotcol" : "")} style={{ background: tone(v) }}>{cell(v)}</div>
            ))}
          </React.Fragment>
        ))}
      </div>
      {isFlow && <div className="seas-grid seas-aggrow" style={{ gridTemplateColumns: gridCols }}>
        <div className="seas-agg-lab">{ko ? "평균" : "Avg"}</div>
        {avgRow.map((v, ci) => <div key={"a" + ci} className={"seas-cell" + (hotCol === ci ? " hotcol" : "")} style={{ background: tone(v) }}>{cell(v)}</div>)}
        <div className="seas-agg-lab">{ko ? "중앙" : "Med"}</div>
        {medRow.map((v, ci) => <div key={"m" + ci} className={"seas-cell" + (hotCol === ci ? " hotcol" : "")} style={{ background: tone(v) }}>{cell(v)}</div>)}
      </div>}
      {isFlow ? (
        <div className="seas-legend">
          {isMono
            ? <span className="seas-leg">{ko ? "낮음" : "Low"}<span className="seas-leg-scale">{[0.15, 0.4, 0.65, 0.9].map(f => <span key={f} className="seas-leg-box" style={{ background: swatch("var(--accent)", f) }} />)}</span>{ko ? "높음" : "High"}</span>
            : <span className="seas-leg">{ko ? "약세" : "Weak"}<span className="seas-leg-scale">{[0.9, 0.5, 0.2].map(f => <span key={"n" + f} className="seas-leg-box" style={{ background: swatch("var(--neg)", f) }} />)}<span className="seas-leg-box" style={{ background: "var(--bg-elevated-2)" }} />{[0.2, 0.5, 0.9].map(f => <span key={"p" + f} className="seas-leg-box" style={{ background: swatch("var(--pos)", f) }} />)}</span>{ko ? "강세" : "Strong"}</span>}
          <span className="seas-leg" style={{ marginLeft: "auto", color: "var(--fg-4)" }}><Lic name="info" size={11} cls="icon-sm" color="var(--fg-4)" />{ko ? "예시 데이터 · 실제 이력 연동 예정" : "Illustrative · real history"}</span>
        </div>
      ) : (
        <div className="seas-foot">
          <span className="seas-leg">{ko ? "저렴함" : "Cheap"}<span className="seas-leg-scale">{[0.9, 0.5, 0.2].map(f => <span key={"c" + f} className="seas-leg-box" style={{ background: swatch("var(--pos)", f) }} />)}<span className="seas-leg-box" style={{ background: "var(--bg-elevated-2)" }} />{[0.2, 0.5, 0.9].map(f => <span key={"r" + f} className="seas-leg-box" style={{ background: swatch("var(--neg)", f) }} />)}</span>{ko ? "비쌈" : "Rich"}</span>
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 16, alignItems: "center" }}>
            <span>{ko ? "현재 " : "Now "}<b className="seas-foot-val">{withU(latest)}</b></span>
            <span>{ko ? "5년 범위 " : "5y "}<b className="seas-foot-val">{gmin.toFixed(1)}~{gmax.toFixed(1)}{metric.unit}</b></span>
            <span style={{ color: "var(--fg-4)", display: "inline-flex", alignItems: "center", gap: 4 }}><Lic name="info" size={11} cls="icon-sm" color="var(--fg-4)" />{ko ? "예시" : "Illustrative"}</span>
          </span>
        </div>
      )}
    </div>
  );
}

/* ---- security detail ---- */
function SecurityDetail({ security, plans, t, lang, onBack, onOpenList, onOpenPlan, onToggleWatch, onCreatePlan, onAddScenario, embedded }) {
  const s = security;
  const [, secForce] = React.useReducer(x => x + 1, 0);
  const [planLimit, setPlanLimit] = React.useState(40);
  const [secDraft, setSecDraft] = React.useState("");
  const secNotes = s.journal || [];
  const addSecNote = () => { const v = secDraft.trim(); if (!v) return; const stamp = lang === "ko" ? "6월 22일" : "Jun 22"; s.journal = [{ id: "nt" + Date.now(), when: stamp, text: v, price: s.price }, ...secNotes]; setSecDraft(""); secForce(); };
  const removeSecNote = (id) => { s.journal = secNotes.filter(n => n.id !== id); secForce(); };
  const [secEditId, setSecEditId] = React.useState(null);
  const [secEditText, setSecEditText] = React.useState("");
  const startSecEdit = (n) => { setSecEditId(n.id); setSecEditText(n.text); };
  const cancelSecEdit = () => { setSecEditId(null); setSecEditText(""); };
  const commitSecEdit = () => { const v = secEditText.trim(); if (!v) return cancelSecEdit(); s.journal = secNotes.map(n => n.id === secEditId ? { ...n, text: v, editedAt: Date.now() } : n); cancelSecEdit(); secForce(); };
  const linked = plansForTicker(plans, s.ticker);
  const per = s.eps > 0 ? s.price / s.eps : 0;
  const capStr = fmtMktCap(s.price * s.sharesOut * 1e6, s.cur);
  const up = s.change >= 0;
  const [secTab, setSecTab] = React.useState("overview");
  const secPlan = React.useMemo(() => ({ id: "sec:" + s.ticker, ticker: s.ticker, tickerName: { en: s.name.en, ko: s.name.ko }, name: { en: s.name.en, ko: s.name.ko }, currentPrice: s.price, eps: s.eps, sharesOut: s.sharesOut, cur: s.cur, fin: (typeof finOf === "function") ? finOf(s.ticker, s.price, s.eps, s.sharesOut) : null, scenarios: [], strategyId: null, avgPrice: 0, executions: [], rules: [] }), [s.ticker, s.price, s.eps, s.sharesOut]);
  const secTabs = [["overview", lang === "ko" ? "개요" : "Overview"], ["financials", lang === "ko" ? "재무제표" : "Financials"], ["indicators", lang === "ko" ? "투자지표" : "Metrics"], ["valuation", lang === "ko" ? "밸류에이션" : "Valuation"]];
  return (
    <div className={embedded ? "" : "detail-main"}>
      <div className="detail-inner">
        {!embedded && <div className="dt-crumb">
          <span className="c-link" onClick={onBack}><Lic name="chevron-left" size={13} cls="icon-sm" color="inherit" /></span>
          <span className="c-link" onClick={onOpenList || onBack}>{t.securities}</span>
          <Lic name="chevron-right" size={12} cls="icon-sm" color="var(--fg-4)" />
          <span className="mono">{s.ticker}</span>
        </div>}

        <div className="sec-head">
          <div className="sec-head-l">
            <div className="sec-ticker-row">
              <Flag market={s.market} size={20} />
              <span className="sec-mkt-badge">{s.market === "KR" ? t.market === "Market" ? "KRX" : "KRX" : "NASDAQ"}</span>
              <span className="mono" style={{ color: "var(--fg-3)", fontSize: 13 }}>{s.ticker}</span>
              <span className="sec-sector">{s.sector[lang]}</span>
            </div>
            <h1 className="dt-title" style={{ margin: "8px 0 6px" }}>{s.name[lang]}</h1>
            <div className="sec-price-row">
              <span className="sec-price mono">{fmtMoney(s.price, s.cur)}</span>
              <span className={"sec-change mono " + (up ? "pos" : "neg")}>{up ? "▲" : "▼"} {Math.abs(s.change).toFixed(2)}%</span>
            </div>
          </div>
          <button className={"watch-btn" + (s.watched ? " on" : "")} onClick={() => onToggleWatch(s.ticker)}>
            <Lic name="star" size={14} cls="icon-sm" color={s.watched ? "var(--r-base)" : "var(--fg-3)"} />{s.watched ? t.watching : t.watch}
          </button>
        </div>

        <SecurityChart security={s} />
        <div className="sec-chart-cap"><Lic name="info" size={12} cls="icon-sm" color="var(--fg-4)" />{t.chartNote}</div>

        <div className="metric-row" style={{ marginTop: 18 }}>
          <div className="metric"><div className="metric-lab">{t.current}</div><div className="metric-val">{fmtMoney(s.price, s.cur)}</div></div>
          <div className="metric"><div className="metric-lab">{t.change}</div><div className={"metric-val sm " + (up ? "pos" : "neg")}>{up ? "+" : ""}{s.change.toFixed(2)}%</div></div>
          <div className="metric"><div className="metric-lab">PER</div><div className="metric-val sm">{per.toFixed(1)}×</div></div>
          <div className="metric"><div className="metric-lab">{t.mktCap}</div><div className="metric-val sm">{capStr}</div></div>
          <div className="metric"><div className="metric-lab">{t.val_shares}</div><div className="metric-val sm mono">{fmtShares(s.sharesOut, lang)}</div></div>
          <div className="metric"><div className="metric-lab">EPS</div><div className="metric-val sm mono">{s.cur === "USD" ? "$" + s.eps.toFixed(2) : "₩" + s.eps.toLocaleString()}</div></div>
        </div>

        <div className="dt-tabs sec-tabs">{secTabs.map(([k, lab]) => <div key={k} className={"dt-tab" + (secTab === k ? " active" : "")} onClick={() => setSecTab(k)}>{lab}</div>)}</div>

        {secTab === "financials" && <FinancialsTab plan={secPlan} t={t} lang={lang} />}
        {secTab === "indicators" && <IndicatorsTab plan={secPlan} t={t} lang={lang} />}
        {secTab === "valuation" && <ValuationView plan={secPlan} t={t} lang={lang} />}
        {secTab === "overview" && <React.Fragment>
        <SeasonalityHeatmap security={s} lang={lang} />
        <div style={{ display: "flex", gap: 8, marginBottom: 24, marginTop: 24 }}>
          <button className="v-btn v-btn--primary" onClick={() => onCreatePlan(s)}><Lic name="plus" size={15} cls="icon-sm" color="var(--fg-on-accent)" />{t.createPlanHere}</button>
        </div>

        <SecurityScenarios security={s} plans={plans} t={t} lang={lang} onAdd={() => onAddScenario && onAddScenario(s.ticker)} onOpenPlan={onOpenPlan} />

        <div className="se-section-h" style={{ marginTop: 24 }}>{t.plansOn} <span className="grp-count">{linked.length}</span></div>
        {linked.length ? <React.Fragment>{linked.slice(0, planLimit).map(p => {
          const ret = planReturn(p);
          return (
            <div className="sec-planrow" key={p.id} onClick={() => onOpenPlan(p)}>
              <StatusIcon status={p.status} size={14} />
              <span className="mono" style={{ color: "var(--fg-4)", fontSize: 12, width: 58 }}>{p.id}</span>
              <span style={{ flex: 1, font: "var(--fw-medium) 13px var(--font-sans)", color: "var(--fg)" }}>{p.name[lang]}</span>
              {STRATEGIES.find(x => x.id === p.strategyId) && <span className="strat-dot" style={{ background: STRATEGIES.find(x => x.id === p.strategyId).color }} />}
              <span className={"mono " + (ret ? (ret.rate >= 0 ? "pos" : "neg") : "")} style={{ fontSize: 13, width: 60, textAlign: "right" }}>{ret ? (ret.rate >= 0 ? "+" : "") + ret.rate.toFixed(1) + "%" : "—"}</span>
            </div>
          );
        })}{linked.length > planLimit && <button className="note-more" style={{ margin: "4px 0 8px" }} onClick={() => setPlanLimit(l => l + 40)}>{lang === "ko" ? `더 보기 (${linked.length - planLimit}개 남음)` : `Show more (${linked.length - planLimit} left)`}</button>}</React.Fragment> : <div style={{ padding: "16px 0", color: "var(--fg-4)", font: "var(--fw-medium) 13px var(--font-sans)" }}>{t.noPlansYet}</div>}
        </React.Fragment>}
        {!embedded && <div className="sec-memo">
          <div className="se-section-h" style={{ marginTop: 24 }}>{lang === "ko" ? "종목 메모" : "Security notes"} <span className="grp-count">{secNotes.length}</span></div>
          <div className="note-compose">
            <textarea className="note-input" rows="2" placeholder={lang === "ko" ? "이 종목을 왜 보는지·리서치를 기록하세요… (⌘/Ctrl+Enter)" : "Why you're watching this… (⌘/Ctrl+Enter)"} value={secDraft}
              onChange={e => setSecDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addSecNote(); }} />
            {secDraft.trim() && <button className="v-btn v-btn--primary note-save" onClick={addSecNote}>{lang === "ko" ? "기록" : "Log"}</button>}
          </div>
          {secNotes.length === 0 ? <div className="note-empty">{lang === "ko" ? "아직 메모가 없습니다. 일지에도 함께 모입니다." : "No notes yet. These also collect in the Journal."}</div>
            : secNotes.map(n => (
              <div className="note-item" key={n.id}>
                <div className="note-meta"><span className="note-when">{n.when && typeof n.when === "object" ? (n.when[lang] || n.when.en) : n.when}{n.editedAt && <span className="note-edited">{lang === "ko" ? " · 수정됨" : " · edited"}</span>}</span>
                  {secEditId !== n.id && <span className="note-acts">
                    <button className="note-edit" title={lang === "ko" ? "수정" : "Edit"} onClick={() => startSecEdit(n)}><Lic name="pencil" size={11} color="currentColor" /></button>
                    <button className="note-del" title={t.delete} onClick={() => removeSecNote(n.id)}><Lic name="x" size={12} color="currentColor" /></button>
                  </span>}
                </div>
                {secEditId === n.id
                  ? <div className="note-edit-box">
                      <textarea className="note-input" autoFocus rows="3" value={secEditText} onChange={e => setSecEditText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commitSecEdit(); if (e.key === "Escape") cancelSecEdit(); }} />
                      <div className="note-edit-acts">
                        <button className="note-cancel" onClick={cancelSecEdit}>{lang === "ko" ? "취소" : "Cancel"}</button>
                        <button className="v-btn v-btn--primary note-save" onClick={commitSecEdit}>{lang === "ko" ? "저장" : "Save"}</button>
                      </div>
                    </div>
                  : <div className="note-text">{n.text}</div>}
              </div>
            ))}
        </div>}
      </div>
    </div>
  );
}

/* ---- security search modal (with KR/US market toggle) ---- */
function SecuritySearch({ t, lang, plans, onClose, onOpenSecurity, onCreatePlan }) {
  const [q, setQ] = React.useState("");
  const [mkt, setMkt] = React.useState("all");
  const list = SECURITIES.filter(s =>
    (mkt === "all" || s.market === mkt) &&
    (q === "" || s.ticker.toLowerCase().includes(q.toLowerCase()) || s.name.en.toLowerCase().includes(q.toLowerCase()) || s.name.ko.includes(q))
  );
  const mini = (s) => {
    const sp = s.spark.slice(-16); const min = Math.min(...sp), max = Math.max(...sp);
    const pts = sp.map((v, i) => `${(i / (sp.length - 1) * 56).toFixed(1)},${(16 - (v - min) / (max - min || 1) * 14 - 1).toFixed(1)}`).join(" ");
    return <svg width="56" height="16" style={{ flex: "none" }}><polyline points={pts} fill="none" stroke={s.change >= 0 ? "var(--pos)" : "var(--neg)"} strokeWidth="1.5" /></svg>;
  };
  return (
    <div className="scrim" onClick={onClose}>
      <div className="cmd" onClick={e => e.stopPropagation()} style={{ width: 600 }}>
        <div className="cmd-input-row">
          <Lic name="search" size={17} color="var(--fg-4)" />
          <input autoFocus className="cmd-input" placeholder={t.searchSec} value={q} onChange={e => setQ(e.target.value)} />
          <div className="market-toggle">
            {[["all", { en: "All", ko: "전체" }], ...MARKETS.map(m => [m.key, m.label])].map(([k, lab]) => (
              <div key={k} className={"mt-seg" + (mkt === k ? " on" : "")} onClick={() => setMkt(k)}>{lab[lang] || lab}</div>
            ))}
          </div>
        </div>
        <div className="cmd-list" style={{ maxHeight: 420 }}>
          {list.map(s => {
            const up = s.change >= 0; const nPlans = plansForTicker(plans, s.ticker).length;
            return (
              <div className="sec-search-row" key={s.ticker} onClick={() => onOpenSecurity(s.ticker)}>
                <Flag market={s.market} size={15} />
                <span className="mono" style={{ width: 64, color: "var(--fg-3)", fontSize: 12 }}>{s.ticker}</span>
                <span style={{ flex: 1, minWidth: 0, font: "var(--fw-medium) 13px var(--font-sans)", color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name[lang]}</span>
                {s.watched && <Lic name="star" size={12} cls="icon-sm" color="var(--r-base)" />}
                {nPlans > 0 && <span className="sec-nplans">{nPlans}</span>}
                {mini(s)}
                <span className="mono" style={{ width: 84, textAlign: "right", fontSize: 13, color: "var(--fg)" }}>{fmtCompact(s.price, s.cur)}</span>
                <span className={"mono " + (up ? "pos" : "neg")} style={{ width: 60, textAlign: "right", fontSize: 12 }}>{up ? "+" : ""}{s.change.toFixed(2)}%</span>
              </div>
            );
          })}
          {!list.length && <div style={{ padding: 24, textAlign: "center", color: "var(--fg-4)", font: "var(--fw-medium) 13px var(--font-sans)" }}>{lang === "ko" ? "검색 결과 없음" : "No results"}</div>}
        </div>
      </div>
    </div>
  );
}

/* ---- universal search (plans + securities + strategies), distinct from ⌘K ---- */
function SearchModal({ t, lang, plans, onClose, onOpenPlan, onOpenSecurity, onOpenStrategy }) {
  const [q, setQ] = React.useState("");
  const [mkt, setMkt] = React.useState("all");
  const ql = q.toLowerCase();
  const planHits = plans.filter(p => !q || p.name[lang].toLowerCase().includes(ql) || p.tickerName[lang].toLowerCase().includes(ql) || p.ticker.toLowerCase().includes(ql) || p.id.toLowerCase().includes(ql));
  const secHits = SECURITIES.filter(s => (mkt === "all" || s.market === mkt) && (!q || s.ticker.toLowerCase().includes(ql) || s.name.en.toLowerCase().includes(ql) || s.name.ko.includes(q)));
  const stratHits = (typeof EXEC_STRATEGIES !== "undefined" ? EXEC_STRATEGIES : []).filter(s => !q || s.name[lang].toLowerCase().includes(ql) || s.name.en.toLowerCase().includes(ql));
  const fwHits = STRATEGIES.filter(s => s.model && (!q || s.name[lang].toLowerCase().includes(ql) || s.name.en.toLowerCase().includes(ql)));
  const cap = (arr) => q ? arr : arr.slice(0, 6);
  const moreCount = (arr) => (!q && arr.length > 6) ? arr.length - 6 : 0;
  // recency rank for relative ("2h"/"1d"/"now") or absolute ("Apr 18") updatedAt — smaller = more recent
  const RELMIN = (s) => {
    if (!s) return 1e9;
    if (s === "now") return 0;
    let m;
    if (m = /^(\d+)\s*m/.exec(s)) return +m[1];
    if (m = /^(\d+)\s*h/.exec(s)) return +m[1] * 60;
    if (m = /^(\d+)\s*d/.exec(s)) return +m[1] * 1440;
    const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const am = /^([A-Za-z]{3})\s+(\d+)/.exec(s);
    if (am) { const mo = mon.indexOf(am[1]); if (mo >= 0) return 1e6 - (mo * 31 + (+am[2])); }
    return 1e9;
  };
  const planOrdered = q ? planHits : [...planHits].sort((a, b) => RELMIN(a.updatedAt) - RELMIN(b.updatedAt));
  const capCap = (label, arr) => { const more = moreCount(arr); return <div className="cmd-cap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><span>{label}</span>{more > 0 && <span className="cmd-cap-more">+{more}</span>}</div>; };
  // default (no query): rank securities by recency → watched → array order, so "All" shows a real
  // mix of what the user actually opened instead of the first few array entries (all one market).
  const secRecents = getSecRecents();
  const secRank = (s) => { const ri = secRecents.indexOf(s.ticker); if (ri >= 0) return ri; return s.watched ? 100 : 200; };
  const secOrdered = q ? secHits : [...secHits].sort((a, b) => secRank(a) - secRank(b));
  const secShownIsRecent = !q && secRecents.length > 0;
  const mini = (s) => {
    const sp = s.spark.slice(-16); const min = Math.min(...sp), max = Math.max(...sp);
    const pts = sp.map((v, i) => `${(i / (sp.length - 1) * 52).toFixed(1)},${(16 - (v - min) / (max - min || 1) * 14 - 1).toFixed(1)}`).join(" ");
    return <svg width="52" height="16" style={{ flex: "none" }}><polyline points={pts} fill="none" stroke={s.change >= 0 ? "var(--pos)" : "var(--neg)"} strokeWidth="1.5" /></svg>;
  };
  const empty = !planHits.length && !secHits.length && !stratHits.length && !fwHits.length;
  return (
    <div className="scrim" onClick={onClose}>
      <div className="cmd" onClick={e => e.stopPropagation()} style={{ width: 620 }}>
        <div className="cmd-input-row">
          <Lic name="search" size={17} color="var(--fg-4)" />
          <input autoFocus className="cmd-input" placeholder={lang === "ko" ? "플랜·종목·전략 검색…" : "Search plans, securities, strategies…"} value={q} onChange={e => setQ(e.target.value)} />
          <span className="kbd">/</span>
        </div>
        <div className="cmd-list" style={{ maxHeight: 440 }}>
          {planHits.length > 0 && <>
            {capCap(t.plans, planOrdered)}
            {cap(planOrdered).map(p => { const r = planReturn(p); return (
              <div className="cmd-item" key={p.id} onClick={() => { onOpenPlan(p); onClose(); }}>
                <StatusIcon status={p.status} size={14} /><span className="mono" style={{ color: "var(--fg-4)", fontSize: 11, width: 54 }}>{p.id}</span>
                <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name[lang]}</span>
                <span className={"mono " + (r ? (r.rate >= 0 ? "pos" : "neg") : "")} style={{ fontSize: 12 }}>{r ? (r.rate >= 0 ? "+" : "") + r.rate.toFixed(1) + "%" : ""}</span>
              </div>
            ); })}
          </>}
          {secHits.length > 0 && <>
            <div className="cmd-cap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{secShownIsRecent ? (lang === "ko" ? "종목 · 최근 본" : "Securities · Recent") : t.securities}{moreCount(secOrdered) > 0 && <span className="cmd-cap-more">+{moreCount(secOrdered)}</span>}</span>
              <div className="market-toggle" onClick={e => e.stopPropagation()}>
                {[["all", { en: "All", ko: "전체" }], ...MARKETS.map(m => [m.key, m.label])].map(([k, lab]) => <div key={k} className={"mt-seg" + (mkt === k ? " on" : "")} onClick={() => setMkt(k)}>{lab[lang] || lab}</div>)}
              </div>
            </div>
            {cap(secOrdered).map(s => { const up = s.change >= 0; const n = plansForTicker(plans, s.ticker).length; return (
              <div className="cmd-item" key={s.ticker} onClick={() => { onOpenSecurity(s.ticker); onClose(); }}>
                <Flag market={s.market} size={14} /><span className="mono" style={{ color: "var(--fg-4)", fontSize: 11, width: 58 }}>{s.ticker}</span>
                <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name[lang]}</span>
                {s.watched && <Lic name="star" size={11} cls="icon-sm" color="var(--r-base)" />}{n > 0 && <span className="sec-nplans">{n}</span>}{mini(s)}
                <span className="mono" style={{ width: 78, textAlign: "right", fontSize: 12, color: "var(--fg-2)" }}>{fmtCompact(s.price, s.cur)}</span>
                <span className={"mono " + (up ? "pos" : "neg")} style={{ width: 52, textAlign: "right", fontSize: 11 }}>{up ? "+" : ""}{s.change.toFixed(1)}%</span>
              </div>
            ); })}
          </>}
          {stratHits.length > 0 && <>
            {capCap(t.strategies, stratHits)}
            {cap(stratHits).map(s => (
              <div className="cmd-item" key={s.id} onClick={() => { onOpenStrategy(s.id); onClose(); }}>
                <Lic name={s.icon} size={14} cls="icon-sm" color={s.color} /><span>{s.name[lang]}</span>
              </div>
            ))}
          </>}
          {fwHits.length > 0 && <>
            {capCap(t.framework, fwHits)}
            {cap(fwHits).map(s => (
              <div className="cmd-item" key={s.id} onClick={() => { onOpenStrategy(s.id); onClose(); }}>
                <Lic name={s.icon || "gauge"} size={14} cls="icon-sm" color={s.color || "var(--fg-3)"} /><span>{s.name[lang]}</span>
              </div>
            ))}
          </>}
          {empty && <div style={{ padding: 24, textAlign: "center", color: "var(--fg-4)", font: "var(--fw-medium) 13px var(--font-sans)" }}>{lang === "ko" ? "검색 결과 없음" : "No results"}</div>}
        </div>
      </div>
    </div>
  );
}

/* ---- security peek (right slide-over) ---- */
function SecurityPeek({ security, plans, t, lang, onClose, onExpand, onOpenPlan, onToggleWatch, onCreatePlan, onAddScenario }) {
  if (!security) return null;
  return (
    <>
      <div className="peek-scrim" onClick={onClose} />
      <div className="peek-panel">
        <div className="peek-head">
          <span className="mono" style={{ fontSize: 12, color: "var(--fg-4)", display: "inline-flex", alignItems: "center", gap: 6 }}><Flag market={security.market} size={13} /> {security.ticker}</span>
          <span style={{ flex: 1 }} />
          <button className="iconbtn" onClick={onExpand} title={lang === "ko" ? "전체화면으로 열기" : "Open full"}><Lic name="maximize-2" size={15} /></button>
          <button className="iconbtn" onClick={onClose} title={lang === "ko" ? "닫기" : "Close"}><Lic name="x" size={16} /></button>
        </div>
        <div className="peek-body">
          <SecurityDetail security={security} plans={plans} t={t} lang={lang} embedded
            onOpenPlan={onOpenPlan} onToggleWatch={onToggleWatch} onCreatePlan={onCreatePlan} onAddScenario={onAddScenario} />
        </div>
      </div>
    </>
  );
}

Object.assign(window, { SecurityChart, SecurityDetail, SecurityPeek, SecuritySearch, SearchModal });
