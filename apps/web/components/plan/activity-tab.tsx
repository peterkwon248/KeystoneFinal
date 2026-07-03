// source/DetailView.jsx ActivityTab 이식 — 체결·규칙·생성의 시간순 활동 피드.
// 데이터: UIPlan(executions/rules/createdAt). rules는 현재 stub(last="")이라 자연 제외.
"use client";
import type { Lang } from "@keystone/core/types";
import { fmtMoney } from "@keystone/core/format";
import { Lic } from "@/components/icons";
import type { UIPlan } from "@/lib/plan-mapper";

interface ActItem { type: string; icon: string; color: string; when: string; text: string }

export function ActivityTab({ plan, lang }: { plan: UIPlan; lang: Lang }) {
  const ko = lang === "ko";
  const items: ActItem[] = [];
  plan.executions.forEach((e) => items.push({
    type: "exec",
    icon: e.side === "buy" ? "arrow-down-left" : "arrow-up-right",
    color: e.side === "buy" ? "var(--r-active)" : "var(--r-closing)",
    when: e.date,
    text: ko ? `${e.side === "buy" ? "매수" : "매도"} 체결 ${e.qty}주 @ ${fmtMoney(e.price, plan.cur)}` : `${e.side === "buy" ? "Bought" : "Sold"} ${e.qty} @ ${fmtMoney(e.price, plan.cur)}`,
  }));
  // 규칙 트리거 — last가 실제 값일 때만 (현재 매퍼 stub은 last="" → 제외)
  plan.rules.filter((r) => r.last && r.last !== "Never").forEach((r) => items.push({
    type: "rule", icon: "zap", color: "var(--r-base)", when: r.last,
    text: ko ? `규칙 "${r.name.ko}" 트리거됨` : `Rule "${r.name.en}" triggered`,
  }));
  items.push({ type: "sys", icon: "circle-plus", color: "var(--fg-3)", when: plan.createdAt, text: ko ? "플랜 생성됨" : "Plan created" });

  return (
    <div className="act-feed">
      {items.map((it, i) => (
        <div className="act-item" key={i}>
          <div className="act-rail">
            <div className="act-ico"><Lic name={it.icon} size={14} cls="icon-sm" color={it.color} /></div>
            {i < items.length - 1 && <div className="act-line" />}
          </div>
          <div className="act-body">
            <div className="act-text">{it.text}</div>
            <div className="act-time">{it.when}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
