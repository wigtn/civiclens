// REST 클라이언트 — shared/contract/api.ts 기반 typed fetch.
// EXPO_PUBLIC_USE_MOCK=1 이면 B/C 없이 contract mock 으로 동작(언블락 전략).
// 에러코드는 contract 의 ApiErrorCode 단일 출처만 사용(하드코딩 금지).
import 'react-native-url-polyfill/auto'; // new URL() 폴리필 — realtime-ws 미로딩 화면(records/benchmark)에서도 보장
import type {
  ApiResponse,
  ApiError,
  ApiErrorCode,
  CreateSessionRequest,
  CreateSessionResponse,
  RagQueryRequest,
  RagQueryResponse,
  RecognizeRequest,
  RecognizeResponse,
  CreateRecordRequest,
  CreateRecordResponse,
  RecordEntry,
  OfficesNearbyQuery,
  OfficesNearbyResponse,
  BenchmarkResponse,
  HealthResponse,
  LangCode,
} from '@contract/api';
import * as mock from './mock';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
/** mock 모드(기본 ON) — '0' 일 때만 실서버. realtime transport 토글에도 사용. */
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== '0';

/** contract ApiError 를 그대로 들고 다니는 예외(화면이 code 로 분기). */
export class ApiClientError extends Error {
  code: ApiErrorCode;
  retryable: boolean;
  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.retryable = error.retryable;
  }
}

interface RequestOpts {
  method?: 'GET' | 'POST';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** realtime/session 이 발급한 단명 토큰(도구 핸들러 호출 인증). */
  sessionToken?: string;
}

function buildUrl(path: string, query?: RequestOpts['query']): string {
  const url = new URL(path, BASE_URL);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = 'GET', body, query, sessionToken } = opts;
  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // 네트워크 단절 등 — retryable 로 표시(가장 가까운 코드로 폴백).
    throw new ApiClientError({
      code: 'SESSION_CREATE_FAILED',
      message: 'Network request failed',
      retryable: true,
    });
  }

  let payload: ApiResponse<T>;
  try {
    payload = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError({
      code: 'INVALID_REQUEST',
      message: `Malformed response (${res.status})`,
      retryable: false,
    });
  }

  if (!payload.success) throw new ApiClientError(payload.error);
  return payload.data;
}

// ---- 엔드포인트별 메서드 (contract §5.1) ---------------------------------
export const apiClient = {
  useMock: USE_MOCK,
  baseUrl: BASE_URL,

  async createSession(req: CreateSessionRequest): Promise<CreateSessionResponse> {
    if (USE_MOCK) return mock.mockSession(req.language);
    return request('/api/v1/realtime/session', { method: 'POST', body: req });
  },

  async recognize(req: RecognizeRequest, sessionToken?: string): Promise<RecognizeResponse> {
    if (USE_MOCK) return mock.mockRecognize(req.language);
    return request('/api/v1/recognize', { method: 'POST', body: req, sessionToken });
  },

  async ragQuery(req: RagQueryRequest, sessionToken?: string): Promise<RagQueryResponse> {
    if (USE_MOCK) return mock.mockRag(req.query);
    return request('/api/v1/rag/query', { method: 'POST', body: req, sessionToken });
  },

  async createRecord(req: CreateRecordRequest, sessionToken?: string): Promise<CreateRecordResponse> {
    if (USE_MOCK) return mock.mockCreateRecord();
    return request('/api/v1/records', { method: 'POST', body: req, sessionToken });
  },

  async listRecords(): Promise<RecordEntry[]> {
    if (USE_MOCK) return mock.mockRecordList();
    return request('/api/v1/records', { method: 'GET' });
  },

  async getRecord(id: string): Promise<RecordEntry> {
    if (USE_MOCK) {
      const r = mock.mockRecord(id);
      if (!r) throw new ApiClientError({ code: 'NOT_FOUND', message: 'Record not found', retryable: false });
      return r;
    }
    return request(`/api/v1/records/${encodeURIComponent(id)}`, { method: 'GET' });
  },

  async officesNearby(q: OfficesNearbyQuery, sessionToken?: string): Promise<OfficesNearbyResponse> {
    if (USE_MOCK) return mock.mockOffices();
    return request('/api/v1/offices/nearby', {
      method: 'GET',
      query: { lat: q.lat, lng: q.lng, radiusKm: q.radiusKm },
      sessionToken,
    });
  },

  async benchmark(): Promise<BenchmarkResponse> {
    if (USE_MOCK) return mock.mockBenchmark();
    return request('/api/v1/benchmark', { method: 'GET' });
  },

  async health(): Promise<HealthResponse> {
    if (USE_MOCK) return { status: 'ok', openai: true, vectorStore: true };
    return request('/api/v1/health', { method: 'GET' });
  },
};

export type { LangCode };
