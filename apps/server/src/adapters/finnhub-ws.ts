// Finnhub 실시간 체결(trade) WS 구독 클라이언트 (Stage A).
// connect wss://ws.finnhub.io?token=... → 심볼별 subscribe → trade 이벤트 → onTick.
// changePct는 trade 스트림에 없으므로 null. close/error 시 지수백오프 재접속 + 재구독.
import WebSocket from "ws";
import { env } from "../env.js";
import type { OnTick, WsHandle } from "./kis-ws.js";

interface FinnhubTradeMsg {
  type: string;
  data?: { s: string; p: number; t: number; v: number }[];
}

/** Finnhub 실시간 체결 구독. symbols = 티커(예: AAPL) 배열. */
export function connectFinnhubWs(symbols: string[], onTick: OnTick): WsHandle {
  let ws: WebSocket | null = null;
  let closed = false;
  let backoff = 1000;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function connect(): void {
    if (closed) return;
    const url = `wss://ws.finnhub.io?token=${env.finnhubApiKey()}`;
    console.log(`[finnhub-ws] connecting (${symbols.length} symbols)`);
    ws = new WebSocket(url);

    ws.on("open", () => {
      backoff = 1000;
      console.log(`[finnhub-ws] open — subscribing ${symbols.length} symbols`);
      for (const s of symbols) ws!.send(JSON.stringify({ type: "subscribe", symbol: s }));
    });

    ws.on("message", (data: WebSocket.RawData) => {
      let msg: FinnhubTradeMsg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (msg.type === "ping") return; // ws lib가 프로토콜 ping은 자동 pong; 앱 레벨 ping은 무시
      if (msg.type !== "trade" || !msg.data) return;
      for (const tr of msg.data) {
        if (!tr.s || !Number.isFinite(tr.p) || tr.p <= 0) continue;
        onTick({ ticker: tr.s, price: tr.p, changePct: null, ts: tr.t });
      }
    });

    ws.on("close", () => {
      if (!closed) {
        console.warn(`[finnhub-ws] closed — reconnecting`);
        scheduleReconnect();
      }
    });
    ws.on("error", (err) => {
      console.error(`[finnhub-ws] error: ${err instanceof Error ? err.message : err}`);
    });
  }

  function scheduleReconnect(): void {
    if (closed || reconnectTimer) return;
    const wait = backoff;
    backoff = Math.min(backoff * 2, 30000);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, wait);
  }

  connect();

  return {
    close() {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
    },
  };
}
