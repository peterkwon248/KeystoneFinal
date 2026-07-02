// icons.jsx — Keystone status icons, scenario gauge, logo, lucide wrapper

// Lifecycle status icon: hollow ring + a growing pie wedge per stage,
// reusing Vector's pie technique (r=3 inner circle, dasharray controls arc).
function StatusIcon({ status = "research", size = 15 }) {
  const meta = PLAN_STATUS[status] || PLAN_STATUS.research;
  const c = meta.color;
  const common = { width: size, height: size, viewBox: "0 0 14 14" };
  const ring = <circle cx="7" cy="7" r="5.5" fill="none" stroke={c} strokeWidth="1.5" />;
  const wedge = (len) => <circle cx="7" cy="7" r="3" fill="none" stroke={c} strokeWidth="6" strokeDasharray={len + " 100"} transform="rotate(-90 7 7)" />;
  if (status === "research")
    return <svg {...common}><circle cx="7" cy="7" r="5.5" fill="none" stroke={c} strokeWidth="1.5" strokeDasharray="1.7 1.9" /></svg>;
  if (status === "planning")
    return <svg {...common}>{ring}{wedge(4.7)}</svg>;
  if (status === "active")
    return <svg {...common}>{ring}{wedge(9.4)}</svg>;
  if (status === "paused")
    return <svg {...common}>{ring}{wedge(9.4)}</svg>;
  if (status === "closing")
    return <svg {...common}>{ring}{wedge(14.5)}</svg>;
  // closed
  return <svg {...common}><circle cx="7" cy="7" r="6" fill={c} /><path d="M4.3 7.1l1.8 1.8 3.4-3.6" stroke="var(--bg-app)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

// Scenario mini-status pill colors
const SC_STATUS_COLOR = {
  tracking:    { bg: "var(--bg-elevated-2)", fg: "var(--fg-3)" },
  approaching: { bg: "rgba(242,201,76,.18)", fg: "var(--r-base)" },
  realized:    { bg: "rgba(76,183,130,.18)", fg: "var(--r-bull)" },
  invalidated: { bg: "rgba(235,87,87,.16)", fg: "var(--r-bear)" },
};
// Auto-determine a scenario's status from current price vs its target.
// 추적(tracking) · 근접(approaching) · 돌파(realized, upside reached) · 이탈(invalidated, downside reached)
function scAutoStatus(plan, target) {
  const px = plan && plan.currentPrice;
  if (px == null || target == null) return "tracking";
  const up = target >= px;
  if (up) {
    if (px >= target) return "realized";
    if (px >= target * 0.97) return "approaching";
    return "tracking";
  }
  if (px <= target) return "invalidated";
  if (px <= target * 1.03) return "approaching";
  return "tracking";
}

// The killer column — Bear↔Bull range with current-price marker.
function ScenarioGauge({ plan, lang = "ko", compact }) {
  const g = gaugeData(plan);
  const rootRef = React.useRef(null);
  const [tip, setTip] = React.useState(null);
  const closeRef = React.useRef(() => {});
  closeRef.current = () => setTip(null);
  React.useEffect(() => {
    if (!tip) return;
    const el = rootRef.current;
    const sc = el && (el.closest(".body-main") || el.closest(".peek-body"));
    const clear = () => setTip(null);
    if (sc) sc.addEventListener("scroll", clear, { passive: true });
    window.addEventListener("wheel", clear, { passive: true });
    return () => { if (sc) sc.removeEventListener("scroll", clear); window.removeEventListener("wheel", clear); };
  }, [tip]);
  React.useEffect(() => () => { if (window.__gaugeClose === closeRef.current) window.__gaugeClose = null; }, []);
  if (!g) return <div className="gauge" />;
  const t = I18N[lang];
  const bearT = plan.scenarios.find(s => s.label.en === "Bear").target;
  const bullT = plan.scenarios.find(s => s.label.en === "Bull").target;
  const num = (v) => fmtCompact(v, plan.cur).replace(/^[₩$]/, "");
  const money = (v) => fmtMoney(v, plan.cur);
  const cur = plan.currentPrice;
  const lines = planActionLines(plan);
  const pct = (v, base) => { const r = (v / base - 1) * 100; return (r >= 0 ? "+" : "") + r.toFixed(1) + "%"; };
  const scOrder = ["Bull", "Base", "Bear"];
  const scIcon = { Bull: "trending-up", Base: "minus", Bear: "trending-down" };
  const tipRows = [];
  scOrder.forEach(k => { const sc = plan.scenarios.find(s => s.label.en === k); if (sc) tipRows.push({ icon: scIcon[k], color: sc.color, label: sc.label[lang], val: sc.target, ret: pct(sc.target, cur) }); });
  const onEnter = () => {
    // singleton: close any other gauge tooltip first so only one is ever open
    if (window.__gaugeClose && window.__gaugeClose !== closeRef.current) window.__gaugeClose();
    window.__gaugeClose = closeRef.current;
    const el = rootRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const need = 210, gap = 9, vh = window.innerHeight;
    const roomAbove = r.top, roomBelow = vh - r.bottom;
    // default: open ABOVE; flip down only when above would clip and below has more room
    const above = roomAbove >= need || roomAbove >= roomBelow;
    setTip({ x: r.left + r.width / 2, y: above ? r.top - gap : r.bottom + gap, above });
  };
  const onLeave = () => { setTip(null); if (window.__gaugeClose === closeRef.current) window.__gaugeClose = null; };
  if (compact) {
    return (
      <div className={"gauge gauge-compact" + (g.dim ? " gauge-dim" : "")}>
        <div className="gauge-bar">
          <div className="gauge-track" />
          <div className="gauge-range" style={{ left: g.bearPos + "%", right: (100 - g.bullPos) + "%" }} />
          <div className="gauge-node bear" style={{ left: g.bearPos + "%" }} />
          <div className="gauge-node base" style={{ left: g.basePos + "%" }} />
          <div className="gauge-node bull" style={{ left: g.bullPos + "%" }} />
          {g.avgPos != null && <div className="gauge-avg" style={{ left: g.avgPos + "%" }} />}
          <div className={"gauge-marker" + (g.isExit ? " exit" : "")} style={{ left: g.pos + "%" }} />
        </div>
      </div>
    );
  }
  return (
    <div className={"gauge" + (g.dim ? " gauge-dim" : "")} ref={rootRef} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <div className="gauge-bar">
        <div className="gauge-track" />
        <div className="gauge-range" style={{ left: g.bearPos + "%", right: (100 - g.bullPos) + "%" }} />
        <div className="gauge-node bear" style={{ left: g.bearPos + "%" }} />
        <div className="gauge-node base" style={{ left: g.basePos + "%" }} />
        <div className="gauge-node bull" style={{ left: g.bullPos + "%" }} />
        {g.avgPos != null && <div className="gauge-avg" style={{ left: g.avgPos + "%" }} />}
        <div className={"gauge-marker" + (g.isExit ? " exit" : "")} style={{ left: g.pos + "%" }} />
      </div>
      <div className="gauge-labels">
        <span className="gl bear">{num(bearT)}</span>
        <span className="gl now">{num(g.primary)}</span>
        <span className="gl bull">{num(bullT)}</span>
      </div>
      {tip && <div className={"gauge-tip-fixed" + (tip.above ? " above" : " below")} style={{ left: tip.x + "px", top: tip.y + "px" }}>
        <div className="gtip-head"><Flag market={plan.cur === "KRW" ? "KR" : "US"} size={12} />{plan.tickerName[lang]}<span className="gtip-id">{plan.ticker}</span></div>
        {tipRows.map((r, i) => (
          <div className="gtip-row" key={i}>
            <Lic name={r.icon} size={13} cls="icon-sm" color={r.color} />
            <span className="gtip-lab">{r.label} {t.target}</span>
            <span className="gtip-val">{money(r.val)}</span>
            <span className={"gtip-ret " + (parseFloat(r.ret) >= 0 ? "pos" : "neg")}>{r.ret}</span>
          </div>
        ))}
        <div className="gtip-sep" />
        <div className="gtip-row">
          <span className="gtip-dot now" />
          <span className="gtip-lab">{g.isExit ? t.exitL : t.current}</span>
          <span className="gtip-val">{money(g.primary)}</span>
          <span className="gtip-ret" />
        </div>
        {g.avgPrice != null && <div className="gtip-row">
          <span className="gtip-dot avg" />
          <span className="gtip-lab">{t.avg}</span>
          <span className="gtip-val">{money(g.avgPrice)}</span>
          <span className={"gtip-ret " + ((cur / g.avgPrice - 1) >= 0 ? "pos" : "neg")}>{pct(cur, g.avgPrice)}</span>
        </div>}
        {lines.tp != null && <div className="gtip-row">
          <span className="gtip-tick tp" />
          <span className="gtip-lab">{t.takeProfit}</span>
          <span className="gtip-val">{money(lines.tp)}</span>
          <span className="gtip-ret pos">{pct(lines.tp, cur)}</span>
        </div>}
        {lines.sl != null && <div className="gtip-row">
          <span className="gtip-tick sl" />
          <span className="gtip-lab">{t.stopLoss}</span>
          <span className="gtip-val">{money(lines.sl)}</span>
          <span className={"gtip-ret " + ((lines.sl / cur - 1) >= 0 ? "pos" : "neg")}>{pct(lines.sl, cur)}</span>
        </div>}
      </div>}
    </div>
  );
}

// Lucide wrapper
function Lic({ name, size = 16, cls = "icon", color, style }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current && window.lucide) {
      ref.current.innerHTML = "";
      const i = document.createElement("i");
      i.setAttribute("data-lucide", name);
      ref.current.appendChild(i);
      window.lucide.createIcons({ attrs: { width: size, height: size, "stroke-width": 1.7 }, nodes: [i] });
    }
  }, [name, size]);
  return <span ref={ref} className={cls} style={{ display: "inline-flex", color, width: size, height: size, ...style }} />;
}

