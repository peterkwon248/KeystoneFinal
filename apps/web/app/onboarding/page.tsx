// source/Auth.jsx Onboarding 이식 — finish()의 localStorage 스텁을
// profiles upsert + portfolios INSERT(+선택 첫 plan)로 교체 (DATA_MODEL §9).
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Lic, Flag } from "@/components/icons";

const STEPS = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [lang] = useState<"ko" | "en">("ko");
  const ko = lang === "ko";
  const [step, setStep] = useState(0);
  const [cur, setCur] = useState("native"); // native | KRW | USD
  const [markets, setMarkets] = useState<string[]>(["KR", "US"]);
  const [pfName, setPfName] = useState(ko ? "내 포트폴리오" : "My portfolio");
  const [firstTicker, setFirstTicker] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // 비로그인 접근 가드
  useEffect(() => {
    supabaseBrowser().auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
    });
  }, [router]);

  const toggleMarket = (m: string) =>
    setMarkets((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    setErr("");
    const supabase = supabaseBrowser();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const name = pfName.trim() || (ko ? "내 포트폴리오" : "My portfolio");

      // 1) 프로필 (온보딩 답 = 유저의 첫 데이터, prefs로 영속)
      const { error: pErr } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email ?? "",
        provider: "email",
        email_verified: !!user.email_confirmed_at,
        prefs: { lang, theme: "dark", displayCurrency: cur === "native" ? null : cur, markets },
        onboarded: true,
      });
      if (pErr) throw pErr;

      // 2) 첫 포트폴리오
      const { data: pf, error: pfErr } = await supabase
        .from("portfolios")
        .insert({ user_id: user.id, name, base_currency: cur === "USD" ? "USD" : "KRW" })
        .select("id")
        .single();
      if (pfErr) throw pfErr;

      // 3) 첫 플랜 (선택) — securities에 있는 티커만
      const t = firstTicker.trim().toUpperCase();
      if (t) {
        const { data: sec } = await supabase
          .from("securities").select("ticker, name, currency").eq("ticker", t).maybeSingle();
        if (sec) {
          const nm = sec.name as { en: string; ko: string };
          await supabase.from("plans").insert({
            user_id: user.id,
            portfolio_id: pf.id,
            ticker: sec.ticker,
            currency: sec.currency,
            name: { en: `${nm.en} plan`, ko: `${nm.ko} 플랜` },
            status: "research",
            human_id: "PLN-001",
          });
        }
      }
      router.push("/");
      router.refresh();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : String(ex));
      setBusy(false);
    }
  };

  const next = () => (step < STEPS - 1 ? setStep(step + 1) : void finish());
  const back = () => setStep(Math.max(0, step - 1));

  const curOpts = [
    { v: "native", t: { ko: "종목 통화 그대로", en: "Native currency" }, d: { ko: "한국주는 ₩, 미국주는 $", en: "₩ for KR, $ for US" }, ic: "₩/$" },
    { v: "KRW", t: { ko: "원화로 통일", en: "Korean won" }, d: { ko: "모든 평가액을 ₩로", en: "Everything in ₩" }, ic: "₩" },
    { v: "USD", t: { ko: "달러로 통일", en: "US dollar" }, d: { ko: "모든 평가액을 $로", en: "Everything in $" }, ic: "$" },
  ];
  const mktOpts = [
    { v: "KR" as const, t: { ko: "국내 주식", en: "Korea" }, d: { ko: "KOSPI · KOSDAQ", en: "KOSPI · KOSDAQ" } },
    { v: "US" as const, t: { ko: "미국 주식", en: "US" }, d: { ko: "NYSE · NASDAQ", en: "NYSE · NASDAQ" } },
  ];

  const canNext = step === 0 ? !!cur && markets.length > 0 : step === 1 ? pfName.trim().length > 0 : true;

  return (
    <div className="ob-root">
      <div className="ob-card">
        <div className="ob-dots">
          {Array.from({ length: STEPS }).map((_, i) => (
            <span key={i} className={"ob-dot" + (i === step ? " on" : i < step ? " done" : "")} />
          ))}
        </div>

        {step === 0 && <>
          <div className="ob-step-n">{ko ? "1단계 / 3" : "Step 1 / 3"}</div>
          <div className="ob-h">{ko ? "기본 설정" : "The basics"}</div>
          <div className="ob-sub">{ko ? "표시 통화와 관심 시장을 골라주세요. 나중에 언제든 바꿀 수 있어요." : "Pick your display currency and markets. You can change these anytime."}</div>
          <div className="ob-opts">
            {curOpts.map((o) => (
              <button key={o.v} className={"ob-opt" + (cur === o.v ? " on" : "")} onClick={() => setCur(o.v)}>
                <span className="ob-opt-ic mono">{o.ic}</span>
                <span className="ob-opt-tx"><span className="ob-opt-t">{o.t[lang]}</span><span className="ob-opt-d">{o.d[lang]}</span></span>
                <span className="ob-opt-check"><Lic name="check" size={17} cls="icon-sm" color="currentColor" /></span>
              </button>
            ))}
          </div>
          <div className="ob-sub" style={{ margin: "22px 0 10px", fontSize: 13 }}>{ko ? "어떤 시장을 보시나요? (복수 선택)" : "Which markets? (multiple)"}</div>
          <div className="ob-opts row">
            {mktOpts.map((o) => (
              <button key={o.v} className={"ob-opt" + (markets.includes(o.v) ? " on" : "")} onClick={() => toggleMarket(o.v)}>
                <span className="ob-opt-ic"><Flag market={o.v} size={16} /></span>
                <span className="ob-opt-tx"><span className="ob-opt-t">{o.t[lang]}</span><span className="ob-opt-d">{o.d[lang]}</span></span>
                <span className="ob-opt-check"><Lic name="check" size={17} cls="icon-sm" color="currentColor" /></span>
              </button>
            ))}
          </div>
        </>}

        {step === 1 && <>
          <div className="ob-step-n">{ko ? "2단계 / 3" : "Step 2 / 3"}</div>
          <div className="ob-h">{ko ? "첫 포트폴리오" : "Your first portfolio"}</div>
          <div className="ob-sub">{ko ? "플랜을 묶을 포트폴리오 이름을 정해주세요. 예: 장기 성장주, 배당, 단기 트레이딩." : "Name a portfolio to group your plans — e.g. Long-term growth, Dividends, Swing."}</div>
          <input className="ob-input" autoFocus value={pfName} onChange={(e) => setPfName(e.target.value)}
            placeholder={ko ? "포트폴리오 이름" : "Portfolio name"}
            onKeyDown={(e) => { if (e.key === "Enter" && canNext) next(); }} />
        </>}

        {step === 2 && <>
          <div className="ob-step-n">{ko ? "3단계 / 3" : "Step 3 / 3"}</div>
          <div className="ob-h">{ko ? "첫 플랜 (선택)" : "First plan (optional)"}</div>
          <div className="ob-sub">{ko ? "관심 종목 코드나 티커를 입력하면 첫 플랜을 만들어둘게요. 건너뛰고 나중에 만들어도 돼요." : "Enter a ticker to seed your first plan. You can skip and add one later."}</div>
          <input className="ob-input" autoFocus value={firstTicker} onChange={(e) => setFirstTicker(e.target.value)}
            placeholder={ko ? "예: 005930, AAPL" : "e.g. 005930, AAPL"}
            onKeyDown={(e) => { if (e.key === "Enter") void finish(); }} />
        </>}

        {err && <div className="auth-err" style={{ marginTop: 12 }}>{err}</div>}

        <div className="ob-nav">
          {step > 0 && <button className="ob-back" onClick={back}><Lic name="chevron-left" size={14} cls="icon-sm" color="currentColor" />{ko ? "이전" : "Back"}</button>}
          <span className="ob-spacer" />
          {step === STEPS - 1 && <button className="ob-skip" onClick={() => void finish()} disabled={busy}>{ko ? "건너뛰기" : "Skip"}</button>}
          <button className="ob-next" disabled={!canNext || busy} onClick={next}>
            {busy ? (ko ? "저장 중…" : "Saving…") : step === STEPS - 1 ? (ko ? "시작하기" : "Get started") : (ko ? "다음" : "Next")}
          </button>
        </div>
      </div>
    </div>
  );
}
