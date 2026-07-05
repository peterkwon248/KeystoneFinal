// SecurityPeek(B5) — 종목 브라우징 표면에서 여는 우측 슬라이드오버 미리보기.
// source/SecurityView.jsx:460-480 SecurityPeek 구조 이식: SecurityDetailScreen을 embedded로 임베드해
// 빠른 프리뷰(생성/시나리오추가/관심 토글은 임베드 상세가 그대로 제공) + 전체화면 확장 버튼.
// CSS(.peek-scrim/.peek-panel/.peek-head/.peek-body)는 styles/reticle.css에 이미 존재.
"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Flag, Lic } from "@/components/icons";
import { usePrefs } from "@/components/shell/prefs";
import { SecurityDetailScreen } from "@/components/securities/security-detail";
import { fetchSecurityDetailAction } from "@/app/(shell)/securities/[ticker]/actions";
import type { SecurityDetailData } from "@/lib/security-detail-data";

const PeekCtx = createContext<{ openPeek: (ticker: string) => void }>({ openPeek: () => {} });
export function useSecurityPeek() { return useContext(PeekCtx); }

export function SecurityPeekProvider({ children }: { children: React.ReactNode }) {
  const [ticker, setTicker] = useState<string | null>(null);
  const [data, setData] = useState<SecurityDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const openPeek = useCallback((tk: string) => {
    setTicker(tk); setData(null); setLoading(true);
    fetchSecurityDetailAction(tk).then((d) => { setData(d); setLoading(false); });
  }, []);
  const close = useCallback(() => { setTicker(null); setData(null); setLoading(false); }, []);

  // 라우트 변경(전체보기 확장·연관 플랜 이동) 시 peek 닫기.
  useEffect(() => { close(); }, [pathname, close]);
  // Escape로 닫기.
  useEffect(() => {
    if (!ticker) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [ticker, close]);

  return (
    <PeekCtx.Provider value={{ openPeek }}>
      {children}
      {ticker && <PeekPanel ticker={ticker} data={data} loading={loading} onClose={close}
        onExpand={() => { router.push(`/securities/${ticker}`); }} />}
    </PeekCtx.Provider>
  );
}

function PeekPanel({ ticker, data, loading, onClose, onExpand }: {
  ticker: string; data: SecurityDetailData | null; loading: boolean; onClose: () => void; onExpand: () => void;
}) {
  const { lang }: { lang: "ko" | "en" } = usePrefs();
  return (
    <>
      <div className="peek-scrim" onClick={onClose} />
      <div className="peek-panel">
        <div className="peek-head">
          <span className="mono" style={{ fontSize: 12, color: "var(--fg-4)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            {data && <Flag market={data.security.market} size={13} />} {ticker}
          </span>
          <span style={{ flex: 1 }} />
          <button className="iconbtn" onClick={onExpand} title={lang === "ko" ? "전체화면으로 열기" : "Open full"}><Lic name="maximize-2" size={15} /></button>
          <button className="iconbtn" onClick={onClose} title={lang === "ko" ? "닫기" : "Close"}><Lic name="x" size={16} /></button>
        </div>
        <div className="peek-body">
          {loading || !data
            ? <div style={{ padding: 40, textAlign: "center", color: "var(--fg-4)", font: "var(--fw-medium) 13px var(--font-sans)" }}>{lang === "ko" ? "불러오는 중…" : "Loading…"}</div>
            : <SecurityDetailScreen {...data} embedded />}
        </div>
      </div>
    </>
  );
}
