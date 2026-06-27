// ============================================================
// scripts/ingest-aihub.ts — 👤 C  (FR-013)
// AI Hub 원천 → 정규화 → 임베딩 → 벡터스토어 upsert.
// 실행: npm run ingest
// ⚠️ AI Hub 원천 파일은 data/aihub/ (gitignore). 비영리·연구 범위, sourceLabel 보존.
// ============================================================

import 'dotenv/config';
import { embedBatch } from '../server/lib/rag/embed.js';
import { getVectorStore, saveIndex, type VectorRecord } from '../server/lib/rag/vector-store.js';
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
  // 큐레이션 행정용어 — 모두 AI Hub 공공행정문서 OCR(88)에 실제 출현하는 용어
  // (annotation.text 인벤토리 기반). 정의는 한국어 권위 설명, 번역은 검증 큐레이션.
  // 실데이터 대량 적재 시 build로 교체(인터페이스 동일).
  const t = (
    id: string,
    term_ko: string,
    definition: string,
    en: string,
    vi: string,
    zh: string,
    th: string,
  ): NormalizedTerm => ({
    id: `admin:${id}`,
    source: 'admin_term',
    term_ko,
    definition,
    translations: { en, vi, zh, th },
    sourceLabel: 'AI Hub 공공행정문서 OCR',
  });

  return [
    t('sedaeju', '세대주', '주민등록상 한 세대를 대표하는 사람.', 'head of household', 'chủ hộ', '户主', 'หัวหน้าครัวเรือน'),
    t('jeonip_sayu', '전입사유', '새 주소지로 이사하게 된 이유(예: 직장, 가족).', 'reason for moving in', 'lý do chuyển đến', '迁入事由', 'เหตุผลในการย้ายเข้า'),
    t('jeonip_singo', '전입신고', '이사한 후 14일 이내에 새 주소를 신고하는 절차.', 'report of moving-in (change of address)', 'khai báo chuyển đến', '迁入申报', 'การแจ้งย้ายเข้า'),
    t('chelyu_jagyeok', '체류자격', '외국인이 한국에 머물 수 있는 법적 자격(비자 종류).', 'status of stay (visa type)', 'tư cách lưu trú', '停留资格', 'สถานะการพำนัก'),
    t('oegugin_deungrok', '외국인등록번호', '국내 체류 외국인에게 부여되는 고유 등록번호.', 'foreign resident registration number', 'số đăng ký người nước ngoài', '外国人登录号码', 'หมายเลขลงทะเบียนชาวต่างชาติ'),
    t('susin', '수신', '문서를 받는 사람·기관.', 'recipient (addressee)', 'người/cơ quan nhận', '收件人', 'ผู้รับ'),
    t('chamjo', '참조', '문서를 함께 참고로 받는 사람·부서.', 'cc / for reference', 'người tham chiếu', '抄送/参照', 'อ้างอิง/สำเนาถึง'),
    t('damdangja', '담당자', '해당 업무를 처리하는 직원.', 'person in charge', 'người phụ trách', '负责人', 'ผู้รับผิดชอบ'),
    t('sihaeng_ilja', '시행일자', '문서의 효력이 시작되는 날짜.', 'effective date', 'ngày thi hành', '施行日期', 'วันที่มีผลบังคับใช้'),
    t('munseo_beonho', '문서번호', '행정문서에 부여된 고유 번호.', 'document number', 'số văn bản', '文件编号', 'เลขที่เอกสาร'),
  ];
}

async function main() {
  const items = await loadNormalized();
  console.log(`[ingest] 정규화 항목 ${items.length}건, 임베딩 생성 중...`);

  const embeddings = await embedBatch(items.map((t) => `${t.term_ko}: ${t.definition}`));
  const records: VectorRecord[] = items.map((t, i) => ({ ...t, embedding: embeddings[i] }));

  // 파일 인덱스로 영속화 → 서버(retriever)가 같은 데이터를 로드.
  saveIndex(records);

  const store = getVectorStore();
  await store.upsert(records);
  console.log(`[ingest] 완료. 인덱스 ${await store.size()}건 → ${process.env.RAG_INDEX_PATH ?? './data/rag/index.json'}`);
}

main().catch((e) => {
  console.error('[ingest] 실패:', e);
  process.exit(1);
});
