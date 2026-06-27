// ============================================================
// server/lib/domain/recognize-document.ts — 👤 C
// gpt-4o 비전으로 한국 공문서/안내문/키오스크 화면을 분류 + 칸 구조 추출.
// B의 /api/v1/recognize 라우트와 C의 run-benchmark.ts가 "동일 함수"를 공유.
// FR-014 환각 가드: confidence<0.5면 호출측이 단정 금지 처리.
// ============================================================

import type { LangCode, RecognizeResponse } from '@contract/api';
import { getOpenAI, MODELS } from '../ai/openai.js';

/** 데모/벤치마크 대상 문서종류 라벨(AI Hub 공공행정문서 OCR 기준으로 확장). */
export const DOC_TYPES = [
  { id: 'resident_registration_move', ko: '전입신고서' },
  { id: 'foreigner_registration', ko: '외국인등록 신청서' },
  { id: 'health_insurance', ko: '건강보험 관련 서식' },
  { id: 'seal_certificate', ko: '인감증명 관련 서식' },
  { id: 'kiosk_screen', ko: '무인민원발급기 화면' },
  { id: 'unknown', ko: '미상' },
] as const;

const SYSTEM = `You classify Korean public/administrative documents from an image.
Return STRICT JSON only. Choose docTypeId from the provided list. If the image is blurry,
cropped, or you are not sure, choose "unknown" and set confidence below 0.5 — never guess a
specific form from superficial similarity. fields = the labeled blanks the user must fill,
with a short hint in the requested language.`;

interface RecognizeOptions {
  language: LangCode;
}

export async function recognizeDocument(
  imageBase64: string,
  { language }: RecognizeOptions,
): Promise<RecognizeResponse> {
  const list = DOC_TYPES.map((d) => `${d.id} (${d.ko})`).join(', ');
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
          {
            type: 'text',
            text:
              `docTypeId candidates: [${list}].\n` +
              `Respond as JSON: {"docType","docTypeId","confidence",` +
              `"fields":[{"label","hint"}],"isKiosk"}. hint language = ${language}.`,
          },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const raw = res.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw) as Partial<RecognizeResponse>;

  // 정규화 + 가드
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
