// ============================================================
// GET /api/v1/records/:id — Record 상세 조회(FR-009)
// 본인 세션 소유만 열람 가능(타 세션 → 403 FORBIDDEN).
// 출처: PRD §5.1 GET /records/:id / shared/contract RecordEntry
// ============================================================

import type { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/http/respond';
import { extractSessionToken, verifySessionToken } from '@/lib/security/session-token';
import { getRecord, toEntry } from '@/lib/db/record-store';
import { preflight } from '@/lib/security/cors';

export const runtime = 'nodejs';

export function OPTIONS(req: NextRequest) {
  return preflight(req.headers.get('origin'));
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const origin = req.headers.get('origin');

  const claims = verifySessionToken(extractSessionToken(req));
  if (!claims) {
    return fail('UNAUTHORIZED', { message: '유효한 세션 토큰이 필요합니다.', origin });
  }

  const { id } = await ctx.params;
  const rec = getRecord(id);
  if (!rec) {
    return fail('NOT_FOUND', { origin });
  }
  // 본인 세션 소유 검증(guest=세션 단위 소유)
  if (rec.sessionId !== claims.sessionId) {
    return fail('FORBIDDEN', { origin });
  }

  return ok(toEntry(rec), { origin });
}
