// source/Auth.jsx LoginScreen 이식 — PROD: 지점을 실제 Supabase Auth로 교체.
// 이메일 가입 = 즉시 세션(소프트 인증, enable_confirmations=false) → 온보딩.
// 소셜 4종은 클라우드 연결 시 활성화 (NEXT-ACTION 보류 항목) — UI는 유지, 비활성.
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Lic, KeystoneLogo, SocialIcon } from "@/components/icons";

const SOCIALS = [
  { kind: "google", cls: "asb-google", label: { ko: "Google로 계속하기", en: "Continue with Google" } },
  { kind: "apple", cls: "asb-apple", label: { ko: "Apple로 계속하기", en: "Continue with Apple" } },
  { kind: "kakao", cls: "asb-kakao", label: { ko: "카카오로 계속하기", en: "Continue with Kakao" } },
  { kind: "naver", cls: "asb-naver", label: { ko: "네이버로 계속하기", en: "Continue with Naver" } },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"ko" | "en">("ko");
  const ko = lang === "ko";
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const onEmailSubmit = async () => {
    const e = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setErr(ko ? "올바른 이메일을 입력하세요" : "Enter a valid email"); return; }
    if (pw.length < 6) { setErr(ko ? "비밀번호는 6자 이상" : "Password must be 6+ characters"); return; }
    setErr("");
    setBusy(true);
    const supabase = supabaseBrowser();
    try {
      if (mode === "signup") {
        // 계정 생성 → 즉시 세션 (소프트 인증: email_verified는 배너로 안내)
        const { error } = await supabase.auth.signUp({ email: e, password: pw });
        if (error) throw error;
        router.push("/onboarding");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: e, password: pw });
        if (error) throw error;
        router.push("/"); // 온보딩 여부는 홈이 판단해 리다이렉트
      }
      router.refresh();
    } catch (ex) {
      const msg = ex instanceof Error ? ex.message : String(ex);
      setErr(
        /invalid login credentials/i.test(msg) ? (ko ? "이메일 또는 비밀번호가 올바르지 않습니다" : "Invalid email or password")
        : /already registered/i.test(msg) ? (ko ? "이미 가입된 이메일입니다 — 로그인해 주세요" : "Email already registered — sign in instead")
        : msg,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-topbar">
        <button className="auth-tb-btn" onClick={() => setLang(ko ? "en" : "ko")}>
          <Lic name="languages" size={13} cls="icon-sm" color="currentColor" />{ko ? "한" : "EN"}
        </button>
      </div>

      <div className="auth-left">
        <div className="auth-brand"><KeystoneLogo size={24} />Keystone</div>
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
            {SOCIALS.map((s) => (
              <button
                key={s.kind}
                className={"auth-social-btn " + s.cls}
                disabled
                title={ko ? "곧 지원 예정 (클라우드 연결 시)" : "Coming soon"}
                style={{ opacity: 0.45, cursor: "not-allowed" }}
              >
                <span className="asb-ic"><SocialIcon kind={s.kind} /></span>{s.label[lang]}
              </button>
            ))}
          </div>

          <div className="auth-divider">{ko ? "또는 이메일로" : "or with email"}</div>

          <div className="auth-field">
            <span className="auth-label">{ko ? "이메일" : "Email"}</span>
            <input className="auth-input" type="email" autoComplete="email" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onEmailSubmit(); }} />
          </div>
          <div className="auth-field">
            <span className="auth-label">{ko ? "비밀번호" : "Password"}</span>
            <input className="auth-input" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder={ko ? "6자 이상" : "6+ characters"}
              value={pw} onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onEmailSubmit(); }} />
          </div>
          {err && <div className="auth-err">{err}</div>}
          <button className="auth-primary" onClick={onEmailSubmit} disabled={busy}>
            {busy ? (ko ? "처리 중…" : "Working…") : mode === "signup" ? (ko ? "이메일로 시작하기" : "Sign up with email") : (ko ? "로그인" : "Sign in")}
          </button>

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
