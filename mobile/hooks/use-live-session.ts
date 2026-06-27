// use-live-session — 연결/말하기/듣기/tool-call 상태머신.
// contract(realtime.ts) 의 LiveSessionApi 를 구현하고, 화면에는 전사·도구 로그를 더 노출.
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  LiveStatus,
  LiveSessionConfig,
  LiveSessionApi,
  ServerEvent,
} from '@contract/realtime';
import type { LangCode, RecordVisit, RecognizeResponse, RagQueryResponse } from '@contract/api';
import type { ExplainFieldArgs } from '@contract/tools';
import { connectRealtime, type RealtimeTransport } from '@/lib/openai/realtime-ws';
import { connectMockRealtime } from '@/lib/openai/mock-realtime';
import { createMicCapture, createPcmPlayer, type MicCapture, type PcmPlayer } from '@/lib/audio';
import { dispatchTool, type ToolContext } from '@/lib/tool-dispatch';
import { USE_MOCK } from '@/lib/api-client';
import { getJourney, type CivicJourney } from '@/lib/journey';

/** B — Grounding Sentinel: 답이 AI Hub RAG 근거에 기반했는지. */
export interface GroundingInfo {
  grounded: boolean;
  sourceLabel?: string;
}

export interface TranscriptLine {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  final: boolean;
  grounding?: GroundingInfo;
}

export interface UseLiveSessionOptions {
  language: LangCode;
  sessionId: string;
  getFrame?: () => string | null;
  getCoords?: () => { lat: number; lng: number } | null;
  /** confidence<0.5 등 재촬영 유도(FR-014) 트리거를 화면에 알림. */
  onReshoot?: () => void;
}

export interface LiveSession extends LiveSessionApi {
  transcripts: TranscriptLine[];
  lastError: { code: string; message: string } | null;
  /** A — Civic Journey: 인식된 서류의 민원 전체 여정(없으면 null). */
  journey: CivicJourney | null;
}

