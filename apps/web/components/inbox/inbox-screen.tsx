// design_handoff_keystone/source/Inbox.jsx InboxScreen 이식 — 인박스 3-pane 트리아지 표면.
// .inbox > .inbox-master(리스트: 헤드 탭 all/unread·마크올·그룹 today/earlier·행·처리됨 접이식·undo)
//        + .inbox-detail(InboxReader) + InboxProps(우측 읽기전용).
// 트리아지 상태(read/resolved/muted)는 inbox_triage 테이블(옵션2: 기기간 동기화). 서버가 진실원 →
// 초기값은 props(DB 로드값)로 받고, 변경은 setTriage/markAllRead 서버액션으로 영속(낙관적 setState 유지).
// 서버액션 연결: 매수/매도 → addExecutionAction, 청산 → patchPlanAction(status:'closing'), 기록 → patchNotesAction.
// 상태전이(active/closing)는 DB 트리거가 처리 → insert 후 router.refresh 로 재수화.
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@keystone/core/types";
import { I18N } from "@keystone/core/i18n";
import { fmtRel, MON_EN } from "@keystone/core/format";
import { Lic } from "@/components/icons";
import { usePrefs } from "@/components/shell/prefs";
import type { PfLite } from "@/lib/pf-palette";
import type { UIPlan, UINote } from "@/lib/plan-mapper";
import { buildInboxNotes, ibxBucket, IBX_META, type InboxNote } from "@/lib/inbox";
import { addExecutionAction, patchPlanAction, patchNotesAction, type ExecInput } from "@/app/(shell)/plans/[id]/actions";
import { setTriage, markAllRead } from "@/app/(shell)/inbox/actions";
import { InboxReader } from "./inbox-reader";
import { InboxProps } from "./inbox-props";

