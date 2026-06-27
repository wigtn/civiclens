// ============================================================
// POST /api/v1/recognize — gpt-4o 비전 폴백 라우트(B 소유, 도메인은 C)
// 가드: CORS → 레이트리밋(IP 20/min) → 이미지 검증(≤4MB)
//       → C 도메인 recognizeDocument() 호출 → 환각 가드(conf<0.5 → 422)
// 출처: PRD §5.1 /recognize, FR-003/FR-014
// ============================================================

import type { NextRequest } from 'next/server';
import type { RecognizeRequest, RecognizeResponse } from '@contract/api';
import { ok, fail } from '@/lib/http/respond';
import { readJson, isLangCode, isNonEmptyString } from '@/lib/http/validate';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';
import { recognizeDocument } from '@/lib/domain/recognize-document';
import { RATE_LIMITS, MAX_IMAGE_BYTES } from '@/lib/config';
import { preflight } from '@/lib/security/cors';

export const runtime = 'nodejs';

export function OPTIONS(req: NextRequest) {
  return preflight(req.headers.get('origin'));
}

/** base64 문자열의 디코딩 후 대략 바이트 수. */
function approxBytes(b64: string): number {
  const clean = b64.replace(/^data:[^;]+;base64,/, '');
  const padding = (clean.match(/=+$/)?.[0].length ?? 0);
  return Math.floor((clean.length * 3) / 4) - padding;
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');

  // 1) 레이트리밋(이미지 인식: IP 20/min)
  const ip = clientIp(req);
  const rl = checkRateLimit('recognize', ip, RATE_LIMITS.recognize);
  if (!rl.allowed) {
    return fail('RATE_LIMITED', { origin });
  }

  // 2) 본문 검증
  const body = await readJson<RecognizeRequest>(req);
  if (!body || !isLangCode(body.language) || !isNonEmptyString(body.imageBase64)) {
    return fail('INVALID_IMAGE', { message: 'imageBase64·language 가 필요합니다.', origin });
  }
  if (approxBytes(body.imageBase64) > MAX_IMAGE_BYTES) {
    return fail('INVALID_IMAGE', { message: '이미지 용량이 4MB 를 초과했습니다.', origin });
  }

  // 3) C 도메인 분류 호출
  let result: RecognizeResponse;
  try {
    result = await recognizeDocument({ imageBase64: body.imageBase64, language: body.language });
  } catch (err) {
    console.error('[recognize] domain failed:', err);
    return fail('VISION_FAILED', { origin });
  }

  // 4) 환각 가드(FR-014): confidence < 0.5 → 단정 금지(422 LOW_CONFIDENCE)
  if (result.confidence < 0.5) {
    return fail('LOW_CONFIDENCE', { origin });
  }

  return ok(result, { origin });
}
