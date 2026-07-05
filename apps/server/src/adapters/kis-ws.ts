// KIS 실시간 체결가(H0STCNT0) WS 구독 클라이언트 (Stage A).
// connect → 티커별 subscribe 프레임 전송 → 실시간 체결 데이터 프레임 파싱 → onTick.
// PINGPONG은 받은 그대로 echo(필수). close/error 시 지수백오프 재접속 + 재구독.
import WebSocket from "ws";
import { kisApprovalKey, kisWsUrl } from "./kis.js";

/** 실시간 틱 콜백 페이로드 (KIS·Finnhub 공통). */
export interface LiveTick {
  ticker: string;
  price: number;
  changePct: number | null;
  ts: number; // epoch ms
}
export type OnTick = (tick: LiveTick) => void;

/** 구독 프레임(JSON 문자열) 생성. tr_type "1"=구독, "2"=해지. */
function subscribeFrame(approvalKey: string, trKey: string, trType: "1" | "2"): string {
  return JSON.stringify({
    header: {
      approval_key: approvalKey,
      custtype: "P",
      tr_type: trType,
      "content-type": "utf-8",
    },
    body: { input: { tr_id: "H0STCNT0", tr_key: trKey } },
  });
}

// H0STCNT0 recvdata 필드 인덱스(^ 구분). 41필드/건.
const F_TICKER = 0;
const F_PRICE = 2; // STCK_PRPR 현재가
const F_CHANGE_PCT = 5; // PRDY_CTRT 전일대비율
const FIELDS_PER_ROW = 41;

/** 파이프 구분 실시간 데이터 프레임 파싱 → 첫 건만 LiveTick 반환(없으면 null). */
function parseDataFrame(raw: string): LiveTick | null {
  // <암호화플래그>|<tr_id>|<건수>|<recvdata(^구분)>
  const parts = raw.split("|");
  if (parts.length < 4) return null;
  const trId = parts[1];
  if (trId !== "H0STCNT0") return null;
  const fields = parts[3].split("^");
  if (fields.length < FIELDS_PER_ROW) return null;
  const ticker = fields[F_TICKER];
  const price = Number(fields[F_PRICE]);
  if (!ticker || !Number.isFinite(price) || price <= 0) return null;
  const rawPct = Number(fields[F_CHANGE_PCT]);
  const changePct = Number.isFinite(rawPct) ? rawPct : null;
  return { ticker, price, changePct, ts: Date.now() };
}

export interface WsHandle {
  close(): void;
}

/** KIS 실시간 체결가 구독. tickers = 6자리 종목코드 배열. */
export function connectKisWs(tickers: string[], onTick: OnTick): WsHandle {
  let ws: WebSocket | null = null;
  let closed = false;
  let backoff = 1000;
  let approvalKey: string | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  async function connect(): Promise<void> {
    if (closed) return;
    try {
      if (!approvalKey) approvalKey = await kisApprovalKey();
    } catch (e) {
      console.error(`[kis-ws] approval_key 발급 실패: ${e instanceof Error ? e.message : e}`);
      scheduleReconnect();
      return;
    }
    if (closed) return;
    const url = kisWsUrl();
    console.log(`[kis-ws] connecting ${url} (${tickers.length} tickers)`);
    ws = new WebSocket(url);

    ws.on("open", () => {
      backoff = 1000;
      console.log(`[kis-ws] open — subscribing ${tickers.length} tickers`);
      for (const t of tickers) ws!.send(subscribeFrame(approvalKey!, t, "1"));
    });

    ws.on("message", (data: WebSocket.RawData) => {
      const raw = data.toString();
      if (raw.startsWith("{")) {
        // 구독 ack 또는 PINGPONG
        let msg: { header?: { tr_id?: string } };
        try {
          msg = JSON.parse(raw);
        } catch {
          return;
        }
        if (msg.header?.tr_id === "PINGPONG") {
          ws!.send(raw); // 받은 그대로 echo (필수)
        }
        return;
      }
      // 실시간 데이터 프레임(파이프 구분)
      const tick = parseDataFrame(raw);
      if (tick) onTick(tick);
    });

    ws.on("close", () => {
      if (!closed) {
        console.warn(`[kis-ws] closed — reconnecting`);
        scheduleReconnect();
      }
    });
    ws.on("error", (err) => {
      console.error(`[kis-ws] error: ${err instanceof Error ? err.message : err}`);
      // close 이벤트가 뒤따르므로 여기선 재접속 예약하지 않음
    });
  }

  function scheduleReconnect(): void {
    if (closed || reconnectTimer) return;
    const wait = backoff;
    backoff = Math.min(backoff * 2, 30000); // 지수백오프 최대 30s
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, wait);
  }

  void connect();

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
