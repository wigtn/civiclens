// ============================================================
// server/lib/domain/doc-categories.ts — 👤 C
// AI Hub 공공행정문서 OCR(dataSetSn=88)의 문서 분류 정답 라벨.
// image.category(12개 행정분야)를 단일 출처로 정의.
// recognize-document(분류 출력) ↔ build-eval-set(정답 추출)가 공유.
// ============================================================

/** AI Hub image.category(한국어) → 안정적 영문 ID + 라이브 UX 힌트 */
export const DOC_CATEGORIES = [
  { id: 'permit_license', ko: '인.허가', hint: '인허가·신고·등록 관련' },
  { id: 'resident_autonomy', ko: '주민자치', hint: '주민자치·민원 일반' },
  { id: 'accounting_budget', ko: '회계.예산', hint: '회계·예산·정산' },
  { id: 'urban_development', ko: '도시개발', hint: '도시계획·개발·건축' },
  { id: 'industry_promotion', ko: '산업진흥', hint: '산업·경제 지원' },
  { id: 'agriculture_livestock', ko: '농림.축산지원', hint: '농림·축산 지원' },
  { id: 'general_admin', ko: '일반행정', hint: '일반 행정 문서' },
  { id: 'resident_welfare', ko: '주민복지', hint: '복지·지원금' },
  { id: 'resident_living_support', ko: '주민생활지원', hint: '생활 지원' },
  { id: 'environment_forest', ko: '지역환경.산림', hint: '환경·산림' },
  { id: 'local_culture', ko: '지역문화', hint: '문화·관광·체육' },
  { id: 'water_sewage', ko: '상.하수도관리', hint: '상하수도' },
] as const;

export type DocCategoryId = (typeof DOC_CATEGORIES)[number]['id'] | 'unknown';

const KO_TO_ID = new Map<string, DocCategoryId>(DOC_CATEGORIES.map((c) => [c.ko, c.id]));

/** AI Hub image.category 한국어 라벨 → 영문 ID. 미매칭은 'unknown'. */
export function categoryKoToId(ko: string): DocCategoryId {
  return KO_TO_ID.get(ko.trim()) ?? 'unknown';
}

export const CATEGORY_IDS = new Set<string>(DOC_CATEGORIES.map((c) => c.id));
