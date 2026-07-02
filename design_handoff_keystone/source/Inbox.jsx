// Inbox.jsx — Keystone inbox as a TRIAGE surface (Vector two-pane master/detail).
// Each rule that has fired becomes an actionable notification: record a buy, move to
// closing, or just mark read. Read state persists in localStorage.

const IBX_READ_KEY = "keystone-inbox-read-v1";
const IBX_RESOLVE_KEY = "keystone-inbox-resolved-v1";
const IBX_MUTE_KEY = "keystone-inbox-muted-v1";
function ibxSetOf(key) { try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch (e) { return new Set(); } }
function ibxSaveSet(key, set) { try { localStorage.setItem(key, JSON.stringify([...set])); } catch (e) {} }

// classify a rule into an event type → drives icon, color, and the triage action
function ibxType(rule) {
  const s = (rule.name.en + " " + rule.then.en).toLowerCase();
  if (/buy|loc|average|add/.test(s) && !/sell|trim|exit|profit/.test(s)) return "buy";
  if (/sell|trim|exit|profit|take|band|target/.test(s)) return "sell";
  return "info";
}
const IBX_META = {
  buy: { icon: "arrow-down-left", color: "var(--r-active)", soft: "color-mix(in srgb, var(--r-active) 14%, transparent)" },
  sell: { icon: "arrow-up-right", color: "var(--r-closing)", soft: "color-mix(in srgb, var(--r-closing) 14%, transparent)" },
  info: { icon: "zap", color: "var(--fg-3)", soft: "var(--bg-elevated-2)" },
  opportunity: { icon: "shield-check", color: "var(--pos)", soft: "color-mix(in srgb, var(--pos) 14%, transparent)" },
  impair: { icon: "alert-triangle", color: "var(--neg)", soft: "color-mix(in srgb, var(--neg) 14%, transparent)" },
  converge: { icon: "target", color: "var(--accent)", soft: "color-mix(in srgb, var(--accent) 14%, transparent)" },
};
// 시나리오 기반 알림: 각 플랜의 시나리오 목표가(상단/중간/하단) vs 현재가에서 파생.
// 추상적 '내재가치' 대신 사용자가 직접 세운 구체적 목표가를 트리거로 사용 → API 연동 시 그대로 유효.
function scenarioAlerts(p, lang) {
  if (!p.scenarios || p.scenarios.length < 3) return [];
  const ko = lang === "ko";
  const px = p.currentPrice;
  const find = (en) => p.scenarios.find(s => s.label.en === en);
  const bull = find("Bull"), base = find("Base"), bear = find("Bear");
  if (!bull || !base || !bear) return [];
  const f = (v) => fmtCompact(v, p.cur);
  const out = [];
  const mk = (id, type, title, body, action) => ({ id: p.id + ":scn:" + id, plan: p, type, time: p.updatedAt || "Today", title, body, computed: true, action });
  // 상단
  if (px >= bull.target) {
    out.push(mk("bull-hit", "converge", ko ? "상단 목표가 돌파" : "Upper target reached",
      ko ? `현재가가 상단 목표가 ${f(bull.target)}를 돌파했습니다. 차익 실현을 검토하세요.` : `Price broke above the upper target (${f(bull.target)}). Consider taking profit.`, "sell"));
  } else if (px >= bull.target * 0.97) {
    out.push(mk("bull-near", "converge", ko ? "상단 목표가 근접" : "Approaching upper target",
      ko ? `현재가가 상단 목표가 ${f(bull.target)}의 ${(px / bull.target * 100).toFixed(0)}%에 도달했습니다.` : `Price reached ${(px / bull.target * 100).toFixed(0)}% of the upper target ${f(bull.target)}.`));
  }
  // 하단
  if (px <= bear.target) {
    out.push(mk("bear-hit", "impair", ko ? "하단 목표가 이탈" : "Fell below lower target",
      ko ? `현재가가 하단 목표가 ${f(bear.target)} 아래로 내려갔습니다. 논제를 재점검하세요.` : `Price fell below the lower target (${f(bear.target)}). Re-check the thesis.`));
  } else if (px <= bear.target * 1.03) {
    out.push(mk("bear-near", "opportunity", ko ? "하단 근접 · 매수 검토" : "Near lower target · consider buying",
      ko ? `현재가가 하단 목표가 ${f(bear.target)}에 근접했습니다. 분할 매수를 검토하세요.` : `Price is near the lower target ${f(bear.target)}. Consider scaling in.`, "buy"));
  }
  // 중간 수렴 (상·하단 알림이 없을 때만)
  if (!out.length && Math.abs(px / base.target - 1) <= 0.02) {
    out.push(mk("base", "converge", ko ? "중간 목표가 수렴" : "Converging on base target",
      ko ? `현재가가 중간 목표가 ${f(base.target)} 부근에서 움직이고 있습니다.` : `Price is hovering around the base target ${f(base.target)}.`));
  }
  return out;
}

// crude time bucket from the stored "last" string ("Today 09:01" / "Jun 7 14:20" / "Jun 5")
function ibxBucket(last) { return /^today/i.test(last) ? "today" : "earlier"; }

