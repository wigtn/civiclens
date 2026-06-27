// ============================================================
// POST /api/v1/records — 민원 처리 기록 생성(create_record 핸들러, FR-008)
// GET  /api/v1/records — 본인 세션 기록 목록(FR-009 목록)
// 가드: CORS → 세션 토큰 검증 → (POST) 비식별 구조화 강제 + PII 파이프라인(FR-015)
// 출처: PRD §5.1 /records, §4.5 PII / shared/contract Create*·Record*
// ============================================================

import type { NextRequest } from 'next/server';
import type {
  CreateRecordRequest,
  CreateRecordResponse,
  RecordVisit,
} from '@contract/api';
import { ok, fail } from '@/lib/http/respond';
import { readJson, isLangCode, isNonEmptyString } from '@/lib/http/validate';
import { extractSessionToken, verifySessionToken } from '@/lib/security/session-token';
import { scrubPii } from '@/lib/security/pii-scrub';
import { createRecord, listRecords, toEntry } from '@/lib/db/record-store';
import { preflight } from '@/lib/security/cors';

export const runtime = 'nodejs';

export function OPTIONS(req: NextRequest) {
  return preflight(req.headers.get('origin'));
}

/** 비식별 구조화 필드만 추출(자유서술 차단, FR-015). */
function sanitizeVisit(raw: unknown): RecordVisit | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Record<string, unknown>;
  if (!isNonEmptyString(v.docTypeId)) return null;

  const visit: RecordVisit = { docTypeId: v.docTypeId };
  if (Array.isArray(v.guidedFieldKeys)) {
    visit.guidedFieldKeys = v.guidedFieldKeys.filter((k): k is string => typeof k === 'string');
  }
  if (typeof v.noteSafe === 'string') {
    visit.noteSafe = v.noteSafe;
  }
  return visit;
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');

  // 1) 세션 토큰 검증(§5.1 tool-call 인증 흐름)
  const claims = verifySessionToken(extractSessionToken(req));
  if (!claims) {
    return fail('UNAUTHORIZED', { message: '유효한 세션 토큰이 필요합니다.', origin });
  }

  // 2) 본문 검증
  const body = await readJson<CreateRecordRequest>(req);
  if (!body || !isLangCode(body.language) || !isNonEmptyString(body.sessionId)) {
    return fail('INVALID_INPUT', { origin });
  }
  if (body.sessionId !== claims.sessionId) {
    return fail('FORBIDDEN', { message: '세션 토큰과 sessionId 가 일치하지 않습니다.', origin });
  }
  if (!Array.isArray(body.visits) || body.visits.length < 1) {
    return fail('INVALID_INPUT', { message: 'visits 는 최소 1건이 필요합니다.', origin });
  }

  // 3) 비식별 구조화 강제 + PII 파이프라인(FR-015)
  const cleanVisits: RecordVisit[] = [];
  for (const raw of body.visits) {
    const visit = sanitizeVisit(raw);
    if (!visit) {
      return fail('INVALID_INPUT', { message: 'visit 형식이 올바르지 않습니다.', origin });
    }
    if (visit.noteSafe !== undefined) {
      const scrub = scrubPii(visit.noteSafe);
      if (!scrub.ok) {
        // 강한 식별자 탐지 → 저장 거부
        return fail('PII_DETECTED', {
          message: `개인식별정보가 감지되었습니다(${scrub.hits
            .filter((h) => h.blocking)
            .map((h) => h.category)
            .join(', ')}).`,
          origin,
        });
      }
      visit.noteSafe = scrub.scrubbed; // 약한 식별자 마스킹 반영
    }
    cleanVisits.push(visit);
  }

  // 4) 저장
  try {
    const rec = createRecord({
      sessionId: body.sessionId,
      language: body.language,
      visits: cleanVisits,
    });
    const data: CreateRecordResponse = {
      recordId: rec.recordId,
      createdAt: rec.createdAt,
      piiScrubbed: true,
    };
    return ok(data, { status: 201, origin });
  } catch (err) {
    console.error('[records] create failed:', err);
    return fail('RECORD_FAILED', { origin });
  }
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  // 로컬/게스트 데모: 세션 토큰은 선택. 있으면 해당 세션으로 스코프, 없으면 전체.
  // (mobile api-client.listRecords 는 토큰을 전송하지 않음 — 로컬 단일 디바이스 기준)
  // ⚠️ 프로덕션(author 클라우드, FR-009)에서는 토큰 필수 + ownerId 스코프로 강화 필요.
  const claims = verifySessionToken(extractSessionToken(req));
  const entries = listRecords(claims ? { sessionId: claims.sessionId } : {}).map(toEntry);
  // api-client 는 data 로 RecordEntry[] (배열)을 기대 → 래핑하지 않는다(my.tsx FlatList).
  return ok(entries, { origin });
}
