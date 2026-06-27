// ============================================================
// scripts/build-eval-set.ts — 👤 C  (FR-012)
// AI Hub 공공행정문서 OCR 라벨에서 "문서종류 분류" 평가셋(hold-out) 분리.
// 실행: npm run eval:build
// ⚠️ 데이터 누수 방지: 여기서 분리한 hold-out은 RAG 인덱스/few-shot에서 제외.
// ============================================================

import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface EvalItem {
  imagePath: string; // data/aihub/...  (gitignore)
  goldDocTypeId: string; // 정답 라벨
}

const EVAL_OUT = process.env.EVAL_SET ?? './data/eval/doc-classification.json';
const HOLDOUT_RATIO = 0.2;

// TODO(C): AI Hub OCR 라벨(JSON/CSV)에서 (이미지경로, 문서종류) 쌍 로드.
async function loadLabeled(): Promise<EvalItem[]> {
  return []; // 실제 라벨 연결 전 빈 배열
}

/** 결정적 분할(해시 기반) — 실행마다 동일 hold-out 보장(누수/재현성). */
function isHoldout(key: string): boolean {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return (h % 100) / 100 < HOLDOUT_RATIO;
}

async function main() {
  const all = await loadLabeled();
  const holdout = all.filter((it) => isHoldout(it.imagePath));
  await mkdir(dirname(EVAL_OUT), { recursive: true });
  await writeFile(EVAL_OUT, JSON.stringify(holdout, null, 2), 'utf8');
  console.log(`[eval:build] 전체 ${all.length} → hold-out ${holdout.length}건 → ${EVAL_OUT}`);
  if (all.length === 0) console.log('  (TODO: loadLabeled에 AI Hub 라벨 연결 필요)');
}

main().catch((e) => {
  console.error('[eval:build] 실패:', e);
  process.exit(1);
});
