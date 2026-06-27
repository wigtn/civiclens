// ============================================================
// shared/contract/api.ts  — 🔒 공유 계약 (Day 0 동결)
// REST(/api/v1/*) 요청·응답 타입 + ApiResponse 엔벨로프 + 에러코드.
// 변경은 3인 합의 후에만(PARALLEL_WORK_PLAN.md §4).
// 출처: PRD §5.1
// ============================================================

export type LangCode = 'ko' | 'en' | 'zh' | 'vi' | 'th';
export type SessionMode = 'document' | 'kiosk';

/** 모든 /api/v1/* 응답 엔벨로프. 핸들러는 이 형태로만 응답한다. */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  retryable: boolean;
}

/** 에러코드 단일 출처 — 문자열 하드코딩 금지. */
export type ApiErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_LANGUAGE'
  | 'INVALID_INPUT'
  | 'INVALID_IMAGE'
  | 'INVALID_COORDS'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'LOW_CONFIDENCE'
  | 'PII_DETECTED'
  | 'NO_MATCH'
  | 'RATE_LIMITED'
  | 'BUDGET_EXCEEDED'
  | 'SESSION_CREATE_FAILED'
  | 'VISION_FAILED'
  | 'RAG_FAILED'
  | 'RECORD_FAILED'
  | 'PLACES_FAILED';

// ---- POST /api/v1/realtime/session (B) -----------------------------------
export interface CreateSessionRequest {
  language: LangCode;
  mode?: SessionMode;
}
export interface SessionLimits {
  maxDurationSec: number; // 300
  maxOutputTokens: number; // 4000
  maxTurns: number; // 40
}
export interface CreateSessionResponse {
  sessionId: string;
  clientSecret: string; // OpenAI ek_... (WS 연결용)
  expiresAt: number;
  model: 'gpt-realtime';
  voice: string;
  sessionToken: string; // tool-call 핸들러(/rag/query 등) 호출용 단명 토큰
  limits: SessionLimits;
}

// ---- POST /api/v1/rag/query (C) ------------------------------------------
export type RagSource = 'admin_term' | 'legal_translation' | 'office';
export interface RagQueryRequest {
  query: string;
  targetLang: LangCode;
  topK?: number; // default 5
  source?: RagSource;
}
export interface RagMatch {
  term: string;
  definition: string;
  translation: string;
  sourceLabel: string; // AI Hub 출처 라벨
  score: number;
}
export interface RagQueryResponse {
  matches: RagMatch[];
}

// ---- POST /api/v1/recognize (B 라우트 / C 도메인) -------------------------
export interface RecognizeRequest {
  imageBase64: string;
  language: LangCode;
}
export interface DocField {
  label: string;
  hint: string;
}
export interface RecognizeResponse {
  docType: string;
  docTypeId: string;
  confidence: number; // <0.5 → 단정 금지(FR-014)
  fields: DocField[];
  isKiosk: boolean;
}

// ---- /api/v1/records (B) -------------------------------------------------
/** 비식별 구조화 필드만. 자유서술 금지(FR-015). */
export interface RecordVisit {
  docTypeId: string;
  guidedFieldKeys?: string[];
  noteSafe?: string; // 서버 PII 마스킹 통과 텍스트
}
export interface CreateRecordRequest {
  sessionId: string;
  language: LangCode;
  visits: RecordVisit[]; // min 1
}
export interface CreateRecordResponse {
  recordId: string;
  createdAt: number;
  piiScrubbed: true;
}
export interface RecordEntry {
  recordId: string;
  language: LangCode;
  visits: RecordVisit[];
  createdAt: number;
}

// ---- GET /api/v1/offices/nearby (B) --------------------------------------
export interface OfficesNearbyQuery {
  lat: number;
  lng: number;
  radiusKm?: number; // default 2
}
export interface OfficeItem {
  name: string;
  type: string;
  address: string;
  distanceM: number;
  hours: string;
}
export interface OfficesNearbyResponse {
  offices: OfficeItem[];
}

// ---- GET /api/v1/benchmark (C) -------------------------------------------
export interface BenchmarkResponse {
  overallTop1: number;
  perDocType: { docTypeId: string; accuracy: number; n: number }[];
  perLang: { lang: LangCode; translationBLEU: number | null }[];
  evaluatedAt: number;
  datasetVersion: string;
}

// ---- GET /api/v1/health (B) ----------------------------------------------
export interface HealthResponse {
  status: 'ok';
  openai: boolean;
  vectorStore: boolean;
}
