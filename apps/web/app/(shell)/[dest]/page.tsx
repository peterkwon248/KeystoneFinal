// 아직 이식 안 된 목적지의 공용 placeholder (inbox/journal/views/strategy 등)
import { notFound } from "next/navigation";

const DESTS: Record<string, { ko: string; screen?: string }> = {
  inbox: { ko: "인박스", screen: "01-inbox.png" },
  journal: { ko: "일지", screen: "02-journal.png" },
  views: { ko: "뷰" },
  watchlist: { ko: "관심종목" },
  insights: { ko: "인사이트" },
  research: { ko: "리서치" },
  scenarios: { ko: "시나리오 모니터" },
  screener: { ko: "스크리너" },
  archive: { ko: "보관함" },
  trash: { ko: "휴지통" },
};

export default async function DestPlaceholder({ params }: { params: Promise<{ dest: string }> }) {
  const { dest } = await params;
  const meta = DESTS[dest];
  if (!meta) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10 }}>
      <div style={{ font: "var(--fw-semi) 16px var(--font-sans)", color: "var(--fg-2)" }}>{meta.ko}</div>
      <div style={{ font: "var(--fw-regular) 13px var(--font-sans)", color: "var(--fg-4)" }}>
        이식 예정{meta.screen ? ` — 디자인 기준: screens/${meta.screen}` : " (마일스톤 7)"}
      </div>
    </div>
  );
}
