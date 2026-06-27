// tool-dispatch — 모델의 Function Call(ServerEvent 'tool_call') 을
// api-client 호출로 라우팅하고, 결과(ToolResultMap)를 세션에 다시 주입한다.
// 라우팅 키/타입은 전부 shared/contract/tools.ts 에만 의존.
import type {
  ToolName,
  ToolArgMap,
  ToolResultMap,
} from '@contract/tools';
import type { LangCode, RecordVisit } from '@contract/api';
import { apiClient, ApiClientError } from './api-client';

export interface ToolContext {
  language: LangCode;
  sessionId: string;
  sessionToken: string;
  /** recognize_document 시 현재 카메라 프레임(jpeg base64)을 끌어오는 콜백. */
  getFrame?: () => string | null;
  /** discover_office 시 현재 좌표. */
  getCoords?: () => { lat: number; lng: number } | null;
  /** create_record 시 세션 중 인식한 방문 기록(비식별 구조화 필드, min 1). */
  getVisits?: () => RecordVisit[];
}

/** 모델이 다시 읽을 수 있도록 항상 직렬화 가능한 객체를 반환한다. */
export type ToolOutput =
  | { ok: true; result: ToolResultMap[ToolName] }
  | { ok: false; error: { code: string; message: string } };

async function run<T extends ToolName>(
  name: T,
  rawArgs: unknown,
  ctx: ToolContext,
): Promise<ToolResultMap[T]> {
  const args = (rawArgs ?? {}) as ToolArgMap[T];

  switch (name) {
    case 'recognize_document': {
      const a = args as ToolArgMap['recognize_document'];
      const frame = ctx.getFrame?.() ?? '';
      const res = await apiClient.recognize(
        { imageBase64: frame, language: a.language ?? ctx.language },
        ctx.sessionToken,
      );
      return res as ToolResultMap[T];
    }
    case 'explain_field': {
      const a = args as ToolArgMap['explain_field'];
      // endpoint 없음(모델 추론) — RAG 로 용어를 grounding 해 단계 텍스트로 구성.
      const rag = await apiClient.ragQuery(
        { query: a.fieldKey, targetLang: a.language ?? ctx.language, source: 'admin_term' },
        ctx.sessionToken,
      );
      const steps = rag.matches.length
        ? [rag.matches[0].definition, rag.matches[0].translation].filter(Boolean)
        : [];
      return { steps } as ToolResultMap[T];
    }
    case 'lookup_admin_term': {
      const a = args as ToolArgMap['lookup_admin_term'];
      const res = await apiClient.ragQuery(
        { query: a.term, targetLang: a.targetLang ?? ctx.language, source: 'admin_term' },
        ctx.sessionToken,
      );
      return res as ToolResultMap[T];
    }
    case 'translate_notice': {
      const a = args as ToolArgMap['translate_notice'];
      const res = await apiClient.ragQuery(
        { query: a.text, targetLang: a.targetLang ?? ctx.language, source: 'legal_translation' },
        ctx.sessionToken,
      );
      return res as ToolResultMap[T];
    }
    case 'create_record': {
      const a = args as ToolArgMap['create_record'];
      const res = await apiClient.createRecord(
        {
          sessionId: a.sessionId ?? ctx.sessionId,
          language: ctx.language,
          visits: ctx.getVisits?.() ?? [],
        },
        ctx.sessionToken,
      );
      return res as ToolResultMap[T];
    }
    case 'discover_office': {
      const a = args as ToolArgMap['discover_office'];
      const coords = ctx.getCoords?.();
      const res = await apiClient.officesNearby(
        {
          lat: a.lat ?? coords?.lat ?? 0,
          lng: a.lng ?? coords?.lng ?? 0,
          radiusKm: a.radiusKm,
        },
        ctx.sessionToken,
      );
      return res as ToolResultMap[T];
    }
    default: {
      // 모든 ToolName 을 처리했는지 컴파일 타임 보장.
      const _exhaustive: never = name;
      throw new Error(`Unknown tool: ${String(_exhaustive)}`);
    }
  }
}

/** 단일 tool_call 처리 진입점 — use-live-session 이 호출. 절대 throw 하지 않는다. */
export async function dispatchTool(
  name: ToolName,
  args: unknown,
  ctx: ToolContext,
): Promise<ToolOutput> {
  try {
    const result = await run(name, args, ctx);
    return { ok: true, result };
  } catch (e) {
    if (e instanceof ApiClientError) {
      return { ok: false, error: { code: e.code, message: e.message } };
    }
    return { ok: false, error: { code: 'INVALID_REQUEST', message: String(e) } };
  }
}
