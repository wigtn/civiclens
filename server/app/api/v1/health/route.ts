// ============================================================
// GET /api/v1/health — 헬스체크
// 출처: PRD §5.1 /health / shared/contract HealthResponse
// vectorStore 는 C 스트림 소유 → 로컬 B 단독에서는 false(통합 시 실제 점검).
// ============================================================

import type { NextRequest } from 'next/server';
import type { HealthResponse } from '@contract/api';
import { ok } from '@/lib/http/respond';
import { openaiAvailable } from '@/lib/openai/client';
import { preflight } from '@/lib/security/cors';

export const runtime = 'nodejs';

export function OPTIONS(req: NextRequest) {
  return preflight(req.headers.get('origin'));
}

export async function GET(req: NextRequest) {
  const data: HealthResponse = {
    status: 'ok',
    openai: openaiAvailable(),
    vectorStore: false, // C 스트림 통합 시 실제 벡터스토어 점검으로 교체
  };
  return ok(data, { origin: req.headers.get('origin') });
}
