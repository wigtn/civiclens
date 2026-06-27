// ============================================================
// scripts/build-eval-set.ts — 👤 C  (FR-012, 신뢰성 입증)
// AI Hub 공공행정문서 OCR(88) Validation 라벨에서 평가셋 추출.
// 각 문서: 정답 텍스트(annotation.text) + 행정분야(image.category) + 이미지 파일명.
// 벤치마크 = "우리 인식이 실제 한국 공문서 텍스트를 얼마나 정확히 읽나"를 정답 대비 측정.
// 실행: npm run eval:build
// ============================================================

import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { categoryKoToId } from '../server/lib/domain/doc-categories.js';

const LABELS_DIR = process.env.AIHUB_LABELS_DIR ?? './data/aihub/labels_validation';
const EVAL_OUT = process.env.EVAL_SET ?? './data/eval/doc-eval.json';
const SAMPLE = Number(process.env.EVAL_SAMPLE ?? 200); // 비용 절감용 표본 상한(문서 수)

export interface EvalDoc {
  imageFileName: string; // 원천 jpg 파일명 (run-benchmark가 경로 해석)
  categoryId: string; // 행정분야 정답(보조 지표·분해용)
  goldTexts: string[]; // 정답 텍스트(주 지표: 인식 recall 기준)
}

function walkJson(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkJson(p));
    else if (name.endsWith('.json')) out.push(p);
  }
  return out;
}

/** 정답 텍스트 정제: 너무 짧거나 불용 토큰 제거(인식 평가에 의미 있는 항목만). */
function cleanGold(texts: string[]): string[] {
  const stop = new Set(['끝.', '같이', '의거', '따른', '및', '제']);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of texts) {
    const t = (raw ?? '').trim();
    if (t.length < 2 || stop.has(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function main() {
  let files: string[];
  try {
    files = walkJson(LABELS_DIR);
  } catch {
    console.log(`[eval:build] 라벨 디렉터리 없음: ${LABELS_DIR} (먼저 AI Hub 88 라벨 다운로드)`);
    return;
  }

  // 결정적 균등 표본 — 실행마다 동일, 분야 편중 완화.
  files.sort();
  const step = Math.max(1, Math.floor(files.length / SAMPLE));
  const picked = files.filter((_, i) => i % step === 0).slice(0, SAMPLE);

  const docs: EvalDoc[] = [];
  for (const f of picked) {
    try {
      const d = JSON.parse(readFileSync(f, 'utf8'));
      const img = d.images?.[0] ?? {};
      const goldTexts = cleanGold((d.annotations ?? []).map((a: any) => a['annotation.text']));
      if (goldTexts.length === 0) continue;
      docs.push({
        imageFileName: img['image.file.name'] ?? '',
        categoryId: categoryKoToId(img['image.category'] ?? ''),
        goldTexts,
      });
    } catch {
      /* skip malformed */
    }
  }

  mkdirSync(dirname(EVAL_OUT), { recursive: true });
  writeFileSync(EVAL_OUT, JSON.stringify(docs, null, 2), 'utf8');
  console.log(`[eval:build] 라벨 ${files.length}개 → 표본 ${docs.length}개 평가문서 → ${EVAL_OUT}`);
}

main();
