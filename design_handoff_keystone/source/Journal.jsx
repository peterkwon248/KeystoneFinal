// Journal.jsx — Keystone unified investment journal.
// Master-detail (Vector inbox-style): note list (left) │ note reader + subject context (center) │ summary rail (right).
//
// Journal is the BACKWARD-looking / reflective surface (vs. the Inbox's forward-looking triage).
// So it does NOT show the live strategy "next signal" strip — that's a present-tense action datum.
// Instead it shows "since this note": the subject's price when the note was written → now.

// Price the subject was at when a note was written. A real snapshot (n.price, stamped on every
// note created from now on) always wins; seed/legacy notes without one get a deterministic
// pseudo-historical price derived from their id and bounded to the plan's scenario band, so the
// "since this note" delta is demonstrable until real snapshots accrue. (API-ready: drop the
// synthesis the moment every note carries n.price.)
function jrWritePrice(n, now, lo, hi) {
  if (n.price != null) return n.price;
  if (!now) return null;
  const m = String(n.id).match(/nt(\d+)/);
  const seed = m ? +m[1] : 0;
  const frac = (((seed % 997) / 997) - 0.5) * 0.22; // ±11%
  let v = now * (1 + frac);
  if (lo != null) v = Math.max(lo, v);
  if (hi != null) v = Math.min(hi, v);
  return now < 1000 ? Math.round(v * 100) / 100 : Math.round(v);
}

