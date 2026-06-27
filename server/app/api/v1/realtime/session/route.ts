// ============================================================
// POST /api/v1/realtime/session — ek_ 발급 + limits + sessionToken(FR-001)
// 가드: CORS → 레이트리밋(IP 6/min·60/day) → 일일 비용 캡(503) → 발급
// 출처: PRD §5.1, §4.5 / shared/contract CreateSessionRequest·Response
// ============================================================

import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import type { CreateSessionRequest, CreateSessionResponse } from '@contract/api';
import { ok, fail } from '@/lib/http/respond';
import { readJson, isLangCode, isSessionMode } from '@/lib/http/validate';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';
import { checkBudget, recordSpend } from '@/lib/security/budget-guard';
import { issueSessionToken } from '@/lib/security/session-token';
import { mintEphemeralKey } from '@/lib/openai/realtime-token';
import { RATE_LIMITS, SESSION_LIMITS } from '@/lib/config';
import { preflight } from '@/lib/security/cors';

export const runtime = 'nodejs';

export function OPTIONS(req: NextRequest) {
  return preflight(req.headers.get('origin'));
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');

  // 1) 본문 검증
  const body = await readJson<CreateSessionRequest>(req);
  if (!body || !isLangCode(body.language)) {
    return fail('INVALID_LANGUAGE', { origin });
  }
  if (body.mode !== undefined && !isSessionMode(body.mode)) {
    return fail('INVALID_REQUEST', { message: 'mode 값이 올바르지 않습니다.', origin });
  }

  // 2) 레이트리밋(IP 6/min·60/day)
  const ip = clientIp(req);
  const rl = checkRateLimit('session', ip, RATE_LIMITS.session);
  if (!rl.allowed) {
    return fail('RATE_LIMITED', {
      message:
        rl.blockedBy === 'day'
          ? '일일 세션 발급 한도를 초과했습니다.'
          : '분당 세션 발급 한도를 초과했습니다.',
      origin,
    });
  }

  // 3) 일일 비용 캡(초과 시 503 BUDGET_EXCEEDED)
  const budget = checkBudget();
  if (!budget.allowed) {
    return fail('BUDGET_EXCEEDED', { origin });
  }

  // 4) ephemeral 토큰 발급
  try {
    const ek = await mintEphemeralKey(body.language);
    const sessionId = randomUUID();
    const sessionToken = issueSessionToken(sessionId);
    recordSpend(); // 발급 성공분 누적

    const data: CreateSessionResponse = {
      sessionId,
      clientSecret: ek.clientSecret,
      expiresAt: ek.expiresAt,
      model: ek.model,
      voice: ek.voice,
      sessionToken,
      limits: SESSION_LIMITS,
    };
    return ok(data, { origin });
  } catch (err) {
    console.error('[realtime/session] mint failed:', err);
    return fail('SESSION_CREATE_FAILED', { origin });
  }
}
