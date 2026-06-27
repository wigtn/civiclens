// ============================================================
// server/api/v1/benchmark/handler.ts — 👤 C
// GET /api/v1/benchmark — 최신 BenchmarkRun 집계 반환.
// run-benchmark.ts가 기록한 결과를 읽어 대시보드(A)에 제공.
// (admin 인증은 B가 라우트에서 적용)
// ============================================================

import type { ApiResponse, BenchmarkResponse } from '@contract/api';
import { readLatestBenchmark } from '../../../lib/domain/benchmark-store.js';

export async function benchmarkHandler(): Promise<ApiResponse<BenchmarkResponse>> {
  const latest = await readLatestBenchmark();
  if (!latest) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: '아직 벤치마크 실행 기록이 없습니다 (npm run benchmark)', retryable: false },
    };
  }
  return { success: true, data: latest };
}
