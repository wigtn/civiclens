// ============================================================
// server/lib/security/cors.ts — Origin 화이트리스트(§4.5)
// 와일드카드 '*' 금지. 허용 Origin 만 반사(reflect).
// ============================================================

import { NextResponse } from 'next/server';
import { ALLOWED_ORIGINS } from '@/lib/config';

export function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

/** 응답에 CORS 헤더를 부착. 허용된 Origin 일 때만 반사한다. */
export function applyCorsHeaders<T extends NextResponse>(res: T, origin?: string | null): T {
  if (origin && isAllowedOrigin(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Vary', 'Origin');
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Token');
    res.headers.set('Access-Control-Max-Age', '600');
  }
  return res;
}

/** Preflight(OPTIONS) 공통 응답. */
export function preflight(origin?: string | null): NextResponse {
  const res = new NextResponse(null, { status: isAllowedOrigin(origin) ? 204 : 403 });
  return applyCorsHeaders(res, origin);
}
