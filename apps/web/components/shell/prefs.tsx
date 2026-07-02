// 앱 전역 표시 설정 (lang/theme) — 프로토타입 App.jsx의 lang/theme state 대응.
// localStorage 키는 프로토타입과 동일하게 유지 (§9 기기로컬 prefs는 유지 방침).
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { Lang } from "@keystone/core/types";

interface Prefs {
  lang: Lang;
  theme: "dark" | "light";
  toggleLang: () => void;
  toggleTheme: () => void;
  setLang: (l: Lang) => void;
}

const PrefsCtx = createContext<Prefs>({
  lang: "ko", theme: "dark", toggleLang: () => {}, toggleTheme: () => {}, setLang: () => {},
});

export const usePrefs = () => useContext(PrefsCtx);

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ko");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    try {
      const l = localStorage.getItem("keystone-lang-v1");
      if (l === "en" || l === "ko") setLangState(l);
      const th = localStorage.getItem("keystone-theme-v1");
      if (th === "light" || th === "dark") setTheme(th);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("keystone-theme-v1", theme); } catch {}
  }, [theme]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("keystone-lang-v1", l); } catch {}
  };

  return (
    <PrefsCtx.Provider
      value={{
        lang, theme, setLang,
        toggleLang: () => setLang(lang === "ko" ? "en" : "ko"),
        toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
      }}
    >
      {children}
    </PrefsCtx.Provider>
  );
}
