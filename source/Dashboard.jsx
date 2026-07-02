// Dashboard.jsx — operations "현황" view: portfolio roll-up + per-plan live status.
// Everything (round, avg cost, deployed, P/L) is a ROLL-UP of each plan's executions —
// only the market price is mock. Rows deep-link to the plan's 체결 (executions) ledger.

// mock FX so mixed-currency groups can still roll up into one display currency (KRW base)
const FX_USD_KRW = 1380;
const toKRW = (v, cur) => cur === "USD" ? v * FX_USD_KRW : v;

// portfolio mini-heatmap tile fill — return %: translucent green/red on dark bg, clamped ±20%
function dashHeatColor(rate) {
  const m = Math.max(-1, Math.min(1, rate / 20));
  const a = (0.18 + Math.abs(m) * 0.6).toFixed(2);
  return m >= 0 ? "rgba(39,174,96," + a + ")" : "rgba(235,87,87," + a + ")";
}

// squarified treemap: pack items (sorted desc) into W×H so tile AREA ∝ value, keeping tiles square-ish
function squarifyTreemap(items, W, H) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const scale = (W * H) / total;
  const data = items.map(i => ({ ...i, area: Math.max(i.value * scale, 0.0001) }));
  const out = [];
  const rect = { x: 0, y: 0, w: W, h: H };
  const worst = (row, side) => {
    const s = row.reduce((a, b) => a + b.area, 0);
    const mx = Math.max(...row.map(r => r.area));
    const mn = Math.min(...row.map(r => r.area));
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  };
  const place = (row) => {
    const s = row.reduce((a, b) => a + b.area, 0);
    if (rect.w >= rect.h) {
      const cw = s / rect.h; let oy = rect.y;
      row.forEach(r => { const th = r.area / cw; out.push({ ...r, x: rect.x, y: oy, w: cw, h: th }); oy += th; });
      rect.x += cw; rect.w -= cw;
    } else {
      const ch = s / rect.w; let ox = rect.x;
      row.forEach(r => { const tw = r.area / ch; out.push({ ...r, x: ox, y: rect.y, w: tw, h: ch }); ox += tw; });
      rect.y += ch; rect.h -= ch;
    }
  };
  let i = 0, row = [];
  while (i < data.length) {
    const side = Math.min(rect.w, rect.h);
    const item = data[i];
    if (row.length === 0 || worst(row, side) >= worst([...row, item], side)) { row.push(item); i++; }
    else { place(row); row = []; }
  }
  if (row.length) place(row);
  return out;
}

// group a plan by the chosen key → { key, label, color }
function tmapGroupOf(p, mode, lang) {
  if (mode === "market") {
    const kr = p.cur === "KRW";
    return { key: kr ? "KR" : "US", label: kr ? (lang === "ko" ? "한국" : "Korea") : (lang === "ko" ? "미국" : "US"), color: kr ? "#4C8DFF" : "#BB6BD9" };
  }
  if (mode === "sector") {
    const sec = (typeof securityOf === "function" ? securityOf(p.ticker) : null);
    const s = sec && sec.sector ? sec.sector : { en: "Other", ko: "기타" };
    return { key: s.en, label: s[lang] || s.en, color: "var(--fg-3)" };
  }
  // portfolio (default)
  const pf = (typeof PORTFOLIOS !== "undefined") ? PORTFOLIOS.find(x => x.id === p.portfolioId) : null;
  return pf ? { key: pf.id, label: pf.name[lang], color: pf.color } : { key: "none", label: lang === "ko" ? "미분류" : "Unassigned", color: "var(--fg-4)" };
}