// derive the full notification list from plans: fired rules + scenario-target alerts
function buildInboxNotes(source, lang) {
  const out = [];
  source.forEach(p => (p.rules || []).filter(r => r.on && r.last && r.last !== "Never")
    .forEach(r => out.push({ id: p.id + ":" + r.id, plan: p, rule: r, type: ibxType(r), time: r.last })));
  source.forEach(p => scenarioAlerts(p, lang).forEach(a => out.push(a)));
  return out.sort((a, b) => (a.computed === b.computed ? (a.time < b.time ? 1 : -1) : a.computed ? -1 : 1));
}
function ibxReadSet() { try { return new Set(JSON.parse(localStorage.getItem(IBX_READ_KEY) || "[]")); } catch (e) { return new Set(); } }
// a notif is "inactive" (out of the live queue) when read/resolved/muted
function ibxInactive(n, read, resolved, muted) {
  return read.has(n.id) || resolved.has(n.id) || muted.has(n.id);
}
// unread count for the sidebar badge — recomputed by App on each render
function inboxUnreadCount(plans, lang) {
  const source = plans && plans.length ? plans : (typeof PLANS !== "undefined" ? PLANS : []);
  const read = ibxReadSet(), resolved = ibxSetOf(IBX_RESOLVE_KEY), muted = ibxSetOf(IBX_MUTE_KEY);
  return buildInboxNotes(source, lang).filter(n => !ibxInactive(n, read, resolved, muted)).length;
}

