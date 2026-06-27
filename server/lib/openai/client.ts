// ============================================================
// server/lib/openai/client.ts — 서버 전용 OpenAI 클라이언트(§4.5)
// 비밀키는 서버에만 보관. 클라이언트 노출 금지.
// mock 모드(키 없음/강제)에서는 null 을 반환하고 호출측이 폴백한다.
// ============================================================

import OpenAI from 'openai';
import { OPENAI, useRealOpenAI } from '@/lib/config';

let cached: OpenAI | null = null;

/** mock 모드면 null. 실제 호출 모드면 싱글턴 OpenAI 클라이언트. */
export function getOpenAI(): OpenAI | null {
  if (!useRealOpenAI() || !OPENAI.apiKey) return null;
  if (!cached) cached = new OpenAI({ apiKey: OPENAI.apiKey });
  return cached;
}

/** OpenAI 연동 가용 여부(health 체크용). */
export function openaiAvailable(): boolean {
  return useRealOpenAI();
}
