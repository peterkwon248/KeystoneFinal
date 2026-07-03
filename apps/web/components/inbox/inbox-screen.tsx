// design_handoff_keystone/source/Inbox.jsx InboxScreen 이식 — 인박스 3-pane 트리아지 표면.
// .inbox > .inbox-master(리스트: 헤드 탭 all/unread·마크올·그룹 today/earlier·행·처리됨 접이식·undo)
//        + .inbox-detail(InboxReader) + InboxProps(우측 읽기전용).
// 트리아지 상태(read/resolved/muted)는 localStorage(클라이언트 전용, lib/inbox-triage). SSR 가드: lazy init.
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
import { IBX_READ_KEY, IBX_RESOLVE_KEY, IBX_MUTE_KEY, ibxSetOf, ibxSaveSet } from "@/lib/inbox-triage";
import { addExecutionAction, patchPlanAction, patchNotesAction, type ExecInput } from "@/app/(shell)/plans/[id]/actions";
import { InboxReader } from "./inbox-reader";
import { InboxProps } from "./inbox-props";

export function InboxScreen({ plans, portfolios }: { plans: UIPlan[]; portfolios: PfLite[] }) {
  const router = useRouter();
  const { lang }: { lang: Lang } = usePrefs();
  const t = I18N[lang];
  const ko = lang === "ko";

  const notes = useMemo(() => buildInboxNotes(plans, lang), [plans, lang]);

  // read/resolved/muted — localStorage 소유(클라이언트 전용). SSR 가드: lazy init 은 서버에서 빈 Set.
  const [readSet, setReadSet] = useState<Set<string>>(() => ibxSetOf(IBX_READ_KEY));
  const [resolvedSet, setResolvedSet] = useState<Set<string>>(() => ibxSetOf(IBX_RESOLVE_KEY));
  const [mutedSet, setMutedSet] = useState<Set<string>>(() => ibxSetOf(IBX_MUTE_KEY));
  // 하이드레이션 후 localStorage 재동기화(서버는 빈 Set 로 렌더했으므로).
  useEffect(() => {
    setReadSet(ibxSetOf(IBX_READ_KEY));
    setResolvedSet(ibxSetOf(IBX_RESOLVE_KEY));
    setMutedSet(ibxSetOf(IBX_MUTE_KEY));
  }, []);

  const markRead = (ids: string[]) =>
    setReadSet((prev) => { const nn = new Set(prev); ids.forEach((i) => nn.add(i)); ibxSaveSet(IBX_READ_KEY, nn); return nn; });
  const mutate = (setFn: React.Dispatch<React.SetStateAction<Set<string>>>, key: string, fn: (s: Set<string>) => void) =>
    setFn((prev) => { const nn = new Set(prev); fn(nn); ibxSaveSet(key, nn); return nn; });

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
  const markAll = () => markRead(notes.map((n) => n.id));

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
    mutate(setResolvedSet, IBX_RESOLVE_KEY, (s) => s.add(n.id));
    flashUndo(ko ? "매수 체결 기록됨 · 처리완료" : "Fill recorded · resolved", () => mutate(setResolvedSet, IBX_RESOLVE_KEY, (s) => s.delete(n.id)));
  };
  const doSell = (n: InboxNote, ov?: { price: number; qty: number }) => {
    const price = ov?.price ?? n.plan.currentPrice;
    const qty = ov?.qty ?? 0;
    runExec(n.plan, { side: "sell", price, quantity: qty });
    markRead([n.id]);
    mutate(setResolvedSet, IBX_RESOLVE_KEY, (s) => s.add(n.id));
    flashUndo(ko ? "매도 체결 기록됨 · 처리완료" : "Sell recorded · resolved", () => mutate(setResolvedSet, IBX_RESOLVE_KEY, (s) => s.delete(n.id)));
  };
  const doClose = (n: InboxNote) => {
    void patchPlanAction(n.plan.dbId, { status: "closing" }).then(() => router.refresh()).catch(() => {});
    markRead([n.id]);
    mutate(setResolvedSet, IBX_RESOLVE_KEY, (s) => s.add(n.id));
    flashUndo(ko ? "청산중으로 전환됨" : "Moved to Closing", () => {
      void patchPlanAction(n.plan.dbId, { status: "active" }).then(() => router.refresh()).catch(() => {});
      mutate(setResolvedSet, IBX_RESOLVE_KEY, (s) => s.delete(n.id));
    });
  };
  const resolve = (n: InboxNote) => {
    markRead([n.id]);
    const next = nextAfter(n);
    mutate(setResolvedSet, IBX_RESOLVE_KEY, (s) => s.add(n.id));
    if (sel && sel.id === n.id && next) setSelId(next.id);
    flashUndo(ko ? "처리됨" : "Resolved", () => mutate(setResolvedSet, IBX_RESOLVE_KEY, (s) => s.delete(n.id)));
  };
  const mute = (n: InboxNote) => {
    markRead([n.id]);
    const next = nextAfter(n);
    mutate(setMutedSet, IBX_MUTE_KEY, (s) => s.add(n.id));
    if (sel && sel.id === n.id && next) setSelId(next.id);
    flashUndo(ko ? "이 알림 음소거됨" : "Alert muted", () => mutate(setMutedSet, IBX_MUTE_KEY, (s) => s.delete(n.id)));
  };
  const restore = (n: InboxNote) => { mutate(setResolvedSet, IBX_RESOLVE_KEY, (s) => s.delete(n.id)); };
  const unmute = (n: InboxNote) => mutate(setMutedSet, IBX_MUTE_KEY, (s) => s.delete(n.id));
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
