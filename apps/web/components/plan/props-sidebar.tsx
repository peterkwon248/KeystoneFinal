// source/DetailView.jsx:1141-1287 PropsSidebar 이식 — 04 플랜 상세 우측 디테일바.
// 헤더(dt-headrow)에 status/portfolio/strategy 픽커가 이미 있으므로 sysProps 에서 그 3개는 제외(중복 방지).
// 순수 로직은 @keystone/core, 청산 요약은 웹 lib(closeout), 영속은 서버 액션(patchNotes).
// ⚠️ 커스텀 필드는 디자인에서 제거됨 — source PropsSidebar 에 핸들러만 남은 vestigial 코드라 이식하지 않는다.
// SWC 함정 회피: JSX 자식/표현식 안에 제네릭 캐스트(x as Record<A,B>)를 두지 않는다 — 캐스트는 전부 statement 로 hoist.
"use client";
import { useState } from "react";
import type { I18nDict, Lang } from "@keystone/core/types";
import { fmtMoney, fmtCompact, fmtDate, fmtRel } from "@keystone/core/format";
import { Lic, PanelIcon } from "@/components/icons";
import type { UINote, UIPlan } from "@/lib/plan-mapper";
import { closeoutSummary } from "@/lib/closeout";
import { refNow, REF_YEAR } from "@/lib/clock";

// 보유 기간: createdAt("Feb 18")부터 앱 frozen 현재(2026-06)까지 개월 수. source/DetailView.jsx:6 verbatim.
function holdingPeriod(createdAt: string | undefined, lang: Lang): string {
  if (!createdAt) return "—";
  const MON: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const m = createdAt.match(/([A-Za-z]{3})\s*(\d+)/);
  if (!m || MON[m[1]] == null) return "—";
  const now = refNow();
  let mo = (now.getFullYear() * 12 + now.getMonth()) - ((REF_YEAR - 1) * 12 + MON[m[1]]);
  if (mo < 0) mo += 12;
  if (mo < 1) return lang === "ko" ? "1개월 미만" : "<1mo";
  if (mo < 12) return mo + (lang === "ko" ? "개월" : "mo");
  const y = Math.floor(mo / 12), rm = mo % 12;
  return lang === "ko" ? (y + "년" + (rm ? " " + rm + "개월" : "")) : (y + "y" + (rm ? " " + rm + "mo" : ""));
}

// 프로토타입의 addNote 스탬프 — 앱 frozen 현재(KS_REF)를 L10n 으로 생성. source:1154 참고.
function noteStamp(): { en: string; ko: string } {
  const d = refNow();
  const monEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  return { en: `${monEn} ${d.getDate()}`, ko: `${d.getMonth() + 1}월 ${d.getDate()}일` };
}

