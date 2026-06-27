// ============================================================
// server/lib/http/respond.ts — ApiResponse 엔벨로프 + 에러 헬퍼
// 모든 /api/v1/* 핸들러는 이 헬퍼로만 응답한다(§5.1).
// 에러코드는 shared/contract/api.ts 의 ApiErrorCode 만 사용(하드코딩 금지).
// ============================================================

import { NextResponse } from 'next/server';
import type { ApiResponse, ApiError, ApiErrorCode } from '@contract/api';
import { applyCorsHeaders } from '@/lib/security/cors';

/** 성공 응답: { success: true, data } */
export function ok<T>(data: T, init?: { status?: number; origin?: string | null }) {
  const body: ApiResponse<T> = { success: true, data };
  const res = NextResponse.json(body, { status: init?.status ?? 200 });
  return applyCorsHeaders(res, init?.origin);
}

/** 에러코드 → 기본 HTTP 상태 + retryable 매핑(§5.1 각 엔드포인트 Errors와 일치). */
const ERROR_META: Record<ApiErrorCode, { status: number; retryable: boolean }> = {
  INVALID_REQUEST: { status: 400, retryable: false },
  INVALID_LANGUAGE: { status: 400, retryable: false },
  INVALID_INPUT: { status: 400, retryable: false },
  INVALID_IMAGE: { status: 400, retryable: false },
  INVALID_COORDS: { status: 400, retryable: false },
  UNAUTHORIZED: { status: 401, retryable: false },
  FORBIDDEN: { status: 403, retryable: false },
  NOT_FOUND: { status: 404, retryable: false },
  LOW_CONFIDENCE: { status: 422, retryable: false },
  PII_DETECTED: { status: 422, retryable: false },
  NO_MATCH: { status: 404, retryable: false },
  RATE_LIMITED: { status: 429, retryable: true },
  BUDGET_EXCEEDED: { status: 503, retryable: false },
  SESSION_CREATE_FAILED: { status: 500, retryable: true },
  VISION_FAILED: { status: 500, retryable: true },
  RAG_FAILED: { status: 500, retryable: true },
  RECORD_FAILED: { status: 500, retryable: true },
  PLACES_FAILED: { status: 500, retryable: true },
};

const DEFAULT_MESSAGE: Partial<Record<ApiErrorCode, string>> = {
  INVALID_LANGUAGE: '지원하지 않는 언어입니다.',
  INVALID_INPUT: '요청 형식이 올바르지 않습니다.',
  INVALID_IMAGE: '이미지가 올바르지 않거나 용량 제한을 초과했습니다.',
  INVALID_COORDS: '좌표가 올바르지 않습니다.',
  LOW_CONFIDENCE: '문서를 확신할 수 없습니다. 다시 촬영해 주세요.',
  PII_DETECTED: '개인식별정보가 감지되어 저장할 수 없습니다.',
  RATE_LIMITED: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  BUDGET_EXCEEDED: '일일 사용량 한도에 도달했습니다.',
  SESSION_CREATE_FAILED: '세션 생성에 실패했습니다.',
  NOT_FOUND: '대상을 찾을 수 없습니다.',
  FORBIDDEN: '접근 권한이 없습니다.',
};

/** 에러 응답: { success: false, error } + 적절한 HTTP 상태 + CORS */
export function fail(
  code: ApiErrorCode,
  opts?: { message?: string; status?: number; retryable?: boolean; origin?: string | null },
) {
  const meta = ERROR_META[code];
  const error: ApiError = {
    code,
    message: opts?.message ?? DEFAULT_MESSAGE[code] ?? code,
    retryable: opts?.retryable ?? meta.retryable,
  };
  const body: ApiResponse<never> = { success: false, error };
  const res = NextResponse.json(body, { status: opts?.status ?? meta.status });
  return applyCorsHeaders(res, opts?.origin);
}
