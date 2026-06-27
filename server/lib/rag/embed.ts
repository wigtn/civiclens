// ============================================================
// server/lib/rag/embed.ts — 👤 C
// text-embedding-3-small 임베딩 헬퍼.
// ============================================================

import { getOpenAI, MODELS } from '../ai/openai.js';

export async function embed(text: string): Promise<number[]> {
  const res = await getOpenAI().embeddings.create({
    model: MODELS.embed,
    input: text,
  });
  return res.data[0].embedding;
}

/** 배치 임베딩(적재 스크립트용) */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await getOpenAI().embeddings.create({
    model: MODELS.embed,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}