export function InboxScreen({
  plans, portfolios, readKeys, resolvedKeys, mutedKeys,
}: {
  plans: UIPlan[];
  portfolios: PfLite[];
  readKeys: string[];
  resolvedKeys: string[];
  mutedKeys: string[];
}) {
  const router = useRouter();
  const { lang }: { lang: Lang } = usePrefs();
  const t = I18N[lang];
  const ko = lang === "ko";

  const notes = useMemo(() => buildInboxNotes(plans, lang), [plans, lang]);

  // read/resolved/muted — inbox_triage 테이블 소유(서버가 진실원). 초기값은 props(DB 로드값).
  const [readSet, setReadSet] = useState<Set<string>>(() => new Set(readKeys));
  const [resolvedSet, setResolvedSet] = useState<Set<string>>(() => new Set(resolvedKeys));
  const [mutedSet, setMutedSet] = useState<Set<string>>(() => new Set(mutedKeys));

  // 낙관적 setState + setTriage 서버액션(await) 로 영속. read 는 add-only(마킹만).
  const markRead = (ids: string[]) => {
    const fresh = ids.filter((i) => !readSet.has(i));
    setReadSet((prev) => { const nn = new Set(prev); ids.forEach((i) => nn.add(i)); return nn; });
    fresh.forEach((i) => void setTriage(i, "read", true).catch(() => {}));
  };
  // resolved/muted 토글 헬퍼: 낙관적 Set 갱신 + 해당 field 를 on/off 로 영속.
  // 델타(존재 변화)는 현재 렌더의 Set(cur) 기준으로 updater 밖에서 계산 → 서버액션은 정확히 1회.
  const mutate = (
    setFn: React.Dispatch<React.SetStateAction<Set<string>>>,
    field: "resolved" | "muted",
    fn: (s: Set<string>) => void,
  ) => {
    const cur = field === "resolved" ? resolvedSet : mutedSet;
    const nn = new Set(cur);
    fn(nn);
    // cur 대비 각 노트키의 존재 변화 → on(추가) / off(삭제) 로 영속.
    new Set([...cur, ...nn]).forEach((k) => {
      const was = cur.has(k), now = nn.has(k);
      if (was !== now) void setTriage(k, field, now).catch(() => {});
    });
    setFn(nn);
  };

  const [undo, setUndo] = useState<{ label: string; fn: () => void } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashUndo = (label: string, fn: () => void) => {
    setUndo({ label, fn });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 6000);
  };
  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);
  const [showDone, setShowDone] = useState(false);

  const [tab, setTab] = useState<"all" | "unread">("all");
  const [selId, setSelId] = useState<string | null>(notes[0] ? notes[0].id : null);

  // queues
  const notMuted = notes.filter((n) => !mutedSet.has(n.id));
  const resolvedList = notMuted.filter((n) => resolvedSet.has(n.id));
  const live = notMuted.filter((n) => !resolvedSet.has(n.id));
  const mutedNotes = notes.filter((n) => mutedSet.has(n.id));
  const unreadCount = live.filter((n) => !readSet.has(n.id)).length;
  const shown = tab === "unread" ? live.filter((n) => !readSet.has(n.id)) : live;
  const sel = notes.find((n) => n.id === selId) || shown[0] || null;

  const select = (n: InboxNote) => { setSelId(n.id); if (!readSet.has(n.id)) markRead([n.id]); };
  // 마크올(모두 읽음) — 낙관적 Set 갱신 + markAllRead 배치 upsert(신규만 영속).
  const markAll = () => {
    const ids = notes.map((n) => n.id);
    const fresh = ids.filter((i) => !readSet.has(i));
    setReadSet((prev) => { const nn = new Set(prev); ids.forEach((i) => nn.add(i)); return nn; });
    if (fresh.length) void markAllRead(fresh).catch(() => {});
  };

  // group shown notes by time bucket (ibxBucket가 웹 상대토큰/"Mon D"를 today/earlier로 분류)
  const groups = ([["today", t.ibx_today], ["earlier", t.ibx_earlier]] as const)
    .map(([k, label]) => ({ k, label, items: shown.filter((n) => ibxBucket(n.time) === k) }))
    .filter((g) => g.items.length);

  // advance selection to the next live item after one leaves the queue
  const nextAfter = (n: InboxNote) => {
    const rest = live.filter((x) => x.id !== n.id);
    const idx = live.findIndex((x) => x.id === n.id);
    return (rest[idx] || rest[idx - 1] || rest[0] || null);
  };

  // ---- 서버액션 래퍼 (프로토타입 addExecution/setStatus/onPatchPlan 대응) ----
  const openPlan = (plan: UIPlan, planTab: string) => {
    // planTab(activity|executions)은 후속(탭 딥링크) — 지금은 상세로 이동.
    void planTab;
    router.push(`/plans/${plan.dbId}`);
  };
  const runExec = (plan: UIPlan, input: ExecInput) => {
    void addExecutionAction(plan.dbId, input).then(() => router.refresh()).catch(() => {});
  };

  // ---- triage actions (source verbatim; addExecution/setStatus/onPatchPlan → 서버액션) ----
  const doBuy = (n: InboxNote, ov?: { price: number; qty: number }) => {
    const price = ov?.price ?? n.plan.currentPrice;
    const qty = ov?.qty ?? 0;
    runExec(n.plan, { side: "buy", price, quantity: qty });
    markRead([n.id]);
    mutate(setResolvedSet, "resolved", (s) => s.add(n.id));
    flashUndo(ko ? "매수 체결 기록됨 · 처리완료" : "Fill recorded · resolved", () => mutate(setResolvedSet, "resolved", (s) => s.delete(n.id)));
  };
  const doSell = (n: InboxNote, ov?: { price: number; qty: number }) => {
    const price = ov?.price ?? n.plan.currentPrice;
    const qty = ov?.qty ?? 0;
    runExec(n.plan, { side: "sell", price, quantity: qty });
    markRead([n.id]);
    mutate(setResolvedSet, "resolved", (s) => s.add(n.id));
    flashUndo(ko ? "매도 체결 기록됨 · 처리완료" : "Sell recorded · resolved", () => mutate(setResolvedSet, "resolved", (s) => s.delete(n.id)));
  };
  const doClose = (n: InboxNote) => {
    void patchPlanAction(n.plan.dbId, { status: "closing" }).then(() => router.refresh()).catch(() => {});
    markRead([n.id]);
    mutate(setResolvedSet, "resolved", (s) => s.add(n.id));
    flashUndo(ko ? "청산중으로 전환됨" : "Moved to Closing", () => {
      void patchPlanAction(n.plan.dbId, { status: "active" }).then(() => router.refresh()).catch(() => {});
      mutate(setResolvedSet, "resolved", (s) => s.delete(n.id));
    });
  };
  const resolve = (n: InboxNote) => {
    markRead([n.id]);
    const next = nextAfter(n);
    mutate(setResolvedSet, "resolved", (s) => s.add(n.id));
    if (sel && sel.id === n.id && next) setSelId(next.id);
    flashUndo(ko ? "처리됨" : "Resolved", () => mutate(setResolvedSet, "resolved", (s) => s.delete(n.id)));
  };
  const mute = (n: InboxNote) => {
    markRead([n.id]);
    const next = nextAfter(n);
    mutate(setMutedSet, "muted", (s) => s.add(n.id));
    if (sel && sel.id === n.id && next) setSelId(next.id);
    flashUndo(ko ? "이 알림 음소거됨" : "Alert muted", () => mutate(setMutedSet, "muted", (s) => s.delete(n.id)));
  };
  const restore = (n: InboxNote) => { mutate(setResolvedSet, "resolved", (s) => s.delete(n.id)); };
  const unmute = (n: InboxNote) => mutate(setMutedSet, "muted", (s) => s.delete(n.id));
  const logNote = (n: InboxNote, text: string) => {
    const v = (text || "").trim();
    if (!v) return;
    const d = new Date();
    const stamp = { en: `${MON_EN[d.getMonth()]} ${d.getDate()}`, ko: `${d.getMonth() + 1}월 ${d.getDate()}일` };
    const entry: UINote = { id: "nt" + Date.now(), when: stamp, text: v, price: n.plan.currentPrice };
    const next = [entry, ...((n.plan.notes as UINote[] | undefined) || [])];
    void patchNotesAction(n.plan.dbId, next).then(() => router.refresh()).catch(() => {});
  };

  return (
    <div className="inbox">
      <div className="inbox-master">
        <div className="inbox-head">
          <span className="ibx-title">{t.inbox}</span>
          {unreadCount > 0 && <span className="ibx-count">{unreadCount}</span>}
          <div className="ibx-head-tabs">
            <button className={"ibx-seg" + (tab === "all" ? " on" : "")} onClick={() => setTab("all")}>{t.ibx_all}</button>
            <button className={"ibx-seg" + (tab === "unread" ? " on" : "")} onClick={() => setTab("unread")}>{t.ibx_unread}</button>
          </div>
          {unreadCount > 0 && <button className="ibx-markall" onClick={markAll} title={t.ibx_markAll}><Lic name="check-check" size={15} cls="icon-sm" color="currentColor" /></button>}
        </div>

        <div className="inbox-items">
          {!live.length && (
            <div className="ibx-empty">
              <svg width="46" height="46" viewBox="0 0 48 48" fill="none"><path d="M8 16h32v18a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V16Z" stroke="var(--fg-4)" strokeWidth="1.6" /><path d="M8 16l4-8h24l4 8M8 28h8l3 4h10l3-4h8" stroke="var(--fg-4)" strokeWidth="1.6" strokeLinejoin="round" /></svg>
              <div className="ibx-empty-t">{resolvedList.length || mutedNotes.length ? (ko ? "활성 알림 없음" : "Inbox zero") : t.ibx_empty}</div>
              <div className="ibx-empty-s">{resolvedList.length || mutedNotes.length ? (ko ? "모든 알림을 처리했어요." : "You've triaged everything.") : t.ibx_emptySub}</div>
            </div>
          )}
          {groups.map((g) => (
            <div key={g.k} className="ibx-group">
              <div className="ibx-group-cap">{g.label}<span className="ibx-group-n">{g.items.length}</span></div>
              {g.items.map((n) => {
                const m = IBX_META[n.type];
                const isRead = readSet.has(n.id);
                return (
                  <div key={n.id} className={"ibx-item" + (isRead ? " read" : "") + (sel && sel.id === n.id ? " active" : "")} onClick={() => select(n)}>
                    {!isRead && <span className="ibx-unread" />}
                    <span className="ibx-ic" style={{ background: m.soft }}><Lic name={m.icon} size={13} cls="icon-sm" color={m.color} /></span>
                    <div className="ibx-body">
                      <div className="ibx-line"><span className="ibx-actor">{n.rule ? n.rule.name[lang] : n.title}</span> · <span className="ibx-id">{n.plan.ticker}</span></div>
                      <div className="ibx-sub">{n.rule ? n.rule.when[lang] + " → " + n.rule.then[lang] : n.body}</div>
                    </div>
                    <span className="ibx-time">{fmtRel(n.time, lang)}</span>
                    <span className="ibx-row-acts">
                      <button className="ibx-rowbtn" title={ko ? "처리완료" : "Resolve"} onClick={(e) => { e.stopPropagation(); resolve(n); }}><Lic name="check-circle" size={13} cls="icon-sm" color="currentColor" /></button>
                      <button className="ibx-rowbtn" title={t.ibx_openPlan} onClick={(e) => { e.stopPropagation(); openPlan(n.plan, n.type === "info" ? "activity" : "executions"); }}><Lic name="arrow-up-right" size={13} cls="icon-sm" color="currentColor" /></button>
                    </span>
                  </div>
                );
              })}
            </div>
          ))}

          {(resolvedList.length > 0 || mutedNotes.length > 0) && (
            <div className="ibx-done">
              <button className="ibx-done-head" onClick={() => setShowDone((v) => !v)}>
                <Lic name={showDone ? "chevron-down" : "chevron-right"} size={13} cls="icon-sm" color="currentColor" />
                {ko ? "처리됨" : "Triaged"}
                <span className="ibx-done-n">{resolvedList.length + mutedNotes.length}</span>
              </button>
              {showDone && <div className="ibx-done-list">
                {resolvedList.map((n) => (
                  <div key={n.id} className="ibx-done-row">
                    <Lic name="check-circle" size={13} cls="icon-sm" color="var(--fg-4)" />
                    <span className="ibx-done-txt">{n.rule ? n.rule.name[lang] : n.title} · {n.plan.ticker}</span>
                    <button className="ibx-done-restore" onClick={() => restore(n)}>{ko ? "되돌리기" : "Restore"}</button>
                  </div>
                ))}
                {mutedNotes.map((n) => (
                  <div key={n.id} className="ibx-done-row">
                    <Lic name="bell-off" size={13} cls="icon-sm" color="var(--fg-4)" />
                    <span className="ibx-done-txt">{n.rule ? n.rule.name[lang] : n.title} · {n.plan.ticker}</span>
                    <button className="ibx-done-restore" onClick={() => unmute(n)}>{ko ? "음소거 해제" : "Unmute"}</button>
                  </div>
                ))}
              </div>}
            </div>
          )}
        </div>
        {undo && <div className="ibx-undo"><span className="ibx-undo-lab">{undo.label}</span><button className="ibx-undo-btn" onClick={() => { undo.fn(); setUndo(null); }}>{ko ? "실행취소" : "Undo"}</button></div>}
      </div>

      <div className="inbox-detail">
        {sel ? (
          <InboxReader n={sel} t={t} lang={lang} onOpen={openPlan} doBuy={doBuy} doSell={doSell} doClose={doClose} resolve={resolve} mute={mute} logNote={logNote} />
        ) : (
          <div className="ibx-pick">
            <Lic name="bell" size={28} cls="icon" color="var(--fg-4)" />
            <div className="ibx-pick-t">{t.ibx_pick}</div>
            <div className="ibx-pick-s">{t.ibx_pickSub}</div>
          </div>
        )}
      </div>
      {sel && <InboxProps n={sel} t={t} lang={lang} portfolios={portfolios} />}
    </div>
  );
}
