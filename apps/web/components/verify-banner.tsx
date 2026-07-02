// source/Auth.jsx VerifyBanner 이식 — 소프트 이메일 인증 배너 (하드 게이트 아님)
"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Lic } from "@/components/icons";

export function VerifyBanner({ email, lang = "ko" }: { email: string; lang?: "ko" | "en" }) {
  const ko = lang === "ko";
  const [hidden, setHidden] = useState(false);
  const [sent, setSent] = useState(false);
  if (hidden) return null;

  const onResend = async () => {
    await supabaseBrowser().auth.resend({ type: "signup", email });
    setSent(true);
  };

  return (
    <div className="verify-banner">
      <Lic name="mail" size={15} cls="icon-sm" color="var(--r-base)" />
      {sent
        ? (ko ? "인증 메일을 다시 보냈어요." : "Verification email resent.")
        : (ko ? `${email}로 인증 메일을 보냈어요. 받은편지함을 확인해주세요.` : `We sent a verification link to ${email}. Check your inbox.`)}
      <span className="verify-banner-spacer" />
      {!sent && <button className="verify-resend" onClick={onResend}>{ko ? "다시 보내기" : "Resend"}</button>}
      <button className="verify-dismiss" onClick={() => setHidden(true)}>{ko ? "나중에" : "Later"}</button>
    </div>
  );
}
