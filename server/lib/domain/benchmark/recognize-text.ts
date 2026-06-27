// ============================================================
// server/lib/domain/benchmark/recognize-text.ts — 👤 C
// 벤치마크 전용: 공문서 이미지에서 보이는 텍스트를 추출(gpt-4o 비전).
// AI Hub annotation.text 정답과 대조해 "인식 정확도"를 산출하기 위한 입력.
// (제품 recognize-document와 별개 — 여기선 평가 목적의 raw 텍스트만)
// ============================================================

import { getOpenAI, MODELS } from '../../ai/openai.js';

const SYSTEM = `You are an OCR engine for Korean public administrative documents. Read ALL visible
text in the image. Return STRICT JSON: {"texts": string[]} where each element is one text token or
short phrase exactly as printed (labels, field names, headers, values). Do not translate, do not
explain, do not add text that is not visible.`;

export async function recognizeText(imageBase64: string): Promise<string[]> {
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
          { type: 'text', text: 'Read all text. Return {"texts": [...]}.' },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const raw = res.choices[0]?.message?.content ?? '{}';
  try {
    const parsed = JSON.parse(raw) as { texts?: unknown };
    return Array.isArray(parsed.texts) ? parsed.texts.map(String) : [];
  } catch {
    return [];
  }
}
