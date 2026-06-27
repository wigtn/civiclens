// use-live-session — 연결/말하기/듣기/tool-call 상태머신.
// contract(realtime.ts) 의 LiveSessionApi 를 구현하고, 화면에는 전사·도구 로그를 더 노출.
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  LiveStatus,
  LiveSessionConfig,
  LiveSessionApi,
  ServerEvent,
} from '@contract/realtime';
import type { LangCode, RecordVisit, RecognizeResponse } from '@contract/api';
import type { ExplainFieldArgs } from '@contract/tools';
import { connectRealtime, type RealtimeTransport } from '@/lib/openai/realtime-ws';
import { createMicCapture, createPcmPlayer, type MicCapture, type PcmPlayer } from '@/lib/audio';
import { dispatchTool, type ToolContext } from '@/lib/tool-dispatch';

export interface TranscriptLine {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  final: boolean;
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
}

export function useLiveSession(options: UseLiveSessionOptions): LiveSession {
  const [status, setStatus] = useState<LiveStatus>('idle');
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [lastError, setLastError] = useState<{ code: string; message: string } | null>(null);

  const transportRef = useRef<RealtimeTransport | null>(null);
  const micRef = useRef<MicCapture | null>(null);
  const playerRef = useRef<PcmPlayer | null>(null);
  const ctxRef = useRef<ToolContext | null>(null);
  const visitsRef = useRef<RecordVisit[]>([]);
  const seqRef = useRef(0);

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

  const appendTranscript = useCallback((role: 'user' | 'assistant', text: string, final: boolean) => {
    setTranscripts((prev) => {
      // 같은 역할의 비-final 라인은 이어붙여 갱신.
      const last = prev[prev.length - 1];
      if (last && last.role === role && !last.final) {
        const merged = { ...last, text: final ? text || last.text : last.text + text, final };
        return [...prev.slice(0, -1), merged];
      }
      return [...prev, { id: `t${seqRef.current++}`, role, text, final }];
    });
  }, []);

  const handleEvent = useCallback(
    async (event: ServerEvent) => {
      switch (event.kind) {
        case 'status':
          setStatus(event.status);
          break;
        case 'audio_delta':
          playerRef.current?.enqueue(event.pcmBase64);
          break;
        case 'transcript':
          appendTranscript(event.role, event.text, event.final);
          break;
        case 'tool_call': {
          const ctx = ctxRef.current;
          if (!ctx) return;
          const out = await dispatchTool(event.name, event.args, ctx);
          if (out.ok) {
            trackVisit(event.name, event.args, out.result);
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
      visitsRef.current = [];
      ctxRef.current = {
        language: options.language,
        sessionId: options.sessionId,
        sessionToken: config.sessionToken,
        getFrame: options.getFrame,
        getCoords: options.getCoords,
        getVisits: () => visitsRef.current,
      };
      playerRef.current = createPcmPlayer();
      transportRef.current = connectRealtime(config, (e) => {
        void handleEvent(e);
      });
      micRef.current = createMicCapture((pcmBase64) => {
        transportRef.current?.send({ kind: 'audio', pcmBase64 });
      });
      try {
        await micRef.current.start();
      } catch (e) {
        setLastError({ code: 'MIC_PERMISSION', message: String(e) });
        setStatus('error');
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
    transportRef.current?.send({ kind: 'text', text });
  }, []);

  const pushFrame = useCallback((jpegBase64: string) => {
    transportRef.current?.send({ kind: 'image', jpegBase64 });
  }, []);

  // 언마운트 시 정리.
  useEffect(() => stop, [stop]);

  return { status, start, stop, sendText, pushFrame, transcripts, lastError };
}
