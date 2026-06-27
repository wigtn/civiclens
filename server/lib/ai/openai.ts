// ============================================================
// server/lib/ai/openai.ts — 👤 C
// OpenAI 클라이언트(서버 전용). C의 RAG 임베딩·gpt-4o 비전이 사용.
// ⚠️ B의 server/lib/openai/ 와 경로가 다름(충돌 회피). 통합 시 B와 단일화 논의.
// ============================================================

import OpenAI from 'openai';

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY 미설정 (.env 확인)');
  _client = new OpenAI({ apiKey });
  return _client;
}

export const MODELS = {
  vision: process.env.OPENAI_VISION_MODEL ?? 'gpt-4o',
  embed: process.env.OPENAI_EMBED_MODEL ?? 'text-embedding-3-small',
  realtime: process.env.OPENAI_REALTIME_MODEL ?? 'gpt-realtime',
} as const;

/** text-embedding-3-small 차원 */
export const EMBED_DIM = 1536;