export function PropsSidebar({
  plan, t, lang, onToggleRight, onPatchNotes, onOpenSecurity,
}: {
  plan: UIPlan;
  t: I18nDict;
  lang: Lang;
  onToggleRight: () => void;
  onPatchNotes: (notes: UINote[]) => void;
  onOpenSecurity?: (ticker: string) => void;
}) {
  const notes: UINote[] = (plan.notes as UINote[] | undefined) ?? [];

  const [noteDraft, setNoteDraft] = useState("");
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const addNote = () => {
    const v = noteDraft.trim();
    if (!v) return;
    onPatchNotes([{ id: "nt" + Date.now(), when: noteStamp(), text: v, price: plan.currentPrice }, ...notes]);
    setNoteDraft("");
  };
  const removeNote = (id: string) => onPatchNotes(notes.filter((n) => n.id !== id));
  const startEdit = (n: UINote) => { setEditId(n.id); setEditText(n.text); };
  const cancelEdit = () => { setEditId(null); setEditText(""); };
  const commitEdit = () => {
    const v = editText.trim();
    if (!v) { cancelEdit(); return; }
    onPatchNotes(notes.map((n) => (n.id === editId ? { ...n, text: v, editedAt: Date.now() } : n)));
    cancelEdit();
  };

  // 현황(Vitals) 행 — 제네릭 캐스트 없음. IIFE 대신 사전 계산해 JSX 를 단순 유지.
  const px = plan.currentPrice;
  const avg = plan.avgPrice ?? 0;
  const ret = avg > 0 ? ((px - avg) / avg) * 100 : null;
  const vitals: { k: string; v: string; tone?: "pos" | "neg" }[] = [
    { k: lang === "ko" ? "현재가" : "Price", v: fmtCompact(px, plan.cur) },
  ];
  if (avg > 0) vitals.push({ k: lang === "ko" ? "평단가" : "Avg cost", v: fmtCompact(avg, plan.cur) });
  if (ret != null) vitals.push({ k: lang === "ko" ? "평가손익" : "P/L", v: (ret >= 0 ? "+" : "") + ret.toFixed(1) + "%", tone: ret >= 0 ? "pos" : "neg" });
  if (plan.divisions) vitals.push({ k: lang === "ko" ? "회차" : "Round", v: `${plan.round ?? 0}/${plan.divisions}` });

  const co = plan.status === "closed" ? closeoutSummary(plan) : null;
  const visibleNotes = showAllNotes ? notes : notes.slice(0, 3);

  return (
    <div className="detail-side">
      <div className="ds-toolbar">
        <button className="iconbtn" onClick={onToggleRight} title={t.hideProps}><PanelIcon side="right" size={15} /></button>
      </div>

      {co ? (
        <div className="side-group">
          <div className="side-cap">{lang === "ko" ? "청산 요약" : "Closeout"}</div>
          <div className="prop-line"><span className="pl-label">{t.realizedPL}</span><span className={"pl-value mono " + (co.realized >= 0 ? "pos" : "neg")}>{(co.realized >= 0 ? "+" : "") + fmtCompact(co.realized, plan.cur)}</span></div>
          <div className="prop-line"><span className="pl-label">{t.totalInvestedLab}</span><span className="pl-value mono">{fmtCompact(co.invested, plan.cur)}</span></div>
          <div className="prop-line"><span className="pl-label">{t.totalBought}</span><span className="pl-value mono">{co.buyQty.toLocaleString("en-US")}{lang === "ko" ? "주" : ""} · {co.rounds}{lang === "ko" ? "회" : "×"}</span></div>
          <div className="prop-line"><span className="pl-label">{t.avgBuySell}</span><span className="pl-value mono">{fmtMoney(co.avgBuy, plan.cur)} → {co.avgSell != null ? fmtMoney(co.avgSell, plan.cur) : "—"}</span></div>
        </div>
      ) : (plan.totalShares > 0 || plan.totalInvested > 0) ? (
        <div className="side-group">
          <div className="side-cap">{lang === "ko" ? "포지션" : "Position"}</div>
          <div className="prop-line"><span className="pl-label">{t.invested}</span><span className="pl-value mono">{fmtCompact(plan.totalInvested, plan.cur)}</span></div>
          <div className="prop-line"><span className="pl-label">{t.shares}</span><span className="pl-value mono">{(plan.totalShares || 0).toLocaleString("en-US")}</span></div>
          <div className="prop-line"><span className="pl-label">{t.dash_value}</span><span className="pl-value mono">{fmtCompact(plan.currentPrice * (plan.totalShares || 0), plan.cur)}</span></div>
          <div className="prop-line"><span className="pl-label">{lang === "ko" ? "보유 기간" : "Holding period"}</span><span className="pl-value mono">{holdingPeriod(plan.createdAt, lang)}</span></div>
        </div>
      ) : null}

      <div className="side-group">
        <div className="side-cap">{t.sysProps}</div>
        <div className="prop-line"><span className="pl-label">{t.ticker}</span><span className="pl-value c-link" onClick={() => onOpenSecurity && onOpenSecurity(plan.ticker)} style={{ cursor: onOpenSecurity ? "pointer" : "default" }}>{plan.flag} <span className="mono">{plan.ticker}</span></span></div>
        <div className="prop-line"><span className="pl-label">{t.created}</span><span className="pl-value" style={{ color: "var(--fg-3)" }}>{fmtDate(plan.createdAt, lang)}</span></div>
        <div className="prop-line"><span className="pl-label">{t.updated}</span><span className="pl-value" style={{ color: "var(--fg-3)" }}>{fmtRel(plan.updatedAt, lang)}</span></div>
      </div>

      <div className="side-group">
        <div className="side-cap">{lang === "ko" ? "현황" : "Vitals"}</div>
        {vitals.map((r, i) => (
          <div className="field-line" key={i}>
            <span className="fl-key">{r.k}</span>
            <span className="fl-val" style={r.tone === "pos" ? { color: "var(--pos)" } : r.tone === "neg" ? { color: "var(--neg)" } : undefined}>{r.v}</span>
          </div>
        ))}
        {plan.execId && <div className="side-vitals-foot">{lang === "ko" ? "전략 파라미터·규칙은 전략 탭에서" : "Parameters & rules in the Strategy tab"}</div>}
      </div>

      <div className="side-group side-group--notes">
        <div className="side-cap">{lang === "ko" ? "메모 (투자 일지)" : "Notes"}</div>
        <div className="note-compose">
          <textarea className="note-input" rows={2} placeholder={lang === "ko" ? "관찰·결정을 기록하세요…" : "Log an observation or decision…"} value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote(); }} />
          {noteDraft.trim() && <button className="v-btn v-btn--primary note-save" onClick={addNote}>{lang === "ko" ? "기록" : "Log"}</button>}
        </div>
        {notes.length === 0 ? (
          <div className="note-empty">{lang === "ko" ? "아직 메모가 없습니다." : "No notes yet."}</div>
        ) : (
          <div className={"note-list" + (showAllNotes ? " scroll" : "")}>
            {visibleNotes.map((n) => {
              const whenLabel = n.when && typeof n.when === "object" ? (n.when[lang] || n.when.en) : "";
              return (
                <div className="note-item" key={n.id}>
                  <div className="note-meta">
                    <span className="note-when">{whenLabel}{n.editedAt && <span className="note-edited">{lang === "ko" ? " · 수정됨" : " · edited"}</span>}</span>
                    {editId !== n.id && (
                      <span className="note-acts">
                        <button className="note-edit" title={lang === "ko" ? "수정" : "Edit"} onClick={() => startEdit(n)}><Lic name="pencil" size={11} color="currentColor" /></button>
                        <button className="note-del" title={t.delete} onClick={() => removeNote(n.id)}><Lic name="x" size={12} color="currentColor" /></button>
                      </span>
                    )}
                  </div>
                  {editId === n.id ? (
                    <div className="note-edit-box">
                      <textarea className="note-input" autoFocus rows={3} value={editText} onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commitEdit(); if (e.key === "Escape") cancelEdit(); }} />
                      <div className="note-edit-acts">
                        <button className="note-cancel" onClick={cancelEdit}>{lang === "ko" ? "취소" : "Cancel"}</button>
                        <button className="v-btn v-btn--primary note-save" onClick={commitEdit}>{lang === "ko" ? "저장" : "Save"}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="note-text">{n.text}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {notes.length > 3 && (
          <button className="note-more" onClick={() => setShowAllNotes((v) => !v)}>
            {showAllNotes ? (lang === "ko" ? "접기" : "Show less") : (lang === "ko" ? ("메모 " + (notes.length - 3) + "개 더 보기") : ("Show " + (notes.length - 3) + " more"))}
          </button>
        )}
      </div>

      <div className="side-group">
        <div className="side-cap">{t.scSummary}</div>
        {plan.scenarios.map((s, i) => {
          const gap = (s.target / plan.currentPrice - 1) * 100;
          return (
            <div className="scsum-row" key={i}>
              <span className="scsum-dot" style={{ background: s.color }} />
              <span className="scsum-lab">{s.label[lang]} · <span className="mono">{fmtCompact(s.target, plan.cur)}</span></span>
              <span className={"scsum-pct " + (gap >= 0 ? "pos" : "neg")}>{gap >= 0 ? "+" : ""}{gap.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
