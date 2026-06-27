// ============================================================
// server/lib/config.ts — 환경변수 + 상수(세션 상한·가드 값)
// 출처: PRD §4.5 비용/남용 가드, shared/contract SessionLimits
// ============================================================

import type { SessionLimits } from '@contract/api';

function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

function numEnv(key: string, fallback: number): number {
  const v = env(key);
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** 실제 OpenAI 를 호출할지 여부.
 *  로컬 전용 기본값은 mock 이다. 실제 호출은 명시적으로 켤 때만:
 *  CIVICLENS_USE_OPENAI=1 AND OPENAI_API_KEY 존재. */
export function useRealOpenAI(): boolean {
  return env('CIVICLENS_USE_OPENAI') === '1' && !!env('OPENAI_API_KEY');
}

/** OpenAI 호출 없이 mock 토큰을 발급할지 여부(useRealOpenAI 의 반대). */
export function isMockOpenAI(): boolean {
  return !useRealOpenAI();
}

export const OPENAI = {
  apiKey: env('OPENAI_API_KEY'),
  realtimeModel: (env('OPENAI_REALTIME_MODEL') ?? 'gpt-realtime') as 'gpt-realtime',
  voice: env('OPENAI_REALTIME_VOICE') ?? 'alloy',
} as const;

/** 토큰당 실사용량 봉인(PRD §4.5). 발급 시 OpenAI 세션에 설정. */
export const SESSION_LIMITS: SessionLimits = {
  maxDurationSec: 300, // 5분
  maxOutputTokens: 4000,
  maxTurns: 40,
};

/** ephemeral client secret 수명(초). 세션 상한과 동일. */
export const EK_TTL_SEC = SESSION_LIMITS.maxDurationSec;

/** 세션 토큰(tool-call 핸들러 호출용) 수명(초). 세션보다 약간 길게. */
export const SESSION_TOKEN_TTL_SEC = SESSION_LIMITS.maxDurationSec + 60;

/** 레이트리밋 정책(PRD §4.5). */
export const RATE_LIMITS = {
  // ephemeral 토큰 발급
  session: { perMin: 6, perDay: 60 },
  // 이미지 인식
  recognize: { perMin: 20, perDay: 400 },
} as const;

/** /recognize 이미지 상한(바이트). PRD §4.5: ≤4MB/요청. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** 일일 비용 캡(USD). 초과 시 신규 토큰 발급 차단(503). */
export const DAILY_BUDGET_USD = numEnv('CIVICLENS_DAILY_BUDGET_USD', 5);

/** Realtime 세션 1건의 보수적 추정 비용(USD). budget-guard 누적용. */
export const EST_SESSION_COST_USD = 0.15;

/** CORS 허용 Origin 화이트리스트. 와일드카드 금지(§4.5). */
export const ALLOWED_ORIGINS: string[] = (
  env('CIVICLENS_ALLOWED_ORIGINS') ??
  'http://localhost:8081,http://localhost:19006,http://localhost:3000'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

/** guest Record TTL(ms). PRD §4.3: 90일. */
export const RECORD_TTL_MS = 90 * 24 * 60 * 60 * 1000;
