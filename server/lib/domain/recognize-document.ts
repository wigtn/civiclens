// ============================================================
// ⚠️ STUB — 이 파일의 실제 소유자는 C (AI Hub Data & Intelligence) 입니다.
// B 스트림 언블락용 임시 구현. 통합 시 C의 gpt-4o 비전 분류 구현으로
// 통째로 교체됩니다(시그니처는 shared/contract 로 고정).
// PARALLEL_WORK_PLAN.md §2 "C의 recognize-document 는 stub 두고 진행".
// 출처: PRD §5.1 /recognize, FR-003/FR-014
// ============================================================

import type { RecognizeRequest, RecognizeResponse } from '@contract/api';

// 데모용 결정적 분류 결과(이미지 크기 기반으로 약간의 변주).
const SAMPLE_DOCS: Array<Omit<RecognizeResponse, 'confidence' | 'isKiosk'>> = [
  {
    docType: '전입신고서',
    docTypeId: 'resident_registration_move',
    fields: [
      { label: '세대주', hint: '집의 대표자(주민등록상 대표) 이름을 적습니다.' },
      { label: '전입사유', hint: '이사 온 이유를 선택/기재합니다.' },
      { label: '새 주소', hint: '이사 온 곳의 도로명 주소를 적습니다.' },
    ],
  },
  {
    docType: '외국인등록 신청서',
    docTypeId: 'foreigner_registration',
    fields: [
      { label: '체류자격', hint: '비자 종류(예: D-2, E-7)를 적습니다.' },
      { label: '체류지', hint: '한국에서 거주하는 주소를 적습니다.' },
    ],
  },
];

/**
 * 카메라 프레임을 문서종류로 분류한다.
 * @returns RecognizeResponse — confidence < 0.5 시 호출측(B 라우트)이 환각 가드 적용(FR-014)
 */
export async function recognizeDocument(req: RecognizeRequest): Promise<RecognizeResponse> {
  // STUB: 실제 gpt-4o 비전 호출 대신, 입력 길이로 결정적 샘플 선택.
  const idx = req.imageBase64.length % SAMPLE_DOCS.length;
  const doc = SAMPLE_DOCS[idx];
  // 데모: 빈/매우 짧은 이미지는 저신뢰로 → 환각 가드 경로 검증 가능
  const confidence = req.imageBase64.length < 64 ? 0.3 : 0.92;
  return {
    ...doc,
    confidence,
    isKiosk: false,
  };
}
