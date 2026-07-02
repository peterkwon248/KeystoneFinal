// strat_diagram.js — shared "작동 원리" strategy mechanism diagram (used by StrategyEditor preview + plan Rules tab)
function stratDiagram(strategy, lang) {
  if (!strategy || !strategy.fields) return null;
  const ko = lang === "ko";
  const nf = (k, d) => { const f = strategy.fields.find(x => x.key === k); const n = f ? parseFloat(String(f.default).replace(/[^0-9.-]/g, "")) : NaN; return isNaN(n) ? d : n; };
  const has = k => strategy.fields.some(f => f.key === k);
  const txt = k => { const f = strategy.fields.find(x => x.key === k); return f ? String(f.default).trim() : ""; };
  const cyc = (v) => ko ? ({ Weekly: "매주", Daily: "매일", Monthly: "매월", Biweekly: "격주", Quarterly: "분기마다", Yearly: "매년" }[v] || v) : v;
  const BUY = "var(--r-active, #4C8DFF)", SELL = "var(--pos)";
  const card = (children, cap) => <div className="prev-card stratviz"><div className="prev-card-h">{ko ? "작동 원리" : "How it works"}</div><svg viewBox="0 0 320 132" style={{ width: "100%", height: "auto", display: "block" }}>{children}</svg><div className="stratviz-cap">{cap}</div></div>;

  if (has("divisions")) {
    const lp = Math.abs(nf("loc_pct", -5)), tp = nf("tp_pct", 10), dv = Math.round(nf("divisions", 40));
    const steps = Math.min(Math.max(dv, 2), 6);
    const W = 320, H = 132, padL = 14, padR = 14, padT = 16, padB = 26;
    const iw = W - padL - padR, ih = H - padT - padB;
    const pts = []; for (let i = 0; i < steps; i++) { const x = padL + (steps === 1 ? 0 : i / (steps - 1) * iw); const y = padT + (steps === 1 ? 0 : i / (steps - 1) * ih); pts.push([x, y]); }
    const stepPath = pts.map((p, i) => { if (i === 0) return `M ${p[0]} ${p[1]}`; const prev = pts[i - 1]; return `L ${prev[0]} ${p[1]} L ${p[0]} ${p[1]}`; }).join(" ");
    const avgY = padT + ih * 0.52, tpY = padT + ih * 0.2;
    return <div className="prev-card stratviz">
      <div className="prev-card-h">{ko ? "작동 원리" : "How it works"}</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <line x1={padL} x2={W - padR} y1={tpY} y2={tpY} stroke="var(--pos)" strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
        <text x={W - padR} y={tpY - 5} textAnchor="end" style={{ fill: "var(--pos)", font: "var(--fw-semi) 9.5px var(--font-sans)" }}>{ko ? `익절 +${tp}%` : `TP +${tp}%`}</text>
        <line x1={padL} x2={W - padR} y1={avgY} y2={avgY} stroke="var(--fg-3)" strokeWidth="1" strokeDasharray="3 3" />
        <text x={W - padR} y={avgY - 5} textAnchor="end" style={{ fill: "var(--fg-3)", font: "var(--fw-semi) 9.5px var(--font-sans)" }}>{ko ? "평단가 ↓" : "Avg ↓"}</text>
        <path d={stepPath} fill="none" stroke="var(--fg-4)" strokeWidth="1.5" strokeLinejoin="round" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="4.5" fill={BUY} stroke="var(--bg-app)" strokeWidth="1.5" />)}
        {pts.length > 1 && <text x={(pts[0][0] + pts[1][0]) / 2} y={pts[1][1] + 14} textAnchor="middle" style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 9px var(--font-mono)" }}>{`-${lp}%`}</text>}
      </svg>
      <div className="stratviz-cap">{ko ? `가격이 ` : `Each `}<b style={{ color: "var(--fg-2)" }}>{`-${lp}%`}</b>{ko ? ` 빠질 때마다 파란 점에서 한 번씩 분할 매수 → 살수록 평단가가 내려가고, 평단 +${tp}%에 닿으면 익절 알림.` : ` dip → buy once; avg cost drops; alert at +${tp}% over avg.`}</div>
    </div>;
  }
  if (has("amount") && has("interval")) {
    const xs = [30, 78, 126, 174, 222, 270];
    return card(<g>
      <line x1="14" x2="306" y1="80" y2="80" stroke="var(--border-strong)" strokeWidth="1" />
      {xs.map((x, i) => <g key={i}><line x1={x} x2={x} y1="80" y2={80 - 26} stroke="var(--fg-4)" strokeWidth="1" /><circle cx={x} cy={80 - 26} r="4.5" fill={BUY} stroke="var(--bg-app)" strokeWidth="1.5" /></g>)}
      <text x="160" y="104" textAnchor="middle" style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 9.5px var(--font-sans)" }}>{ko ? "→ 시간 (정해진 주기)" : "→ time (fixed cycle)"}</text>
    </g>, <React.Fragment>{ko ? "주가와 무관하게 " : ""}<b style={{ color: "var(--fg-2)" }}>{cyc(txt("interval"))}</b>{ko ? " 똑같은 금액을 기계적으로 매수 → 고점·저점 평균에 자연스럽게 분산됩니다." : " buy the same amount each cycle, averaging highs and lows."}</React.Fragment>);
  }
  if (has("target_path")) {
    return card(<g>
      <line x1="20" y1="96" x2="300" y2="34" stroke="var(--fg-3)" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="300" y="28" textAnchor="end" style={{ fill: "var(--fg-3)", font: "var(--fw-semi) 9.5px var(--font-sans)" }}>{ko ? "목표 경로" : "Target path"}</text>
      <path d="M20 100 Q 80 118 120 96 T 220 70 T 300 50" fill="none" stroke="var(--fg)" strokeWidth="1.8" />
      <circle cx="120" cy="96" r="4.5" fill={BUY} stroke="var(--bg-app)" strokeWidth="1.5" /><text x="120" y="114" textAnchor="middle" style={{ fill: BUY, font: "var(--fw-semi) 8.5px var(--font-sans)" }}>{ko ? "더 매수" : "buy+"}</text>
      <circle cx="220" cy="70" r="4.5" fill={SELL} stroke="var(--bg-app)" strokeWidth="1.5" /><text x="220" y="62" textAnchor="middle" style={{ fill: SELL, font: "var(--fw-semi) 8.5px var(--font-sans)" }}>{ko ? "덜 매수" : "buy−"}</text>
    </g>, <React.Fragment>{ko ? "실제 자산이 " : ""}<b style={{ color: "var(--fg-2)" }}>{ko ? "목표 경로" : "the target path"}</b>{ko ? "보다 아래면 더 사고, 위면 덜 사서 정해진 성장 곡선을 따라가게 맞춥니다." : " — buy more below it, less above."}</React.Fragment>);
  }
  if (has("upper") && has("lower")) {
    const gl = [40, 58, 76, 94];
    return card(<g>
      {gl.map((y, i) => <line key={i} x1="40" x2="280" y1={y} y2={y} stroke="var(--border)" strokeWidth="1" />)}
      <text x="286" y="44" style={{ fill: SELL, font: "var(--fw-semi) 9px var(--font-sans)" }}>{ko ? "상단" : "high"}</text>
      <text x="286" y="98" style={{ fill: BUY, font: "var(--fw-semi) 9px var(--font-sans)" }}>{ko ? "하단" : "low"}</text>
      <path d="M40 94 L 90 76 L 140 94 L 190 58 L 240 76 L 280 40" fill="none" stroke="var(--fg)" strokeWidth="1.6" />
      <circle cx="90" cy="76" r="4" fill={BUY} stroke="var(--bg-app)" strokeWidth="1.5" /><circle cx="140" cy="94" r="4" fill={BUY} stroke="var(--bg-app)" strokeWidth="1.5" />
      <circle cx="190" cy="58" r="4" fill={SELL} stroke="var(--bg-app)" strokeWidth="1.5" /><circle cx="280" cy="40" r="4" fill={SELL} stroke="var(--bg-app)" strokeWidth="1.5" />
      <text x="160" y="118" textAnchor="middle" style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 9px var(--font-sans)" }}>{ko ? "한 칸 ↓ 매수 · 한 칸 ↑ 매도" : "step down buy · step up sell"}</text>
    </g>, <React.Fragment>{ko ? "가격 구간을 여러 칸으로 나눠 " : ""}<b style={{ color: BUY }}>{ko ? "한 칸 내리면 사고" : "buy on a step down"}</b>{ko ? " " : ", "}<b style={{ color: SELL }}>{ko ? "한 칸 오르면 팔아" : "sell on a step up"}</b>{ko ? " 잔잔한 등락에서 차익을 쌓습니다." : "."}</React.Fragment>);
  }
  if (has("vr_vline")) {
    const up = Math.abs(nf("vr_upper", 15)), lo = Math.abs(nf("vr_lower", 15)), gr = nf("vr_growth", 15);
    return card(<g>
      <line x1="24" y1="92" x2="296" y2="44" stroke="var(--accent)" strokeWidth="1.8" />
      <text x="24" y="22" textAnchor="start" style={{ fill: "var(--accent)", font: "var(--fw-semi) 9px var(--font-sans)" }}>{ko ? `가치선 V (연 +${gr}%)` : `V (+${gr}%/yr)`}</text>
      <line x1="24" y1="78" x2="296" y2="30" stroke={SELL} strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
      <line x1="24" y1="106" x2="296" y2="58" stroke={BUY} strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
      <path d="M24 96 Q 70 70 110 84 T 190 66 Q 230 40 270 64 L 296 50" fill="none" stroke="var(--fg)" strokeWidth="1.6" />
      <circle cx="110" cy="84" r="4.5" fill={BUY} stroke="var(--bg-app)" strokeWidth="1.5" /><text x="110" y="100" textAnchor="middle" style={{ fill: BUY, font: "var(--fw-semi) 8.5px var(--font-sans)" }}>{ko ? "매수" : "buy"}</text>
      <circle cx="230" cy="40" r="4.5" fill={SELL} stroke="var(--bg-app)" strokeWidth="1.5" /><text x="230" y="34" textAnchor="middle" style={{ fill: SELL, font: "var(--fw-semi) 8.5px var(--font-sans)" }}>{ko ? "매도" : "sell"}</text>
    </g>, <React.Fragment>{ko ? "평가액이 매년 " : "A value line growing "}<b style={{ color: "var(--accent)" }}>{ko ? `${gr}% 커지는 가치선` : `${gr}%/yr`}</b>{ko ? `을 따라가도록 — 상단(+${up}%) 넘으면 매도, 하단(−${lo}%) 이탈하면 현금풀로 매수합니다.` : ` — trim above +${up}%, add below −${lo}% via the cash pool.`}</React.Fragment>);
  }
  if (has("equity_w")) {
    const ew = nf("equity_w", 60); const split = 40 + (ew / 100) * 240;
    return card(<g>
      <rect x="40" y="52" width={split - 40} height="26" rx="3" fill={BUY} opacity="0.85" />
      <rect x={split} y="52" width={280 - split} height="26" rx="3" fill="var(--fg-3)" opacity="0.7" />
      <text x={(40 + split) / 2} y="69" textAnchor="middle" style={{ fill: "#fff", font: "var(--fw-semi) 10px var(--font-sans)" }}>{ko ? `주식 ${ew}%` : `${ew}%`}</text>
      <text x={(split + 280) / 2} y="69" textAnchor="middle" style={{ fill: "var(--bg-app)", font: "var(--fw-semi) 10px var(--font-sans)" }}>{100 - ew}%</text>
      <text x="160" y="100" textAnchor="middle" style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 9px var(--font-sans)" }}>{ko ? "주기마다 이 비율로 되돌림" : "rebalance to this split each cycle"}</text>
    </g>, <React.Fragment><b style={{ color: BUY }}>{ko ? `주식 ${ew}%` : `${ew}% equity`}</b>{" / "}<b style={{ color: "var(--fg-2)" }}>{ko ? `방어자산 ${100 - ew}%` : `${100 - ew}% defensive`}</b>{ko ? "를 정해진 주기마다 다시 맞춰 위험을 분산합니다." : " rebalanced each cycle."}</React.Fragment>);
  }
  if (has("lookback") && has("stop")) {
    const st = Math.abs(nf("stop", 15));
    return card(<g>
      <path d="M20 100 L 70 86 L 120 92 L 170 64 L 220 72 L 270 40" fill="none" stroke="var(--fg)" strokeWidth="1.8" />
      <path d="M20 112 L 70 98 L 120 104 L 170 76 L 220 84 L 270 52" fill="none" stroke={SELL} strokeWidth="1.2" strokeDasharray="4 3" opacity="0.8" />
      <text x="270" y="34" textAnchor="end" style={{ fill: "var(--fg-2)", font: "var(--fw-semi) 9px var(--font-sans)" }}>{ko ? "강세 추종" : "ride trend"}</text>
      <text x="270" y="64" textAnchor="end" style={{ fill: SELL, font: "var(--fw-semi) 8.5px var(--font-sans)" }}>{ko ? `−${st}% 스탑` : `−${st}% stop`}</text>
      <text x="160" y="124" textAnchor="middle" style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 9px var(--font-sans)" }}>{ko ? "고점 따라 스탑선이 같이 올라감" : "stop trails the peak up"}</text>
    </g>, <React.Fragment>{ko ? "오르는 종목을 따라 타다가, " : ""}<b style={{ color: SELL }}>{ko ? `고점 대비 −${st}%` : `−${st}% from peak`}</b>{ko ? " 떨어지면 자동으로 빠져나옵니다." : " → exit."}</React.Fragment>);
  }
  return null;
}