export function useLiveSession(options: UseLiveSessionOptions): LiveSession {
  const [status, setStatus] = useState<LiveStatus>('idle');
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [lastError, setLastError] = useState<{ code: string; message: string } | null>(null);
  const [journey, setJourney] = useState<CivicJourney | null>(null);

  const transportRef = useRef<RealtimeTransport | null>(null);
  const micRef = useRef<MicCapture | null>(null);
  const playerRef = useRef<PcmPlayer | null>(null);
  const ctxRef = useRef<ToolContext | null>(null);
  const visitsRef = useRef<RecordVisit[]>([]);
  const seqRef = useRef(0);
  // B: RAG 도구 결과가 들어오면 다음 assistant 답에 붙일 근거를 보관.
  const pendingGroundingRef = useRef<GroundingInfo | null>(null);
  // 질문 1건당 한 번만 근거 배지를 부여(인사말·인식 설명엔 배지 금지). 답변 소비 시 해제.
  const awaitingAnswerRef = useRef(false);

  // recognize_document 결과 → 방문 기록 누적. explain_field → 안내한 칸 키 append.
  // create_record(visits min 1)가 contract-valid 하도록 세션 상태를 모은다.
  const trackVisit = useCallback((name: string, args: unknown, result: unknown) => {
    if (name === 'recognize_document') {
      const r = result as RecognizeResponse;
      if (r?.docTypeId && !visitsRef.current.some((v) => v.docTypeId === r.docTypeId)) {
        visitsRef.current.push({ docTypeId: r.docTypeId, guidedFieldKeys: [] });
      }
    } else if (name === 'explain_field') {
      const a = args as ExplainFieldArgs;
      const visit = visitsRef.current.find((v) => v.docTypeId === a?.docTypeId);
      if (visit && a?.fieldKey && !visit.guidedFieldKeys?.includes(a.fieldKey)) {
        visit.guidedFieldKeys = [...(visit.guidedFieldKeys ?? []), a.fieldKey];
      }
    }
  }, []);

  const appendTranscript = useCallback(
    (role: 'user' | 'assistant', text: string, final: boolean, grounding?: GroundingInfo) => {
      setTranscripts((prev) => {
        // 같은 역할의 비-final 라인은 이어붙여 갱신.
        const last = prev[prev.length - 1];
        if (last && last.role === role && !last.final) {
          const merged = {
            ...last,
            text: final ? text || last.text : last.text + text,
            final,
            grounding: grounding ?? last.grounding,
          };
          return [...prev.slice(0, -1), merged];
        }
        return [...prev, { id: `t${seqRef.current++}`, role, text, final, grounding }];
      });
    },
    [],
  );

  const handleEvent = useCallback(
    async (event: ServerEvent) => {
      switch (event.kind) {
        case 'status':
          setStatus(event.status);
          break;
        case 'audio_delta':
          playerRef.current?.enqueue(event.pcmBase64);
          break;
        case 'transcript': {
          // B: 질문에 대한 답변(이번 턴)에만 근거 배지. 인식 설명·인사말 제외.
          let grounding: GroundingInfo | undefined;
          if (event.role === 'assistant' && event.final && awaitingAnswerRef.current) {
            grounding = pendingGroundingRef.current ?? { grounded: false };
            pendingGroundingRef.current = null;
            awaitingAnswerRef.current = false; // 한 질문당 1회 소비
          }
          appendTranscript(event.role, event.text, event.final, grounding);
          break;
        }
        case 'tool_call': {
          const ctx = ctxRef.current;
          if (!ctx) return;
          const out = await dispatchTool(event.name, event.args, ctx);
          if (out.ok) {
            trackVisit(event.name, event.args, out.result);
            // A: 서류 인식되면 그 민원의 전체 여정을 구성.
            if (event.name === 'recognize_document' && 'docTypeId' in out.result) {
              setJourney(getJourney((out.result as RecognizeResponse).docTypeId, options.language));
            }
            // B: RAG 도구가 매치를 반환하면 다음 답변을 "근거 있음"으로 표시.
            if (event.name === 'lookup_admin_term' || event.name === 'translate_notice') {
              const rag = out.result as RagQueryResponse;
              if (rag?.matches?.length) {
                pendingGroundingRef.current = { grounded: true, sourceLabel: rag.matches[0].sourceLabel };
              }
            }
            // FR-014: recognize 결과 confidence<0.5 → 재촬영 유도.
            if (
              event.name === 'recognize_document' &&
              'confidence' in out.result &&
              (out.result as { confidence: number }).confidence < 0.5
            ) {
              options.onReshoot?.();
            }
          }
          transportRef.current?.send({
            kind: 'tool_result',
            callId: event.callId,
            output: out.ok ? out.result : { error: out.error },
          });
          break;
        }
        case 'error':
          setLastError({ code: event.code, message: event.message });
          setStatus('error');
          break;
      }
    },
    [appendTranscript, trackVisit, options],
  );

  const start = useCallback(
    async (config: LiveSessionConfig) => {
      setLastError(null);
      setStatus('connecting');
      setJourney(null);
      visitsRef.current = [];
      pendingGroundingRef.current = null;
      awaitingAnswerRef.current = false;
      ctxRef.current = {
        language: options.language,
        sessionId: options.sessionId,
        sessionToken: config.sessionToken,
        getFrame: options.getFrame,
        getCoords: options.getCoords,
        getVisits: () => visitsRef.current,
      };
      playerRef.current = createPcmPlayer();
      // mock 모드면 오프라인 transport 사용(OpenAI·백엔드 불필요).
      const connect = USE_MOCK ? connectMockRealtime : connectRealtime;
      transportRef.current = connect(config, (e) => {
        void handleEvent(e);
      });
      // mock 모드는 마이크 PCM 경로가 없으므로 권한 요청·캡처를 건너뛴다.
      if (!USE_MOCK) {
        micRef.current = createMicCapture((pcmBase64) => {
          transportRef.current?.send({ kind: 'audio', pcmBase64 });
        });
        try {
          await micRef.current.start();
        } catch (e) {
          setLastError({ code: 'MIC_PERMISSION', message: String(e) });
          setStatus('error');
        }
      }
    },
    [handleEvent, options],
  );

  const stop = useCallback(() => {
    void micRef.current?.stop();
    transportRef.current?.close();
    playerRef.current?.reset();
    micRef.current = null;
    transportRef.current = null;
    playerRef.current = null;
    ctxRef.current = null;
    setStatus('idle');
  }, []);

  const sendText = useCallback((text: string) => {
    awaitingAnswerRef.current = true;
    transportRef.current?.send({ kind: 'text', text });
  }, []);

  const pushFrame = useCallback((jpegBase64: string) => {
    transportRef.current?.send({ kind: 'image', jpegBase64 });
  }, []);

  // 언마운트 시 정리.
  useEffect(() => stop, [stop]);

  return { status, start, stop, sendText, pushFrame, transcripts, lastError, journey };
}
