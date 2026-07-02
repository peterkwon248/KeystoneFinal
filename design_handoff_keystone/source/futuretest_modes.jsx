// futuretest_modes.jsx — FutureTest 2.0 modes beyond the playout:
//  CompareView: same assumed path → 4 canonical strategies side by side (incl. buy&hold benchmark).
//  StressView : one strategy → all 6 preset paths; robustness vs buy&hold per path.
// The point is NOT predicting the path — it's seeing which strategy is least path-sensitive.

const FTK_LABEL = {
  infinite: { en: "Infinite buying", ko: "무한매수법" },
  dca: { en: "DCA", ko: "정액분할 (DCA)" },
  rebalance: { en: "Value rebalance", ko: "밸류리밸런싱" },
  hold: { en: "Buy & hold", ko: "바이앤홀드" },
  value: { en: "Value averaging", ko: "밸류애버리징" },
  grid: { en: "Grid", ko: "그리드 매매" },
  signal: { en: "Momentum (signal)", ko: "모멘텀 (시그널)" },
};

function ftPnlSpark(steps, w = 72, h = 20) {
  if (!steps.length) return null;
  const vals = steps.map(s => s.pnl);
  const lo = Math.min(...vals, 0), hi = Math.max(...vals, 0), span = (hi - lo) || 1;
  const pts = steps.filter((_, i) => i % 2 === 0).map((s, i, arr) => `${(i / (arr.length - 1) * w).toFixed(1)},${(h - 2 - (s.pnl - lo) / span * (h - 4)).toFixed(1)}`).join(" ");
  const zero = h - 2 - (0 - lo) / span * (h - 4);
  const won = vals[vals.length - 1] >= 0;
  return (
    <svg width={w} height={h} className="cmp-spark">
      <line x1="0" y1={zero} x2={w} y2={zero} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="2 3" />
      <polyline points={pts} fill="none" stroke={won ? "var(--pos)" : "var(--neg)"} strokeWidth="1.4" />
    </svg>
  );
}

/* ---------- compare: user-picked strategies on ONE assumed path ---------- */
const FT_KIND_OF = (s) => ({ st1: "infinite", st4: "dca", st5: "value", st6: "grid", st3: "rebalance", st7: "rebalance", st2: "signal" }[s.id])
  || (s.cat === "rebal" ? "rebalance" : s.cat === "signal" ? "signal" : s.cat === "accum" ? "dca" : null);

