// 앱의 canonical "현재"(frozen) — golden-protected core의 KS_REF에서 파생하는 단일 웹 앵커.
// 흩어져 드리프트하던 new Date(2026,5,17/22)·"Jun 8" 리터럴을 전부 여기로 통일한다.
// 실제 today(real-now) 전환은 core KS_REF·시드·trajectory 창까지 얽힌 별도 대작업 —
// 그때도 이 파일(+core KS_REF)만 손대면 되도록 웹 레이어 앵커를 1곳으로 모은다.
import { KS_REF } from "@keystone/core/format";

/** 앱 기준 연도(= KS_REF.y). trajectory 창 등에서 사용. */
export const REF_YEAR = KS_REF.y;

/** 앱 기준 '오늘'(frozen KS_REF). 기존 new Date(2026,5,X) 시맨틱(로컬 자정) 미러. */
export function refNow(): Date {
  return new Date(KS_REF.y, KS_REF.mo - 1, KS_REF.d);
}