// Market chip — KR / US text badge. Renders identically on every OS (no emoji/font dependency).
function Flag({ market, size = 15 }) {
  const mk = market === "KR" ? "KR" : "US";
  const fs = Math.max(8, Math.round(size * 0.62));
  return (
    <span style={{ flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: Math.round(size * 1.5), height: Math.round(size * 1.05), padding: "0 " + Math.round(size * 0.28) + "px", borderRadius: 4, background: mk === "KR" ? "rgba(38,99,230,0.14)" : "rgba(180,40,60,0.14)", color: mk === "KR" ? "#4C8DFF" : "#E5687A", font: "700 " + fs + "px var(--font-mono, ui-monospace)", letterSpacing: "0.02em", lineHeight: 1 }}>{mk}</span>
  );
}
function _FlagSVG_unused({ market, size = 15 }) {
  const w = Math.round(size * 1.34), h = size;
  const uid = "fl" + market + Math.round(size);
  // waving banner outline (top crest, bottom trough) — mimics mobile emoji flags
  const wave = "M1.5 5 Q 9 1.5 18 4.5 T 34.5 4 L 34.5 20 Q 27 23.5 18 20.5 T 1.5 21 Z";
  const kr = (
    <g>
      <rect x="0" y="0" width="36" height="26" fill="#fff" />
      <g transform="translate(18,13) rotate(-33.7)">
        <path d="M0 -5.4 A5.4 5.4 0 0 1 0 5.4 A2.7 2.7 0 0 0 0 0 A2.7 2.7 0 0 1 0 -5.4 Z" fill="#C60C30" />
        <path d="M0 5.4 A5.4 5.4 0 0 1 0 -5.4 A2.7 2.7 0 0 1 0 0 A2.7 2.7 0 0 0 0 5.4 Z" fill="#003478" />
        <circle cx="0" cy="-2.7" r="2.7" fill="#C60C30" /><circle cx="0" cy="2.7" r="2.7" fill="#003478" />
      </g>
      {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sy],i)=>{const ang=Math.atan2(sy,-sx*0.62)*180/Math.PI;return(
        <g key={i} transform={`translate(${18+sx*10.4},${13+sy*7.2}) rotate(${56.3*(sx*sy>0?1:-1)})`} stroke="#000" strokeWidth="0.85" strokeLinecap="butt">
          <line x1="-3" y1="-1.15" x2="3" y2="-1.15" /><line x1="-3" y1="1.15" x2="3" y2="1.15" />
        </g>
      );})}
    </g>
  );
  const us = (
    <g>
      <rect x="0" y="0" width="36" height="26" fill="#B31942" />
      {[1,3,5,7,9,11].map(i=><rect key={i} x="0" y={i*2} width="36" height="2" fill="#fff" />)}
      <rect x="0" y="0" width="15.5" height="14" fill="#0A3161" />
      {Array.from({length:9}).map((_,r)=>Array.from({length:(r%2?5:6)}).map((_,c)=>(
        <circle key={r+"-"+c} cx={1.6+ (r%2?2.8:1.4) + c*2.55} cy={1.5+r*1.45} r="0.5" fill="#fff" />
      )))}
    </g>
  );
  return (
    <svg width={w} height={h} viewBox="0 0 36 26" style={{ flex: "none", display: "block", filter: "drop-shadow(0 0.5px 0.5px rgba(0,0,0,.25))" }}>
      <defs>
        <clipPath id={uid}><path d={wave} /></clipPath>
        <linearGradient id={uid+"g"} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.28" /><stop offset="42%" stopColor="#fff" stopOpacity="0.04" /><stop offset="60%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity="0.14" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${uid})`}>
        {market === "KR" ? kr : us}
        <path d={wave} fill={`url(#${uid+"g"})`} />
      </g>
    </svg>
  );
}