function CompareView({ plan, t, lang, pricePath, cfg, N, shape, pickShape, scn, setScnK, months, setMonths, drawMode, unit, dispCur }) {
  const ko = lang === "ko";
  // pick which strategies to race — every engine-supported strategy (presets + custom) is offered
  const [selIds, setSelIds] = React.useState(() => {
    const pref = [plan.strategyId, "st1", "st4", "st3"].filter(Boolean);
    const ids = [];
    pref.forEach(id => { const s = STRATEGIES.find(x => x.id === id); if (s && FT_KIND_OF(s) && !ids.includes(id)) ids.push(id); });
    return ids.length ? ids : STRATEGIES.filter(s => FT_KIND_OF(s)).slice(0, 3).map(s => s.id);
  });
  const toggleSel = (id) => setSelIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const rows = React.useMemo(() => {
    const list = selIds.map(id => STRATEGIES.find(s => s.id === id)).filter(s => s && FT_KIND_OF(s)).map(s => {
      const base = defaultFTParams(plan, s);
      const c = deriveFTCfg({ ...base, kind: FT_KIND_OF(s), budget: cfg.budget, costPct: cfg.costPct || 0 }, N);
      const sim = simulateStrategy(pricePath, c);
      return { key: s.id, name: s.name[lang], color: s.color, sim, s: sim.summary };
    });
    const bh = simulateStrategy(pricePath, deriveFTCfg({ ...cfg, kind: "hold" }, N));
    list.push({ key: "hold", name: FTK_LABEL.hold[lang], sim: bh, s: bh.summary, isBH: true });
    return list;
  }, [selIds, pricePath, cfg, plan.id, lang]);
  const bh = rows.find(r => r.isBH);
  const bestRet = Math.max(...rows.map(r => r.s.finalRet));
  const money = (v) => ftMoney(v, plan.cur, dispCur);
  const pct = (v) => (v >= 0 ? "+" : "") + v.toFixed(1) + "%";

  return (
    <div className="ft-body">
      <div className="ft-hint">{t.cmp_hint}</div>
      <div className="ft-build">
        <div className="ft-build-block">
          <div className="ft-build-cap"><span>{t.ft_scenario}</span></div>
          <div className="ft-chips">
            {FT_SHAPE_LIST.map(s => (
              <button key={s} className={"ft-chip" + (!drawMode && shape === s ? " on" : "")} onClick={() => pickShape(s)}>{t["scn_" + s]}</button>
            ))}
          </div>
          <div className="ft-sliders ft-sliders-2">
            <label className="ft-slider">
              <span className="ft-slider-lab"><FTLab text={scn.peak ? t.ft_peak : t.ft_maxdrop} tip={t.tip_depth} /><FTNum display={scn.depth + "%"} value={scn.depth} min={5} max={60} onCommit={(n) => setScnK("depth", Math.round(n))} title={t.tip_click} /></span>
              <input type="range" min="5" max="60" step="1" value={scn.depth} onChange={e => setScnK("depth", Number(e.target.value))} />
            </label>
            <label className="ft-slider">
              <span className="ft-slider-lab"><FTLab text={t.ft_landing} tip={t.tip_landing} /><span className="ft-num-pair"><FTNum display={(scn.endPct >= 0 ? "+" : "") + scn.endPct + "%"} value={scn.endPct} min={-40} max={40} onCommit={(n) => setScnK("endPct", Math.round(n))} title={t.tip_click} /><b className="mono dim3"> · {ftMoney(plan.currentPrice * (1 + scn.endPct / 100), plan.cur, dispCur)}</b></span></span>
              <input type="range" min="-40" max="40" step="1" value={scn.endPct} onChange={e => setScnK("endPct", Number(e.target.value))} />
            </label>
            <label className="ft-slider">
              <span className="ft-slider-lab"><FTLab text={t.ft_vol} tip={t.tip_vol} /><FTNum display={scn.vol + "%"} value={scn.vol} min={0} max={100} onCommit={(n) => setScnK("vol", Math.round(n))} title={t.tip_click} /></span>
              <input type="range" min="0" max="100" step="1" value={scn.vol} onChange={e => setScnK("vol", Number(e.target.value))} />
            </label>
            <FTHorizon months={months} setMonths={setMonths} lang={lang} t={t} unit={unit} />
          </div>
        </div>
        <div className="ft-build-block">
          <div className="ft-build-cap"><span>{t.cmp_pick}</span></div>
          <div className="ft-chips">
            {STRATEGIES.map(s => {
              const ok = !!FT_KIND_OF(s);
              return (
                <button key={s.id} disabled={!ok}
                  className={"ft-chip" + (ok && selIds.includes(s.id) ? " on" : "") + (ok ? "" : " off")}
                  title={ok ? "" : t.cmp_signalNote}
                  onClick={() => ok && toggleSel(s.id)}>
                  <span className="strat-dot" style={{ background: s.color }} />{s.name[lang]}
                </button>
              );
            })}
            <button className="ft-chip on bh" disabled title={t.cmp_bhNote}><Lic name="anchor" size={11} cls="icon-sm" color="currentColor" />{FTK_LABEL.hold[lang]}</button>
          </div>
        </div>
      </div>

      <table className="cmp-table">
        <thead><tr>
          <th>{t.cmp_strategy}</th><th></th>
          <th className="num"><FTLab text={t.cmp_ret} tip={t.tip_col_strat} /></th><th className="num"><FTLab text="MDD" tip={t.tip_col_mdd} /></th>
          <th className="num"><FTLab text={t.cmp_trades} tip={t.tip_col_trades} /></th><th className="num"><FTLab text={t.ft_maxDeployed} tip={t.tip_col_deployed} /></th>
          <th className="num"><FTLab text={t.cmp_vsBH} tip={t.tip_col_delta} /></th>
        </tr></thead>
        <tbody>
          {rows.map(r => {
            const d = bh && !r.isBH ? r.s.finalRet - bh.s.finalRet : 0;
            return (
              <tr key={r.key} className={r.isBH ? "cmp-bh" : ""}>
                <td className="cmp-name">{r.color && <span className="strat-dot" style={{ background: r.color, marginRight: 7 }} />}{r.name}{r.s.finalRet === bestRet && <span className="cmp-badge">{t.cmp_best}</span>}</td>
                <td>{ftPnlSpark(r.sim.steps)}</td>
                <td className={"num mono " + (r.s.finalRet >= 0 ? "pos" : "neg")}>{pct(r.s.finalRet)}</td>
                <td className="num mono dim2">{r.s.mddPct.toFixed(1)}%</td>
                <td className="num mono dim2">{r.s.rounds}/{r.s.sells}</td>
                <td className="num mono dim2">{money(r.s.maxDeployed)}</td>
                <td className={"num mono " + (r.isBH ? "dim2" : d >= 0 ? "pos" : "neg")}>{r.isBH ? "—" : pct(d)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="ft-hint" style={{ marginTop: 10 }}>{t.cmp_note}</div>
    </div>
  );
}

/* ---------- stress: ONE strategy across all 6 preset paths ---------- */
function StressView({ plan, t, lang, strat, cfg, N, months, setMonths, ftBase, unit, dispCur }) {
  const ko = lang === "ko";
  const rows = React.useMemo(() => FT_SHAPE_LIST.map(id => {
    const path = buildPricePath({ ...FT_PRESETS[id], seed: plan.ticker }, ftBase, N);
    const mine = simulateStrategy(path, cfg).summary;
    const bh = simulateStrategy(path, deriveFTCfg({ ...cfg, kind: "hold" }, N)).summary;
    const endPct = (path[path.length - 1].price / ftBase - 1) * 100;
    return { id, endPct, mine, bh, delta: mine.finalRet - bh.finalRet };
  }), [cfg, ftBase, plan.ticker]);
  const wins = rows.filter(r => r.delta >= 0).length;
  const pct = (v) => (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
  const kindLabel = FTK_LABEL[cfg.kind] ? FTK_LABEL[cfg.kind][lang] : cfg.kind;

  return (
    <div className="ft-body">
      <div className="ft-hint">{t.str_hint}</div>
      <div className="ft-sliders" style={{ maxWidth: 300, marginBottom: 16 }}>
        <FTHorizon months={months} setMonths={setMonths} lang={lang} t={t} unit={unit} />
      </div>
      <table className="cmp-table">
        <thead><tr>
          <th><FTLab text={t.str_path} tip={t.tip_col_path} /></th>
          <th className="num"><FTLab text={t.str_end} tip={t.tip_col_end} /></th>
          <th className="num"><FTLab text={kindLabel} tip={t.tip_col_strat} /></th>
          <th className="num"><FTLab text="MDD" tip={t.tip_col_mdd} /></th>
          <th className="num"><FTLab text={FTK_LABEL.hold[lang]} tip={t.tip_col_bh} /></th>
          <th className="num"><FTLab text={t.cmp_vsBH} tip={t.tip_col_delta} /></th>
        </tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td className="cmp-name">{t["scn_" + r.id]}</td>
              <td className={"num mono dim2"}>{pct(r.endPct)}</td>
              <td className={"num mono " + (r.mine.finalRet >= 0 ? "pos" : "neg")}>{pct(r.mine.finalRet)}</td>
              <td className="num mono dim2">{r.mine.mddPct.toFixed(1)}%</td>
              <td className={"num mono dim2"}>{pct(r.bh.finalRet)}</td>
              <td className={"num mono " + (r.delta >= 0 ? "pos" : "neg")}>{pct(r.delta)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="str-verdict">
        <Lic name={wins >= 4 ? "shield-check" : "shield-alert"} size={14} cls="icon-sm" color={wins >= 4 ? "var(--pos)" : "var(--r-paused)"} />
        {ko
          ? `6개 경로 중 ${wins}개에서 ${kindLabel} 전략이 바이앤홀드보다 우위 — 경로 의존성이 ${wins >= 4 ? "낮은" : "높은"} 전략입니다.`
          : `${kindLabel} beats buy & hold on ${wins} of 6 paths — ${wins >= 4 ? "low" : "high"} path sensitivity.`}
      </div>
    </div>
  );
}

Object.assign(window, { CompareView, StressView, FTK_LABEL });
