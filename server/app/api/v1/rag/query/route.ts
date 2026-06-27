// ============================================================
// POST /api/v1/rag/query — AI Hub RAG grounding 검색 (C 도메인, B 앱에 wiring)
// lookup_admin_term / translate_notice tool-call 이 도달.
// 가드: CORS → 레이트리밋(IP 60/min) → 본문 검증 → C retriever 호출.
// 출처: PRD §5.1 /rag/query, FR-005/FR-006
// ============================================================

import type { NextRequest } from 'next/server';
import type { RagQueryRequest, RagSource } from '@contract/api';
import { ok, fail } from '@/lib/http/respond';
import { readJson, isLangCode, isNonEmptyString } from '@/lib/http/validate';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';
import { preflight } from '@/lib/security/cors';
import { retrieve } from '@/lib/rag/retriever';

export const runtime = 'nodejs';

const SOURCES: RagSource[] = ['admin_term', 'legal_translation', 'multilingual_corpus'];

export function OPTIONS(req: NextRequest) {
  return preflight(req.headers.get('origin'));
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');

  // 1) 레이트리밋 (RAG 검색: IP 60/min)
  const ip = clientIp(req);
  const rl = checkRateLimit('rag', ip, { perMin: 60, perDay: 600 });
  if (!rl.allowed) return fail('RATE_LIMITED', { origin });

  // 2) 본문 검증
  const body = await readJson<RagQueryRequest>(req);
  if (!body || !isNonEmptyString(body.query) || !isLangCode(body.targetLang)) {
    return fail('INVALID_INPUT', { message: 'query·targetLang 가 필요합니다.', origin });
  }
  const source =
    typeof body.source === 'string' && SOURCES.includes(body.source as RagSource)
      ? (body.source as RagSource)
      : undefined;
  const topK = Number.isFinite(body.topK) ? Math.min(Math.max(body.topK as number, 1), 10) : 5;

  // 3) C 도메인 RAG 검색
  try {
    const matches = await retrieve(body.query, body.targetLang, { topK, source });
    if (matches.length === 0) return fail('NO_MATCH', { origin });
    return ok({ matches }, { origin });
  } catch (err) {
    console.error('[rag/query] retrieve failed:', err);
    return fail('RAG_FAILED', { origin });
  }
}