// Keystone logo — gap-split two-tone keystone chevron (the arch's crown wedge).
// Left face azure, right face darker; thin center gap reads as the cut keystone.
function KeystoneLogo({ size = 22, tile = false }) {
  const s = 24, g = s * 0.022;
  const left = `M${s*0.5-g} ${s*0.27} L${s*0.18} ${s*0.71} L${s*0.39} ${s*0.71} L${s*0.5-g} ${s*0.52} Z`;
  const right = `M${s*0.5+g} ${s*0.27} L${s*0.82} ${s*0.71} L${s*0.61} ${s*0.71} L${s*0.5+g} ${s*0.52} Z`;
  if (tile) {
    return (
      <svg className="logo-mark" width={size} height={size} viewBox="0 0 24 24" style={{ width: size, height: size }}>
        <rect width="24" height="24" rx="6.5" fill="#4C8DFF" />
        <path d={`M12 5.5 L5.4 14.6 L9.3 14.6 L12 10.9 Z`} fill="#fff" />
        <path d={`M12 5.5 L18.6 14.6 L14.7 14.6 L12 10.9 Z`} fill="#fff" opacity="0.62" />
      </svg>
    );
  }
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ width: size, height: size, borderRadius: 0 }}>
      <path d={left} fill="#4C8DFF" />
      <path d={right} fill="#2C66CC" />
    </svg>
  );
}
const ReticleLogo = KeystoneLogo;

