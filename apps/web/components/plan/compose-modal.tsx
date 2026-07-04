// source/App.jsx:123-205 ComposeModal 이식 — 단일 모달 플랜 생성.
// 필드: 이름(필수) + 종목(인라인 검색+자동완성) + 메모(→Base 근거) + 상태/포트폴리오/관점 드롭다운 + "더보기"(만들고 계속).
// 데이터(securities/portfolios)는 SearchModal 패턴대로 클라이언트 자체 페치 → 어느 진입점이든 <ComposeModal/> 하나로 재사용.
// ⚠ 웹 적응: 실 종목만(미등록 티커 mock 제거) — matchedSec 없으면 생성 불가. 관점=strategyId(전략execId은 프로토타입 compose에 없음).
// ⚠ SWC 함정: JSX 안 제네릭 캐스트 없음.
"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Lang, PlanStatus } from "@keystone/core/types";
import { I18N } from "@keystone/core/i18n";
import { STATUS_ORDER, EXEC_STRATEGIES } from "@keystone/core/reference";
import { fmtMoney } from "@keystone/core/format";
import { KeystoneLogo, Flag, Lic, StatusIcon } from "@/components/icons";
import { usePrefs } from "@/components/shell/prefs";
import { supabaseBrowser } from "@/lib/supabase/client";
import { fetchAllSecurities } from "@/lib/securities-list";
import { pfColor, type PfLite } from "@/lib/pf-palette";
import type { UISecurity } from "@/lib/security-mapper";
import { MiniDropdown, type MdItem } from "./mini-dropdown";
import { createPlan, createPortfolio } from "@/app/(shell)/plans/actions";

