// ============================================================
// server/lib/rag/vector-store.ts — 👤 C
// 벡터스토어 추상화. MVP는 in-memory 코사인 검색.
// 운영 전환 시 PgVectorStore 등으로 교체(인터페이스 유지).
// ============================================================

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { LangCode, RagSource } from '@contract/api';

export interface VectorRecord {
  id: string;
  source: RagSource;
  term_ko: string;
  translations: Partial<Record<LangCode, string>>;
  definition: string;
  sourceLabel: string; // AI Hub 데이터셋 출처
  embedding: number[];
}

export interface VectorHit {
  record: VectorRecord;
  score: number;
}

export interface VectorStore {
  upsert(records: VectorRecord[]): Promise<void>;
  query(embedding: number[], topK: number, source?: RagSource): Promise<VectorHit[]>;
  size(): Promise<number>;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

/** MVP 기본 구현. 프로세스 메모리에 보관(데모/소규모 인덱스 충분). */
export class InMemoryVectorStore implements VectorStore {
  private records: VectorRecord[] = [];

  async upsert(records: VectorRecord[]): Promise<void> {
    const byId = new Map(this.records.map((r) => [r.id, r]));
    for (const r of records) byId.set(r.id, r);
    this.records = [...byId.values()];
  }

  async query(embedding: number[], topK: number, source?: RagSource): Promise<VectorHit[]> {
    const pool = source ? this.records.filter((r) => r.source === source) : this.records;
    return pool
      .map((record) => ({ record, score: cosine(embedding, record.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async size(): Promise<number> {
    return this.records.length;
  }
}

/** 인덱스 파일(JSON) 저장 — ingest 스크립트가 호출. */
export function saveIndex(records: VectorRecord[], path = indexPath()): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(records), 'utf8');
}

function indexPath(): string {
  return process.env.RAG_INDEX_PATH ?? './data/rag/index.json';
}

let _store: VectorStore | null = null;

/**
 * 벡터스토어 반환. 최초 호출 시 RAG_INDEX_PATH(JSON)이 있으면 로드한다
 * → ingest 프로세스와 서버 프로세스가 동일 인덱스를 공유(in-memory 한계 보완).
 */
export function getVectorStore(): VectorStore {
  if (_store) return _store;
  const store = new InMemoryVectorStore();
  try {
    const records = JSON.parse(readFileSync(indexPath(), 'utf8')) as VectorRecord[];
    // 동기 로드: upsert는 async지만 내부는 동기 → 즉시 반영
    void store.upsert(records);
  } catch {
    /* 인덱스 파일 없음 → 빈 스토어(쿼리 시 NO_MATCH) */
  }
  _store = store;
  return _store;
}