// nested squarified treemap: outer rects per group (area ∝ group value), inner tiles per holding
function groupedTreemap(tiles, mode, lang, W, H) {
  const map = {};
  tiles.forEach(t => {
    const g = tmapGroupOf(t.p, mode, lang);
    if (!map[g.key]) map[g.key] = { ...g, items: [], value: 0 };
    map[g.key].items.push(t); map[g.key].value += t.value;
  });
  const groups = Object.values(map).sort((a, b) => b.value - a.value);
  const outer = squarifyTreemap(groups.map(g => ({ g, value: g.value })), W, H);
  const HEAD = 16, GAP = 3;
  const groupRects = [], placed = [];
  outer.forEach(({ g, x, y, w, h }) => {
    const gx = x + GAP, gy = y + GAP, gw = Math.max(2, w - GAP * 2), gh = Math.max(2, h - GAP * 2);
    const showHead = gh > HEAD + 22 && gw > 60;
    groupRects.push({ key: g.key, label: g.label, color: g.color, value: g.value, x: gx, y: gy, w: gw, h: gh, showHead });
    const iy = showHead ? gy + HEAD : gy, ih = showHead ? gh - HEAD : gh;
    const inner = squarifyTreemap(g.items.slice().sort((a, b) => b.value - a.value), gw, ih);
    inner.forEach(t => placed.push({ ...t, x: t.x + gx, y: t.y + iy }));
  });
  return { groupRects, tiles: placed };
}

