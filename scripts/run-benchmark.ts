// ============================================================
// scripts/run-benchmark.ts — 👤 C  (FR-012, 신뢰성 입증)
// 평가셋(AI Hub 88 Validation)으로 "공문서 텍스트 인식 정확도"를 산출.
// 주 지표 = 정답 텍스트 recall(평균). 분야별(image.category)로 분해.
// 실행: npm run benchmark  → 결과는 /api/v1/benchmark 가 노출.
// ============================================================

import 'dotenv/config';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { recognizeText } from '../server/lib/domain/benchmark/recognize-text.js';
import { scoreDoc } from '../server/lib/domain/benchmark/score.js';
import { writeBenchmark } from '../server/lib/domain/benchmark-store.js';
import type { BenchmarkResponse } from '../shared/contract/api.js';
import type { EvalDoc } from './build-eval-set.js';

const EVAL_SET = process.env.EVAL_SET ?? './data/eval/doc-eval.json';
const IMAGES_DIR = process.env.AIHUB_IMAGES_DIR ?? './data/aihub';

/** 원천 이미지 디렉터리에서 파일명 → 전체경로 인덱스 구축(중첩 구조 무관). */
function indexImages(dir: string): Map<string, string> {
  const idx = new Map<string, string>();
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(jpg|jpeg|png)$/i.test(name)) idx.set(name, p);
    }
  };
  try {
    walk(dir);
  } catch {
    /* dir 없음 */
  }
  return idx;
}

async function main() {
  let evalDocs: EvalDoc[];
  try {
    evalDocs = JSON.parse(readFileSync(EVAL_SET, 'utf8')) as EvalDoc[];
  } catch {
    console.log('[benchmark] 평가셋 없음 → 먼저 npm run eval:build');
    return;
  }
  if (evalDocs.length === 0) {
    console.log('[benchmark] 평가셋이 비어 있음');
    return;
  }

  // BENCH_LIMIT: 빠른 proof용 상한(예: 저티어→Tier1 직후 12건만)
  const limit = Number(process.env.BENCH_LIMIT ?? evalDocs.length);
  evalDocs = evalDocs.slice(0, limit);

  const imgIndex = indexImages(IMAGES_DIR);
  if (imgIndex.size === 0) {
    console.log(`[benchmark] 원천 이미지 없음: ${IMAGES_DIR} (88 Validation 원천 7GB 다운로드 필요)`);
    return;
  }

  const perCat = new Map<string, { sum: number; n: number }>();
  let recallSum = 0;
  let evaluated = 0;
  let missing = 0;

  for (const doc of evalDocs) {
    const path = imgIndex.get(doc.imageFileName);
    if (!path) {
      missing++;
      continue;
    }
    const img = readFileSync(path, 'base64');
    const recognized = await recognizeWithRetry(img);
    await sleep(Number(process.env.BENCH_DELAY_MS ?? 1500)); // throttle (저티어 RPM 대비)
    const s = scoreDoc(recognized, doc.goldTexts);
    recallSum += s.recall;
    evaluated++;
    const b = perCat.get(doc.categoryId) ?? { sum: 0, n: 0 };
    b.sum += s.recall;
    b.n++;
    perCat.set(doc.categoryId, b);
    if (evaluated % 10 === 0) console.log(`  ...${evaluated}/${evalDocs.length}`);
  }

  if (evaluated === 0) {
    console.log(`[benchmark] 매칭된 이미지 0 (라벨 파일명과 원천 불일치). missing=${missing}`);
    return;
  }

  const run: BenchmarkResponse = {
    overallTop1: round(recallSum / evaluated), // 주 지표: 텍스트 인식 정확도(recall 평균)
    perDocType: [...perCat.entries()].map(([docTypeId, b]) => ({
      docTypeId, // 행정분야 ID
      accuracy: round(b.sum / b.n),
      n: b.n,
    })),
    perLang: [], // 번역 품질(chrF/BLEU)은 71720 연결 후
    evaluatedAt: Date.now(),
    datasetVersion: process.env.DATASET_VERSION ?? 'aihub-88-validation',
  };

  await writeBenchmark(run);
  console.log(
    `[benchmark] 텍스트 인식 정확도 = ${(run.overallTop1 * 100).toFixed(1)}% ` +
      `(평가 ${evaluated}건, 이미지 미발견 ${missing}건)`,
  );
}

const round = (n: number) => Math.round(n * 1000) / 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 429(rate_limit) 시 지수 백오프 재시도. 저티어 OpenAI 키 대응. */
async function recognizeWithRetry(img: string): Promise<string[]> {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await recognizeText(img);
    } catch (e: any) {
      const is429 = e?.status === 429 || e?.code === 'rate_limit_exceeded';
      if (!is429 || attempt === 5) throw e;
      const wait = 20000 * (attempt + 1);
      console.log(`  ⏳ rate limit → ${wait / 1000}s 대기 후 재시도`);
      await sleep(wait);
    }
  }
  return [];
}

main().catch((e) => {
  console.error('[benchmark] 실패:', e);
  process.exit(1);
});
