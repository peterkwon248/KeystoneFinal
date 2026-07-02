// Auth.jsx — login / signup / onboarding gate + soft email-verify banner + first-run coach marks.
//
// PRODUCTION WIRING (prototype uses localStorage stubs):
//  - Social buttons: replace onSocial() with the real OAuth redirect (Google/Apple/Kakao/Naver).
//    Social providers pre-verify email, so no email-verification step is needed for them.
//  - Email signup/login: replace onEmailSubmit() with a real auth call (Supabase/Firebase/Clerk…).
//    Current trend = let the user in immediately and verify email "softly" via an in-app banner,
//    not a hard code-gate at signup. We follow that here (session.needsVerify drives the banner).
//  - Onboarding answers (currency / markets / portfolio name / first plan) are the user's FIRST data —
//    they map straight onto the app's models (dispCur, portfolioId, plan). Persist them server-side.
//
// Session shape (localStorage "keystone-auth-v1"):
//   { email, provider, onboarded:boolean, needsVerify:boolean }

const AUTH_KEY = "keystone-auth-v1";
const OB_KEY = "keystone-onboard-v1";
const COACH_KEY = "keystone-coach-done-v1";

function loadAuth() { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch (e) { return null; } }
function saveAuth(s) { try { localStorage.setItem(AUTH_KEY, JSON.stringify(s)); } catch (e) {} }
function clearAuth() { try { localStorage.removeItem(AUTH_KEY); } catch (e) {} }

/* ---- brand glyphs (inline so they survive offline) ---- */
function SocialIcon({ kind }) {
  if (kind === "google") return (
    <svg width="17" height="17" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.63z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.02-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
  );
  if (kind === "apple") return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M11.18 8.5c-.02-1.7 1.39-2.52 1.45-2.56-.79-1.16-2.02-1.32-2.46-1.34-1.05-.1-2.04.61-2.57.61-.53 0-1.35-.6-2.22-.58-1.14.02-2.2.66-2.78 1.69-1.19 2.06-.3 5.1.85 6.77.57.82 1.24 1.73 2.12 1.7.85-.04 1.17-.55 2.2-.55s1.31.55 2.2.53c.91-.02 1.49-.83 2.04-1.65.65-.95.91-1.86.93-1.91-.02-.01-1.78-.68-1.8-2.71-.02-.01-.61-.01-.63-.01zM9.6 3.5c.47-.57.78-1.36.7-2.15-.67.03-1.49.45-1.97 1.01-.43.5-.81 1.31-.71 2.08.75.06 1.51-.38 1.98-.94z"/></svg>
  );
  if (kind === "kakao") return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="#191600"><path d="M9 1.5C4.86 1.5 1.5 4.13 1.5 7.38c0 2.1 1.4 3.94 3.5 4.98-.15.55-.56 2.02-.64 2.33-.1.39.14.38.3.28.13-.08 2.04-1.39 2.87-1.95.32.04.64.06.97.06 4.14 0 7.5-2.63 7.5-5.88S13.14 1.5 9 1.5z"/></svg>
  );
  if (kind === "naver") return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="#fff"><path d="M10.6 8.45 5.2 1H1v14h4.4V7.55L10.8 15H15V1h-4.4v7.45z"/></svg>
  );
  return null;
}

const SOCIALS = [
  { kind: "google", cls: "asb-google", label: { ko: "Google로 계속하기", en: "Continue with Google" } },
  { kind: "apple", cls: "asb-apple", label: { ko: "Apple로 계속하기", en: "Continue with Apple" } },
  { kind: "kakao", cls: "asb-kakao", label: { ko: "카카오로 계속하기", en: "Continue with Kakao" } },
  { kind: "naver", cls: "asb-naver", label: { ko: "네이버로 계속하기", en: "Continue with Naver" } },
];

