// ============================================================
// scripts/ingest-aihub.ts — 👤 C  (FR-013)
// AI Hub 원천 → 정규화 → 임베딩 → 벡터스토어 upsert.
// 실행: npm run ingest
// ⚠️ AI Hub 원천 파일은 data/aihub/ (gitignore). 비영리·연구 범위, sourceLabel 보존.
// ============================================================

import 'dotenv/config';
import { embedBatch } from '../server/lib/rag/embed.js';
import { getVectorStore, type VectorRecord } from '../server/lib/rag/vector-store.js';
import type { LangCode, RagSource } from '../shared/contract/api.js';

/** 정규화된 중간 표현(원천 파서가 이 형태로 내보냄) */
interface NormalizedTerm {
  id: string;
  source: RagSource;
  term_ko: string;
  translations: Partial<Record<LangCode, string>>;
  definition: string;
  sourceLabel: string;
}

// TODO(C): AIHUB_DATA_DIR의 실제 파일 포맷에 맞춰 파서 구현.
//  - 공공행정문서 OCR 행정용어 → source:'admin_term'
//  - 국내 법률 다국어 번역(5개국어, dataSetSn=71720) → source:'legal_translation'
//  - 한국어-다국어 말뭉치(dataSetSn=71498) → source:'multilingual_corpus' (일반 문장 번역 보강)
// ⚠️ 관광 POI / 인근 창구(discover_office)는 RAG 대상 아님 — offices/nearby(B)에서 처리.
async function loadNormalized(): Promise<NormalizedTerm[]> {
  // 임시 시드(파이프라인 검증용). 실제 적재 전까지 데모용 소량.
  return [
    {
      id: 'admin:sedaeju',
      source: 'admin_term',
      term_ko: '세대주',
      translations: { en: 'head of household', vi: 'chủ hộ', zh: '户主', th: 'หัวหน้าครัวเรือน' },
      definition: '주민등록상 한 세대를 대표하는 사람.',
      sourceLabel: 'AI Hub 공공행정문서 OCR',
    },
    {
      id: 'admin:jeonip_sayu',
      source: 'admin_term',
      term_ko: '전입사유',
      translations: { en: 'reason for moving in', vi: 'lý do chuyển đến', zh: '迁入事由', th: 'เหตุผลในการย้ายเข้า' },
      definition: '새 주소지로 이사하게 된 이유(예: 직장, 가족).',
      sourceLabel: 'AI Hub 공공행정문서 OCR',
    },
  ];
}

async function main() {
  const items = await loadNormalized();
  console.log(`[ingest] 정규화 항목 ${items.length}건`);

  const embeddings = await embedBatch(items.map((t) => `${t.term_ko}: ${t.definition}`));
  const records: VectorRecord[] = items.map((t, i) => ({ ...t, embedding: embeddings[i] }));

  const store = getVectorStore();
  await store.upsert(records);
  console.log(`[ingest] upsert 완료. 인덱스 크기 = ${await store.size()}`);
  // ⚠️ in-memory 스토어는 프로세스 종료 시 사라짐 → 운영은 pgvector로.
}

main().catch((e) => {
  console.error('[ingest] 실패:', e);
  process.exit(1);
});