function InboxScreen({ t, lang, plans, onOpen, addExecution, setStatus, fire, onPatchPlan, read, onMarkRead, onMarkAll }) {
  const ko = lang === "ko";
  const source = plans && plans.length ? plans : PLANS;
  const notes = React.useMemo(() => buildInboxNotes(source, lang), [source, lang]);

  // read state is owned by App (so the sidebar badge stays in sync); fall back to local if not provided
  const [localRead, setLocalRead] = React.useState(ibxReadSet);
  const readSet = read || localRead;
  const markRead = onMarkRead || ((ids) => setLocalRead(prev => { const n = new Set(prev); ids.forEach(i => n.add(i)); try { localStorage.setItem(IBX_READ_KEY, JSON.stringify([...n])); } catch (e) {} return n; }));

  // triage state (resolved / muted) — persisted locally; badge reads the same keys
  const [resolvedSet, setResolvedSet] = React.useState(() => ibxSetOf(IBX_RESOLVE_KEY));
  const [mutedSet, setMutedSet] = React.useState(() => ibxSetOf(IBX_MUTE_KEY));
  const mutate = (setFn, key, fn) => setFn(prev => { const n = new Set(prev); fn(n); ibxSaveSet(key, n); return n; });
  const [undo, setUndo] = React.useState(null); // { label, fn }
  const undoTimer = React.useRef(null);
  const flashUndo = (label, fn) => { setUndo({ label, fn }); if (undoTimer.current) clearTimeout(undoTimer.current); undoTimer.current = setTimeout(() => setUndo(null), 6000); };
  React.useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);
  const [showDone, setShowDone] = React.useState(false);

  const [tab, setTab] = React.useState("all"); // all | unread
  const [selId, setSelId] = React.useState(notes[0] ? notes[0].id : null);

  // queues
  const notMuted = notes.filter(n => !mutedSet.has(n.id));
  const resolvedList = notMuted.filter(n => resolvedSet.has(n.id));
  const live = notMuted.filter(n => !resolvedSet.has(n.id));
  const mutedNotes = notes.filter(n => mutedSet.has(n.id));
  const unreadCount = live.filter(n => !readSet.has(n.id)).length;
  const shown = tab === "unread" ? live.filter(n => !readSet.has(n.id)) : live;
  const sel = notes.find(n => n.id === selId) || shown[0] || null;

  const select = (n) => { setSelId(n.id); if (!readSet.has(n.id)) markRead([n.id]); };
  const markAll = onMarkAll || (() => markRead(notes.map(n => n.id)));

  // group shown notes by time bucket
  const groups = [["today", t.ibx_today], ["earlier", t.ibx_earlier]]
    .map(([k, label]) => ({ k, label, items: shown.filter(n => ibxBucket(n.time) === k) }))
    .filter(g => g.items.length);

  // advance selection to the next live item after one leaves the queue
  const nextAfter = (n) => { const rest = live.filter(x => x.id !== n.id); const idx = live.findIndex(x => x.id === n.id); return (rest[idx] || rest[idx - 1] || rest[0] || null); };

  // ---- triage actions ----
  // per-buy size is strategy-aware: DCA → the fixed period amount; grid → one rung (budget ÷ grids);
  // split (무한매수법) → one round's worth; else fall back to budget/round or total.
  const unitBudget = (p) => {
    const ex = (typeof EXEC_STRATEGIES !== "undefined") ? EXEC_STRATEGIES.find(s => s.id === p.execId) : null;
    const fNum = (k, d) => { const f = ex && ex.fields && ex.fields.find(x => x.key === k); if (!f) return d; const n = parseFloat(String(f.default).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? d : n; };
    if (ex) {
      if (p.execId === "ex2") { const a = fNum("amount", 0); if (a > 0) return a; }
      if (p.execId === "ex4" && p.totalInvested) { const g = Math.max(1, fNum("grids", 10)); return p.totalInvested / g; }
    }
    return (p.totalInvested && p.round) ? p.totalInvested / p.round : (p.totalInvested || p.currentPrice * 10);
  };
  const unitQty = (p) => Math.max(1, Math.round(unitBudget(p) / (p.currentPrice || 1)));
  const doBuy = (n, ov) => { const price = (ov && ov.price) || n.plan.currentPrice; const qty = (ov && ov.qty) || unitQty(n.plan); addExecution && addExecution(n.plan.id, { side: "buy", price, qty, date: "now" }); markRead([n.id]); mutate(setResolvedSet, IBX_RESOLVE_KEY, s => s.add(n.id)); flashUndo(ko ? "매수 체결 기록됨 · 처리완료" : "Fill recorded · resolved", () => mutate(setResolvedSet, IBX_RESOLVE_KEY, s => s.delete(n.id))); };
  const doClose = (n) => { setStatus && setStatus(n.plan.id, "closing"); markRead([n.id]); mutate(setResolvedSet, IBX_RESOLVE_KEY, s => s.add(n.id)); flashUndo(ko ? "청산중으로 전환됨" : "Moved to Closing", () => { setStatus && setStatus(n.plan.id, "active"); mutate(setResolvedSet, IBX_RESOLVE_KEY, s => s.delete(n.id)); }); };
  const doSell = (n, ov) => { const price = (ov && ov.price) || n.plan.currentPrice; const qty = (ov && ov.qty) || unitQty(n.plan); addExecution && addExecution(n.plan.id, { side: "sell", price, qty, date: "now" }); markRead([n.id]); mutate(setResolvedSet, IBX_RESOLVE_KEY, s => s.add(n.id)); flashUndo(ko ? "매도 체결 기록됨 · 처리완료" : "Sell recorded · resolved", () => mutate(setResolvedSet, IBX_RESOLVE_KEY, s => s.delete(n.id))); };
  const resolve = (n) => { markRead([n.id]); const next = nextAfter(n); mutate(setResolvedSet, IBX_RESOLVE_KEY, s => s.add(n.id)); if (sel && sel.id === n.id && next) setSelId(next.id); flashUndo(ko ? "처리됨" : "Resolved", () => mutate(setResolvedSet, IBX_RESOLVE_KEY, s => s.delete(n.id))); };
  const mute = (n) => { markRead([n.id]); const next = nextAfter(n); mutate(setMutedSet, IBX_MUTE_KEY, s => s.add(n.id)); if (sel && sel.id === n.id && next) setSelId(next.id); flashUndo(ko ? "이 알림 음소거됨" : "Alert muted", () => mutate(setMutedSet, IBX_MUTE_KEY, s => s.delete(n.id))); };
  const restore = (n) => { mutate(setResolvedSet, IBX_RESOLVE_KEY, s => s.delete(n.id)); };
  const unmute = (n) => mutate(setMutedSet, IBX_MUTE_KEY, s => s.delete(n.id));
  const logNote = (n, text) => {
    const v = (text || "").trim(); if (!v || !onPatchPlan) return;
    const d = new Date(2026, 5, 22);
    const stamp = ko ? `${d.getMonth() + 1}월 ${d.getDate()}일` : `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]} ${d.getDate()}`;
    const entry = { id: "nt" + Date.now(), when: stamp, text: v, price: n.plan.currentPrice, fromAlert: true };
    onPatchPlan(n.plan.id, { notes: [entry, ...(n.plan.notes || [])] });
    fire && fire(ko ? "일지에 기록됨" : "Logged to journal");
  };

  return (
    <div className="inbox">
      <div className="inbox-master">
        <div className="inbox-head">
          <span className="ibx-title">{t.inbox}</span>
          {unreadCount > 0 && <span className="ibx-count">{unreadCount}</span>}
          <div className="ibx-head-tabs">
            <button className={"ibx-seg" + (tab === "all" ? " on" : "")} onClick={() => setTab("all")}>{t.ibx_all}</button>
            <button className={"ibx-seg" + (tab === "unread" ? " on" : "")} onClick={() => setTab("unread")}>{t.ibx_unread}</button>
          </div>
          {unreadCount > 0 && <button className="ibx-markall" onClick={markAll} title={t.ibx_markAll}><Lic name="check-check" size={15} cls="icon-sm" color="currentColor" /></button>}
        </div>

        <div className="inbox-items">
          {!live.length && (
            <div className="ibx-empty">
              <svg width="46" height="46" viewBox="0 0 48 48" fill="none"><path d="M8 16h32v18a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V16Z" stroke="var(--fg-4)" strokeWidth="1.6"/><path d="M8 16l4-8h24l4 8M8 28h8l3 4h10l3-4h8" stroke="var(--fg-4)" strokeWidth="1.6" strokeLinejoin="round"/></svg>
              <div className="ibx-empty-t">{resolvedList.length || mutedNotes.length ? (ko ? "활성 알림 없음" : "Inbox zero") : t.ibx_empty}</div>
              <div className="ibx-empty-s">{resolvedList.length || mutedNotes.length ? (ko ? "모든 알림을 처리했어요." : "You've triaged everything.") : t.ibx_emptySub}</div>
            </div>
          )}
          {groups.map(g => (
            <div key={g.k} className="ibx-group">
              <div className="ibx-group-cap">{g.label}<span className="ibx-group-n">{g.items.length}</span></div>
              {g.items.map(n => {
                const m = IBX_META[n.type]; const isRead = readSet.has(n.id);
                return (
                  <div key={n.id} className={"ibx-item" + (isRead ? " read" : "") + (sel && sel.id === n.id ? " active" : "")} onClick={() => select(n)}>
                    {!isRead && <span className="ibx-unread" />}
                    <span className="ibx-ic" style={{ background: m.soft }}><Lic name={m.icon} size={13} cls="icon-sm" color={m.color} /></span>
                    <div className="ibx-body">
                      <div className="ibx-line"><span className="ibx-actor">{n.rule ? n.rule.name[lang] : n.title}</span> · <span className="ibx-id">{n.plan.ticker}</span></div>
                      <div className="ibx-sub">{n.rule ? n.rule.when[lang] + " → " + n.rule.then[lang] : n.body}</div>
                    </div>
                    <span className="ibx-time">{fmtRel ? fmtRel(n.time, lang) : n.time}</span>
                    <span className="ibx-row-acts">
                      <button className="ibx-rowbtn" title={ko ? "처리완료" : "Resolve"} onClick={(e) => { e.stopPropagation(); resolve(n); }}><Lic name="check-circle" size={13} cls="icon-sm" color="currentColor" /></button>
                      <button className="ibx-rowbtn" title={t.ibx_openPlan} onClick={(e) => { e.stopPropagation(); onOpen(n.plan, n.type === "info" ? "activity" : "executions"); }}><Lic name="arrow-up-right" size={13} cls="icon-sm" color="currentColor" /></button>
                    </span>
                  </div>
                );
              })}
            </div>
          ))}

          {(resolvedList.length > 0 || mutedNotes.length > 0) && (
            <div className="ibx-done">
              <button className="ibx-done-head" onClick={() => setShowDone(v => !v)}>
                <Lic name={showDone ? "chevron-down" : "chevron-right"} size={13} cls="icon-sm" color="currentColor" />
                {ko ? "처리됨" : "Triaged"}
                <span className="ibx-done-n">{resolvedList.length + mutedNotes.length}</span>
              </button>
              {showDone && <div className="ibx-done-list">
                {resolvedList.map(n => (
                  <div key={n.id} className="ibx-done-row">
                    <Lic name="check-circle" size={13} cls="icon-sm" color="var(--fg-4)" />
                    <span className="ibx-done-txt">{n.rule ? n.rule.name[lang] : n.title} · {n.plan.ticker}</span>
                    <button className="ibx-done-restore" onClick={() => restore(n)}>{ko ? "되돌리기" : "Restore"}</button>
                  </div>
                ))}
                {mutedNotes.map(n => (
                  <div key={n.id} className="ibx-done-row">
                    <Lic name="bell-off" size={13} cls="icon-sm" color="var(--fg-4)" />
                    <span className="ibx-done-txt">{n.rule ? n.rule.name[lang] : n.title} · {n.plan.ticker}</span>
                    <button className="ibx-done-restore" onClick={() => unmute(n)}>{ko ? "음소거 해제" : "Unmute"}</button>
                  </div>
                ))}
              </div>}
            </div>
          )}
        </div>
        {undo && <div className="ibx-undo"><span className="ibx-undo-lab">{undo.label}</span><button className="ibx-undo-btn" onClick={() => { undo.fn(); setUndo(null); }}>{ko ? "실행취소" : "Undo"}</button></div>}
      </div>

      <div className="inbox-detail">
        {sel ? <InboxReader n={sel} t={t} lang={lang} onOpen={onOpen} doBuy={doBuy} doSell={doSell} doClose={doClose} unitQty={unitQty} resolve={resolve} mute={mute} logNote={logNote} /> : (
          <div className="ibx-pick">
            <Lic name="bell" size={28} cls="icon" color="var(--fg-4)" />
            <div className="ibx-pick-t">{t.ibx_pick}</div>
            <div className="ibx-pick-s">{t.ibx_pickSub}</div>
          </div>
        )}
      </div>
      {sel && <InboxProps n={sel} t={t} lang={lang} />}
    </div>
  );
}