// Strategy badge dot + lucide
function StrategyBadge({ strategy, t }) {
  if (!strategy) return <span className="strat-badge" style={{ color: "var(--fg-4)" }}>—</span>;
  return (
    <span className="strat-badge">
      <span className="strat-dot" style={{ background: strategy.color }} />
      {strategy.name[t.__lang]}
    </span>
  );
}

// Vector's rounded "panel" toggle icon (softer corners than Lucide), ported as-is.
function PanelIcon({ side = "left", size = 16, color = "currentColor" }) {
  const railLeft = side === "left";
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" style={{ flex: "none" }}>
      <rect x="2" y="3" width="14" height="12" rx="4" stroke={color} strokeWidth="1.6" />
      <line x1={railLeft ? "7" : "11"} y1="3.6" x2={railLeft ? "7" : "11"} y2="14.4" stroke={color} strokeWidth="1.6" />
      <rect x={railLeft ? "2.8" : "11.2"} y="3.8" width="4" height="10.4" rx="2.4" fill={color} opacity="0.18" />
    </svg>
  );
}

Object.assign(window, { StatusIcon, ScenarioGauge, StrategyStrip, SC_STATUS_COLOR, scAutoStatus, Lic, KeystoneLogo, ReticleLogo, StrategyBadge, PanelIcon });

