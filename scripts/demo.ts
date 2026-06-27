// ============================================================
// scripts/demo.ts — CivicLens 민원동행 종단 데모 (실 문서 분석)
// 사용자가 업로드/지정한 실제 문서 이미지를 분석:
//   ① 서류 인식(gpt-4o) → ② 칸별 작성법 모국어 안내
//   → ③ 칸에 등장하는 행정용어를 AI Hub 공인 데이터로 grounding(환각 방지)
//
// 실행:
//   npm run demo -- <문서이미지경로>        (없으면 샘플 사용)
//   DEMO_LANG=en|vi|zh|th  로 사용자 언어 지정
// ============================================================

import 'dotenv/config';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { LangCode } from '../shared/contract/api.js';
import { recognizeDocument } from '../server/lib/domain/recognize-document.js';
import { retrieve } from '../server/lib/rag/retriever.js';

const LANG = (process.env.DEMO_LANG ?? 'en') as LangCode;
const LANG_NAME: Record<LangCode, string> = {
  ko: 'Korean', en: 'English', zh: 'Chinese', vi: 'Vietnamese', th: 'Thai',
};
const SAMPLE_DIR = './data/aihub/images_validation';

/** 분석할 문서 이미지: CLI 인자 > DEMO_IMAGE > 샘플. */
function resolveImage(): string {
  const arg = process.argv[2] ?? process.env.DEMO_IMAGE;
  if (arg) {
    if (!existsSync(arg)) throw new Error(`이미지 없음: ${arg}`);
    return arg;
  }
  const f = readdirSync(SAMPLE_DIR).filter((x) => /\.(jpe?g|png)$/i.test(x));
  if (!f.length) throw new Error(`샘플 이미지 없음 — 문서 경로를 인자로 주세요: npm run demo -- <경로>`);
  return join(SAMPLE_DIR, f[0]);
}

/** 칸 라벨을 AI Hub RAG로 검증(충분히 가까운 행정용어일 때만). */
async function groundTerm(label: string) {
  const m = (await retrieve(label, LANG, { topK: 1 }))[0];
  if (!m) return null;
  // 라벨과 검증 용어가 실제로 같은 용어일 때만 채택(부분 포함 + 점수 임계)
  const close = m.score >= 0.55 || label.includes(m.term) || m.term.includes(label);
  return close ? m : null;
}

async function main() {
  const imgPath = resolveImage();
  const b64 = readFileSync(imgPath, 'base64');
  const uploaded = !!(process.argv[2] ?? process.env.DEMO_IMAGE);

  console.log('════════════════════════════════════════════');
  console.log('  CivicLens — 실제 문서 분석 데모');
  console.log('════════════════════════════════════════════');
  console.log(`사용자 언어 : ${LANG_NAME[LANG]} (${LANG})`);
  console.log(`${uploaded ? '업로드 문서' : '샘플 문서  '}: ${imgPath.split('/').pop()}\n`);

  // ① 문서 인식
  console.log('① 문서 인식 중 (gpt-4o vision)...');
  let rec;
  try {
    rec = await recognizeDocument({ imageBase64: b64, language: LANG });
  } catch (e: any) {
    console.error(`   ✗ 인식 실패: ${e?.status === 429 ? 'gpt-4o 일일 한도 초과(키 티어 확인)' : e?.message}`);
    process.exit(1);
  }

  if (rec.confidence < 0.5) {
    console.log(`   ⚠️ 확신 부족(conf ${(rec.confidence * 100).toFixed(0)}%) → "다시 또렷이 비춰주세요" (환각 가드 FR-014)`);
    console.log('   (확실하지 않은 서식명은 단정하지 않습니다.)');
    return;
  }
  console.log(`   ✓ 인식: "${rec.docType}"  (확신 ${(rec.confidence * 100).toFixed(0)}%${rec.isKiosk ? ', 무인민원기 화면' : ''})\n`);

  // ② 칸별 작성 안내 + ③ 행정용어 AI Hub grounding
  if (!rec.fields.length) {
    console.log('② 추출된 작성 칸이 없습니다.');
    return;
  }
  console.log(`② 이 문서의 칸별 작성 안내 (${LANG_NAME[LANG]}):\n`);
  for (const f of rec.fields.slice(0, 8)) {
    console.log(`   ▸ ${f.label}`);
    console.log(`     ${f.hint}`);
    const g = await groundTerm(f.label);
    if (g) {
      console.log(`     🔎 AI Hub 검증: ${g.term} = ${g.translation} — ${g.definition} [${g.sourceLabel}]`);
    }
    console.log('');
  }

  console.log('────────────────────────────────────────────');
  console.log('이 문서를 직접 분석 → 칸별 모국어 안내 + 행정용어는 "국가 공인(AI Hub) 데이터"로 grounding.');
}

main().catch((e) => {
  console.error('[demo] 실패:', e?.message ?? e);
  process.exit(1);
});