function InboxReader({ n, t, lang, onOpen, doBuy, doSell, doClose, unitQty, resolve, mute, logNote }) {
  const ko = lang === "ko";
  const m = IBX_META[n.type]; const p = n.plan;
  const hasScen = p.scenarios && p.scenarios.length >= 3;
  const ret = planReturn(p);
  const hasPos = p.totalShares > 0 && p.avgPrice != null;
  const fillPct = p.divisions ? Math.round(p.round / p.divisions * 100) : null;
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [noteText, setNoteText] = React.useState("");
  const [buyOpen, setBuyOpen] = React.useState(false);
  const [buyPrice, setBuyPrice] = React.useState("");
  const [buyQty, setBuyQty] = React.useState("");
  const [sellOpen, setSellOpen] = React.useState(false);
  const [sellPrice, setSellPrice] = React.useState("");
  const [sellQty, setSellQty] = React.useState("");
  React.useEffect(() => { setNoteOpen(false); setNoteText(""); setBuyOpen(false); setSellOpen(false); }, [n.id]);
  const openBuy = () => { setBuyPrice(String(p.currentPrice)); setBuyQty(String(unitQty(p))); setBuyOpen(true); };
  const buyPriceN = parseFloat(String(buyPrice).replace(/[^0-9.]/g, "")) || 0;
  const buyQtyN = Math.max(0, parseInt(String(buyQty).replace(/[^0-9]/g, ""), 10) || 0);
  const confirmBuy = () => { if (buyPriceN > 0 && buyQtyN > 0) doBuy(n, { price: buyPriceN, qty: buyQtyN }); setBuyOpen(false); };
  const sellUnit = Math.min(unitQty(p), p.totalShares || 0) || unitQty(p);
  const openSell = () => { setSellPrice(String(p.currentPrice)); setSellQty(String(sellUnit)); setSellOpen(true); };
  const sellPriceN = parseFloat(String(sellPrice).replace(/[^0-9.]/g, "")) || 0;
  const sellQtyN = Math.max(0, parseInt(String(sellQty).replace(/[^0-9]/g, ""), 10) || 0);
  const confirmSell = () => { if (sellPriceN > 0 && sellQtyN > 0) doSell(n, { price: sellPriceN, qty: sellQtyN }); setSellOpen(false); };
  const submitNote = (prefix) => {
    const body = (prefix ? prefix + (noteText.trim() ? ": " + noteText.trim() : "") : noteText.trim());
    if (!body) return;
    logNote && logNote(n, "[" + (n.rule ? n.rule.name[lang] : (n.title || (ko ? "알림" : "Alert"))) + "] " + body);
    setNoteOpen(false); setNoteText("");
  };
  return (
    <div className="ibx-reader">
      <div className="ibx-reader-head">
        <span className="ibx-ic lg" style={{ background: m.soft }}><Lic name={m.icon} size={16} cls="icon-sm" color={m.color} /></span>
        <h2>{n.rule ? n.rule.name[lang] : n.title}</h2>
        <button className="jr-rd-open" onClick={() => onOpen(p, n.type === "info" ? "activity" : "executions")}>{t.ibx_openPlan}<Lic name="arrow-up-right" size={13} cls="icon-sm" color="currentColor" /></button>
      </div>
      <div className="ibx-reader-meta">
        <span className="ibx-rm-tk mono">{p.ticker}</span>
        <span className="ibx-rm-dot">·</span>
        <span className="ibx-rm-name">{p.name[lang]}</span>
        {p.status === "closed" && (typeof EXEC_STRATEGIES !== "undefined") && (() => { const eg = EXEC_STRATEGIES.find(s => s.id === p.execId); return eg ? <React.Fragment><span className="ibx-rm-dot">·</span><span className="ibx-rm-strat"><Lic name={eg.icon || "git-branch"} size={12} cls="icon-sm" color={eg.color} />{eg.name[lang]}</span></React.Fragment> : null; })()}
        <span className="ibx-rm-time">{fmtRel ? fmtRel(n.time, lang) : n.time}</span>
      </div>

      <div className="ibx-whenthen">
        {n.rule ? <>
          <div className="ibx-wt-row"><span className="ibx-wt-k">{t.ibx_when}</span><span className="ibx-wt-v">{n.rule.when[lang]}</span></div>
          <div className="ibx-wt-arrow"><Lic name="arrow-down" size={13} cls="icon-sm" color="var(--fg-4)" /></div>
          <div className="ibx-wt-row"><span className="ibx-wt-k">{t.ibx_then}</span><span className="ibx-wt-v">{n.rule.then[lang]}</span></div>
        </> : <div className="ibx-wt-row"><span className="ibx-wt-v" style={{ lineHeight: 1.55 }}>{n.body}</span></div>}
      </div>

      {hasScen && (
        <div className="ibx-gauge">
          <div className="ibx-gauge-cap">{lang === "ko" ? "시나리오 범위" : "Scenario range"}</div>
          <ScenarioGauge plan={p} lang={lang} />
        </div>
      )}

      {p.execId && p.status !== "closed" && (typeof EXEC_STRATEGIES !== "undefined") && EXEC_STRATEGIES.some(s => s.id === p.execId) && (
        <div className="ibx-gauge">
          <div className="ibx-gauge-cap">{lang === "ko" ? "전략" : "Strategy"}</div>
          <StrategyStrip plan={p} lang={lang} />
        </div>
      )}

      {p.status === "closed" && (typeof closeoutSummary === "function") && (() => {
        const co = closeoutSummary(p); const ko = lang === "ko";
        const tone = co.realized >= 0 ? "pos" : "neg";
        return (
          <div className={"ibx-closeout " + tone}>
            <div className="ibx-closeout-top">
              <div className="ibx-closeout-head">
                <span className="ibx-closeout-cap">{ko ? "청산 요약" : "Closeout"}</span>
                <span className="ibx-closeout-sub mono">{co.avgBuy != null ? fmtCompact(co.avgBuy, p.cur) : "—"}{co.avgSell != null ? " → " + fmtCompact(co.avgSell, p.cur) : ""}</span>
              </div>
              <div className="ibx-closeout-pl">
                <span className={"ibx-closeout-rate " + tone}>{co.realizedPct == null ? "—" : (co.realizedPct >= 0 ? "+" : "") + co.realizedPct.toFixed(1) + "%"}</span>
                <span className={"ibx-closeout-amt mono " + tone}>{(co.realized >= 0 ? "+" : "−") + fmtCompact(Math.abs(co.realized), p.cur)}</span>
              </div>
            </div>
            <div className="ibx-closeout-stats">
              <div className="ibx-co-cell"><span className="ibx-co-lab">{ko ? "총 투입" : "Invested"}</span><span className="ibx-co-val mono">{fmtCompact(co.invested, p.cur)}</span></div>
              <div className="ibx-co-cell"><span className="ibx-co-lab">{ko ? "총 매수" : "Bought"}</span><span className="ibx-co-val mono">{co.buyQty.toLocaleString("en-US")}{ko ? "주" : " sh"}</span></div>
              {co.holdDays != null && <div className="ibx-co-cell"><span className="ibx-co-lab">{ko ? "보유 기간" : "Held"}</span><span className="ibx-co-val mono">{co.holdDays}{ko ? "일" : "d"}</span></div>}
            </div>
          </div>
        );
      })()}

      {(() => {
        const act = n.action || (n.type === "buy" ? "buy" : n.type === "sell" ? "sell" : null);
        const canSell = act === "sell" && p.status !== "closed" && (p.totalShares || 0) > 0;
        const canClose = act === "sell" && p.status !== "closing" && p.status !== "closed";
        if (act !== "buy" && !canSell && !canClose) return null;
        return (
          <div className="ibx-actions">
            {act === "buy" && (buyOpen
              ? <div className="ibx-buyform">
                  <div className="ibx-buyform-grid">
                    <label className="ibx-bf-field">
                      <span className="ibx-bf-lab">{ko ? "체결 단가" : "Fill price"}</span>
                      <input className="ibx-bf-input mono" value={buyPrice} inputMode="decimal" autoFocus onChange={e => setBuyPrice(e.target.value)} onKeyDown={e => { if (e.key === "Enter") confirmBuy(); if (e.key === "Escape") setBuyOpen(false); }} />
                    </label>
                    <label className="ibx-bf-field">
                      <span className="ibx-bf-lab">{ko ? "수량" : "Qty"}</span>
                      <input className="ibx-bf-input mono" value={buyQty} inputMode="numeric" onChange={e => setBuyQty(e.target.value)} onKeyDown={e => { if (e.key === "Enter") confirmBuy(); if (e.key === "Escape") setBuyOpen(false); }} />
                    </label>
                    <div className="ibx-bf-field">
                      <span className="ibx-bf-lab">{ko ? "합계" : "Total"}</span>
                      <span className="ibx-bf-total mono">{fmtCompact(buyPriceN * buyQtyN, p.cur)}</span>
                    </div>
                  </div>
                  <div className="ibx-bf-acts">
                    <span className="ibx-bf-note"><Lic name="info" size={12} cls="icon-sm" color="var(--fg-4)" />{ko ? "실제 체결 내역을 입력하세요 — 위 값은 추정치입니다" : "Enter your actual fill — values above are estimates"}</span>
                    <button className="note-cancel" onClick={() => setBuyOpen(false)}>{ko ? "취소" : "Cancel"}</button>
                    <button className="v-btn v-btn--primary note-save" onClick={confirmBuy} disabled={!(buyPriceN > 0 && buyQtyN > 0)}>{ko ? "체결 기록" : "Record fill"}</button>
                  </div>
                </div>
              : <button className="v-btn v-btn--primary ibx-act" onClick={openBuy}>
                  <Lic name="plus" size={14} cls="icon-sm" color="currentColor" />{ko ? "매수 체결 입력" : "Record buy"}
                  <span className="ibx-act-hint">{ko ? "예상" : "est."} {unitQty(p).toLocaleString("en-US")}{lang === "ko" ? "주" : "sh"} · {fmtCompact(p.currentPrice * unitQty(p), p.cur)}</span>
                </button>
            )}
            {canSell && (sellOpen
              ? <div className="ibx-buyform is-sell">
                  <div className="ibx-buyform-grid">
                    <label className="ibx-bf-field">
                      <span className="ibx-bf-lab">{ko ? "체결 단가" : "Fill price"}</span>
                      <input className="ibx-bf-input mono" value={sellPrice} inputMode="decimal" autoFocus onChange={e => setSellPrice(e.target.value)} onKeyDown={e => { if (e.key === "Enter") confirmSell(); if (e.key === "Escape") setSellOpen(false); }} />
                    </label>
                    <label className="ibx-bf-field">
                      <span className="ibx-bf-lab">{ko ? `수량 (보유 ${(p.totalShares || 0).toLocaleString("en-US")})` : `Qty (held ${(p.totalShares || 0).toLocaleString("en-US")})`}</span>
                      <input className="ibx-bf-input mono" value={sellQty} inputMode="numeric" onChange={e => setSellQty(e.target.value)} onKeyDown={e => { if (e.key === "Enter") confirmSell(); if (e.key === "Escape") setSellOpen(false); }} />
                    </label>
                    <div className="ibx-bf-field">
                      <span className="ibx-bf-lab">{ko ? "합계" : "Total"}</span>
                      <span className="ibx-bf-total mono">{fmtCompact(sellPriceN * sellQtyN, p.cur)}</span>
                    </div>
                  </div>
                  <div className="ibx-bf-acts">
                    <span className="ibx-bf-note"><Lic name="info" size={12} cls="icon-sm" color="var(--fg-4)" />{ko ? "부분 매도예요 — 보유가 0이 되면 자동으로 청산중 전환" : "Partial sell — auto-moves to Closing when shares reach 0"}</span>
                    <button className="note-cancel" onClick={() => setSellOpen(false)}>{ko ? "취소" : "Cancel"}</button>
                    <button className="v-btn v-btn--primary note-save" onClick={confirmSell} disabled={!(sellPriceN > 0 && sellQtyN > 0)}>{ko ? "매도 기록" : "Record sell"}</button>
                  </div>
                </div>
              : <button className="v-btn v-btn--primary ibx-act" onClick={openSell}>
                  <Lic name="minus" size={14} cls="icon-sm" color="currentColor" />{ko ? "매도 체결 입력" : "Record sell"}
                  <span className="ibx-act-hint">{ko ? "예상" : "est."} {sellUnit.toLocaleString("en-US")}{lang === "ko" ? "주" : "sh"} · {fmtCompact(p.currentPrice * sellUnit, p.cur)}</span>
                </button>
            )}
            {canClose && !sellOpen && (
              <button className="ibx-close-ghost" onClick={() => doClose(n)}>
                <Lic name="flag" size={13} cls="icon-sm" color="currentColor" />{t.ibx_toClosing}
              </button>
            )}
          </div>
        );
      })()}

      {/* triage bar — resolve / mute / log decision (the surface's true verbs) */}
      <div className="ibx-triage">
        <button className="ibx-tg-btn" onClick={() => resolve(n)}><Lic name="check-circle" size={14} cls="icon-sm" color="currentColor" />{ko ? "처리완료" : "Resolve"}</button>
        <button className="ibx-tg-btn" onClick={() => mute(n)}><Lic name="bell-off" size={14} cls="icon-sm" color="currentColor" />{ko ? "이 알림 음소거" : "Mute"}</button>
        <button className={"ibx-tg-btn" + (noteOpen ? " on" : "")} style={{ marginLeft: "auto" }} onClick={() => setNoteOpen(v => !v)}><Lic name="pencil" size={14} cls="icon-sm" color="currentColor" />{ko ? "기록 남기기" : "Log"}</button>
      </div>

      {noteOpen && (
        <div className="ibx-logbox">
          <div className="ibx-log-quick">
            <button className="ibx-log-chip" onClick={() => submitNote(ko ? "실행함" : "Acted")}><Lic name="check" size={12} cls="icon-sm" color="var(--pos)" />{ko ? "실행함" : "Acted"}</button>
            <button className="ibx-log-chip" onClick={() => submitNote(ko ? "건너뜀" : "Skipped")}><Lic name="x" size={12} cls="icon-sm" color="var(--fg-3)" />{ko ? "건너뜀" : "Skipped"}</button>
            <span className="ibx-log-hint">{ko ? "이유를 적으면 일지에 남아요" : "Add a reason — saved to the journal"}</span>
          </div>
          <textarea className="note-input" rows="2" autoFocus value={noteText} placeholder={ko ? "왜 이 결정을 했는지(선택)…" : "Why this decision (optional)…"}
            onChange={e => setNoteText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitNote(null); if (e.key === "Escape") setNoteOpen(false); }} />
          <div className="note-edit-acts">
            <button className="note-cancel" onClick={() => setNoteOpen(false)}>{ko ? "취소" : "Cancel"}</button>
            <button className="v-btn v-btn--primary note-save" onClick={() => submitNote(null)}>{ko ? "기록" : "Log"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

const IBX_STRAT_VAL_KO = { Monthly: "매월", Quarterly: "분기별", Weekly: "매주", Daily: "매일", Annually: "연 1회", Yearly: "연 1회" };
function ibxStratVal(v, lang) {
  if (v === "auto") return "—";
  if (lang === "ko" && IBX_STRAT_VAL_KO[v]) return IBX_STRAT_VAL_KO[v];
  return v;
}

// Read-only mirror of the plan detail PropsSidebar — same sections & order, no editing.
function InboxProps({ n, t, lang }) {
  const p = n.plan;
  const strat = (typeof STRATEGIES !== "undefined") ? STRATEGIES.find(s => s.id === p.strategyId) : null;
  const pf = (typeof PORTFOLIOS !== "undefined") ? PORTFOLIOS.find(x => x.id === p.portfolioId) : null;
  const fields = strat ? (strat.fields || []) : [];
  const hasPos = p.totalShares > 0 || p.totalInvested > 0;
  return (
    <div className="inbox-props">
      {hasPos && (
        <div className="side-group">
          <div className="side-cap">{lang === "ko" ? "포지션" : "Position"}</div>
          <div className="prop-line"><span className="pl-label">{t.invested}</span><span className="pl-value mono">{fmtCompact(p.totalInvested, p.cur)}</span></div>
          <div className="prop-line"><span className="pl-label">{t.shares}</span><span className="pl-value mono">{(p.totalShares || 0).toLocaleString("en-US")}</span></div>
          <div className="prop-line"><span className="pl-label">{t.dash_value}</span><span className="pl-value mono">{fmtCompact(p.currentPrice * (p.totalShares || 0), p.cur)}</span></div>
        </div>
      )}

      {!hasPos && p.status === "closed" && (typeof closeoutSummary === "function") && (() => {
        const co = closeoutSummary(p);
        return (
          <div className="side-group">
            <div className="side-cap">{lang === "ko" ? "청산 요약" : "Closeout"}</div>
            <div className="prop-line"><span className="pl-label">{t.realizedPL}</span><span className={"pl-value mono " + (co.realized >= 0 ? "pos" : "neg")}>{(co.realized >= 0 ? "+" : "") + fmtCompact(co.realized, p.cur)}{co.realizedPct != null ? "  " + (co.realizedPct >= 0 ? "+" : "") + co.realizedPct.toFixed(1) + "%" : ""}</span></div>
            <div className="prop-line"><span className="pl-label">{t.totalInvestedLab}</span><span className="pl-value mono">{fmtCompact(co.invested, p.cur)}</span></div>
            <div className="prop-line"><span className="pl-label">{t.avgBuySell}</span><span className="pl-value mono">{fmtCompact(co.avgBuy, p.cur)}{co.avgSell != null ? " → " + fmtCompact(co.avgSell, p.cur) : ""}</span></div>
            {co.holdDays != null && <div className="prop-line"><span className="pl-label">{t.holdPeriod}</span><span className="pl-value mono">{co.holdDays}{lang === "ko" ? "일" : "d"}</span></div>}
          </div>
        );
      })()}

      <div className="side-group">
        <div className="side-cap">{t.sysProps}</div>
        <div className="prop-line"><span className="pl-label">{t.status}</span><span className="pl-value ibx-pv-ic"><StatusIcon status={p.status} size={14} />{t["s_" + p.status]}</span></div>
        <div className="prop-line"><span className="pl-label">{t.portfolio}</span><span className="pl-value ibx-pv-ic">{pf ? <><span className="pf-dot" style={{ background: pf.color }} />{pf.name[lang]}</> : "—"}</span></div>
        <div className="prop-line"><span className="pl-label">{t.strategy}</span><span className="pl-value ibx-pv-ic">{strat ? <><span className="strat-dot" style={{ background: strat.color }} />{strat.name[lang]}</> : <span style={{ color: "var(--fg-4)" }}>{t.noStrategy}</span>}</span></div>
        <div className="prop-line"><span className="pl-label">{t.ticker}</span><span className="pl-value"><Flag market={p.cur === "KRW" ? "KR" : "US"} size={14} /> <span className="mono">{p.ticker}</span></span></div>
        <div className="prop-line"><span className="pl-label">{t.created}</span><span className="pl-value" style={{ color: "var(--fg-3)" }}>{fmtDate ? fmtDate(p.createdAt, lang) : p.createdAt}</span></div>
        {p.updatedAt && <div className="prop-line"><span className="pl-label">{t.updated}</span><span className="pl-value" style={{ color: "var(--fg-3)" }}>{fmtRel ? fmtRel(p.updatedAt, lang) : p.updatedAt}</span></div>}
      </div>

      {fields.length > 0 && (
        <div className="side-group">
          <div className="side-cap">{t.stratFields}</div>
          {fields.map(f => {
            let val = f.default;
            if (f.key === "round_cur") val = String(p.round ?? 0);
            if (f.key === "buy_unit" && p.totalInvested) val = fmtCompact(p.totalInvested / (p.round || 1), p.cur);
            if (f.key === "loc_price") val = fmtCompact(p.currentPrice * 0.95, p.cur);
            val = ibxStratVal(val, lang);
            return (
              <div className="field-line" key={f.key}>
                <span className="fl-key">{f.label[lang]}{f.auto && <span className="fl-auto">auto</span>}</span>
                <span className="fl-val">{val}</span>
              </div>
            );
          })}
        </div>
      )}

      {p.scenarios && p.scenarios.length >= 1 && (
        <div className="side-group">
          <div className="side-cap">{t.scSummary}</div>
          {p.scenarios.map((s, i) => {
            const gap = (s.target / p.currentPrice - 1) * 100;
            return (
              <div className="scsum-row" key={i}>
                <span className="scsum-dot" style={{ background: s.color }} />
                <span className="scsum-lab">{s.label[lang]} · <span className="mono">{fmtCompact(s.target, p.cur)}</span></span>
                <span className={"scsum-pct " + (gap >= 0 ? "pos" : "neg")}>{gap >= 0 ? "+" : ""}{gap.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { InboxScreen, inboxUnreadCount, buildInboxNotes, ibxReadSet, IBX_READ_KEY });