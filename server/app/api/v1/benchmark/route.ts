// ============================================================
// GET /api/v1/benchmark — 최신 인식 정확도(BenchmarkRun) 반환 (C 도메인, B 앱에 wiring)
// /benchmark 대시보드(A)가 "서식 텍스트 인식 정확도 OO%" 표시에 사용.
// 데모/심사용 내부 화면 — 인증은 데모 단순화를 위해 생략(CORS만).
// 출처: PRD §5.1 /benchmark, FR-012
// ============================================================

import type { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/http/respond';
import { preflight } from '@/lib/security/cors';
import { readLatestBenchmark } from '@/lib/domain/benchmark-store';

export const runtime = 'nodejs';

export function OPTIONS(req: NextRequest) {
  return preflight(req.headers.get('origin'));
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const latest = await readLatestBenchmark();
  if (!latest) {
    return fail('NOT_FOUND', {
      message: '아직 벤치마크 실행 기록이 없습니다 (npm run benchmark).',
      origin,
    });
  }
  return ok(latest, { origin });
}
