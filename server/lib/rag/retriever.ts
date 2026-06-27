// ============================================================
// server/lib/rag/retriever.ts — 👤 C
// RAG 검색: 쿼리 임베딩 → 벡터 top-k → RagMatch[] 변환.
// /api/v1/rag/query 핸들러(lookup_admin_term / translate_notice)가 사용.
// ============================================================

import type { LangCode, RagMatch, RagSource } from '@contract/api';
import { embed } from './embed.js';
import { getVectorStore } from './vector-store.js';

export async function retrieve(
  query: string,
  targetLang: LangCode,
  opts: { topK?: number; source?: RagSource } = {},
): Promise<RagMatch[]> {
  const { topK = 5, source } = opts;
  const qv = await embed(query);
  const hits = await getVectorStore().query(qv, topK, source);

  return hits.map(({ record, score }) => ({
    term: record.term_ko,
    definition: record.definition,
    translation: record.translations[targetLang] ?? record.translations.en ?? '',
    sourceLabel: record.sourceLabel,
    score,
  }));
}
