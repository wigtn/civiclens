// ============================================================
// server/lib/db/record-store.ts — Record 인메모리 저장소(FR-008)
// 비식별 구조화 필드만 저장(FR-015). 자유서술 금지.
// 로컬 전용: 프로세스 메모리(재시작 시 휘발). guest 90일 TTL.
// 통합 시 동일 인터페이스로 Firestore/Postgres 교체.
// ============================================================

import { randomUUID } from 'node:crypto';
import type { LangCode, RecordVisit, RecordEntry } from '@contract/api';
import { RECORD_TTL_MS } from '@/lib/config';

interface StoredRecord {
  recordId: string;
  ownerId: string | null; // author=uid, guest=null
  sessionId: string;
  language: LangCode;
  visits: RecordVisit[];
  piiScrubbed: boolean;
  createdAt: number;
  expiresAt: number;
}

// Next.js 라우트별 모듈 분리 환경에서도 한 프로세스 내 동일 저장소를 쓰도록
// globalThis 에 Map 을 싱글턴으로 보관(POST /records ↔ GET /records/:id 공유).
const g = globalThis as typeof globalThis & { __civiclensRecordStore?: Map<string, StoredRecord> };
const store: Map<string, StoredRecord> = (g.__civiclensRecordStore ??= new Map());

function pruneExpired(): void {
  const now = Date.now();
  for (const [id, rec] of store) {
    if (rec.expiresAt <= now) store.delete(id);
  }
}

export interface CreateRecordInput {
  sessionId: string;
  language: LangCode;
  visits: RecordVisit[]; // 이미 PII 파이프라인 통과한 visits
  ownerId?: string | null;
}

export function createRecord(input: CreateRecordInput): StoredRecord {
  pruneExpired();
  const now = Date.now();
  const rec: StoredRecord = {
    recordId: randomUUID(),
    ownerId: input.ownerId ?? null,
    sessionId: input.sessionId,
    language: input.language,
    visits: input.visits,
    piiScrubbed: true,
    createdAt: now,
    expiresAt: now + RECORD_TTL_MS,
  };
  store.set(rec.recordId, rec);
  return rec;
}

export function getRecord(recordId: string): StoredRecord | null {
  pruneExpired();
  return store.get(recordId) ?? null;
}

/** sessionId 또는 ownerId 기준 목록(최신순). */
export function listRecords(filter: { sessionId?: string; ownerId?: string }): StoredRecord[] {
  pruneExpired();
  const all = [...store.values()];
  const filtered = all.filter((r) => {
    if (filter.sessionId && r.sessionId !== filter.sessionId) return false;
    if (filter.ownerId && r.ownerId !== filter.ownerId) return false;
    return true;
  });
  return filtered.sort((a, b) => b.createdAt - a.createdAt);
}

/** contract RecordEntry 형태로 직렬화. */
export function toEntry(rec: StoredRecord): RecordEntry {
  return {
    recordId: rec.recordId,
    language: rec.language,
    visits: rec.visits,
    createdAt: rec.createdAt,
  };
}

/** 테스트용: 저장소 초기화. */
export function __resetRecords(): void {
  store.clear();
}
