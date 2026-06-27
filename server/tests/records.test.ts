import { describe, it, expect, beforeEach } from 'vitest';
import { POST, GET } from '@/app/api/v1/records/route';
import { GET as GET_DETAIL } from '@/app/api/v1/records/[id]/route';
import { issueSessionToken } from '@/lib/security/session-token';
import { __resetRecords, listRecords } from '@/lib/db/record-store';
import type { ApiResponse, CreateRecordResponse, RecordEntry } from '@contract/api';

beforeEach(() => __resetRecords());

const SESSION_ID = 'sess-test-1';

function postReq(token: string | null, body: unknown): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new Request('http://localhost:3001/api/v1/records', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function getReq(token: string | null): Request {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new Request('http://localhost:3001/api/v1/records', { headers });
}

describe('POST /records: 인증', () => {
  it('세션 토큰 없으면 401', async () => {
    const res = await POST(postReq(null, { sessionId: SESSION_ID, language: 'ko', visits: [] }) as never);
    expect(res.status).toBe(401);
  });

  it('토큰 sessionId 와 body sessionId 불일치 시 403', async () => {
    const token = issueSessionToken(SESSION_ID);
    const res = await POST(
      postReq(token, { sessionId: 'other', language: 'ko', visits: [{ docTypeId: 'x' }] }) as never,
    );
    expect(res.status).toBe(403);
  });
});

describe('POST /records: PII 파이프라인(FR-015)', () => {
  it('noteSafe 에 강한 PII 가 있으면 422 PII_DETECTED 이고 저장되지 않는다', async () => {
    const token = issueSessionToken(SESSION_ID);
    const res = await POST(
      postReq(token, {
        sessionId: SESSION_ID,
        language: 'ko',
        visits: [{ docTypeId: 'resident_registration_move', noteSafe: '내 번호 010-1234-5678' }],
      }) as never,
    );
    expect(res.status).toBe(422);
    const json = (await res.json()) as ApiResponse<unknown>;
    expect(json.success).toBe(false);
    if (!json.success) expect(json.error.code).toBe('PII_DETECTED');
    // 저장소에 아무것도 없어야 함(PII 스캔 테스트)
    expect(listRecords({ sessionId: SESSION_ID }).length).toBe(0);
  });

  it('저장된 데이터에는 강한 PII 가 절대 남지 않는다', async () => {
    const token = issueSessionToken(SESSION_ID);
    // 약한 PII(인명)는 마스킹 후 통과
    const res = await POST(
      postReq(token, {
        sessionId: SESSION_ID,
        language: 'ko',
        visits: [{ docTypeId: 'resident_registration_move', noteSafe: '담당자 홍길동 안내 완료' }],
      }) as never,
    );
    expect(res.status).toBe(201);
    const stored = listRecords({ sessionId: SESSION_ID });
    expect(stored.length).toBe(1);
    expect(stored[0].piiScrubbed).toBe(true);
    expect(stored[0].visits[0].noteSafe).not.toContain('홍길동');
  });
});

describe('POST /records: 비식별 구조화 강제(FR-015)', () => {
  it('docTypeId 없는 visit 은 400', async () => {
    const token = issueSessionToken(SESSION_ID);
    const res = await POST(
      postReq(token, { sessionId: SESSION_ID, language: 'ko', visits: [{ noteSafe: 'x' }] }) as never,
    );
    expect(res.status).toBe(400);
  });

  it('자유서술 등 미허용 필드는 저장 시 제거된다', async () => {
    const token = issueSessionToken(SESSION_ID);
    await POST(
      postReq(token, {
        sessionId: SESSION_ID,
        language: 'ko',
        visits: [{ docTypeId: 'd1', summary: '자유서술 금지 필드', guidedFieldKeys: ['세대주'] }],
      }) as never,
    );
    const stored = listRecords({ sessionId: SESSION_ID });
    expect(stored.length).toBe(1);
    expect(Object.keys(stored[0].visits[0])).not.toContain('summary');
    expect(stored[0].visits[0].guidedFieldKeys).toEqual(['세대주']);
  });
});

describe('GET /records & /records/:id: 소유권', () => {
  it('생성 후 목록·상세를 본인 세션으로 조회한다', async () => {
    const token = issueSessionToken(SESSION_ID);
    const createRes = await POST(
      postReq(token, {
        sessionId: SESSION_ID,
        language: 'ko',
        visits: [{ docTypeId: 'd1' }],
      }) as never,
    );
    const created = (await createRes.json()) as ApiResponse<CreateRecordResponse>;
    expect(created.success).toBe(true);
    const recordId = created.success ? created.data.recordId : '';

    const listRes = await GET(getReq(token) as never);
    const list = (await listRes.json()) as ApiResponse<{ records: RecordEntry[] }>;
    expect(list.success && list.data.records.length).toBe(1);

    const detailRes = await GET_DETAIL(getReq(token) as never, {
      params: Promise.resolve({ id: recordId }),
    });
    expect(detailRes.status).toBe(200);
  });

  it('타 세션 토큰으로 상세 접근 시 403', async () => {
    const ownerToken = issueSessionToken(SESSION_ID);
    const createRes = await POST(
      postReq(ownerToken, { sessionId: SESSION_ID, language: 'ko', visits: [{ docTypeId: 'd1' }] }) as never,
    );
    const created = (await createRes.json()) as ApiResponse<CreateRecordResponse>;
    const recordId = created.success ? created.data.recordId : '';

    const otherToken = issueSessionToken('sess-other');
    const detailRes = await GET_DETAIL(getReq(otherToken) as never, {
      params: Promise.resolve({ id: recordId }),
    });
    expect(detailRes.status).toBe(403);
  });
});
