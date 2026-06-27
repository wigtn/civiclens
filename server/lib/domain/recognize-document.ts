// ============================================================
// server/lib/domain/recognize-document.ts — 👤 C (B 라우트와 통합)
// 제품 본연: 사용자가 비춘 한국 공문서/무인민원기 화면을 인식하고
// 채워야 할 칸(필드)을 추출해 모국어 힌트와 함께 반환.
// (주제: 서류 인식 + 칸별 작성법 안내)
//
// 시그니처는 shared/contract(RecognizeRequest)로 고정 — B의
// /app/api/v1/recognize/route.ts 가 recognizeDocument({imageBase64,language}) 호출.
// FR-014 환각 가드: confidence<0.5면 서식명을 단정하지 않음(라우트가 422 처리).
//
// ※ AI Hub 공공행정문서 OCR 라벨은 "제품 인식"을 바꾸지 않는다.
//   그건 신뢰성 입증 벤치마크(server/lib/domain/benchmark/*)에서만 사용.
// ============================================================

import type { RecognizeRequest, RecognizeResponse } from '@contract/api';
import { getOpenAI, MODELS } from '../ai/openai.js';

/** 자주 만나는 민원 서식(라이브 안내 대상). 목록 밖이면 docType은 자유서술로. */
export const DOC_TYPES = [
  { id: 'resident_registration_move', ko: '전입신고서' },
  { id: 'foreigner_registration', ko: '외국인등록 신청서' },
  { id: 'resident_cert_issue', ko: '주민등록 등·초본 발급신청' },
  { id: 'health_insurance', ko: '건강보험 관련 서식' },
  { id: 'seal_certificate', ko: '인감증명 관련 서식' },
  { id: 'kiosk_screen', ko: '무인민원발급기 화면' },
  { id: 'other_public_document', ko: '기타 공문서/안내문' },
  { id: 'unknown', ko: '미상' },
] as const;

const SYSTEM = `You are the recognition engine for a civil-affairs companion that helps foreign
residents and digitally vulnerable users fill out KOREAN public documents and use unmanned civil
kiosks. From the image, identify the document/form (or kiosk screen) and extract the fields the
user must fill in.

Return STRICT JSON only:
{"docType","docTypeId","confidence","fields":[{"label","hint"}],"isKiosk"}
- docType: the specific Korean form/notice name as best you can tell (free text, e.g. "전입신고서").
- docTypeId: choose from the provided id list if it matches, else "other_public_document".
- fields: the labeled blanks the user must complete; each "hint" = a one-line how-to-fill note in
  the requested language.
- isKiosk: true if this is an unmanned civil kiosk screen (then fields = the buttons/menus to press).

Anti-hallucination (critical): if the image is blurry, cropped, or you are unsure, set
confidence below 0.5 and do NOT assert a specific form — describe only what is visible. Never
default to a common form from superficial similarity.`;

export async function recognizeDocument(req: RecognizeRequest): Promise<RecognizeResponse> {
  const { imageBase64, language } = req;
  const idList = DOC_TYPES.map((d) => `${d.id} (${d.ko})`).join(', ');
  const dataUrl = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  const res = await getOpenAI().chat.completions.create({
    model: MODELS.vision,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: `docTypeId candidates: [${idList}]. hint language = ${language}.` },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const raw = res.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw) as Partial<RecognizeResponse>;

  const known = new Set<string>(DOC_TYPES.map((d) => d.id));
  const docTypeId = parsed.docTypeId && known.has(parsed.docTypeId) ? parsed.docTypeId : 'unknown';
  const confidence = clamp01(parsed.confidence ?? 0);

  return {
    docType: parsed.docType ?? '미상',
    docTypeId: confidence < 0.5 ? 'unknown' : docTypeId, // FR-014: 저신뢰는 단정 금지
    confidence,
    fields: Array.isArray(parsed.fields) ? parsed.fields : [],
    isKiosk: parsed.isKiosk ?? docTypeId === 'kiosk_screen',
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
}
