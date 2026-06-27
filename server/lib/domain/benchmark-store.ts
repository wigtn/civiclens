// ============================================================
// server/lib/domain/benchmark-store.ts — 👤 C
// BenchmarkRun 영속화(MVP는 JSON 파일). run-benchmark.ts가 쓰고
// benchmark handler가 읽는다. 운영 시 DB 테이블로 교체.
// ============================================================

import type { BenchmarkResponse } from '@contract/api';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const STORE_PATH = process.env.BENCHMARK_STORE ?? './data/benchmark/latest.json';

export async function writeBenchmark(run: BenchmarkResponse): Promise<void> {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(run, null, 2), 'utf8');
}

export async function readLatestBenchmark(): Promise<BenchmarkResponse | null> {
  try {
    const raw = await readFile(STORE_PATH, 'utf8');
    return JSON.parse(raw) as BenchmarkResponse;
  } catch {
    return null;
  }
}
