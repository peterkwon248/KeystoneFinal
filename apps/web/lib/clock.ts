// 앱의 canonical "현재" — 실제 오늘(real-now)을 단일 웹 앵커로 노출한다.
// 흩어져 드리프트하던 new Date(2026,5,17/22)·"Jun 8" 리터럴을 전부 여기로 통일했고,
// 이제 frozen KS_REF 대신 로컬 자정 정규화된 실 today를 반환한다.
// year-less "Mon D" 파싱의 표시연도는 core fmtDate(inferYear)와 일치해야 하므로
// inferYearWeb를 함께 노출한다(아래 주석 참고).
import { KS_REF } from "@keystone/core/format";

/** 앱 기준 연도(= 실 현재연도). trajectory 창 등에서 사용. */
export const REF_YEAR = refNow().getFullYear();

/** 앱 기준 '오늘'(real-now, 로컬 자정 정규화). */
export function refNow(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

/**
 * year-less "Mon D" 날짜의 표시연도 추론 — core inferYear(packages/core/src/format/index.ts:59)
 * 규칙을 그대로 복제한다. core inferYear와 규칙 동기 필수 —
 * year-less 'Mon D' 파싱을 core fmtDate 표시연도와 일치시키기 위함.
 */
export function inferYearWeb(mo: number, d: number): number {
  return (mo < KS_REF.mo || (mo === KS_REF.mo && d <= KS_REF.d)) ? KS_REF.y : KS_REF.y - 1;
}