const TMAP_LSK = "ks_tmap_group";
function PortfolioTreemap({ tiles, lang, onOpen }) {
  const hko = lang === "ko";
  const ref = React.useRef(null);
  const [w, setW] = React.useState(0);
  const [mode, setMode] = React.useState(() => { try { return localStorage.getItem(TMAP_LSK) || "none"; } catch (e) { return "none"; } });
  const setG = (m) => { setMode(m); try { localStorage.setItem(TMAP_LSK, m); } catch (e) {} };
  React.useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(es => { for (const e of es) setW(e.contentRect.width); });
    ro.observe(el); setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const H = 240;
  const grouped = mode !== "none";
  const result = (w > 0)
    ? (grouped ? groupedTreemap(tiles, mode, lang, w, H) : { groupRects: [], tiles: squarifyTreemap(tiles, w, H) })
    : { groupRects: [], tiles: [] };
  const modes = [["none", hko ? "없음" : "None"], ["portfolio", hko ? "포트폴리오" : "Portfolio"], ["sector", hko ? "섹터" : "Sector"], ["market", hko ? "시장" : "Market"]];
  return (
    <div className="dash-heat">
      <div className="dash-heat-cap">{hko ? "포트폴리오 히트맵" : "Portfolio heatmap"}<span className="dash-heat-sub">{hko ? "크기 = 평가액 · 색 = 수익률" : "size = value · color = return"}</span>
        <div className="dash-heat-group">
          <span className="dash-heat-glab">{hko ? "묶음" : "Group"}</span>
          <div className="rb-modebar" style={{ margin: 0 }}>
            {modes.map(([v, lab]) => <div key={v} className={"rb-mode" + (mode === v ? " on" : "")} onClick={() => setG(v)}>{lab}</div>)}
          </div>
        </div>
      </div>
      <div className="dash-tmap" ref={ref} style={{ height: H }}>
        {result.groupRects.map(g => (
          <div className="dash-tmap-grp" key={"g_" + g.key} style={{ left: g.x, top: g.y, width: g.w, height: g.h }}>
            {g.showHead && <span className="dash-tmap-glabel">{mode === "market" ? <Flag market={g.key} size={11} /> : mode === "portfolio" ? <span className="pf-dot" style={{ background: g.color, width: 7, height: 7 }} /> : null}{g.label}</span>}
          </div>
        ))}
        {result.tiles.map(({ p, rate, x, y, w: tw, h: th }) => {
          const area = tw * th;
          const big = area > 9000, mid = area > 3500;
          const showNm = (big || (th > 44 && tw > 68));
          return (
            <div className="dash-tmap-tile" key={p.id} onClick={() => onOpen(p)}
              style={{ left: x, top: y, width: tw, height: th, background: dashHeatColor(rate) }}
              title={p.tickerName[lang] + (planTag(p, lang) ? " · " + planTag(p, lang) : "") + " · " + (rate >= 0 ? "+" : "") + rate.toFixed(1) + "%"}>
              {th > 26 && <span className="dash-tmap-top">
                <Flag market={p.cur === "KRW" ? "KR" : "US"} size={11} />
                {tw > 56 && <span className="dash-tmap-tk mono">{p.ticker}</span>}
              </span>}
              {showNm && <span className="dash-tmap-nm">{p.tickerName[lang]}</span>}
              {showNm && th > 60 && (() => { const tg = planTag(p, lang); return tg ? <span className="dash-tmap-plan">{tg}</span> : null; })()}
              {(big || mid) && <span className="dash-tmap-ret mono" style={{ fontSize: big ? 15 : 12 }}>{rate >= 0 ? "+" : ""}{rate.toFixed(1)}%</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// tooltip subject label: ticker name + a dim plan tag so same-ticker plans stay distinct
function tipName(p, lang) {
  const tg = (typeof planTag === "function") ? planTag(p, lang) : "";
  return <>{p.tickerName[lang]}{tg ? <span className="dash-tip-plan">{tg}</span> : null}</>;
}
function DashStat({ lab, val, tone, tip }) {
  return (
    <div className={"dash-stat" + (tip && tip.length ? " has-tip" : "")} tabIndex={tip && tip.length ? 0 : undefined}>
      <span className="dash-stat-lab">{lab}</span>
      <span className={"dash-stat-val mono" + (tone ? " " + tone : "")}>{val}</span>
      {tip && tip.length > 0 && <div className="dash-stat-tip">
        <div className="dash-stat-tip-h">{lab}<span className="dash-stat-tip-n">{tip.length}</span></div>
        <div className="dash-stat-tip-rows">
          {tip.map((r, i) => <div className="dash-stat-tip-row" key={i}>
            <span className="dash-stat-tip-nm">{r.flag}{r.name}</span>
            {r.val != null && <span className={"dash-stat-tip-v mono" + (r.tone ? " " + r.tone : "")}>{r.val}</span>}
          </div>)}
        </div>
      </div>}
    </div>
  );
}

function DashRow({ plan, t, lang, onOpen }) {
  const ret = planReturn(plan);
  const hasPos = plan.totalShares > 0 && plan.avgPrice != null;
  const strat = (typeof EXEC_STRATEGIES !== "undefined") ? EXEC_STRATEGIES.find(s => s.id === plan.execId) : null;
  const fill = plan.divisions ? Math.max(0, Math.min(1, plan.round / plan.divisions)) : null;
  const buys = (plan.executions || []).filter(e => e.side === "buy").length;
  return (
    <div className="dash-row" onClick={() => onOpen(plan, "executions")}>
      <div className="dash-c dash-name">
        <StatusIcon status={plan.status} size={14} />
        <span className="dash-nm">
          <span className="dash-nm-title"><Flag market={plan.cur === "KRW" ? "KR" : "US"} size={12} /> {plan.tickerName[lang]}{(() => { const tg = (typeof planTag === "function") ? planTag(plan, lang) : ""; return tg ? <><span className="dash-nm-sep">·</span><span className="dash-nm-plan">{tg}</span></> : null; })()}</span>
          <span className="dash-nm-sub mono">{plan.ticker} · {t["s_" + plan.status]}</span>
        </span>
      </div>
      <div className="dash-c dash-strat">
        {strat ? <span className="dash-strat-badge"><span className="strat-dot" style={{ background: strat.color }} />{strat.name[lang]}</span> : <span className="dim">—</span>}
      </div>
      <div className="dash-c dash-round">
        {fill != null ? <>
          <span className="dash-round-n mono">{plan.round}<span className="dim">/{plan.divisions}</span></span>
          <div className="dash-fill-track"><div className="dash-fill" style={{ width: fill * 100 + "%" }} /></div>
        </> : <span className="dim mono">{buys > 0 ? buys + "회" : "—"}</span>}
      </div>
      <div className="dash-c dash-price">
        {hasPos ? <>
          <span className="mono dim">{fmtCompact(plan.avgPrice, plan.cur)}</span>
          <Lic name="arrow-right" size={11} cls="icon-sm" color="var(--fg-4)" />
          <span key={plan.tickN || 0} className={"mono" + (plan.tickDir ? " tick-" + plan.tickDir : "")}>{fmtCompact(plan.currentPrice, plan.cur)}</span>
        </> : <span className="dim">{t.dash_watching}</span>}
      </div>
      <div className="dash-c dash-pl">
        {ret ? <>
          <span key={plan.tickN || 0} className={"dash-pl-pct mono " + (ret.rate >= 0 ? "pos" : "neg") + (plan.tickDir ? " tick-" + plan.tickDir : "")}>{ret.rate >= 0 ? "+" : ""}{ret.rate.toFixed(1)}%</span>
          <span className={"dash-pl-amt mono " + (ret.amt >= 0 ? "pos" : "neg")}>{ret.amt >= 0 ? "+" : ""}{fmtCompact(ret.amt, plan.cur)}</span>
        </> : <span className="dim mono">—</span>}
      </div>
      <div className="dash-c dash-spark">{hasPos ? <Sparkline plan={plan} w={72} h={26} /> : <span className="spark-empty" />}</div>
    </div>
  );
}

// 액션 큐 기준선 — 플랜의 시나리오(하단/중간/상단) target을 끌어옴. 없으면 iv(가치선) 폴백.
const REF_EN = { bear: "Bear", base: "Base", bull: "Bull" };
const REF_KO = { bear: "하단", base: "중간", bull: "상단" };
const REF_COLOR = { bear: "var(--r-bear)", base: "var(--r-base)", bull: "var(--r-bull)" };
const REF_FULL = { bear: "하단 목표가", base: "중간 목표가", bull: "상단 목표가" };
function refTarget(p, ref) {
  const s = (p.scenarios || []).find(x => x.label && x.label.en === REF_EN[ref]);
  if (s && s.target != null) return s.target;
  return ref === "base" ? (p.iv ?? null) : null;
}

function DashboardView({ plans, t, lang, onOpen, grouping = "portfolio", ordering = "updated" }) {
  const [buyRef, setBuyRef] = React.useState(() => localStorage.getItem("ks_actq_buyRef") || "base");
  const [sellRef, setSellRef] = React.useState(() => localStorage.getItem("ks_actq_sellRef") || "bull");
  const pickBuy = (v) => { setBuyRef(v); try { localStorage.setItem("ks_actq_buyRef", v); } catch (e) {} };
  const pickSell = (v) => { setSellRef(v); try { localStorage.setItem("ks_actq_sellRef", v); } catch (e) {} };
  const [band, setBand] = React.useState(() => { const n = parseInt(localStorage.getItem("ks_actq_band") || "8", 10); return isNaN(n) ? 8 : n; });
  const pickBand = (v) => { const n = Math.max(1, Math.min(50, Math.round(v))); setBand(n); try { localStorage.setItem("ks_actq_band", String(n)); } catch (e) {} };
  const [bandEditing, setBandEditing] = React.useState(false);
  const [bandDraft, setBandDraft] = React.useState("");
  const sortItems = (arr) => (typeof orderPlans === "function" ? orderPlans(arr, ordering, lang) : arr.slice());

  let groups;
  if (grouping === "status") {
    groups = STATUS_ORDER.map(st => ({ key: st, label: t["s_" + st], icon: <StatusIcon status={st} size={13} />, items: plans.filter(p => p.status === st) }));
  } else if (grouping === "strategy") {
    groups = EXEC_STRATEGIES.map(s => ({ key: s.id, label: s.name[lang], dot: s.color, items: plans.filter(p => p.execId === s.id) }));
    const none = plans.filter(p => !p.execId);
    if (none.length) groups.push({ key: "nostrat", label: t.noStrategy, items: none });
  } else if (grouping === "none") {
    groups = [{ key: "all", label: null, items: plans }];
  } else {
    groups = PORTFOLIOS.map(pf => ({ key: pf.id, label: pf.name[lang], dot: pf.color, items: plans.filter(p => p.portfolioId === pf.id) }));
  }
  groups = groups.filter(g => g.items.length).map(g => ({ ...g, items: sortItems(g.items) }));

  // top headline (currency-agnostic): plan counts by lifecycle
  const openN = plans.filter(p => ["active", "paused", "closing"].includes(p.status)).length;
  const preN = plans.filter(p => ["research", "planning"].includes(p.status)).length;
  const posPlans = plans.filter(p => p.totalShares > 0 && p.avgPrice != null);
  const avgRet = posPlans.length ? posPlans.reduce((a, p) => { const r = planReturn(p); return a + (r ? r.rate : 0); }, 0) / posPlans.length : null;

  if (!groups.length) return <div className="dash-empty">{t.dash_empty}</div>;

  // 액션 큐 — 유저가 고른 기준선(매수/매도)에 현재가가 근접(±8% 밴드)한 종목만
  const ko = lang === "ko";
  const NEAR = band / 100;
  const acts = [];
  plans.forEach(p => {
    const st = refTarget(p, sellRef), bt = refTarget(p, buyRef);
    if (st != null && Math.abs(p.currentPrice / st - 1) <= NEAR) acts.push({ p, kind: "sell", ref: sellRef, target: st });
    else if (bt != null && Math.abs(p.currentPrice / bt - 1) <= NEAR) acts.push({ p, kind: "buy", ref: buyRef, target: bt });
  });

  return (
    <div className="dash">
      <div className="dash-headline">
        <DashStat lab={t.dash_open} val={String(openN)}
          tip={plans.filter(p => ["active", "paused", "closing"].includes(p.status)).map(p => { const ex = (typeof EXEC_STRATEGIES !== "undefined") ? EXEC_STRATEGIES.find(s => s.id === p.execId) : null; return { name: tipName(p, lang), flag: <Flag market={p.cur === "KRW" ? "KR" : "US"} size={11} />, val: ex ? <span className="dash-stat-tip-strat"><span className="ref-dot" style={{ background: ex.color }} />{ex.name[lang]}</span> : "—" }; })} />
        <DashStat lab={t.dash_pre} val={String(preN)}
          tip={plans.filter(p => ["research", "planning"].includes(p.status)).map(p => ({ name: tipName(p, lang), flag: <Flag market={p.cur === "KRW" ? "KR" : "US"} size={11} />, val: t["s_" + p.status] }))} />
        {avgRet != null && <DashStat lab={t.dash_avgRet} val={(avgRet >= 0 ? "+" : "") + avgRet.toFixed(1) + "%"} tone={avgRet >= 0 ? "pos" : "neg"}
          tip={posPlans.map(p => ({ p, r: (planReturn(p) || { rate: 0 }).rate })).sort((a, b) => b.r - a.r).map(({ p, r }) => ({ name: tipName(p, lang), flag: <Flag market={p.cur === "KRW" ? "KR" : "US"} size={11} />, val: (r >= 0 ? "+" : "") + r.toFixed(1) + "%", tone: r >= 0 ? "pos" : "neg" }))} />}
        {posPlans.length > 0 && <DashStat lab={t.dash_holdings} val={String(posPlans.length)}
          tip={posPlans.map(p => ({ p, v: toKRW(p.currentPrice * p.totalShares, p.cur) })).sort((a, b) => b.v - a.v).map(({ p }) => ({ name: tipName(p, lang), flag: <Flag market={p.cur === "KRW" ? "KR" : "US"} size={11} />, val: fmtCompact(p.currentPrice * p.totalShares, p.cur) }))} />}
        {acts.length > 0 && <DashStat lab={t.dash_actionq} val={String(acts.length)} tone="warn"
          tip={acts.map(({ p, kind, ref, target }) => ({ name: tipName(p, lang), flag: <Flag market={p.cur === "KRW" ? "KR" : "US"} size={11} />, val: <span className="dash-stat-tip-strat"><span className="ref-dot" style={{ background: kind === "buy" ? "var(--pos)" : "var(--neg)" }} />{kind === "buy" ? (ko ? "매수 검토" : "Buy") : (ko ? "매도 검토" : "Sell")}</span> }))} />}
      </div>

      {posPlans.length > 0 && (() => {
        const tiles = posPlans.map(p => ({ p, val: toKRW(p.currentPrice * p.totalShares, p.cur), value: toKRW(p.currentPrice * p.totalShares, p.cur), rate: (planReturn(p) || { rate: 0 }).rate }))
          .sort((a, b) => b.val - a.val);
        return <PortfolioTreemap tiles={tiles} lang={lang} onOpen={onOpen} />;
      })()}

      {plans.length > 0 && <div className="dash-actq">
        <div className="dash-actq-head">
          <div className="dash-actq-cap">{ko ? "지금 확인할 종목" : "Action queue"}<span className="dash-actq-n">{acts.length}</span></div>
          {ko && <div className="dash-actq-sentence">
            <span className="dash-actq-word" tabIndex={0}>매수<span className="dash-actq-tip left"><b>매수 후보로 올라오는 기준선</b><span>현재가가 고른 목표가의 <b>±{band}% 안</b>으로 들어오면 목록에 떠요.</span><span><b>하단</b> = 보수적 — 더 싸질 때만 매수<br /><b>중간</b> = 적정가 부근에서 매수</span></span></span>
            <MiniDropdown width={196} align="left"
              trigger={<span className="gap-ref-pick"><span className="ref-dot" style={{ background: REF_COLOR[buyRef] }} />{REF_KO[buyRef]}<Lic name="chevron-down" size={11} cls="icon-sm" color="currentColor" /></span>}
              items={[["bear", "보수적 — 더 싸질 때만"], ["base", "적정가 부근에서 매수"]].map(([v, d]) => ({ value: v, label: REF_FULL[v], sub: d, on: buyRef === v, icon: <span className="ref-dot" style={{ background: REF_COLOR[v] }} /> }))}
              onPick={pickBuy} />
            <span className="dash-actq-sep">·</span>
            <span className="dash-actq-word" tabIndex={0}>매도<span className="dash-actq-tip left"><b>차익실현 검토로 올라오는 기준선</b><span>현재가가 고른 목표가의 <b>±{band}% 안</b>으로 들어오면 목록에 떠요.</span><span><b>중간</b> = 적정가 도달 시 검토<br /><b>상단</b> = 낙관 목표 도달 시 검토</span></span></span>
            <MiniDropdown width={196} align="left"
              trigger={<span className="gap-ref-pick"><span className="ref-dot" style={{ background: REF_COLOR[sellRef] }} />{REF_KO[sellRef]}<Lic name="chevron-down" size={11} cls="icon-sm" color="currentColor" /></span>}
              items={[["base", "적정가 도달 시 검토"], ["bull", "낙관 목표 도달 시 검토"]].map(([v, d]) => ({ value: v, label: REF_FULL[v], sub: d, on: sellRef === v, icon: <span className="ref-dot" style={{ background: REF_COLOR[v] }} /> }))}
              onPick={pickSell} />
            <span className="dash-actq-conj">기준선에</span>
            {bandEditing
              ? <span className="dash-band-edit">±<input className="dash-band-inp" type="number" min="1" max="50" autoFocus value={bandDraft}
                  onChange={(e) => setBandDraft(e.target.value)}
                  onBlur={() => { const n = parseFloat(bandDraft); if (!isNaN(n)) pickBand(n); setBandEditing(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { const n = parseFloat(bandDraft); if (!isNaN(n)) pickBand(n); setBandEditing(false); } else if (e.key === "Escape") setBandEditing(false); }} />%
                  <span className="dash-band-presets">
                    {[3, 5, 8, 10].map((n) => (
                      <button key={n} className={"dash-band-preset" + (parseFloat(bandDraft) === n ? " on" : "")}
                        onMouseDown={(e) => { e.preventDefault(); pickBand(n); setBandDraft(String(n)); setBandEditing(false); }}>±{n}%</button>
                    ))}
                  </span></span>
              : <button className="dash-band-chip" onClick={() => { setBandDraft(String(band)); setBandEditing(true); }} title="클릭해 값 입력">±{band}%<Lic name="pencil" size={11} cls="icon-sm" color="currentColor" /></button>}
            <span className="dash-actq-conj">근접 시</span>
          </div>}
        </div>
        {acts.length === 0
          ? <div className="dash-actq-empty">{ko ? `설정한 기준선(매수 ${REF_KO[buyRef]} · 매도 ${REF_KO[sellRef]})에 근접한 종목이 없어요` : "Nothing near your reference lines"}</div>
          : <div className="dash-actq-rows">
          {acts.map(({ p, kind, ref, target }) => {
            const refNm = REF_KO[ref];
            const gap = (p.currentPrice - target) / target * 100;
            const dist = Math.abs(gap) < 1.2 ? "도달" : `${gap >= 0 ? "+" : ""}${gap.toFixed(0)}%`;
            const msg = ko ? `${refNm} 목표가 ${dist}` : `Near ${ref} target ${dist}`;
            return (
              <div className={"dash-act dash-act--" + kind} key={p.id} onClick={() => onOpen(p, "executions")}>
                <span className={"dash-act-tag dash-act-tag--" + kind}>{kind === "buy" ? (ko ? "매수" : "BUY") : (ko ? "매도" : "SELL")}</span>
                <span className="dash-act-name">{p.tickerName ? p.tickerName[lang] : p.name[lang]}{(() => { const tg = planTag(p, lang); return tg ? <><span className="dash-act-sep">·</span><span className="dash-act-plan">{tg}</span></> : null; })()}</span>
                <span className="mono dash-act-px">{fmtCompact(p.currentPrice, p.cur)}</span>
                <span className="dash-act-msg">{msg}</span>
              </div>
            );
          })}
        </div>}
      </div>}

      {groups.map(({ key, label, dot, icon, items }) => {
        const cur = items[0].cur;
        const mixed = items.some(p => p.cur !== cur);
        const pos = items.filter(p => p.totalShares > 0 && p.avgPrice != null);
        const invested = pos.reduce((a, p) => a + p.totalInvested, 0);
        const value = pos.reduce((a, p) => a + p.currentPrice * p.totalShares, 0);
        const pl = value - invested, plPct = invested > 0 ? pl / invested * 100 : 0;
        const gAvgRet = pos.length ? pos.reduce((a, p) => { const r = planReturn(p); return a + (r ? r.rate : 0); }, 0) / pos.length : null;
        return (
          <div className="dash-group" key={key}>
            {label != null && <div className="dash-pf-head">
              <span className="dash-pf-name">{dot && <span className="pf-dot" style={{ background: dot }} />}{icon}{label}<span className="dash-pf-count">{items.length}</span></span>
              {pos.length > 0 && <div className="dash-pf-stats">
                {mixed ? (() => {
                  const invK = pos.reduce((a, p) => a + toKRW(p.totalInvested, p.cur), 0);
                  const valK = pos.reduce((a, p) => a + toKRW(p.currentPrice * p.totalShares, p.cur), 0);
                  const plK = valK - invK, plPctK = invK > 0 ? plK / invK * 100 : 0;
                  return <>
                    <DashStat lab={t.invested} val={fmtCompact(invK, "KRW")} />
                    <DashStat lab={t.dash_value} val={fmtCompact(valK, "KRW")} />
                    <DashStat lab={t.retAmt} val={(plK >= 0 ? "+" : "") + fmtCompact(plK, "KRW")} tone={plK >= 0 ? "pos" : "neg"} />
                    <DashStat lab={t.retRate} val={(plPctK >= 0 ? "+" : "") + plPctK.toFixed(1) + "%"} tone={plPctK >= 0 ? "pos" : "neg"} />
                    <span className="dash-fx" title={t.dash_fxNote}>≈₩</span>
                  </>;
                })() : <>
                  <DashStat lab={t.invested} val={fmtCompact(invested, cur)} />
                  <DashStat lab={t.dash_value} val={fmtCompact(value, cur)} />
                  <DashStat lab={t.retAmt} val={(pl >= 0 ? "+" : "") + fmtCompact(pl, cur)} tone={pl >= 0 ? "pos" : "neg"} />
                  <DashStat lab={t.retRate} val={(plPct >= 0 ? "+" : "") + plPct.toFixed(1) + "%"} tone={plPct >= 0 ? "pos" : "neg"} />
                </>}
              </div>}
            </div>}
            <div className="dash-rows">
              {items.map(p => <DashRow key={p.id} plan={p} t={t} lang={lang} onOpen={onOpen} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { DashboardView, DashRow, DashStat });
