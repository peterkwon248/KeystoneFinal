// source/P4Views.jsx:1083-1096 TrashView — 소프트삭제된 플랜 리스트 + 복구/영구삭제.
// 앱셸 헤더(watchlist-screen 패턴: trash-2 아이콘 + t.trash 타이틀) + body-main plan-row 리스트.
// 복구/영구삭제는 dbId(uuid)로 서버액션 호출, useTransition으로 pending 처리.
"use client";
import { useTransition } from "react";
import type { I18nDict, Lang } from "@keystone/core/types";
import { I18N } from "@keystone/core/i18n";
import { Lic } from "@/components/icons";
import { usePrefs } from "@/components/shell/prefs";
import type { UIPlan } from "@/lib/plan-mapper";
import { restorePlan, deleteForeverPlan } from "@/app/(shell)/trash/actions";

function TrashView({ t, lang, trash, onRestore, onDeleteForever, pending }: {
  t: I18nDict;
  lang: Lang;
  trash: UIPlan[];
  onRestore: (p: UIPlan) => void;
  onDeleteForever: (p: UIPlan) => void;
  pending: boolean;
}) {
  return (
    <div className="body-main">
      {trash.length ? trash.map((p) => (
        <div className="plan-row" key={p.id}>
          <Lic name="trash-2" size={14} cls="icon-sm" color="var(--fg-4)" />
          <span className="mono" style={{ width: 64, color: "var(--fg-4)", fontSize: 12 }}>{p.id}</span>
          <span style={{ flex: 1, font: "var(--fw-medium) 13px var(--font-sans)", color: "var(--fg-2)" }}>{p.name[lang]}</span>
          <button className="watch-btn" style={{ height: 26, padding: "0 10px" }} disabled={pending} onClick={() => onRestore(p)}><Lic name="rotate-ccw" size={13} cls="icon-sm" color="inherit" />{t.restore}</button>
          <button className="watch-btn" style={{ height: 26, padding: "0 10px", color: "var(--neg)", borderColor: "rgba(235,87,87,.4)" }} disabled={pending} onClick={() => onDeleteForever(p)}><Lic name="trash-2" size={13} cls="icon-sm" color="var(--neg)" />{t.deleteForever}</button>
        </div>
      )) : <div className="empty-state"><Lic name="trash-2" size={26} color="var(--fg-4)" /><div className="es-title">{t.emptyTrash}</div></div>}
    </div>
  );
}

export function TrashScreen({ plans }: { plans: UIPlan[] }) {
  const { lang }: { lang: Lang } = usePrefs();
  const t = I18N[lang];
  const [pending, startTransition] = useTransition();

  const onRestore = (p: UIPlan) => startTransition(() => { void restorePlan(p.dbId); });
  const onDeleteForever = (p: UIPlan) => startTransition(() => { void deleteForeverPlan(p.dbId); });

  return (
    <div className="main">
      <div className="viewheader">
        <div className="viewtitle">
          <Lic name="trash-2" size={16} color="var(--fg-2)" />
          <h1 className="vt-title">{t.trash}</h1>
        </div>
      </div>
      <div className="body-row">
        <TrashView t={t} lang={lang} trash={plans} onRestore={onRestore} onDeleteForever={onDeleteForever} pending={pending} />
      </div>
    </div>
  );
}
