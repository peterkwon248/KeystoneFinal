// DB portfolios에는 color가 없어 프로토타입 팔레트를 sort 순서로 순환 적용.
// 사이드바·플랜 리스트 그룹핑이 같은 색을 쓰도록 단일 소스로 유지.
export const PF_PALETTE = ["#4C8DFF", "#BB6BD9", "#4CB782", "#F2994A", "#2D9CDB", "#9B6BD9", "#2BB3A3"];

export const pfColor = (index: number) => PF_PALETTE[index % PF_PALETTE.length];

/** 플랜 화면에서 쓰는 포트폴리오 최소 형태 (id/name/color) */
export interface PfLite {
  id: string;
  name: string;
  color: string;
}
