// ============================================================
// server/lib/http/validate.ts — 가벼운 요청 검증 유틸
// ============================================================

import type { LangCode, SessionMode, RagSource } from '@contract/api';

const LANGS: LangCode[] = ['ko', 'en', 'zh', 'vi', 'th'];
const MODES: SessionMode[] = ['document', 'kiosk'];
const RAG_SOURCES: RagSource[] = ['admin_term', 'legal_translation', 'office'];

export function isLangCode(v: unknown): v is LangCode {
  return typeof v === 'string' && (LANGS as string[]).includes(v);
}
export function isSessionMode(v: unknown): v is SessionMode {
  return typeof v === 'string' && (MODES as string[]).includes(v);
}
export function isRagSource(v: unknown): v is RagSource {
  return typeof v === 'string' && (RAG_SOURCES as string[]).includes(v);
}
export function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

/** JSON 본문을 안전하게 파싱. 실패 시 null. */
export async function readJson<T = unknown>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
