// 일지(Journal) 순수 헬퍼 — SSR 안전(브라우저 API·상태 없음).
// design_handoff_keystone/source/Journal.jsx 의 jrWritePrice / tsOf 등을 이식(verbatim 로직, 타입만 부여).
//
// 스코프 결정(마일스톤 7): 웹엔 종목 저장소(SECURITIES/s.journal)가 아직 없으므로 "플랜 노트만" 피드에 담는다.
// 원본의 sec 분기는 구조를 보존하되(후속 종목상세 이식이 쉽도록) 항상 비어 있게 둔다 → JournalScreen 에서 SECS=[].
import type { Lang, L10n } from "@keystone/core/types";
import type { UIPlan, UINote } from "@/lib/plan-mapper";

/** 피드 항목 — 플랜 노트 하나에 소속 플랜(및 정렬 순서)을 부착.
 *  sec 필드는 종목 저널용 자리(이번 스코프에선 항상 undefined). */
export interface JournalEntry extends UINote {
  plan: UIPlan;
  /** 종목 저널(후속 스코프) — 지금은 미사용, 구조 보존용 */
  sec?: undefined;
  _ord: number;
}

// 노트 작성 시점 가격(합성 seam). 실제 스냅샷(n.price, 지금부터 생성되는 모든 노트에 각인)이 항상 우선.
// price 없는 시드/레거시 노트는 id 에서 파생한 결정적 유사-과거가격을 플랜 시나리오 밴드로 클램프해
// "기록 이후" 델타를 시연 가능하게 만든다. (마일스톤 6 실 히스토리 교체 대상 — 모든 노트가 n.price 를
// 갖는 순간 이 합성은 제거.)
export function jrWritePrice(
  n: { id: string; price?: number | null },
  now: number | null | undefined,
  lo: number | null | undefined,
  hi: number | null | undefined,
): number | null {
  if (n.price != null) return n.price;
  if (!now) return null;
  const m = String(n.id).match(/nt(\d+)/);
  const seed = m ? +m[1] : 0;
  const frac = (((seed % 997) / 997) - 0.5) * 0.22; // ±11%
  let v = now * (1 + frac);
  if (lo != null) v = Math.max(lo, v);
  if (hi != null) v = Math.min(hi, v);
  return now < 1000 ? Math.round(v * 100) / 100 : Math.round(v);
}

/** 노트 정렬 키 — id("nt<타임스탬프>")에서 숫자 추출(최신 우선 정렬용). */
export function tsOf(n: { id: string }): number {
  const m = String(n.id).match(/nt(\d+)/);
  return m ? +m[1] : 0;
}

/** when(L10n | 문자열) 로컬라이즈 — 원본 wlab. */
export function wlab(w: L10n | string | null | undefined, lang: Lang): string {
  if (!w) return "—";
  if (typeof w === "string") return w;
  return w[lang] || w.en || "—";
}

/** 모든 플랜의 notes 를 단일 피드로 평탄화 + 최신순 정렬(플랜 노트만; SECS 는 이번 스코프 밖). */
export function flattenNotes(plans: UIPlan[] | null | undefined): JournalEntry[] {
  const all: JournalEntry[] = [];
  (plans || []).forEach((p) =>
    (p.notes || []).forEach((n, i) => all.push({ ...(n as UINote), plan: p, _ord: i })),
  );
  all.sort((a, b) => tsOf(b) - tsOf(a));
  return all;
}
