// ============================================================
// server/api/v1/rag/query/handler.ts — 👤 C
// POST /api/v1/rag/query 핵심 로직(프레임워크 무관 순수 함수).
// B가 Next.js route.ts에서 이 핸들러를 import해 마운트(인증/레이트리밋은 B).
// lookup_admin_term / translate_notice tool-call이 도달.
// ============================================================

import type { ApiErrorCode, ApiResponse, RagQueryRequest, RagQueryResponse } from '@contract/api';
import { retrieve } from '../../../../lib/rag/retriever.js';

const LANGS = new Set(['ko', 'en', 'zh', 'vi', 'th']);

export async function ragQueryHandler(
  body: unknown,
): Promise<ApiResponse<RagQueryResponse>> {
  const req = body as Partial<RagQueryRequest>;

  if (!req || typeof req.query !== 'string' || !req.query.trim()) {
    return err('INVALID_INPUT', 'query는 비어 있을 수 없습니다');
  }
  if (typeof req.targetLang !== 'string' || !LANGS.has(req.targetLang)) {
    return err('INVALID_LANGUAGE', `지원하지 않는 언어: ${req.targetLang}`);
  }

  try {
    const matches = await retrieve(req.query, req.targetLang as RagQueryRequest['targetLang'], {
      topK: req.topK,
      source: req.source,
    });
    if (matches.length === 0) {
      return err('NO_MATCH', '공인 데이터에서 일치 항목을 찾지 못했습니다');
    }
    return { success: true, data: { matches } };
  } catch (e) {
    return err('RAG_FAILED', e instanceof Error ? e.message : 'RAG 검색 실패', true);
  }
}

function err(
  code: ApiErrorCode,
  message: string,
  retryable = false,
): ApiResponse<RagQueryResponse> {
  return { success: false, error: { code, message, retryable } };
}
