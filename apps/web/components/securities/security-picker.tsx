// source/P5Scenarios.jsx:5-45 SecurityPicker 이식 — 검색+KR/US 토글 드롭다운, 종목 선택 공용 컴포넌트.
// 전역 SECURITIES(원본) → securities prop(웹엔 전역 카탈로그가 없음, 서버가 페치한 배열을 주입).
// 리서치 화면(및 향후 다른 종목 선택 UI)이 재사용.
//
// 어댑테이션(faithful, 의도적):
//  - securityOf(ticker) → securities.find(x => x.ticker === ticker) (전역 없음).
//  - React.useState → named useState.
//  - SWC≠tsc 함정 회피: 마켓탭 세그 배열([["all",{en,ko}], ...MARKETS.map(...)])을 JSX 밖(본문 const)으로
//    hoist하고 { key: string; label: L10n }[] 타입 명시 — JSX 자식 안에 제네릭/캐스트 없음.
"use client";
import { useState } from "react";
import type { I18nDict, Lang, L10n } from "@keystone/core/types";
import { MARKETS } from "@keystone/core/reference";
import { Flag, Lic } from "@/components/icons";
import type { UISecurity } from "@/lib/security-mapper";

export function SecurityPicker({ securities, ticker, lang, t, onPick, width = 300 }: {
  securities: UISecurity[];
  ticker: string | null;
  lang: Lang;
  t: I18nDict;
  onPick: (ticker: string) => void;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [mkt, setMkt] = useState("all");
  const s = securities.find((x) => x.ticker === ticker) ?? null;
  const ql = q.toLowerCase();
  const list = securities.filter((x) => (mkt === "all" || x.market === mkt) &&
    (!q || x.ticker.toLowerCase().includes(ql) || x.name.en.toLowerCase().includes(ql) || x.name.ko.includes(q)));

  // 마켓탭 세그 — SWC 회피 위해 JSX 밖에서 계산(제네릭/캐스트를 JSX 자식에 넣지 않음).
  const marketSegs: { key: string; label: L10n }[] = [
    { key: "all", label: { en: "All", ko: "전체" } },
    ...MARKETS.map((m) => ({ key: m.key, label: m.label as L10n })),
  ];

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span className="rb-select" style={{ height: 36 }} onClick={() => setOpen((o) => !o)}>
        {s ? <><Flag market={s.market} size={15} /><span className="mono" style={{ fontSize: 12, color: "var(--fg-3)" }}>{s.ticker}</span><b style={{ color: "var(--fg)" }}>{s.name[lang]}</b></> : <span style={{ color: "var(--fg-4)" }}>{t.pickSecurity}</span>}
        <span className="chev"><Lic name="chevron-down" size={13} cls="icon-sm" color="inherit" /></span>
      </span>
      {open && <>
        <div className="overlay" onClick={() => setOpen(false)} />
        <div className="v-menu" style={{ position: "absolute", top: 40, left: 0, width, zIndex: 62, padding: 0, overflow: "hidden" }}>
          <div className="cmd-input-row" style={{ padding: "10px 12px" }}>
            <Lic name="search" size={15} color="var(--fg-4)" />
            <input autoFocus className="cmd-input" style={{ fontSize: 13 }} placeholder={t.searchSec} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 2, padding: "8px 10px 4px" }}>
            {marketSegs.map(({ key, label }) => (
              <div key={key} className={"mt-seg" + (mkt === key ? " on" : "")} onClick={() => setMkt(key)}>{label[lang] ?? key}</div>
            ))}
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto", padding: "4px 6px 6px" }}>
            {list.map((x) => (
              <div className="v-menu-item" key={x.ticker} onClick={() => { onPick(x.ticker); setOpen(false); setQ(""); }}>
                <Flag market={x.market} size={12} /><span className="mono" style={{ fontSize: 11, color: "var(--fg-4)", width: 54 }}>{x.ticker}</span>
                <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.name[lang]}</span>
                {x.ticker === ticker && <span className="check"><Lic name="check" size={14} cls="icon-sm" color="var(--accent)" /></span>}
              </div>
            ))}
            {!list.length && <div style={{ padding: 16, textAlign: "center", color: "var(--fg-4)", font: "var(--fw-medium) 12px var(--font-sans)" }}>{lang === "ko" ? "결과 없음" : "No results"}</div>}
          </div>
        </div>
      </>}
    </span>
  );
}