/* ============================ Login / Signup ============================ */
function LoginScreen({ lang, theme, toggleTheme, toggleLang, onAuthed }) {
  const ko = lang === "ko";
  const [mode, setMode] = React.useState("signup"); // signup | login
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [err, setErr] = React.useState("");

  // PROD: kick off OAuth redirect for `kind`. Social providers pre-verify email.
  const onSocial = (kind) => {
    onAuthed({ email: null, provider: kind, onboarded: false, needsVerify: false });
  };
  const onEmailSubmit = () => {
    const e = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setErr(ko ? "올바른 이메일을 입력하세요" : "Enter a valid email"); return; }
    if (pw.length < 6) { setErr(ko ? "비밀번호는 6자 이상" : "Password must be 6+ characters"); return; }
    setErr("");
    if (mode === "signup") {
      // PROD: create account → send verification email → let the user in (soft verify via banner)
      onAuthed({ email: e, provider: "email", onboarded: false, needsVerify: true });
    } else {
      // PROD: sign in → returning user, skip onboarding
      onAuthed({ email: e, provider: "email", onboarded: true, needsVerify: false });
    }
  };

  const Logo = window.KeystoneLogo || (() => null);
  return (
    <div className="auth-root">
      <div className="auth-topbar">
        <button className="auth-tb-btn" onClick={toggleLang}><Lic name="languages" size={13} cls="icon-sm" color="currentColor" />{ko ? "한" : "EN"}</button>
        <button className="auth-tb-btn" onClick={toggleTheme}><Lic name={theme === "dark" ? "sun" : "moon"} size={13} cls="icon-sm" color="currentColor" /></button>
      </div>

      <div className="auth-left">
        <div className="auth-brand"><Logo size={24} />Keystone</div>
        <div className="auth-pitch">
          <div className="auth-pitch-h">{ko ? "원칙대로 투자하고,\n기록으로 복기하세요." : "Invest by your rules.\nReview by your record."}</div>
          <div className="auth-pitch-sub">{ko ? "시나리오·전략·체결을 한 곳에서. 가격이 아니라 당신의 판단을 추적하는 투자 워크스페이스." : "Scenarios, strategy, and fills in one place — a workspace that tracks your judgment, not just the price."}</div>
          <div className="auth-pitch-list">
            {[
              { ic: "target", ko: "하단·중간·상단 시나리오로 목표가를 세우고 괴리를 추적", en: "Set bear/base/bull targets and track the gap" },
              { ic: "git-branch", ko: "무한매수법·그리드·모멘텀 등 전략별 다음 신호", en: "Per-strategy next signal — DCA, grid, momentum" },
              { ic: "notebook-pen", ko: "결정을 일지로 남기고 '그때의 나'를 복기", en: "Journal each decision and review your past self" },
            ].map((f, i) => (
              <div className="auth-pitch-item" key={i}>
                <span className="auth-pitch-ic"><Lic name={f.ic} size={14} cls="icon-sm" color="currentColor" /></span>
                {ko ? f.ko : f.en}
              </div>
            ))}
          </div>
        </div>
        <div className="auth-foot">© 2026 Keystone · {ko ? "투자 트래킹 워크스페이스" : "Investment tracking workspace"}</div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-h">{mode === "signup" ? (ko ? "계정 만들기" : "Create account") : (ko ? "다시 오셨네요" : "Welcome back")}</div>
          <div className="auth-sub">{mode === "signup" ? (ko ? "30초면 시작할 수 있어요." : "Start in about 30 seconds.") : (ko ? "계속하려면 로그인하세요." : "Sign in to continue.")}</div>

          <div className="auth-social">
            {SOCIALS.map(s => (
              <button key={s.kind} className={"auth-social-btn " + s.cls} onClick={() => onSocial(s.kind)}>
                <span className="asb-ic"><SocialIcon kind={s.kind} /></span>{s.label[lang]}
              </button>
            ))}
          </div>

          <div className="auth-divider">{ko ? "또는 이메일로" : "or with email"}</div>

          <div className="auth-field">
            <span className="auth-label">{ko ? "이메일" : "Email"}</span>
            <input className="auth-input" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => { if (e.key === "Enter") onEmailSubmit(); }} />
          </div>
          <div className="auth-field">
            <span className="auth-label">{ko ? "비밀번호" : "Password"}</span>
            <input className="auth-input" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder={ko ? "6자 이상" : "6+ characters"} value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => { if (e.key === "Enter") onEmailSubmit(); }} />
          </div>
          {err && <div className="auth-err">{err}</div>}
          <button className="auth-primary" onClick={onEmailSubmit}>{mode === "signup" ? (ko ? "이메일로 시작하기" : "Sign up with email") : (ko ? "로그인" : "Sign in")}</button>

          <div className="auth-switch">
            {mode === "signup"
              ? <>{ko ? "이미 계정이 있나요?" : "Already have an account?"} <button onClick={() => { setMode("login"); setErr(""); }}>{ko ? "로그인" : "Sign in"}</button></>
              : <>{ko ? "처음이신가요?" : "New here?"} <button onClick={() => { setMode("signup"); setErr(""); }}>{ko ? "계정 만들기" : "Create account"}</button></>}
          </div>
          {mode === "signup" && <div className="auth-legal">{ko ? "가입하면 서비스 약관과 개인정보 처리방침에 동의하는 것으로 간주됩니다." : "By signing up you agree to the Terms and Privacy Policy."}</div>}
        </div>
      </div>
    </div>
  );
}