export function ComposeModal({ userId = null, initialTicker, initialStatus, initialPfId, onClose }: {
  userId?: string | null;
  initialTicker?: string | null;
  initialStatus?: PlanStatus;
  initialPfId?: string | null;
  onClose: () => void;
}) {
  const { lang }: { lang: Lang } = usePrefs();
  const t = I18N[lang];
  const router = useRouter();

  const [securities, setSecurities] = useState<UISecurity[]>([]);
  const [portfolios, setPortfolios] = useState<PfLite[]>([]);
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState(initialTicker ?? "");
  const [memo, setMemo] = useState("");
  const [st, setSt] = useState<PlanStatus>(initialStatus ?? "research");
  const [pfId, setPfId] = useState<string | null>(initialPfId ?? null);
  const [execId, setExecId] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [tickFocus, setTickFocus] = useState(false);
  const [saving, startSaving] = useTransition();

  // 데이터 자체 페치(SearchModal 패턴). portfolios는 sort순 pfColor.
  useEffect(() => {
    const supabase = supabaseBrowser();
    let alive = true;
    (async () => {
      const [secs, { data: pfRows }] = await Promise.all([
        fetchAllSecurities(supabase, userId),
        supabase.from("portfolios").select("id, name, sort").order("sort"),
      ]);
      if (!alive) return;
      setSecurities(secs);
      setPortfolios((pfRows ?? []).map((p, i) => ({ id: p.id, name: p.name, color: pfColor(i) })));
    })();
    return () => { alive = false; };
  }, [userId]);

  const pf = portfolios.find((p) => p.id === pfId);
  const ex = execId ? EXEC_STRATEGIES.find((s) => s.id === execId) : null;
  const tq = ticker.trim(), tql = tq.toLowerCase(), tqu = tq.toUpperCase();
  const matchedSec = tq ? securities.find((s) => s.ticker.toUpperCase() === tqu) ?? null : null;
  const sugs = useMemo(() => (tq && !matchedSec
    ? securities.filter((s) => s.ticker.toLowerCase().includes(tql) || s.name.en.toLowerCase().includes(tql) || s.name.ko.includes(tq)).slice(0, 5)
    : []), [tq, tql, matchedSec, securities]);
  const defaultSugs = useMemo(() => securities.slice(0, 6), [securities]);
  const sugList = tq ? sugs : defaultSugs;
  const showSug = tickFocus && !matchedSec && sugList.length > 0;
  const canSubmit = !!name.trim() && !!matchedSec && !saving;

  const submit = () => {
    if (!name.trim() || !matchedSec) return;
    startSaving(async () => {
      const dbId = await createPlan({
        name, ticker: matchedSec.ticker, memo, status: st, portfolioId: pfId, execId,
      });
      if (more) { setName(""); setTicker(""); setMemo(""); router.refresh(); }
      else { onClose(); router.push(`/plans/${dbId}`); }
    });
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-crumb">
            <span className="crumb-badge"><KeystoneLogo size={12} /></span>
            <span className="crumb-team">Keystone</span>
            <span className="crumb-sep"><Lic name="chevron-right" size={13} cls="icon-sm" /></span>
            <span className="crumb-new">{t.newPlan}</span>
          </div>
          <div className="mh-actions">
            <button className="iconbtn" onClick={onClose}><Lic name="x" size={16} /></button>
          </div>
        </div>
        <div className="modal-body">
          <input autoFocus className="title-input" placeholder={t.planName} value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
          <div className="compose-ticker-wrap">
            <Lic name="search" size={14} cls="icon-sm" color="var(--fg-4)" />
            <input className="compose-ticker" placeholder={lang === "ko" ? "종목 코드 또는 이름 검색 (예: 삼성, AAPL)" : "Search ticker or name (e.g. Samsung, AAPL)"}
              value={ticker} onChange={(e) => setTicker(e.target.value)}
              onFocus={() => setTickFocus(true)} onBlur={() => setTimeout(() => setTickFocus(false), 150)}
              onKeyDown={(e) => { if (e.key === "Enter") { if (sugList.length && !matchedSec) setTicker(sugList[0].ticker); else submit(); } }} />
          </div>
          {showSug && <div className="compose-sug">
            {!tq && <div className="compose-sug-cap">{lang === "ko" ? "내 종목" : "Your securities"}</div>}
            {sugList.map((sg) => (
              <div className="compose-sug-row" key={sg.ticker} onMouseDown={() => { setTicker(sg.ticker); setTickFocus(false); }}>
                <Flag market={sg.market} size={14} /><span className="compose-sug-name">{sg.name[lang]}</span>
                <span className="mono compose-sug-tk">{sg.ticker}</span>
                <span className="mono compose-sug-px">{fmtMoney(sg.price, sg.cur)}</span>
              </div>
            ))}
          </div>}
          {matchedSec && <div className="compose-sec-hint"><Lic name="check" size={12} cls="icon-sm" color="var(--pos)" /><Flag market={matchedSec.market} size={12} /> {matchedSec.name[lang]} · <span className="mono">{fmtMoney(matchedSec.price, matchedSec.cur)}</span></div>}
          <textarea className="modal-desc-input" placeholder={t.memoPh} value={memo} onChange={(e) => setMemo(e.target.value)}></textarea>
        </div>
        <div className="modal-props">
          <MiniDropdown trigger={<span className="v-chip"><StatusIcon status={st} size={14} />{t["s_" + st]}</span>}
            items={STATUS_ORDER.map((k): MdItem => ({ value: k, label: t["s_" + k], icon: <StatusIcon status={k} size={14} />, on: st === k }))} onPick={(v) => v && setSt(v as PlanStatus)} />
          <MiniDropdown width={200}
            trigger={<span className="v-chip"><span className="pf-dot" style={{ background: pf ? pf.color : "var(--fg-4)" }} />{pf ? pf.name : t.portfolio}</span>}
            items={[{ value: null, label: t.noPortfolio, icon: <span className="pf-dot" style={{ background: "var(--fg-4)" }} />, on: !pfId } as MdItem]
              .concat(portfolios.map((p): MdItem => ({ value: p.id, label: p.name, icon: <span className="pf-dot" style={{ background: p.color }} />, on: pfId === p.id })))}
            onPick={(v) => setPfId(v ?? null)}
            onCreate={(nm) => { void createPortfolio(nm).then((np) => { setPortfolios((prev) => [...prev, { id: np.id, name: np.name, color: pfColor(prev.length) }]); setPfId(np.id); }); }}
            createLabel={t.newPortfolio} />
          <MiniDropdown width={200}
            trigger={ex
              ? <span className="v-chip"><span className="strat-dot" style={{ background: ex.color }} />{ex.name[lang]}</span>
              : <span className="v-chip"><span className="strat-dot" style={{ background: "var(--fg-4)" }} />{t.strategy}</span>}
            items={[{ value: null, label: t.noStrategy, icon: <span className="strat-dot" style={{ background: "var(--fg-4)" }} />, on: !execId } as MdItem]
              .concat(EXEC_STRATEGIES.map((s): MdItem => ({ value: s.id, label: s.name[lang], icon: <span className="strat-dot" style={{ background: s.color }} />, on: execId === s.id })))}
            onPick={(v) => setExecId(v ?? null)} />
        </div>
        <div className="modal-foot">
          <div className="ff">
            <span className={"toggle-inline" + (more ? " on" : "")} onClick={() => setMore((m) => !m)}><span className="switch"></span>{t.composeMore}</span>
            <button className="v-btn v-btn--primary" onClick={submit} disabled={!canSubmit}>{t.createPlan}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
