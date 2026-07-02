// Insights.jsx — Keystone analytics. Measures the *process*, not a portfolio dashboard.
// Sections: scenario accuracy, performance (관점 vs 전략), process health, win/loss.
// Visuals carry meaning only — gauge (graded score), scatter (relationship),
// funnel/composition (part-to-whole), histogram (distribution). No decorative donuts.
// 전략 = plan.execId → EXEC_STRATEGIES.  관점 = plan.strategyId → STRATEGIES(.model).

const SCASE = [
  { key: "Bull", color: "var(--r-bull)" },
  { key: "Base", color: "var(--r-base)" },
  { key: "Bear", color: "var(--r-bear)" },
];

function insMonthIdx(d) { return typeof trajMonthIdx === "function" ? trajMonthIdx(d) : 0; }

/* ---- section shell ---- */
function InsSection({ title, sub, children, right }) {
  return (
    <div className="ins-section">
      <div className="ins-head">
        <div>
          <div className="ins-title">{title}</div>
          <div className="ins-sub">{sub}</div>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

/* ---- semicircle gauge — a bounded 0..100 score (hit rate, win rate). Fill via pathLength. ---- */
function InsGauge({ pct, label, sub }) {
  const R = 42, cx = 50, cy = 48, sw = 9;
  const v = pct == null ? null : Math.max(0, Math.min(100, pct));
  const arc = `M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`;
  const col = v == null ? "var(--fg-4)" : v >= 60 ? "var(--pos)" : v >= 40 ? "var(--r-base)" : "var(--neg)";
  return (
    <div className="ins-gauge">
      <svg viewBox="0 0 100 60" className="ins-gauge-svg">
        <path d={arc} pathLength="100" fill="none" stroke="var(--border-strong)" strokeWidth={sw} strokeLinecap="round" />
        {v != null && <path d={arc} pathLength="100" fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${v} 100`} />}
        <text x="50" y="44" textAnchor="middle" className="ins-gauge-num" style={{ fill: col }}>{v == null ? "—" : v + "%"}</text>
      </svg>
      <div className="ins-gauge-lab">{label}</div>
      {sub && <div className="ins-gauge-sub">{sub}</div>}
    </div>
  );
}

/* ---- performance scatter — win rate (x) × avg return (y), dot per group ---- */
function PerfScatter({ rows, ko }) {
  const W = 540, H = 210, padL = 46, padR = 18, padT = 16, padB = 34;
  const iw = W - padL - padR, ih = H - padT - padB;
  const vals = rows.map(r => r.avg).filter(v => v != null);
  if (!vals.length) return null;
  const maxAbs = Math.max(8, ...vals.map(v => Math.abs(v))) * 1.15;
  const X = wr => padL + (Math.max(0, Math.min(100, wr || 0)) / 100) * iw;
  const Y = av => padT + (1 - (av + maxAbs) / (2 * maxAbs)) * ih;
  const maxCount = Math.max(1, ...rows.map(r => r.count));
  const rad = c => 5 + (c / maxCount) * 7;
  const y0 = Y(0), x50 = X(50);
  // collision-aware layout: relax overlapping dots vertically within same-x clusters
  const laid = rows.filter(r => r.avg != null).map(r => ({ r, cx: X(r.winRate), rr: rad(r.count), cy: Y(r.avg) }));
  const clusters = {};
  laid.forEach(it => { const k = Math.round(it.cx / 12); (clusters[k] = clusters[k] || []).push(it); });
  Object.values(clusters).forEach(cl => {
    cl.sort((a, b) => a.cy - b.cy);
    const gap = 16;
    for (let iter = 0; iter < 30 && cl.length > 1; iter++) {
      let moved = false;
      for (let i = 1; i < cl.length; i++) { const d = cl[i].cy - cl[i - 1].cy; if (d < gap) { const p = (gap - d) / 2; cl[i - 1].cy -= p; cl[i].cy += p; moved = true; } }
      cl.forEach(c => { c.cy = Math.max(padT + 7, Math.min(H - padB - 7, c.cy)); });
      if (!moved) break;
    }
  });
  return (
    <div className="ins-scatter">
      <svg viewBox={`0 0 ${W} ${H}`} className="ins-scatter-svg" preserveAspectRatio="xMidYMid meet">
        {/* y grid: +maxAbs, 0, -maxAbs */}
        {[maxAbs, maxAbs / 2, 0, -maxAbs / 2, -maxAbs].map((gv, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={Y(gv)} y2={Y(gv)} stroke={gv === 0 ? "var(--border-strong)" : "var(--border)"} strokeWidth="1" />
            <text x={padL - 7} y={Y(gv) + 3.5} textAnchor="end" className="ins-sc-axn">{(gv > 0 ? "+" : "") + gv.toFixed(0)}</text>
          </g>
        ))}
        {/* x reference at 50% */}
        <line x1={x50} x2={x50} y1={padT} y2={H - padB} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
        {[0, 25, 50, 75, 100].map(wr => <text key={wr} x={X(wr)} y={H - padB + 16} textAnchor="middle" className="ins-sc-axn">{wr}</text>)}
        <text x={(padL + W - padR) / 2} y={H - 4} textAnchor="middle" className="ins-sc-axlab">{ko ? "승률 (%)" : "Win rate (%)"}</text>
        <text x="12" y={padT + ih / 2} textAnchor="middle" className="ins-sc-axlab" transform={`rotate(-90 12 ${padT + ih / 2})`}>{ko ? "평균 수익률 (%)" : "Avg return (%)"}</text>
        {/* dots */}
        {laid.map(({ r, cx, cy, rr }) => {
          const near = 70;
          const edge = cx > W - padR - near;
          const anchor = edge ? "end" : cx < padL + near ? "start" : "middle";
          const lx = edge ? cx - rr - 6 : (anchor === "start" ? Math.max(cx - rr, 4) : cx);
          const ly = edge ? cy + 3.5 : (cy - rr - 4 >= 11 ? cy - rr - 4 : cy + rr + 13);
          return (
            <g key={r.id}>
              <circle cx={cx} cy={cy} r={rr} fill={r.color} fillOpacity="0.22" stroke={r.color} strokeWidth="1.5" />
              <text x={lx} y={ly} textAnchor={edge ? "end" : anchor} className="ins-sc-lab">{r.name[ko ? "ko" : "en"]}</text>
            </g>
          );
        })}
      </svg>
      <div className="ins-sc-overlay">
        {laid.map(({ r, cx, cy }) => {
          const L = ko ? "ko" : "en";
          const fx = cx / W, fy = cy / H;
          const tx = fx > 0.6 ? { right: 0, left: "auto" } : fx < 0.4 ? { left: 0, right: "auto" } : { left: "50%", transform: "translateX(-50%)" };
          const ty = fy < 0.45 ? { top: 13 } : { bottom: 13 };
          const ps = r.ps.map(p => { const pr = planReturn(p); return { p, ret: pr ? pr.rate : null }; }).sort((a, b) => (b.ret == null ? -1e9 : b.ret) - (a.ret == null ? -1e9 : a.ret));
          return (
            <div className="ins-sc-hit" key={r.id} style={{ left: fx * 100 + "%", top: fy * 100 + "%" }}>
              <div className="ins-sc-tip" style={{ ...tx, ...ty }}>
                <div className="gap-tip-q" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="strat-dot" style={{ background: r.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name[L]}</span>
                  <span style={{ color: "var(--fg-4)", fontWeight: "var(--fw-medium)", fontSize: 10.5, flexShrink: 0 }}>{r.count}{ko ? "플랜" : " plans"}</span>
                </div>
                <div className="ins-sc-tip-plans">
                  {ps.map(({ p, ret }) => (
                    <div className="ins-sc-tip-plan" key={p.id}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.tickerName ? p.tickerName[L] : p.name[L]}</span>
                      <span className={"mono " + (ret == null ? "" : ret >= 0 ? "pos" : "neg")} style={{ flexShrink: 0, color: ret == null ? "var(--fg-4)" : undefined }}>{ret == null ? "—" : (ret >= 0 ? "+" : "") + ret.toFixed(1) + "%"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- 1. Scenario accuracy ---- */
function ScenarioAccuracy({ plans, t, lang }) {
  const ko = lang === "ko";
  const buckets = {};
  SCASE.forEach(c => buckets[c.key] = { realized: 0, invalidated: 0, pending: 0, gaps: [] });
  let totalR = 0, totalI = 0;
  plans.forEach(p => p.scenarios.forEach(sc => {
    const b = buckets[sc.label.en]; if (!b) return;
    if (sc.status === "realized") { b.realized++; totalR++; }
    else if (sc.status === "invalidated") { b.invalidated++; totalI++; }
    else { b.pending++; b.gaps.push(Math.abs((sc.target / p.currentPrice - 1) * 100)); }
  }));
  const hit = totalR + totalI > 0 ? Math.round((totalR / (totalR + totalI)) * 100) : null;
  const allGaps = SCASE.flatMap(c => buckets[c.key].gaps);
  const avgGap = allGaps.length ? (allGaps.reduce((a, b) => a + b, 0) / allGaps.length) : null;
  return (
    <InsSection title={t.secAccuracy} sub={t.secAccuracySub}>
      <div className="ins-split">
        <InsGauge pct={hit} label={t.hitRate} sub={ko ? `판정난 예측 ${totalR + totalI}건` : `${totalR + totalI} settled`} />
        <div className="ins-split-main">
          <div className="ins-rows">
            {SCASE.map(c => {
              const b = buckets[c.key];
              const total = b.realized + b.invalidated + b.pending || 1;
              const pct = (n) => (n / total) * 100;
              return (
                <div className="ins-row" key={c.key}>
                  <span className="ins-row-label"><span className="scsum-dot" style={{ background: c.color }} />{typeof scLabel === "function" ? scLabel(c.key, lang) : t["case" + c.key]}</span>
                  <div className="ins-stack">
                    {b.realized > 0 && <span className="ins-seg" style={{ width: pct(b.realized) + "%", background: "var(--pos)" }} title={t.realized} />}
                    {b.pending > 0 && <span className="ins-seg" style={{ width: pct(b.pending) + "%", background: "var(--border-strong)" }} title={t.pending} />}
                    {b.invalidated > 0 && <span className="ins-seg" style={{ width: pct(b.invalidated) + "%", background: "var(--neg)" }} title={t.invalidated} />}
                  </div>
                  <span className="ins-row-nums">
                    <span className="inn pos">{b.realized}</span>
                    <span className="inn">{b.pending}</span>
                    <span className="inn neg">{b.invalidated}</span>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="ins-legend">
            <span><i style={{ background: "var(--pos)" }} />{t.realized}</span>
            <span><i style={{ background: "var(--border-strong)" }} />{t.pending}</span>
            <span><i style={{ background: "var(--neg)" }} />{t.invalidated}</span>
            <span className="ins-legend-kpi">{t.avgTargetErr} <b className="mono">{avgGap != null ? "±" + avgGap.toFixed(1) + "%" : "—"}</b></span>
          </div>
        </div>
      </div>
    </InsSection>
  );
}

/* ---- 2. Performance — 관점(lens) vs 전략(strategy), each a distinct axis ---- */
function PerformanceSection({ plans, t, lang }) {
  const ko = lang === "ko";
  const [by, setBy] = React.useState("lens"); // lens(관점) | strat(전략)
  const defs = by === "lens"
    ? (typeof STRATEGIES !== "undefined" ? STRATEGIES.filter(s => s.model) : []).map(s => ({ id: s.id, name: s.name, color: s.color, ps: plans.filter(p => p.strategyId === s.id) }))
    : (typeof EXEC_STRATEGIES !== "undefined" ? EXEC_STRATEGIES : []).map(s => ({ id: s.id, name: s.name, color: s.color, ps: plans.filter(p => p.execId === s.id) }));
  const rows = defs.map(g => {
    const rets = g.ps.map(p => planReturn(p)).filter(Boolean);
    const avg = rets.length ? rets.reduce((a, r) => a + r.rate, 0) / rets.length : null;
    const wins = rets.filter(r => r.rate >= 0).length;
    const winRate = rets.length ? Math.round((wins / rets.length) * 100) : null;
    return { ...g, count: g.ps.length, withPos: rets.length, avg, winRate };
  }).filter(r => r.count > 0);
  const maxAbs = Math.max(1, ...rows.map(r => Math.abs(r.avg || 0)));
  const sampleN = rows.reduce((a, r) => a + r.withPos, 0);
  const title = by === "lens" ? (ko ? "관점 성과" : "Lens performance") : (ko ? "전략 성과" : "Strategy performance");
  const sub = by === "lens"
    ? (ko ? `이 관점으로 세운 플랜들의 성과 · 표본 ${sampleN}플랜` : `How plans built on each lens have done · ${sampleN} plans`)
    : (ko ? `이 전략으로 실행한 플랜들의 성과 · 표본 ${sampleN}플랜` : `How plans run with each strategy have done · ${sampleN} plans`);
  const toggle = (
    <div className="seg-toggle">
      <div className={"st" + (by === "lens" ? " active" : "")} onClick={() => setBy("lens")}>{ko ? "관점" : "Lens"}</div>
      <div className={"st" + (by === "strat" ? " active" : "")} onClick={() => setBy("strat")}>{ko ? "전략" : "Strategy"}</div>
    </div>
  );
  return (
    <InsSection title={title} sub={sub} right={toggle}>
      {rows.some(r => r.avg != null) ? <PerfScatter rows={rows} ko={ko} /> : null}
      <table className="ins-table">
        <thead><tr>
          <th>{by === "lens" ? (ko ? "관점" : "Lens") : (ko ? "전략" : "Strategy")}</th>
          <th className="num">{t.planCount}</th>
          <th style={{ width: "34%" }}>{t.avgReturn}</th>
          <th className="num">{t.winRate}</th>
        </tr></thead>
        <tbody>
          {rows.map(r => {
            const pos = (r.avg || 0) >= 0;
            const w = r.avg != null ? (Math.abs(r.avg) / maxAbs) * 50 : 0;
            return (
              <tr key={r.id}>
                <td><span className="ins-strat"><span className="strat-dot" style={{ background: r.color }} />{r.name[lang]}</span></td>
                <td className="num">{r.count}</td>
                <td>
                  <div className="ins-divbar">
                    <div className="ins-divbar-zero" />
                    {r.avg != null && <div className="ins-divbar-fill" style={{ width: w + "%", left: pos ? "50%" : (50 - w) + "%", background: pos ? "var(--pos)" : "var(--neg)" }} />}
                    <span className={"ins-divbar-val mono " + (pos ? "pos" : "neg")} style={pos ? { left: "calc(50% + " + w + "% + 6px)" } : { right: "calc(50% + " + w + "% + 6px)" }}>{r.avg != null ? (pos ? "+" : "") + r.avg.toFixed(1) + "%" : "—"}</span>
                  </div>
                </td>
                <td className="num mono">{r.winRate != null ? r.winRate + "%" : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="ins-perf-note">{ko ? "수익률 = 보유 플랜의 평단 대비 미실현 · 점 크기 = 플랜 수" : "Return = unrealized vs avg cost on open plans · dot size = plan count"}</div>
    </InsSection>
  );
}

/* ---- 3. Process health ---- */
function ProcessHealth({ plans, t, lang }) {
  const ko = lang === "ko";
  const entryGaps = [], closeGaps = [];
  plans.forEach(p => {
    const created = insMonthIdx(p.createdAt);
    const buys = (p.executions || []).filter(e => e.side === "buy").map(e => insMonthIdx(e.date)).filter(v => v != null);
    if (buys.length && created != null) entryGaps.push(Math.max(0, Math.min(...buys) - created) * 30.4);
    if (p.closedAt && buys.length) closeGaps.push(Math.max(0, insMonthIdx(p.closedAt) - Math.min(...buys)) * 30.4);
  });
  const mean = (a) => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;
  const allRules = plans.flatMap(p => p.rules || []);
  const activeRules = allRules.filter(r => r.on).length;
  const firedRules = allRules.filter(r => r.last && r.last !== "Never").length;
  const actRate = allRules.length ? Math.round((firedRules / allRules.length) * 100) : 0;
  // lifecycle funnel — how many plans sit at each stage (part-to-whole)
  const stageDefs = [
    { keys: ["research", "planning"], label: ko ? "관찰·계획" : "Research", color: "var(--r-research)" },
    { keys: ["active", "paused"], label: ko ? "실행중" : "Active", color: "var(--r-active)" },
    { keys: ["closing"], label: ko ? "청산중" : "Closing", color: "var(--r-closing)" },
    { keys: ["closed"], label: ko ? "종료" : "Closed", color: "var(--r-closed)" },
  ];
  const total = plans.length || 1;
  const stages = stageDefs.map(s => ({ ...s, n: plans.filter(p => s.keys.includes(p.status)).length })).filter(s => s.n > 0);
  const flow = [
    { k: t.toResearch, color: "var(--r-research)", dur: null },
    { k: t.toEntry, color: "var(--r-active)", dur: mean(entryGaps) },
    { k: t.toClose, color: "var(--r-closed)", dur: mean(closeGaps) },
  ];
  return (
    <InsSection title={t.procHealth} sub={t.procHealthSub}>
      <div className="ins-funnel">
        {stages.map((s, i) => (
          <div className="ins-funnel-seg" key={i} style={{ width: (s.n / total * 100) + "%", background: "color-mix(in srgb, " + s.color + " 26%, transparent)", borderColor: "color-mix(in srgb, " + s.color + " 50%, transparent)" }} title={s.label + " · " + s.n}>
            <span className="ins-funnel-dot" style={{ background: s.color }} />
            <span className="ins-funnel-lab">{s.label}</span>
            <span className="ins-funnel-n mono">{s.n}</span>
          </div>
        ))}
      </div>
      <div className="ins-flow">
        {flow.map((s, i) => (
          <React.Fragment key={i}>
            <div className="ins-stage">
              <span className="ins-stage-dot" style={{ background: s.color }} />
              <span className="ins-stage-k">{s.k}</span>
            </div>
            {i < flow.length - 1 && (
              <div className="ins-flow-arrow">
                <span className="ins-flow-dur mono">{flow[i + 1].dur != null ? flow[i + 1].dur + t.days : "—"}</span>
                <span className="ins-flow-line" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="metric-row" style={{ marginTop: 14, marginBottom: 0 }}>
        <div className="metric"><div className="metric-lab">{t.avgHold}</div><div className="metric-val sm mono">{mean(closeGaps.concat(entryGaps)) != null ? mean(entryGaps.concat(closeGaps)) + t.days : "—"}</div></div>
        <div className="metric"><div className="metric-lab">{t.rulesFired}</div><div className="metric-val sm mono">{firedRules}/{allRules.length}</div></div>
        <div className="metric"><div className="metric-lab">{t.ruleActRate}</div><div className="metric-val sm mono">{actRate}%</div></div>
        <div className="metric"><div className="metric-lab">{t.active}</div><div className="metric-val sm mono">{activeRules}</div></div>
      </div>
    </InsSection>
  );
}

/* ---- 4. Win / loss ---- */
function WinLoss({ plans, t, lang }) {
  const ko = lang === "ko";
  const outcomes = plans.map(p => {
    if (p.status === "closed" && p.realizedPL != null) return { p, rate: p.realizedPL >= 0 ? 8 : -8, win: p.realizedPL >= 0, closed: true };
    const r = planReturn(p); if (!r) return null;
    return { p, rate: r.rate, win: r.rate >= 0, closed: false };
  }).filter(Boolean);
  const winners = outcomes.filter(o => o.win), losers = outcomes.filter(o => !o.win);
  const winRate = outcomes.length ? Math.round((winners.length / outcomes.length) * 100) : 0;
  const sumWin = winners.reduce((a, o) => a + o.rate, 0);
  const sumLoss = Math.abs(losers.reduce((a, o) => a + o.rate, 0));
  const pf = sumLoss > 0 ? (sumWin / sumLoss) : (sumWin > 0 ? Infinity : 0);
  const avgWin = winners.length ? sumWin / winners.length : 0;
  const avgLoss = losers.length ? -sumLoss / losers.length : 0;
  const sorted = outcomes.slice().sort((a, b) => b.rate - a.rate);
  const best = sorted[0], worst = sorted[sorted.length - 1];
  const total = outcomes.length || 1;
  // return distribution histogram (open plans only — real % rates)
  const openRates = outcomes.filter(o => !o.closed).map(o => o.rate);
  const bins = [
    { lo: -Infinity, hi: -20, lab: "≤-20" }, { lo: -20, hi: -10, lab: "-20" }, { lo: -10, hi: 0, lab: "-10" },
    { lo: 0, hi: 10, lab: "0" }, { lo: 10, hi: 20, lab: "+10" }, { lo: 20, hi: Infinity, lab: "≥+20" },
  ].map(b => ({ ...b, n: openRates.filter(v => v >= b.lo && v < b.hi).length }));
  const maxBin = Math.max(1, ...bins.map(b => b.n));
  return (
    <InsSection title={t.winLoss} sub={t.winLossSub}
      right={<InsGauge pct={winRate} label={t.winRate} sub={ko ? `${outcomes.length}개 플랜` : `${outcomes.length} plans`} />}>
      <div className="ins-wl-bar">
        {winners.length > 0 && <span className="ins-wl-seg" style={{ width: (winners.length / total * 100) + "%", background: "var(--pos)" }}>{winners.length}</span>}
        {losers.length > 0 && <span className="ins-wl-seg" style={{ width: (losers.length / total * 100) + "%", background: "var(--neg)" }}>{losers.length}</span>}
      </div>
      <div className="ins-wl-labels"><span className="pos">{t.winners} {winners.length}</span><span className="neg">{t.losers} {losers.length}</span></div>
      {openRates.length > 0 && <div className="ins-histo">
        <div className="ins-histo-cap">{ko ? "수익률 분포 (보유 플랜)" : "Return distribution (open plans)"}</div>
        <div className="ins-histo-bars">
          {bins.map((b, i) => (
            <div className="ins-histo-col" key={i}>
              <div className="ins-histo-track">
                <div className="ins-histo-fill" style={{ height: (b.n / maxBin * 100) + "%", background: b.hi <= 0 ? "var(--neg)" : "var(--pos)" }}>{b.n > 0 && <span className="ins-histo-n">{b.n}</span>}</div>
              </div>
              <div className="ins-histo-x mono">{b.lab}</div>
            </div>
          ))}
        </div>
      </div>}
      <div className="metric-row" style={{ marginBottom: 0 }}>
        <div className="metric"><div className="metric-lab">{t.profitFactor}</div><div className="metric-val sm mono">{pf === Infinity ? "∞" : pf.toFixed(2)}</div></div>
        <div className="metric"><div className="metric-lab">{t.avgWin}</div><div className="metric-val sm mono pos">+{avgWin.toFixed(1)}%</div></div>
        <div className="metric"><div className="metric-lab">{t.avgLoss}</div><div className="metric-val sm mono neg">{avgLoss.toFixed(1)}%</div></div>
        <div className="metric"><div className="metric-lab">{t.bestPlan}</div><div className="metric-val sm mono pos">{best ? "+" + best.rate.toFixed(0) + "%" : "—"}</div></div>
        <div className="metric"><div className="metric-lab">{t.worstPlan}</div><div className="metric-val sm mono neg">{worst ? worst.rate.toFixed(0) + "%" : "—"}</div></div>
      </div>
    </InsSection>
  );
}

/* ---- Insights view shell (scope: all plans or a single plan) ---- */
function InsightsView({ plans, t, lang, onOpenPlan }) {
  const [scope, setScope] = React.useState("all"); // "all" | plan id
  const [open, setOpen] = React.useState(false);
  const sel = scope === "all" ? null : plans.find(p => p.id === scope);
  const ko = lang === "ko";
  return (
    <div className="body-main">
      <div className="ins-wrap">
        <div className="ins-scope">
          <div className="rb-select ins-scope-sel" onClick={() => setOpen(o => !o)}>
            {sel
              ? <><StatusIcon status={sel.status} size={13} /><span>{sel.tickerName[lang]}</span><span className="mono" style={{ color: "var(--fg-4)" }}>{sel.ticker}</span></>
              : <><Lic name="chart-line" size={14} cls="icon-sm" color="var(--fg-3)" /><span>{ko ? "전체 인사이트" : "All plans"}</span></>}
            <Lic name="chevrons-up-down" size={13} cls="icon-sm" color="var(--fg-4)" />
          </div>
          {sel && <span className="ins-scope-hint">{ko ? "플랜 상세의 인사이트 탭과 동일" : "Same as the plan's Insights tab"} · <span className="linklike" onClick={() => onOpenPlan(sel)}>{ko ? "플랜 열기" : "Open plan"}</span></span>}
          {open && <>
            <div className="v-menu-scrim" onClick={() => setOpen(false)} />
            <div className="v-menu ins-scope-menu">
              <div className="v-menu-item" onClick={() => { setScope("all"); setOpen(false); }}>
                <Lic name="chart-line" size={14} cls="icon-sm" color="var(--fg-3)" /><span>{ko ? "전체 인사이트" : "All plans"}</span>
              </div>
              <div className="v-menu-sep" />
              {plans.map(p => (
                <div className="v-menu-item" key={p.id} onClick={() => { setScope(p.id); setOpen(false); }}>
                  <StatusIcon status={p.status} size={13} /><span>{p.tickerName[lang]}</span>
                  <span className="mono" style={{ marginLeft: "auto", color: "var(--fg-4)", fontSize: 11 }}>{p.id}</span>
                </div>
              ))}
            </div>
          </>}
        </div>
        {sel
          ? <PlanInsights plan={sel} t={t} lang={lang} />
          : <>
            <ScenarioAccuracy plans={plans} t={t} lang={lang} />
            <PerformanceSection plans={plans} t={t} lang={lang} />
            <ProcessHealth plans={plans} t={t} lang={lang} />
            <WinLoss plans={plans} t={t} lang={lang} onOpenPlan={onOpenPlan} />
          </>}
      </div>
    </div>
  );
}

Object.assign(window, { InsightsView, InsSection, InsGauge });