// 전략 실행 상태 스트립 — 플랜의 두 번째 축. 시나리오(가격 판단) 아래에 실행 상태(회차·다음 매수)를 보여준다.
// 주의: 전략은 plan.execId → EXEC_STRATEGIES. (plan.strategyId는 '관점/framework'이므로 사용하지 않는다.)
function StrategyStrip({ plan, lang = "ko" }) {
  const st = (typeof planExecState === "function") ? planExecState(plan) : null;
  const ex = st ? st.ex : null;
  if (!ex || !st) return null;
  const money = (v) => (typeof fmtCompact === "function") ? fmtCompact(v, plan.cur) : Math.round(v);
  const L = (o) => !o ? "" : (typeof o === "string" ? o : (o[lang] || o.en || ""));
  const h = st.hero;
  const heroTone = h ? (h.tone || "neutral") : "neutral";
  const heroColor = !h ? "var(--fg)" : h.tone === "pos" ? "var(--pos)" : h.tone === "neg" ? "var(--neg)" : h.tone === "accent" ? ex.color : "var(--fg)";
  const heroText = (() => {
    if (!h) return "";
    if (h.kind === "money") return money(h.value);
    if (h.kind === "text") return L(h.value);
    const sign = h.sign != null ? h.sign : (h.tone === "pos" ? "+" : h.tone === "neg" ? "−" : "");
    return sign + Math.abs(h.value).toFixed(h.dp != null ? h.dp : 0) + "%";
  })();
  const cellVal = (c) => c.isText ? L(c.value) : (c.isMoney ? money(c.value) : c.value);
  const progress = st.progress;
  const defOf = (key) => (typeof metricDef === "function") ? metricDef(key) : null;
  const heroDef = h ? defOf(h.tip) : null;
  return (
    <div className={"strat-card tone-" + heroTone} style={{ "--strat-accent": ex.color }}>
      <div className="strat-card-top">
        <div className="strat-card-head">
          <span className="strat-card-name"><Lic name={ex.icon || "git-branch"} size={14} cls="icon-sm" color={ex.color} />{ex.name[lang]}</span>
          {st.tagline && <span className="strat-card-tag">{L(st.tagline)}</span>}
        </div>
        {h && <div className="strat-card-hero">
          <span className="strat-card-val" style={{ color: heroColor }}>{heroText}</span>
          {h.sub && (heroDef
            ? <span className="strat-card-herosub mlab">{L(h.sub)}<span className="mtip">{L(heroDef)}</span></span>
            : <span className="strat-card-herosub">{L(h.sub)}</span>)}
        </div>}
      </div>
      {progress && <div className="strat-card-bar"><div className="strat-card-fill" style={{ width: progress.pct + "%", background: ex.color }} /></div>}
      {st.cells.length > 0 && <div className="strat-card-stats">
        {st.cells.map((c, i) => {
          const def = defOf(c.tip);
          return (
            <div className="strat-card-cell" key={i}>
              <span className="strat-card-clab">{c.dir ? <span className={"strat-card-tick " + c.dir} /> : null}
                {def ? <span className="mlab">{L(c.label)}<span className="mtip">{L(def)}</span></span> : L(c.label)}
              </span>
              <span className="strat-card-cval mono">{cellVal(c)}</span>
            </div>
          );
        })}
      </div>}
    </div>
  );
}