/* ============================ Onboarding (3 steps) ============================ */
function Onboarding({ lang, session, onComplete }) {
  const ko = lang === "ko";
  const [step, setStep] = React.useState(0);
  const [cur, setCur] = React.useState("native");      // ₩/$ display
  const [markets, setMarkets] = React.useState(["KR", "US"]); // watched markets
  const [pfName, setPfName] = React.useState(ko ? "내 포트폴리오" : "My portfolio");
  const [firstTicker, setFirstTicker] = React.useState("");

  const toggleMarket = (m) => setMarkets(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  const finish = () => {
    // PROD: persist these as the user's first real records (preferences + portfolio + optional plan).
    const prefs = { cur, markets, pfName: pfName.trim() || (ko ? "내 포트폴리오" : "My portfolio"), firstTicker: firstTicker.trim() };
    try { localStorage.setItem(OB_KEY, JSON.stringify(prefs)); } catch (e) {}
    onComplete(prefs);
  };

  const STEPS = 3;
  const next = () => step < STEPS - 1 ? setStep(step + 1) : finish();
  const back = () => setStep(Math.max(0, step - 1));

  const curOpts = [
    { v: "native", t: { ko: "종목 통화 그대로", en: "Native currency" }, d: { ko: "한국주는 ₩, 미국주는 $", en: "₩ for KR, $ for US" }, ic: "₩/$" },
    { v: "KRW", t: { ko: "원화로 통일", en: "Korean won" }, d: { ko: "모든 평가액을 ₩로", en: "Everything in ₩" }, ic: "₩" },
    { v: "USD", t: { ko: "달러로 통일", en: "US dollar" }, d: { ko: "모든 평가액을 $로", en: "Everything in $" }, ic: "$" },
  ];
  const mktOpts = [
    { v: "KR", t: { ko: "국내 주식", en: "Korea" }, d: { ko: "KOSPI · KOSDAQ", en: "KOSPI · KOSDAQ" } },
    { v: "US", t: { ko: "미국 주식", en: "US" }, d: { ko: "NYSE · NASDAQ", en: "NYSE · NASDAQ" } },
  ];

  const canNext = step === 0 ? !!cur && markets.length > 0 : step === 1 ? pfName.trim().length > 0 : true;

  return (
    <div className="ob-root">
      <div className="ob-card">
        <div className="ob-dots">
          {Array.from({ length: STEPS }).map((_, i) => <span key={i} className={"ob-dot" + (i === step ? " on" : i < step ? " done" : "")} />)}
        </div>

        {step === 0 && <>
          <div className="ob-step-n">{ko ? "1단계 / 3" : "Step 1 / 3"}</div>
          <div className="ob-h">{ko ? "기본 설정" : "The basics"}</div>
          <div className="ob-sub">{ko ? "표시 통화와 관심 시장을 골라주세요. 나중에 언제든 바꿀 수 있어요." : "Pick your display currency and markets. You can change these anytime."}</div>
          <div className="ob-opts">
            {curOpts.map(o => (
              <button key={o.v} className={"ob-opt" + (cur === o.v ? " on" : "")} onClick={() => setCur(o.v)}>
                <span className="ob-opt-ic mono">{o.ic}</span>
                <span className="ob-opt-tx"><span className="ob-opt-t">{o.t[lang]}</span><span className="ob-opt-d">{o.d[lang]}</span></span>
                <span className="ob-opt-check"><Lic name="check" size={17} cls="icon-sm" color="currentColor" /></span>
              </button>
            ))}
          </div>
          <div className="ob-sub" style={{ margin: "22px 0 10px", fontSize: 13 }}>{ko ? "어떤 시장을 보시나요? (복수 선택)" : "Which markets? (multiple)"}</div>
          <div className="ob-opts row">
            {mktOpts.map(o => (
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
          <input className="ob-input" autoFocus value={pfName} onChange={e => setPfName(e.target.value)} placeholder={ko ? "포트폴리오 이름" : "Portfolio name"} onKeyDown={e => { if (e.key === "Enter" && canNext) next(); }} />
        </>}

        {step === 2 && <>
          <div className="ob-step-n">{ko ? "3단계 / 3" : "Step 3 / 3"}</div>
          <div className="ob-h">{ko ? "첫 플랜 (선택)" : "First plan (optional)"}</div>
          <div className="ob-sub">{ko ? "관심 종목 코드나 티커를 입력하면 첫 플랜을 만들어둘게요. 건너뛰고 나중에 만들어도 돼요." : "Enter a ticker to seed your first plan. You can skip and add one later."}</div>
          <input className="ob-input" autoFocus value={firstTicker} onChange={e => setFirstTicker(e.target.value)} placeholder={ko ? "예: 005930, AAPL" : "e.g. 005930, AAPL"} onKeyDown={e => { if (e.key === "Enter") finish(); }} />
        </>}

        <div className="ob-nav">
          {step > 0 && <button className="ob-back" onClick={back}><Lic name="chevron-left" size={14} cls="icon-sm" color="currentColor" />{ko ? "이전" : "Back"}</button>}
          <span className="ob-spacer" />
          {step === STEPS - 1 && <button className="ob-skip" onClick={finish}>{ko ? "건너뛰기" : "Skip"}</button>}
          <button className="ob-next" disabled={!canNext} onClick={next}>{step === STEPS - 1 ? (ko ? "시작하기" : "Get started") : (ko ? "다음" : "Next")}</button>
        </div>
      </div>
    </div>
  );
}

/* ============================ Soft email-verify banner ============================ */
function VerifyBanner({ lang, email, onResend, onDismiss }) {
  const ko = lang === "ko";
  return (
    <div className="verify-banner">
      <Lic name="mail" size={15} cls="icon-sm" color="var(--r-base)" />
      {ko ? `${email || "이메일"}로 인증 메일을 보냈어요. 받은편지함을 확인해주세요.` : `We sent a verification link to ${email || "your email"}. Check your inbox.`}
      <span className="verify-banner-spacer" />
      <button className="verify-resend" onClick={onResend}>{ko ? "다시 보내기" : "Resend"}</button>
      <button className="verify-dismiss" onClick={onDismiss}>{ko ? "나중에" : "Later"}</button>
    </div>
  );
}

/* ============================ First-run coach marks ============================ */
const COACH_STEPS = [
  { sel: '[data-coach="inbox"]', h: { ko: "인박스", en: "Inbox" }, b: { ko: "규칙이 충족되면 여기에 알림이 떠요. 처리·음소거·기록으로 정리하세요.", en: "Alerts land here when a rule fires. Triage with resolve / mute / log." } },
  { sel: '[data-coach="journal"]', h: { ko: "일지", en: "Journal" }, b: { ko: "결정을 기록하고 '그때의 나'를 복기하는 곳. 기록 시점 가격도 함께 저장돼요.", en: "Log decisions and review your past self — the write-time price is saved too." } },
  { sel: '[data-coach="plans"]', h: { ko: "플랜", en: "Plans" }, b: { ko: "종목마다 시나리오·전략·체결을 관리하는 핵심 화면이에요.", en: "Manage scenarios, strategy, and fills per ticker — the core of the app." } },
  { sel: '[data-coach="new"]', h: { ko: "새 플랜", en: "New plan" }, b: { ko: "여기서 새 투자 플랜을 시작하세요.", en: "Start a new investment plan here." } },
  // ── 2막: 실제 샘플 플랜으로 한 사이클 둘러보기 (탭을 따라 이동) ──
  { nav: "scenarios", sel: '[data-coach-tab="scenarios"]', act2: true, h: { ko: "한 플랜, 한 사이클", en: "One plan, one cycle" }, b: { ko: "실제 샘플 플랜으로 한 바퀴 둘러볼게요. ① 시나리오 — 하단·중간·상단 목표가로 투자 논리를 세우고, 차트로 현재가와의 괴리를 봅니다.", en: "Let's walk a real sample plan once. ① Scenarios — set bear / base / bull targets and read the gap to today's price on the chart." } },
  { nav: "strategy", sel: '[data-coach-tab="strategy"]', act2: true, h: { ko: "② 전략 · 관점", en: "② Strategy · lens" }, b: { ko: "어떻게 사고팔지(무한매수법 등 매매 전략)와 어떤 관점으로 평가할지를 정합니다.", en: "How you'll actually buy and sell (e.g. cost-averaging), and which lens you judge it through." } },
  { nav: "valuation", sel: '[data-coach-tab="valuation"]', act2: true, h: { ko: "③ 밸류에이션", en: "③ Valuation" }, b: { ko: "DCF·PER 밴드로 적정주가를 계산해, 그 값을 시나리오 목표가로 바로 적용해요.", en: "Compute a fair price with DCF / PER bands, then apply it straight to your scenario targets." } },
  { nav: "executions", sel: '[data-coach-tab="executions"]', act2: true, h: { ko: "④ 체결", en: "④ Fills" }, b: { ko: "실제 매수·매도를 기록하면 평단가·실현손익이 자동 집계됩니다 — 모든 수치의 출발점이에요.", en: "Log real buys and sells; average cost and realized P/L roll up automatically — the source of every number." } },
  { nav: "insights", sel: '[data-coach-tab="insights"]', act2: true, h: { ko: "⑤ 인사이트", en: "⑤ Insights" }, b: { ko: "앱이 가격과 기준 가치의 추세를 자동 진단해줘요. 이렇게 한 사이클이 돕니다 — 이제 직접 해보세요.", en: "The app auto-diagnoses price vs your base value. That's one full cycle — now try it yourself." } },
];
function CoachMarks({ lang, onDone, onNav }) {
  const ko = lang === "ko";
  const [i, setI] = React.useState(0);
  const [box, setBox] = React.useState(null);
  React.useEffect(() => {
    const step = COACH_STEPS[i];
    if (!step) { onDone(); return; }
    if (step.nav && onNav) onNav(step.nav);
    let misses = 0;
    // re-measure the current step's target on an interval — survives the async nav/render of act-2
    const id = setInterval(() => {
      const el = document.querySelector(step.sel);
      if (el) { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) { misses = 0; setBox({ top: r.top, left: r.left, width: r.width, height: r.height }); return; } }
      if (++misses > 14) { clearInterval(id); if (i < COACH_STEPS.length - 1) setI(i + 1); else onDone(); }
    }, 130);
    return () => clearInterval(id);
  }, [i]);
  if (!box) return null;
  const step = COACH_STEPS[i];
  // act-1 (sidebar) → popover to the right; act-2 (top tab bar) → below the tab
  const below = !!step.nav;
  const popLeft = below ? Math.max(12, Math.min(box.left, window.innerWidth - 262)) : Math.min(box.left + box.width + 14, window.innerWidth - 262);
  const popTop = below ? (box.top + box.height + 12) : Math.max(12, Math.min(box.top, window.innerHeight - 160));
  const last = i >= COACH_STEPS.length - 1;
  return (
    <>
      <div className="coach-scrim" onClick={onDone} />
      <div className="coach-spot" key={i} style={{ transform: "translate(" + (box.left - 4) + "px," + (box.top - 4) + "px)", width: box.width + 8, height: box.height + 8 }} />
      <div className="coach-pop" style={{ top: popTop, left: popLeft }}>
        <div className="coach-h">{step.h[lang]}</div>
        <div className="coach-b">{step.b[lang]}</div>
        <div className="coach-nav">
          <span className="coach-step">{i + 1} / {COACH_STEPS.length}</span>
          <div className="coach-btns">
            <button className="coach-skip" onClick={onDone}>{ko ? "건너뛰기" : "Skip"}</button>
            <button className="coach-next" onClick={() => last ? onDone() : setI(i + 1)}>{last ? (ko ? "완료" : "Done") : (ko ? "다음" : "Next")}</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ============================ Gate orchestrator ============================ */
// Renders login → onboarding, then calls onReady(session). The app mounts only after.
function AuthFlow({ lang, theme, toggleTheme, toggleLang, onReady }) {
  const [session, setSession] = React.useState(() => loadAuth());
  const phase = !session ? "login" : (!session.onboarded ? "onboard" : "ready");

  React.useEffect(() => { if (phase === "ready") onReady(session); }, [phase]);

  if (phase === "login") {
    return <LoginScreen lang={lang} theme={theme} toggleTheme={toggleTheme} toggleLang={toggleLang}
      onAuthed={(s) => { if (s.onboarded) { saveAuth(s); setSession(s); } else { setSession(s); } }} />;
  }
  if (phase === "onboard") {
    return <Onboarding lang={lang} session={session} onComplete={(prefs) => {
      // apply currency preference for real (the app reads this key)
      try { if (prefs.cur) localStorage.setItem("keystone-cur-v1", prefs.cur); } catch (e) {}
      const done = { ...session, onboarded: true };
      saveAuth(done); setSession(done);
    }} />;
  }
  return null;
}

Object.assign(window, { AuthFlow, VerifyBanner, CoachMarks, loadAuth, saveAuth, clearAuth, AUTH_KEY, COACH_KEY });
