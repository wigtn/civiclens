// ============================================================
// scripts/run-benchmark.ts — 👤 C  (FR-012)
// hold-out 평가셋으로 recognize_document top-1 정확도 산출 → BenchmarkRun 저장.
// 실행: npm run benchmark   (결과는 /api/v1/benchmark 가 노출)
// "서식 인식 정확도 OO%" 데모 숫자의 출처.
// ============================================================

import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { recognizeDocument } from '../server/lib/domain/recognize-document.js';
import { writeBenchmark } from '../server/lib/domain/benchmark-store.js';
import type { BenchmarkResponse } from '../shared/contract/api.js';
import type { EvalItem } from './build-eval-set.js';

const EVAL_SET = process.env.EVAL_SET ?? './data/eval/doc-classification.json';

async function loadEval(): Promise<EvalItem[]> {
  try {
    return JSON.parse(await readFile(EVAL_SET, 'utf8')) as EvalItem[];
  } catch {
    return [];
  }
}

async function main() {
  const items = await loadEval();
  if (items.length === 0) {
    console.log('[benchmark] 평가셋이 비어 있음 → 먼저 npm run eval:build');
    return;
  }

  const perType = new Map<string, { correct: number; n: number }>();
  let correct = 0;

  for (const it of items) {
    const img = await readFile(it.imagePath, 'base64');
    const out = await recognizeDocument(img, { language: 'ko' });
    const hit = out.docTypeId === it.goldDocTypeId;
    if (hit) correct++;
    const bucket = perType.get(it.goldDocTypeId) ?? { correct: 0, n: 0 };
    bucket.n++;
    if (hit) bucket.correct++;
    perType.set(it.goldDocTypeId, bucket);
  }

  const run: BenchmarkResponse = {
    overallTop1: round(correct / items.length),
    perDocType: [...perType.entries()].map(([docTypeId, b]) => ({
      docTypeId,
      accuracy: round(b.correct / b.n),
      n: b.n,
    })),
    perLang: [], // TODO(C): translate_notice chrF/BLEU 산출 후 채움
    evaluatedAt: Date.now(),
    datasetVersion: process.env.DATASET_VERSION ?? 'dev',
  };

  await writeBenchmark(run);
  console.log(`[benchmark] top-1 정확도 = ${(run.overallTop1 * 100).toFixed(1)}% (n=${items.length})`);
}

const round = (n: number) => Math.round(n * 1000) / 1000;

main().catch((e) => {
  console.error('[benchmark] 실패:', e);
  process.exit(1);
});
