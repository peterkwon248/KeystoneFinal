// 전략/관점 열람 placeholder — StrategyEditor(screens/05) 이식 전 임시.
// LIBRARY_LOCKED이므로 열람 전용. 프리셋 메타는 @keystone/core/reference.
import { notFound } from "next/navigation";
import { STRATEGIES, EXEC_STRATEGIES } from "@keystone/core/reference";

export default async function StrategyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = [...STRATEGIES, ...EXEC_STRATEGIES].find((s) => s.id === id);
  if (!item) notFound();

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="strat-dot" style={{ background: item.color, width: 10, height: 10, borderRadius: "50%", display: "inline-block" }} />
        <h1 style={{ font: "var(--fw-semi) 17px var(--font-sans)", color: "var(--fg)", margin: 0 }}>{item.name.ko}</h1>
        <span style={{ font: "var(--fw-medium) 11px var(--font-mono)", color: "var(--fg-4)" }}>{item.id}</span>
      </div>
      {"desc" in item && item.desc && (
        <p style={{ color: "var(--fg-3)", font: "var(--fw-regular) 13.5px var(--font-sans)", lineHeight: 1.6, marginTop: 14 }}>
          {item.desc.ko}
        </p>
      )}
      <div style={{ color: "var(--fg-4)", font: "var(--fw-regular) 12px var(--font-sans)", marginTop: 28 }}>
        전략 편집기(screens/05-strategy-editor.png) 이식 예정 — 지금은 열람 전용 프리셋 카드
      </div>
    </div>
  );
}
