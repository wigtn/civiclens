// realtime-ws — OpenAI Realtime API(WebSocket) 전송 계층.
// 모바일은 WS 전송으로 통일(PRD §6.1). 비밀키는 절대 없고, 서버가 발급한
// 단명 client secret(ek_…)으로만 연결한다.
// 바깥(use-live-session)에는 contract(realtime.ts)의 ServerEvent/ClientInput 만 노출.
//
// 도구 선언(JSON 스키마)·시스템 프롬프트는 C 소유이며, 서버가 세션 생성 시
// ephemeral 세션에 설정한다. 따라서 클라이언트는 도구를 선언하지 않고
// tool_call 이벤트만 처리한다(소유권 분리).
import 'react-native-url-polyfill/auto';
import type { LiveSessionConfig, ClientInput, ServerEvent } from '@contract/realtime';

const REALTIME_URL = 'wss://api.openai.com/v1/realtime';

type Handler = (event: ServerEvent) => void;

export interface RealtimeTransport {
  send: (input: ClientInput) => void;
  close: () => void;
  isOpen: () => boolean;
}

/** OpenAI Realtime WS 연결을 열고 ServerEvent 스트림으로 변환한다. */
export function connectRealtime(config: LiveSessionConfig, onEvent: Handler): RealtimeTransport {
  const url = `${REALTIME_URL}?model=${encodeURIComponent(config.model)}`;

  // 브라우저/RN WebSocket 은 커스텀 헤더를 못 넣으므로 subprotocol 로 인증.
  const ws = new WebSocket(url, [
    'realtime',
    `openai-insecure-api-key.${config.clientSecret}`,
    'openai-beta.realtime-v1',
  ]);

  ws.onopen = () => {
    onEvent({ kind: 'status', status: 'connected' });
    // 클라이언트가 책임지는 입출력 포맷·턴 감지만 설정.
    sendRaw(ws, {
      type: 'session.update',
      session: {
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        turn_detection: { type: 'server_vad', silence_duration_ms: 600 },
        // 사용자 발화 전사 활성화 — 없으면 user transcript 이벤트가 오지 않음.
        input_audio_transcription: { model: 'gpt-4o-transcribe' },
        voice: config.voice,
      },
    });
  };

  ws.onmessage = (msg) => {
    let ev: any;
    try {
      ev = JSON.parse(typeof msg.data === 'string' ? msg.data : '');
    } catch {
      return;
    }
    const mapped = mapServerEvent(ev);
    if (mapped) onEvent(mapped);
  };

  ws.onerror = () => {
    onEvent({ kind: 'error', code: 'WS_ERROR', message: 'Realtime socket error' });
  };

  ws.onclose = () => {
    onEvent({ kind: 'status', status: 'idle' });
  };

  return {
    isOpen: () => ws.readyState === WebSocket.OPEN,
    close: () => {
      try {
        ws.close();
      } catch {
        /* noop */
      }
    },
    send: (input: ClientInput) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      switch (input.kind) {
        case 'audio':
          sendRaw(ws, { type: 'input_audio_buffer.append', audio: input.pcmBase64 });
          break;
        case 'image':
          sendRaw(ws, {
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'user',
              content: [
                { type: 'input_image', image_url: `data:image/jpeg;base64,${input.jpegBase64}` },
              ],
            },
          });
          sendRaw(ws, { type: 'response.create' });
          break;
        case 'text':
          sendRaw(ws, {
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'user',
              content: [{ type: 'input_text', text: input.text }],
            },
          });
          sendRaw(ws, { type: 'response.create' });
          break;
        case 'tool_result':
          sendRaw(ws, {
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: input.callId,
              output: JSON.stringify(input.output),
            },
          });
          sendRaw(ws, { type: 'response.create' });
          break;
      }
    },
  };
}

function sendRaw(ws: WebSocket, payload: unknown): void {
  ws.send(JSON.stringify(payload));
}

/** OpenAI 서버 이벤트 → contract ServerEvent. 관심 없는 이벤트는 null. */
function mapServerEvent(ev: any): ServerEvent | null {
  switch (ev?.type) {
    // 오디오 델타 (GA: output_audio, 구버전: audio)
    case 'response.output_audio.delta':
    case 'response.audio.delta':
      return { kind: 'audio_delta', pcmBase64: ev.delta };

    // 모델 발화 전사
    case 'response.output_audio_transcript.delta':
    case 'response.audio_transcript.delta':
      return { kind: 'transcript', role: 'assistant', text: ev.delta ?? '', final: false };
    case 'response.output_audio_transcript.done':
    case 'response.audio_transcript.done':
      return { kind: 'transcript', role: 'assistant', text: ev.transcript ?? '', final: true };

    // 사용자 발화 전사
    case 'conversation.item.input_audio_transcription.completed':
      return { kind: 'transcript', role: 'user', text: ev.transcript ?? '', final: true };

    // Function Calling
    case 'response.function_call_arguments.done':
      return {
        kind: 'tool_call',
        callId: ev.call_id,
        name: ev.name,
        args: safeParse(ev.arguments),
      };

    // 상태 전이
    case 'input_audio_buffer.speech_started':
      return { kind: 'status', status: 'listening' };
    case 'response.created':
      return { kind: 'status', status: 'speaking' };
    case 'response.done':
      return { kind: 'status', status: 'connected' };
    case 'session.created':
    case 'session.updated':
      return { kind: 'status', status: 'connected' };

    case 'error':
      return {
        kind: 'error',
        code: ev.error?.code ?? 'REALTIME_ERROR',
        message: ev.error?.message ?? 'Unknown realtime error',
      };

    default:
      return null;
  }
}

function safeParse(s: unknown): unknown {
  if (typeof s !== 'string') return s ?? {};
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
