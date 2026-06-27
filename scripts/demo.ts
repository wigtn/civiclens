// ============================================================
// scripts/demo.ts — CivicLens 민원동행 종단 데모 (실 API + 실 데이터)
// 외국인이 카메라로 공문서를 비추고 모국어로 물으면:
//   ① 서류 인식(gpt-4o) → ② 행정용어 AI Hub grounding → ③ 모국어 음성 응답(텍스트)
// 실행: npm run demo   (DEMO_LANG=vi|zh|en|th)
// ============================================================

import 'dotenv/config';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { LangCode } from '../shared/contract/api.js';
import { recognizeDocument } from '../server/lib/domain/recognize-document.js';
import { retrieve } from '../server/lib/rag/retriever.js';
import { getOpenAI, MODELS } from '../server/lib/ai/openai.js';

const LANG = (process.env.DEMO_LANG ?? 'vi') as LangCode;
const IMAGES_DIR = process.env.DEMO_IMAGES ?? './data/aihub/images_validation';
const LANG_NAME: Record<LangCode, string> = {
  ko: 'Korean', en: 'English', zh: 'Chinese', vi: 'Vietnamese', th: 'Thai',
};

function pickImage(): string {
  const f = readdirSync(IMAGES_DIR).filter((x) => /\.jpe?g$/i.test(x));
  if (!f.length) throw new Error(`데모 이미지 없음: ${IMAGES_DIR}`);
  return join(IMAGES_DIR, f[0]);
}

/** grounding된 사실만으로 모국어 음성 응답 생성(환각 금지). gpt-4o 불가 시 graceful fallback. */
async function narrate(question: string, m: { term: string; translation: string; definition: string }): Promise<string> {
  try {
    const res = await getOpenAI().chat.completions.create({
      model: MODELS.vision,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content:
            `You are CivicLens, a kind civil-affairs companion. Answer the user's question in ` +
            `${LANG_NAME[LANG]} in 1-2 short spoken sentences. Use ONLY the verified fact provided; ` +
            `do not invent. Speak simply, like helping an elderly or foreign visitor.`,
        },
        {
          role: 'user',
          content: `Question: ${question}\nVerified fact (official): ${m.term} (${m.translation}): ${m.definition}`,
        },
      ],
    });
    return res.choices[0]?.message?.content?.trim() ?? '';
  } catch (e: any) {
    const limited = e?.status === 429;
    return `[${limited ? 'gpt-4o 일일 한도 — 음성합성 생략, grounding 데이터는 정상' : '생성 생략'}] "${m.term}" = ${m.translation} · ${m.definition}`;
  }
}

async function main() {
  const imgPath = pickImage();
  const b64 = readFileSync(imgPath, 'base64');

  console.log('════════════════════════════════════════════');
  console.log('  CivicLens — 외국인·디지털약자 민원동행 데모');
  console.log('════════════════════════════════════════════');
  console.log(`사용자 언어: ${LANG_NAME[LANG]} (${LANG})`);
  console.log(`비춘 문서  : ${imgPath.split('/').pop()}  (AI Hub 공공행정문서 OCR)\n`);

  // ① 카메라 → 서류 인식 (gpt-4o)
  console.log('① [카메라] 사용자가 서류를 비춥니다 → 인식 중(gpt-4o)...');
  try {
    const rec = await recognizeDocument({ imageBase64: b64, language: LANG });
    if (rec.confidence < 0.5) {
      console.log(`   ⚠️ 확신 부족(conf ${(rec.confidence * 100).toFixed(0)}%) → "다시 비춰주세요" (환각 가드 FR-014)`);
    } else {
      console.log(`   ✓ "${rec.docType}" 인식 (conf ${(rec.confidence * 100).toFixed(0)}%)`);
    }
    if (rec.fields.length) {
      console.log(`   작성 칸: ${rec.fields.slice(0, 5).map((f) => f.label).join(' · ')}`);
    }
  } catch (e: any) {
    console.log(`   [gpt-4o ${e?.status === 429 ? '일일 한도 초과' : '오류'} — 인식 단계 생략, grounding 데모로 진행]`);
  }

  // ② 모국어 음성 질문 → 행정용어 AI Hub grounding
  const queries: Array<[string, string]> = [
    ['세대주', '세대주가 뭐예요?'],
    ['전입신고', '이사 왔는데 신고 어떻게 해요?'],
    ['체류자격', '체류자격 칸에 뭘 써요?'],
  ];
  console.log('\n② [음성] 모국어로 물으면 → AI Hub 공인 데이터로 grounding:');
  for (const [term, question] of queries) {
    const m = (await retrieve(term, LANG, { topK: 1 }))[0];
    if (!m) {
      console.log(`   - "${question}" → (매칭 없음)`);
      continue;
    }
    const spoken = await narrate(question, m);
    console.log(`\n   👤(${LANG}) "${question}"`);
    console.log(`   🔎 grounding: ${m.term} = ${m.translation}  [출처: ${m.sourceLabel}]`);
    console.log(`   🔊 AI: ${spoken}`);
  }

  console.log('\n────────────────────────────────────────────');
  console.log('핵심: 인식 + "환각 대신 국가 공인(AI Hub) 데이터" grounding.');
}

main().catch((e) => {
  console.error('[demo] 실패:', e?.message ?? e);
  process.exit(1);
});
