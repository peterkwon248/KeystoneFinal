// GICS 11 섹터 — source/P4Views.jsx:161 GICS_SECTORS 그대로.
// 정규 API-ready 분류(KR/US 유니버스 공통). securities.gics가 이 en 키를 값으로 가진다.
// s.sector는 행 이름 아래 표시되는 더 세밀한 산업 하위 라벨(별개).
// MARKETS는 @keystone/core/reference에서 온다(여긴 GICS만).
import type { Lang } from "@keystone/core/types";

export interface GicsSector { en: string; ko: string }

export const GICS_SECTORS: GicsSector[] = [
  { en: "Energy", ko: "에너지" },
  { en: "Materials", ko: "소재" },
  { en: "Industrials", ko: "산업재" },
  { en: "Consumer Discretionary", ko: "경기소비재" },
  { en: "Consumer Staples", ko: "필수소비재" },
  { en: "Health Care", ko: "헬스케어" },
  { en: "Financials", ko: "금융" },
  { en: "Information Technology", ko: "정보기술" },
  { en: "Communication Services", ko: "커뮤니케이션" },
  { en: "Utilities", ko: "유틸리티" },
  { en: "Real Estate", ko: "부동산" },
];

export const gicsLabel = (g: GicsSector, lang: Lang): string => g[lang];
