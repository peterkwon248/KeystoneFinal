// source/P4Views.jsx:874-912 ResearchBrowser 이식 — 종목 리서치(검색/최근본종목/관심종목 → 종목상세).
// SecurityPicker/getSecRecents/Flag/fmtCompact/.sec-planrow 재사용, 신규 UI 없음(faithful).
//
// 어댑테이션(faithful, 의도적):
//  - SECURITIES/securityOf(전역) → securities prop + secMap(Map) 조회.
//  - getSecRecents()는 클라이언트 전용(localStorage) — SSR엔 빈 배열, useEffect로 마운트 후 로드
//    (하이드레이션 미스매치 회피).
//  - plansForTicker 인라인(watchlist-screen과 동일 패턴).
//  - onOpenSecurity = router.push(`/securities/${ticker}`).
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@keystone/core/types";
import { I18N } from "@keystone/core/i18n";
import { fmtCompact } from "@keystone/core/format";
import { Flag } from "@/components/icons";
import { usePrefs } from "@/components/shell/prefs";
import { SecurityPicker } from "@/components/securities/security-picker";
import { getSecRecents } from "@/lib/sec-recents";
import type { UISecurity } from "@/lib/security-mapper";
import type { UIPlan } from "@/lib/plan-mapper";

// source/securities.jsx:47 plansForTicker 인라인(watchlist-screen과 동일).
function plansForTicker(plans: UIPlan[], ticker: string): UIPlan[] {
  return plans.filter((p) => p.ticker === ticker);
}

export function ResearchScreen({ securities, plans }: { securities: UISecurity[]; plans: UIPlan[] }) {
  const router = useRouter();
  const { lang }: { lang: Lang } = usePrefs();
  const t = I18N[lang];
  const ko = lang === "ko";

  const [recentTickers, setRecentTickers] = useState<string[]>([]);
  useEffect(() => { setRecentTickers(getSecRecents()); }, []);

  const onOpenSecurity = (ticker: string) => router.push(`/securities/${ticker}`);

  const secMap = new Map(securities.map((s) => [s.ticker, s]));
  const recents = recentTickers.map((tk) => secMap.get(tk)).filter((s): s is UISecurity => Boolean(s));
  const recentSet = new Set(recents.map((s) => s.ticker));
  const watched = securities.filter((s) => s.watched && !recentSet.has(s.ticker));

  // source/P4Views.jsx:879-891 row 헬퍼 그대로.
  const row = (s: UISecurity) => {
    const up = (s.change || 0) >= 0;
    const hasPlan = plansForTicker(plans, s.ticker).length > 0;
    return (
      <div className="sec-planrow" key={s.ticker} onClick={() => onOpenSecurity(s.ticker)}>
        <Flag market={s.market} size={13} />
        <span className="mono" style={{ color: "var(--fg-4)", fontSize: 12, width: 62 }}>{s.ticker}</span>
        <span style={{ flex: 1, minWidth: 0, font: "var(--fw-medium) 13px var(--font-sans)", color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name[lang]}</span>
        {hasPlan && <span className="fl-auto" style={{ fontSize: 10.5 }}>{ko ? "플랜" : "Plan"}</span>}
        <span className="mono" style={{ fontSize: 12.5, color: "var(--fg-2)", width: 92, textAlign: "right" }}>{fmtCompact(s.price, s.cur)}</span>
        <span className={"mono " + (up ? "pos" : "neg")} style={{ fontSize: 12.5, width: 58, textAlign: "right", fontWeight: 600 }}>{up ? "+" : ""}{(s.change || 0).toFixed(1)}%</span>
      </div>
    );
  };

  return (
    <div className="main" style={{ height: "100%" }}>
      <div className="body-row">
        <div className="body-main">
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 32px" }}>
            <h2 className="se-h">{t.research}</h2>
            <p className="se-sub">{t.researchHint}</p>
            <div style={{ margin: "16px 0 26px" }}>
              <SecurityPicker ticker={null} lang={lang} t={t} onPick={onOpenSecurity} width={420} securities={securities} />
            </div>
            {recents.length > 0 && <>
              <div className="side-cap" style={{ margin: "0 0 6px" }}>{t.recentlyViewed}</div>
              <div style={{ marginBottom: watched.length ? 24 : 0 }}>{recents.map(row)}</div>
            </>}
            {watched.length > 0 && <>
              <div className="side-cap" style={{ margin: "0 0 6px" }}>{t.watchlist}</div>
              <div>{watched.map(row)}</div>
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}
