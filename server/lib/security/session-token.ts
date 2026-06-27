// ============================================================
// server/lib/security/session-token.ts — tool-call 핸들러용 단명 토큰
// realtime/session 발급 시 함께 내려주는 sessionToken(§5.1 인증 흐름).
// /rag/query·/records 등 도구 핸들러가 이 토큰을 검증한다.
// 로컬 전용: 프로세스 단위 HMAC 서명(stateless). 비밀키 미노출.
// ============================================================

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { SESSION_TOKEN_TTL_SEC } from '@/lib/config';

// 서명 비밀. Next.js 는 라우트마다 모듈 인스턴스를 분리하므로(dev/serverless),
// globalThis 에 보관해 한 프로세스 내 모든 라우트가 동일 키로 서명·검증하게 한다.
// 환경변수 우선, 없으면 프로세스 1회 랜덤(재시작 시 기존 토큰 무효 — 데모 OK).
const g = globalThis as typeof globalThis & { __civiclensTokenSecret?: string };
const SIGNING_SECRET =
  g.__civiclensTokenSecret ??
  (g.__civiclensTokenSecret =
    process.env.CIVICLENS_TOKEN_SECRET ?? randomBytes(32).toString('hex'));

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sign(payload: string): string {
  return b64url(createHmac('sha256', SIGNING_SECRET).update(payload).digest());
}

export interface SessionTokenClaims {
  sessionId: string;
  exp: number; // epoch ms
}

/** 단명 세션 토큰 발급: base64url(payload).signature */
export function issueSessionToken(sessionId: string): string {
  const exp = Date.now() + SESSION_TOKEN_TTL_SEC * 1000;
  const claims: SessionTokenClaims = { sessionId, exp };
  const payload = b64url(Buffer.from(JSON.stringify(claims), 'utf8'));
  return `${payload}.${sign(payload)}`;
}

/** 토큰 검증. 유효하면 claims, 아니면 null. */
export function verifySessionToken(token: string | null | undefined): SessionTokenClaims | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const claims = JSON.parse(json) as SessionTokenClaims;
    if (typeof claims.exp !== 'number' || Date.now() > claims.exp) return null;
    if (typeof claims.sessionId !== 'string' || !claims.sessionId) return null;
    return claims;
  } catch {
    return null;
  }
}

/** 요청 헤더에서 세션 토큰 추출(Authorization: Bearer / X-Session-Token). */
export function extractSessionToken(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return req.headers.get('x-session-token');
}
