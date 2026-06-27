// ============================================================
// server/lib/openai/realtime-token.ts — ephemeral client secret 발급(FR-001)
// 서버에서 OpenAI Realtime 세션을 만들고 단명 client secret(ek_)만 반환.
// 토큰당 출력토큰 상한(config.SESSION_LIMITS)을 발급 시 봉인(§4.5).
// mock 모드: OpenAI 미호출, 가짜 ek_ 토큰 생성(로컬 전 플로우 동작).
// ============================================================

import { randomBytes } from 'node:crypto';
import { OPENAI, SESSION_LIMITS, EK_TTL_SEC, isMockOpenAI } from '@/lib/config';
import type { LangCode } from '@contract/api';

export interface MintedEk {
  clientSecret: string; // ek_...
  expiresAt: number; // epoch ms
  model: 'gpt-realtime';
  voice: string;
}

function mockEk(): MintedEk {
  return {
    clientSecret: `ek_mock_${randomBytes(18).toString('hex')}`,
    expiresAt: Date.now() + EK_TTL_SEC * 1000,
    model: OPENAI.realtimeModel,
    voice: OPENAI.voice,
  };
}

/**
 * OpenAI Realtime 세션을 생성하고 ephemeral client secret 을 발급한다.
 * SDK 버전 차이를 피하기 위해 REST 엔드포인트를 직접 호출한다.
 * @throws Error  발급 실패(라우트가 SESSION_CREATE_FAILED 로 매핑)
 */
export async function mintEphemeralKey(_language: LangCode): Promise<MintedEk> {
  if (isMockOpenAI()) return mockEk();

  // 현행 GA 엔드포인트: POST /v1/realtime/client_secrets
  // body.session 에 세션 설정을 중첩한다(토큰당 출력 상한 봉인 §4.5).
  const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session: {
        type: 'realtime',
        model: OPENAI.realtimeModel,
        audio: { output: { voice: OPENAI.voice } },
        max_output_tokens: SESSION_LIMITS.maxOutputTokens,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`realtime client_secret create failed: ${res.status} ${detail.slice(0, 200)}`);
  }

  // 응답 형태: { value: "ek_...", expires_at: <epoch s>, session: {...} }
  const json = (await res.json()) as {
    value?: string;
    expires_at?: number;
    client_secret?: { value: string; expires_at?: number }; // 구버전 호환
  };
  const value = json.value ?? json.client_secret?.value;
  if (!value) throw new Error('realtime response missing client secret value');

  const expSec = json.expires_at ?? json.client_secret?.expires_at;
  const expiresAt = expSec ? expSec * 1000 : Date.now() + EK_TTL_SEC * 1000;

  return {
    clientSecret: value,
    expiresAt,
    model: OPENAI.realtimeModel,
    voice: OPENAI.voice,
  };
}
