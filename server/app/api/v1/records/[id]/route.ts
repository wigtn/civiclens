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

  // 로컬/게스트 데모: 세션 토큰은 선택(mobile api-client.getRecord 는 토큰 미전송).
  // 토큰이 있으면 본인 세션 소유 검증(타 세션 403), 없으면 로컬 단일 디바이스로 허용.
  // ⚠️ 프로덕션(author, FR-009)에서는 토큰 필수 + 소유 검증으로 강화 필요.
  const claims = verifySessionToken(extractSessionToken(req));

  const { id } = await ctx.params;
  const rec = getRecord(id);
  if (!rec) {
    return fail('NOT_FOUND', { origin });
  }
  if (claims && rec.sessionId !== claims.sessionId) {
    return fail('FORBIDDEN', { origin });
  }

  return ok(toEntry(rec), { origin });
}
