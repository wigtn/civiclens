// ============================================================
// shared/contract/tools.ts  — 🔒 공유 계약 (Day 0 동결)
// Realtime Function Calling 도구 이름 + 입력/결과 타입.
// 도구 "선언(JSON 스키마) + 시스템 프롬프트"의 실제 작성 주체는 C이며
// 그 산출물도 이 파일/인접 모듈에 둔다. A의 tool-dispatch는 이 타입에만 의존.
// 출처: PRD §5.1 도구표 / §6.3
// ============================================================

import type {
  LangCode,
  RecognizeResponse,
  RagQueryResponse,
  CreateRecordResponse,
  OfficesNearbyResponse,
} from './api';

export type ToolName =
  | 'recognize_document'
  | 'explain_field'
  | 'lookup_admin_term'
  | 'translate_notice'
  | 'create_record'
  | 'discover_office';

// ---- 모델→클라이언트 도구 호출 인자 ----------------------------------------
export interface RecognizeDocumentArgs {
  // 프레임은 Realtime 세션 이미지 입력 또는 /recognize 폴백으로 전달
  language: LangCode;
  mode?: 'document' | 'kiosk';
}
export interface ExplainFieldArgs {
  docTypeId: string;
  fieldKey: string;
  language: LangCode;
}
export interface LookupAdminTermArgs {
  term: string;
  targetLang: LangCode;
}
export interface TranslateNoticeArgs {
  text: string;
  targetLang: LangCode;
}
export interface CreateRecordArgs {
  sessionId: string;
}
export interface DiscoverOfficeArgs {
  lat: number;
  lng: number;
  radiusKm?: number;
}

/** 도구명 → 인자 타입 매핑 (tool-dispatch 라우팅 키) */
export interface ToolArgMap {
  recognize_document: RecognizeDocumentArgs;
  explain_field: ExplainFieldArgs;
  lookup_admin_term: LookupAdminTermArgs;
  translate_notice: TranslateNoticeArgs;
  create_record: CreateRecordArgs;
  discover_office: DiscoverOfficeArgs;
}

/** 도구명 → 결과(모델에 다시 주입할 값) 타입 매핑 */
export interface ToolResultMap {
  recognize_document: RecognizeResponse;
  explain_field: { steps: string[] };
  lookup_admin_term: RagQueryResponse;
  translate_notice: RagQueryResponse;
  create_record: CreateRecordResponse;
  discover_office: OfficesNearbyResponse;
}

/** 각 도구가 호출하는 백엔드 핸들러 경로 (없으면 모델 내 추론) */
export const TOOL_ENDPOINT: Record<ToolName, string | null> = {
  recognize_document: '/api/v1/recognize', // 또는 Realtime 비전
  explain_field: null, // 모델 추론 + lookup_admin_term
  lookup_admin_term: '/api/v1/rag/query',
  translate_notice: '/api/v1/rag/query',
  create_record: '/api/v1/records',
  discover_office: '/api/v1/offices/nearby',
};
