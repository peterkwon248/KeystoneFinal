// 실시간 시세 소비 (Stage B) — 브라우저가 Supabase Realtime으로 live_quotes 변경을 구독해
// 가격 UI를 실시간 갱신한다. worker(KIS/Finnhub WS)가 live_quotes에 upsert → postgres_changes 브로드캐스트.
//
// 이 컴포넌트는 client 전용(브라우저에서만 구독). server-only 모듈 import 금지(회귀 교훈).
// 초기 페치로 맵을 시드하고, useEffect에서 채널 1회 생성(deps=[]) · unmount 시 removeChannel.
"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Database } from "@keystone/core/types";
import { supabaseBrowser } from "@/lib/supabase/client";

/** live_quotes Row (재생성된 packages/core database.ts). */
type LiveQuoteRow = Database["public"]["Tables"]["live_quotes"]["Row"];

/** 티커별 라이브 시세 — 표시에 필요한 최소 필드. */
export interface LiveQuote {
  price: number;
  changePct: number | null;
  ts: string;
}

type QuoteMap = Map<string, LiveQuote>;

const LiveQuotesContext = createContext<QuoteMap | null>(null);

/** DB 행 → LiveQuote (numeric 컬럼은 string으로 올 수 있어 Number 정규화). */
function toQuote(r: Pick<LiveQuoteRow, "price" | "change_pct" | "ts">): LiveQuote {
  return {
    price: Number(r.price),
    changePct: r.change_pct == null ? null : Number(r.change_pct),
    ts: r.ts,
  };
}

export function LiveQuotesProvider({ children }: { children: React.ReactNode }) {
  const [map, setMap] = useState<QuoteMap>(() => new Map());
  // StrictMode 이중 마운트에서도 채널 중복 생성을 막기 위한 가드.
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // SSR 가드: 브라우저에서만 실행(useEffect는 클라이언트에서만 도는 게 보장이나 명시적으로 방어).
    if (typeof window === "undefined") return;
    const sb = supabaseBrowser();
    let cancelled = false;

    // 1) 초기 페치 — 현재 스냅샷으로 맵 시드.
    void sb
      .from("live_quotes")
      .select("ticker,price,change_pct,ts")
      .then(({ data }) => {
        if (cancelled || !data) return;
        setMap((prev) => {
          const next = new Map(prev);
          for (const r of data) next.set(r.ticker, toQuote(r));
          return next;
        });
      });

    // 2) 구독 — INSERT/UPDATE/DELETE 전부. upsert는 새 행 payload가 new에 담긴다.
    const channel = sb
      .channel("live-quotes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_quotes" },
        (payload) => {
          const r = payload.new as Partial<LiveQuoteRow>;
          if (!r || typeof r.ticker !== "string" || r.price == null || r.ts == null) return;
          setMap((prev) =>
            new Map(prev).set(r.ticker as string, toQuote(r as LiveQuoteRow)),
          );
        },
      )
      .subscribe();
    channelRef.current = channel;

    // 3) cleanup(unmount) — 구독 해제.
    return () => {
      cancelled = true;
      if (channelRef.current) {
        void sb.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  return <LiveQuotesContext.Provider value={map}>{children}</LiveQuotesContext.Provider>;
}

/** 맵에서 티커의 라이브 시세를 조회. ticker 없거나 미존재면 undefined. */
export function useLiveQuote(ticker?: string): { price: number; changePct: number | null } | undefined {
  const map = useContext(LiveQuotesContext);
  if (!map || !ticker) return undefined;
  const q = map.get(ticker);
  if (!q) return undefined;
  return { price: q.price, changePct: q.changePct };
}