function JournalScreen({ t, lang, plans, onOpen, onPatchPlan, onOpenSecurity }) {
  const ko = lang === "ko";
  const pfColor = (p) => (typeof PORTFOLIOS !== "undefined" ? (PORTFOLIOS.find(x => x.id === (p && p.portfolioId)) || {}).color : null) || "var(--fg-3)";
  const [scope, setScope] = React.useState("all"); // all | planId | sec:ticker
  const [q, setQ] = React.useState("");
  const [selKey, setSelKey] = React.useState(null);   // selected note composite key
  const [compose, setCompose] = React.useState(true); // center shows compose box
  const [composeFor, setComposeFor] = React.useState(null); // plan/sec id to write to
  const [draft, setDraft] = React.useState("");
  const [limit, setLimit] = React.useState(80);
  const [, jrForce] = React.useReducer(x => x + 1, 0);

  const SECS = (typeof SECURITIES !== "undefined" ? SECURITIES : []);
  const subjOf = (n) => n.sec ? ("sec:" + n.sec.ticker) : n.plan.id;
  const keyOf = (n) => subjOf(n) + ":" + n.id;
  const wlab = (w) => !w ? "—" : typeof w === "string" ? w : (w[lang] || w.en || "—");

  // flatten every plan's + security's notes into one feed
  const all = [];
  (plans || []).forEach(p => (p.notes || []).forEach((n, i) => all.push({ ...n, plan: p, _ord: i })));
  SECS.forEach(s => (s.journal || []).forEach((n, i) => all.push({ ...n, sec: s, _ord: i })));
  const tsOf = (n) => { const m = String(n.id).match(/nt(\d+)/); return m ? +m[1] : 0; };
  all.sort((a, b) => tsOf(b) - tsOf(a));

  const filtered = all.filter(n => {
    if (scope !== "all" && subjOf(n) !== scope) return false;
    if (q.trim()) { const s = q.trim().toLowerCase(); const nm = (n.plan ? n.plan.name[lang] : n.sec.name[lang]) || ""; return (n.text || "").toLowerCase().includes(s) || nm.toLowerCase().includes(s); }
    return true;
  });
  const shown = filtered.slice(0, limit);
  const more = filtered.length - shown.length;

  const withNotes = (plans || []).filter(p => (p.notes || []).length);
  const secsWithNotes = SECS.filter(s => (s.journal || []).length);
  const todayStamp = ko ? "6월 22일" : "Jun 22";

  // context badge — current gap (price vs base target) for the note's plan
  const ctxOf = (p) => {
    const base = ((p.scenarios || []).find(s => s.label && s.label.en === "Base") || {}).target || p.iv;
    const px = p.currentPrice;
    if (!base || !px) return null;
    const g = (px - base) / base * 100;
    const tone = g <= -2 ? "pos" : g >= 2 ? "neg" : "warn";
    const lab = ko ? (g <= -2 ? "저평가" : g >= 2 ? "고평가" : "적정") : (g <= -2 ? "undervalued" : g >= 2 ? "overvalued" : "fair");
    return { g, tone, lab };
  };

  // group shown entries by displayed date
  const groups = [];
  shown.forEach(n => { const key = wlab(n.when); let g = groups[groups.length - 1]; if (!g || g.key !== key) { g = { key, label: key === todayStamp ? (ko ? "오늘" : "Today") : key, items: [] }; groups.push(g); } g.items.push(n); });

  // compose target
  const targetId = composeFor || (scope !== "all" ? scope : ((plans || [])[0] || {}).id);
  const isSecTarget = typeof targetId === "string" && targetId.startsWith("sec:");
  const targetPlan = isSecTarget ? null : (plans || []).find(p => p.id === targetId);
  const targetSec = isSecTarget ? SECS.find(x => x.ticker === targetId.slice(4)) : null;
  const addNote = () => {
    const v = draft.trim(); if (!v) return;
    const d = new Date(2026, 5, 22);
    const stamp = { en: `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]} ${d.getDate()}`, ko: `${d.getMonth() + 1}월 ${d.getDate()}일` };
    const snap = targetSec ? targetSec.price : (targetPlan ? targetPlan.currentPrice : null);
    const entry = { id: "nt" + Date.now(), when: stamp, text: v, price: snap };
    if (targetSec) { targetSec.journal = [entry, ...(targetSec.journal || [])]; jrForce(); }
    else if (targetPlan && onPatchPlan) { onPatchPlan(targetPlan.id, { notes: [entry, ...(targetPlan.notes || [])] }); }
    setDraft("");
    setSelKey((targetSec ? "sec:" + targetSec.ticker : targetPlan.id) + ":" + entry.id);
    setCompose(false);
  };

  // selected note
  const sel = !compose ? all.find(n => keyOf(n) === selKey) : null;
  const selectNote = (n) => { setSelKey(keyOf(n)); setCompose(false); };
  const editNote = (n, text) => {
    const v = (text || "").trim(); if (!v) return;
    if (n.sec) { n.sec.journal = (n.sec.journal || []).map(x => x.id === n.id ? { ...x, text: v, editedAt: Date.now() } : x); jrForce(); }
    else if (n.plan && onPatchPlan) { onPatchPlan(n.plan.id, { notes: (n.plan.notes || []).map(x => x.id === n.id ? { ...x, text: v, editedAt: Date.now() } : x) }); }
  };
  const startCompose = () => { setCompose(true); setSelKey(null); };

  // rail stats
  const total = all.length;
  const bySubj = {};
  all.forEach(n => { const k = subjOf(n); bySubj[k] = bySubj[k] || { key: k, plan: n.plan, sec: n.sec, n: 0 }; bySubj[k].n++; });
  const topSubj = Object.values(bySubj).sort((a, b) => b.n - a.n).slice(0, 6);
  const subjPlans = Object.values(bySubj).filter(s => s.plan).sort((a, b) => b.n - a.n);
  const subjSecs = Object.values(bySubj).filter(s => s.sec && !s.plan).sort((a, b) => b.n - a.n);
  const mkSubjItem = (s) => ({
    value: s.key, label: (s.sec && !s.plan ? s.sec.name[lang] : s.plan.name[lang]),
    search: (s.sec && !s.plan ? s.sec.name[lang] + " " + s.sec.ticker : s.plan.name[lang] + " " + (s.plan.ticker || "")),
    icon: (s.sec && !s.plan) ? <Flag market={s.sec.market} size={15} /> : <span className="jr-chip-dot" style={{ background: pfColor(s.plan) }} />,
    right: s.n, on: s.key === scope,
  });
  const lastWhen = all.length ? all[0].when : null;

  const subjName = (n) => n.sec ? n.sec.name[lang] : n.plan.name[lang];
  const subjColor = (n) => n.sec ? "var(--fg-3)" : pfColor(n.plan);

  return (
    <div className="jr">
      {/* ── master: note list ── */}
      <div className="jr-master">
        <div className="jr-head">
          <span className="jr-h-title">{ko ? "일지" : "Journal"}</span>
          {total > 0 && <span className="jr-h-count">{total}</span>}
          <button className={"jr-h-new" + (compose ? " on" : "")} onClick={startCompose} title={ko ? "새 기록" : "New entry"}>
            <Lic name="pencil" size={13} cls="icon-sm" color="currentColor" />{ko ? "새 기록" : "Write"}
          </button>
        </div>

        {scope !== "all" && (() => {
          const isSecScope = String(scope).startsWith("sec:");
          const subj = isSecScope ? secsWithNotes.find(s => "sec:" + s.ticker === scope) : withNotes.find(p => p.id === scope);
          if (!subj) return null;
          return <div className="jr-filterbar">
            <span className="jr-filter-pill">
              <span className="jr-filter-lab">{ko ? "필터" : "Filter"}</span>
              {isSecScope ? <Flag market={subj.market} size={12} /> : <span className="jr-chip-dot" style={{ background: pfColor(subj) }} />}
              <span className="jr-filter-nm">{subj.name[lang]}</span>
              <button className="jr-filter-x" onClick={() => setScope("all")} title={ko ? "필터 해제" : "Clear filter"}><Lic name="x" size={12} color="currentColor" /></button>
            </span>
          </div>;
        })()}

        <div className="jr-search-row">
          <div className="jr-search">
            <Lic name="search" size={14} cls="icon-sm" color="var(--fg-4)" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={ko ? "메모 검색…" : "Search notes…"} />
          </div>
          <MiniDropdown width={240} align="right" searchable={ko ? "종목·플랜 검색…" : "Search…"} lang={lang}
            trigger={<span className={"jr-filter-trig" + (scope !== "all" ? " on" : "")}>
              <Lic name="list-filter" size={13} cls="icon-sm" color="currentColor" />
              <span className="jr-filter-trig-nm">{scope === "all" ? (ko ? "전체" : "All") : (() => { const s = topSubj.find(x => x.key === scope) || Object.values(bySubj).find(x => x.key === scope); return s ? (s.sec ? s.sec.name[lang] : s.plan.name[lang]) : (ko ? "전체" : "All"); })()}</span>
              <Lic name="chevron-down" size={11} cls="icon-sm" color="var(--fg-4)" />
            </span>}
            items={[
              { value: "all", label: ko ? "전체 기록" : "All entries", icon: <Lic name="layers" size={14} cls="icon-sm" color="var(--fg-4)" />, right: total, on: scope === "all" },
              ...(subjPlans.length ? [{ cap: ko ? "플랜" : "Plans" }, ...subjPlans.map(mkSubjItem)] : []),
              ...(subjSecs.length ? [{ cap: ko ? "종목" : "Securities" }, ...subjSecs.map(mkSubjItem)] : []),
            ]}
            onPick={(v) => setScope(v)} />
        </div>

        <div className="jr-items">
          {filtered.length === 0 ? (
            <div className="jr-empty">
              <Lic name="notebook-pen" size={24} color="var(--fg-4)" />
              <div className="jr-empty-h">{ko ? "아직 기록이 없습니다" : "No entries yet"}</div>
              <div className="jr-empty-sub">{ko ? "오른쪽에서 첫 기록을 남겨보세요." : "Write your first note on the right."}</div>
            </div>
          ) : groups.map((grp, gi) => (
            <div className="jr-daygrp" key={grp.key + gi}>
              <div className="jr-dayhead">{grp.label}<span className="jr-day-n">{grp.items.length}</span></div>
              {grp.items.map((n) => {
                const isSec = !!n.sec; const ctx = isSec ? null : ctxOf(n.plan); const active = !compose && keyOf(n) === selKey;
                return (
                  <div className={"jr-item" + (active ? " active" : "")} key={keyOf(n)} onClick={() => selectNote(n)}>
                    <div className="jr-item-body">
                      <div className="jr-item-head">
                        <span className="jr-tkr-chip">{isSec ? <Flag market={n.sec.market} size={12} /> : <span className="jr-chip-dot" style={{ background: subjColor(n) }} />}{subjName(n)}</span>
                        {ctx && <span className={"jr-ctx " + ctx.tone}>{(ctx.g >= 0 ? "+" : "") + ctx.g.toFixed(0)}%</span>}
                        <span className="jr-when">{wlab(n.when)}</span>
                      </div>
                      <div className="jr-item-text">{n.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {more > 0 && <button className="jr-more" onClick={() => setLimit(l => l + 80)}>{ko ? `더 보기 (${more}개 남음)` : `Show more (${more} left)`}</button>}
        </div>
      </div>

      {/* ── detail: compose OR note reader ── */}
      <div className="jr-detail">
        {compose ? (
          <div className="jr-compose-pane">
            <div className="jr-cp-head">
              <span className="jr-cp-title">{ko ? "새 기록" : "New entry"}</span>
              <div className="jr-cp-target">
                <span className="jr-cp-lab">{ko ? "기록할 대상" : "Log to"}</span>
                <MiniDropdown width={280} searchable={ko ? "플랜·종목 검색…" : "Search…"} lang={lang}
                  trigger={<span className="jr-plan-pick">{targetSec ? <React.Fragment><Flag market={targetSec.market} size={14} />{targetSec.name[lang]}</React.Fragment> : targetPlan ? <React.Fragment><span className="jr-chip-dot" style={{ background: pfColor(targetPlan) }} />{targetPlan.name[lang]}</React.Fragment> : (ko ? "대상 선택" : "Pick")}<Lic name="chevron-down" size={11} cls="icon-sm" color="var(--fg-4)" /></span>}
                  items={[
                    { cap: ko ? "플랜" : "Plans" },
                    ...(plans || []).map(p => ({ value: p.id, label: p.name[lang], search: p.name[lang] + " " + (p.ticker || "") + " " + (p.tickerName ? p.tickerName[lang] : ""), icon: <span className="jr-chip-dot" style={{ background: pfColor(p) }} />, on: p.id === targetId })),
                    { cap: ko ? "종목" : "Securities" },
                    ...SECS.map(s => ({ value: "sec:" + s.ticker, label: s.name[lang], search: s.name[lang] + " " + s.ticker + " " + s.name.en, icon: <Flag market={s.market} size={15} />, on: "sec:" + s.ticker === targetId })),
                  ]}
                  onPick={(v) => setComposeFor(v)} />
              </div>
            </div>
            <textarea className="jr-cp-input" autoFocus value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote(); }}
              placeholder={ko ? "오늘의 관찰·결정을 기록하세요…\n\n무엇을 봤고, 무엇을 결정했는지. (⌘/Ctrl+Enter로 저장)" : "Log today's observation or decision…\n\n(⌘/Ctrl+Enter to save)"} />
            <div className="jr-cp-foot">
              <span className="jr-cp-hint">{ko ? "⌘/Ctrl + Enter" : "⌘/Ctrl + Enter"}</span>
              <button className="v-btn v-btn--primary" disabled={!draft.trim()} onClick={addNote}>{ko ? "기록 저장" : "Save entry"}</button>
            </div>
          </div>
        ) : sel ? (
          <JournalReader n={sel} all={all} lang={lang} t={t} ctxOf={ctxOf} subjName={subjName} subjColor={subjColor} keyOf={keyOf} pfColor={pfColor} wlab={wlab}
            onSelect={selectNote} onEditNote={editNote} onOpen={onOpen} onOpenSecurity={onOpenSecurity} onCompose={(id) => { setComposeFor(id); startCompose(); }} />
        ) : (
          <div className="jr-pick">
            <Lic name="notebook-pen" size={26} cls="icon" color="var(--fg-4)" />
            <div className="jr-pick-t">{ko ? "기록을 선택하세요" : "Select an entry"}</div>
            <div className="jr-pick-s">{ko ? "왼쪽에서 기록을 고르거나, 새 기록을 작성하세요." : "Pick a note on the left, or write a new one."}</div>
          </div>
        )}
      </div>

      {/* ── rail: summary ── */}
      <aside className="jr-rail">
        {total === 0 ? (
          <div className="jr-rail-card jr-rail-empty">{ko ? "첫 기록을 남기면 여기에 요약이 쌓입니다." : "Write your first note and a summary builds here."}</div>
        ) : <React.Fragment>
          <div className="jr-rail-card">
            <div className="jr-rail-h">{ko ? "기록 요약" : "Journal summary"}</div>
            <div className="jr-rail-stats">
              <div className="jr-rail-stat"><span className="jr-rail-num">{total}</span><span className="jr-rail-lab">{ko ? "기록" : "entries"}</span></div>
              <div className="jr-rail-stat"><span className="jr-rail-num">{topSubj.length}</span><span className="jr-rail-lab">{ko ? "종목" : "subjects"}</span></div>
            </div>
            {lastWhen && <div className="jr-rail-last">{ko ? "마지막 기록 · " : "Last · "}{wlab(lastWhen)}</div>}
          </div>
          {topSubj.length > 0 && <div className="jr-rail-card">
            <div className="jr-rail-h">{ko ? "종목별 기록" : "By subject"}<span className="jr-rail-hint">{ko ? "클릭해 필터" : "click to filter"}</span></div>
            {topSubj.map(s => (
              <div className={"jr-rail-row" + (scope === s.key ? " on" : "")} key={s.key} onClick={() => setScope(scope === s.key ? "all" : s.key)}>
                {s.sec ? <Flag market={s.sec.market} size={13} /> : <span className="jr-chip-dot" style={{ background: pfColor(s.plan) }} />}
                <span className="jr-rail-nm">{s.sec ? s.sec.name[lang] : s.plan.name[lang]}</span>
                <span className="jr-rail-cnt">{s.n}</span>
              </div>
            ))}
          </div>}
        </React.Fragment>}
      </aside>
    </div>
  );
}

// Center reader — full note + subject context + same-subject timeline.
function JournalReader({ n, all, lang, t, ctxOf, subjName, subjColor, keyOf, pfColor, wlab, onSelect, onEditNote, onOpen, onOpenSecurity, onCompose }) {
  const ko = lang === "ko";
  const isSec = !!n.sec;
  const [editing, setEditing] = React.useState(false);
  const [editText, setEditText] = React.useState("");
  React.useEffect(() => { setEditing(false); }, [n.id, isSec]);
  const commitEdit = () => { onEditNote && onEditNote(n, editText); setEditing(false); };
  const p = isSec ? null : n.plan;
  const subjId = isSec ? "sec:" + n.sec.ticker : n.plan.id;
  const ctx = isSec ? null : ctxOf(n.plan);
  const siblings = all.filter(x => (x.sec ? "sec:" + x.sec.ticker : x.plan.id) === subjId);
  const ticker = isSec ? n.sec.ticker : (p && p.ticker);
  const cur = p ? p.cur : (n.sec && n.sec.market === "KR" ? "KRW" : "USD");
  const hasPos = p && p.totalShares > 0 && p.avgPrice != null;
  const hasScen = p && p.scenarios && p.scenarios.length >= 3;
  const ret = p ? planReturn(p) : null;
  const openSubj = () => isSec ? (onOpenSecurity && onOpenSecurity(n.sec.ticker)) : (onOpen && onOpen(n.plan));

  // "since this note" — price when written → now (journal-native, vs. the inbox's live next-signal)
  const curPrice = isSec ? (n.sec && n.sec.price) : (p && p.currentPrice);
  const scen = (p && p.scenarios) || [];
  const bear = scen.find(s => s.label && s.label.en === "Bear");
  const bull = scen.find(s => s.label && s.label.en === "Bull");
  const lo = bear ? bear.target : null, hi = bull ? bull.target : null;
  const wrote = jrWritePrice(n, curPrice, lo, hi);
  const sincePct = (wrote != null && curPrice) ? (curPrice - wrote) / wrote * 100 : null;

  return (
    <div className="jr-reader">
      <div className="jr-rd-head">
        <span className="jr-rd-subj">
          {isSec ? <Flag market={n.sec.market} size={16} /> : <span className="jr-chip-dot lg" style={{ background: subjColor(n) }} />}
          {subjName(n)}
        </span>
        {ctx && <span className={"jr-ctx " + ctx.tone}>{(ctx.g >= 0 ? "+" : "") + ctx.g.toFixed(0)}% {ctx.lab}</span>}
        <button className="jr-rd-open" onClick={openSubj}>{isSec ? (ko ? "종목 열기" : "Open security") : (ko ? "플랜 열기" : "Open plan")}<Lic name="arrow-up-right" size={13} cls="icon-sm" color="currentColor" /></button>
      </div>
      <div className="jr-rd-meta">
        {ticker && <span className="jr-rd-tk mono">{ticker}</span>}
        {ticker && <span className="jr-rd-sep">·</span>}
        {(() => { if (isSec || !p || typeof EXEC_STRATEGIES === "undefined") return null; const stg = EXEC_STRATEGIES.find(s => s.id === p.execId); if (!stg) return null; return <React.Fragment><span className="jr-rd-strat"><Lic name={stg.icon || "git-branch"} size={12} cls="icon-sm" color={stg.color} />{stg.name[lang]}</span><span className="jr-rd-sep">·</span></React.Fragment>; })()}
        <span className="jr-rd-when">{wlab(n.when)}{n.editedAt && <span className="note-edited">{ko ? " · 수정됨" : " · edited"}</span>}</span>
        {!editing && <button className="jr-rd-edit" title={ko ? "수정" : "Edit"} onClick={() => { setEditText(n.text); setEditing(true); }}><Lic name="pencil" size={12} cls="icon-sm" color="currentColor" />{ko ? "수정" : "Edit"}</button>}
      </div>

      {editing
        ? <div className="jr-rd-editbox">
            <textarea className="note-input" autoFocus rows="4" value={editText} onChange={e => setEditText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commitEdit(); if (e.key === "Escape") setEditing(false); }} />
            <div className="note-edit-acts">
              <button className="note-cancel" onClick={() => setEditing(false)}>{ko ? "취소" : "Cancel"}</button>
              <button className="v-btn v-btn--primary note-save" onClick={commitEdit}>{ko ? "저장" : "Save"}</button>
            </div>
          </div>
        : <div className="jr-rd-note">{n.text}</div>}

      {sincePct != null && <div className="jr-rd-since">
        <div className="jr-rd-since-track">
          <span className="jr-rd-since-cell">
            <span className="jr-rd-since-lab">{ko ? "기록 시점" : "At writing"}</span>
            <span className="jr-rd-since-val mono">{fmtCompact(wrote, cur)}</span>
            <span className="jr-since-tip"><b>{wlab(n.when)}</b> {ko ? "작성 당시 가격" : "price when written"}</span>
          </span>
          <span className="jr-rd-since-arrow"><Lic name="arrow-right" size={15} cls="icon-sm" color="var(--fg-4)" /></span>
          <span className="jr-rd-since-cell">
            <span className="jr-rd-since-lab">{ko ? "현재" : "Now"}</span>
            <span className="jr-rd-since-val mono">{fmtCompact(curPrice, cur)}</span>
            <span className="jr-since-tip">{ko ? "기록 이후" : "Since note"} <b>{(curPrice - wrote >= 0 ? "+" : "−") + fmtCompact(Math.abs(curPrice - wrote), cur)}</b></span>
          </span>
          <span className={"jr-rd-since-pct " + (sincePct >= 0 ? "pos" : "neg")}>
            <Lic name={sincePct >= 0 ? "trending-up" : "trending-down"} size={13} cls="icon-sm" color="currentColor" />
            {(sincePct >= 0 ? "+" : "") + sincePct.toFixed(1)}%
          </span>
        </div>
      </div>}

      {(hasScen || hasPos) && <div className="jr-rd-ctxblock">
        {hasScen && <div className="jr-rd-gauge">
          <div className="jr-rd-cap">{ko ? "시나리오 범위" : "Scenario range"}</div>
          <ScenarioGauge plan={p} lang={lang} />
        </div>}
        {hasPos && (() => {
          const evalAmt = p.currentPrice * p.totalShares;
          const tone = ret && ret.rate >= 0 ? "pos" : "neg";
          return (
            <div className={"jr-rd-poscard " + tone}>
              <div className="jr-rd-poscard-top">
                <div className="jr-rd-poscard-head">
                  <span className="jr-rd-poscard-cap">{ko ? "포지션" : "Position"}</span>
                  <span className="jr-rd-poscard-sub mono">{(p.totalShares || 0).toLocaleString("en-US")}{ko ? "주" : " sh"}</span>
                </div>
                <div className="jr-rd-poscard-pl">
                  <span className={"jr-rd-poscard-rate " + tone}>{!ret ? "—" : (ret.rate >= 0 ? "+" : "") + ret.rate.toFixed(1) + "%"}</span>
                  <span className={"jr-rd-poscard-amt mono " + tone}>{!ret ? "" : (ret.amt >= 0 ? "+" : "−") + fmtCompact(Math.abs(ret.amt), cur)}</span>
                </div>
              </div>
              <div className="jr-rd-poscard-stats">
                <div className="jr-rd-poscell"><span className="jr-rd-poslab">{ko ? "평단" : "Avg"}</span><span className="jr-rd-posval mono">{fmtCompact(p.avgPrice, cur)}</span></div>
                <div className="jr-rd-poscell"><span className="jr-rd-poslab">{ko ? "현재가" : "Price"}</span><span className="jr-rd-posval mono">{fmtCompact(p.currentPrice, cur)}</span></div>
                <div className="jr-rd-poscell"><span className="jr-rd-poslab">{ko ? "평가액" : "Value"}</span><span className="jr-rd-posval mono">{fmtCompact(evalAmt, cur)}</span></div>
                <div className="jr-rd-poscell"><span className="jr-rd-poslab">{ko ? "투자금" : "Cost"}</span><span className="jr-rd-posval mono">{fmtCompact(p.totalInvested, cur)}</span></div>
              </div>
            </div>
          );
        })()}
      </div>}

      {siblings.length > 1 && <div className="jr-rd-thread">
        <div className="jr-rd-cap">{ko ? `이 종목의 다른 기록 ${siblings.length - 1}` : `Other entries · ${siblings.length - 1}`}</div>
        <div className="jr-rd-thread-list">
          {siblings.filter(x => keyOf(x) !== keyOf(n)).slice(0, 8).map(x => {
            const xw = jrWritePrice(x, curPrice, lo, hi);
            return (
              <div className="jr-rd-titem" key={keyOf(x)} onClick={() => onSelect(x)}>
                <span className="jr-rd-twhen mono">{wlab(x.when)}</span>
                {xw != null && <span className="jr-rd-tprice mono">{fmtCompact(xw, cur)}</span>}
                <span className="jr-rd-ttext">{x.text}</span>
              </div>
            );
          })}
        </div>
      </div>}

      <button className="jr-rd-addmore" onClick={() => onCompose(subjId)}>
        <Lic name="plus" size={13} cls="icon-sm" color="currentColor" />{ko ? "이 종목에 기록 추가" : "Add entry for this subject"}
      </button>
    </div>
  );
}
