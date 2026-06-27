// ============================================================
// shared/contract/realtime.ts  — 🔒 공유 계약 (Day 0 동결)
// 모바일 앱 ↔ OpenAI Realtime(WebSocket) 메시지/이벤트 프로토콜의
// 클라이언트 측 추상화. A가 구현하지만, tool-call 이벤트 형태는
// C(tools.ts)·B(session)와 합류하므로 계약으로 둔다.
// 전송: WebSocket (PRD §6.1 모바일 전송 주의)
// ============================================================

import type { LangCode } from './api';
import type { ToolName } from './tools';

/** A가 use-live-session에 노출하는 세션 상태 */
export type LiveStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening' // 사용자 발화 수신 중
  | 'speaking' // 모델 음성 재생 중
  | 'reconnecting'
  | 'error';

/** 세션 시작 파라미터 (CreateSessionResponse로 채움) */
export interface LiveSessionConfig {
  clientSecret: string; // ek_...
  model: 'gpt-realtime';
  voice: string;
  language: LangCode;
  sessionToken: string; // tool-dispatch가 백엔드 호출에 사용
}

/** 클라이언트가 세션으로 보내는 입력 */
export type ClientInput =
  | { kind: 'audio'; pcmBase64: string } // expo-audio 마이크 청크
  | { kind: 'image'; jpegBase64: string } // expo-camera 프레임
  | { kind: 'text'; text: string }
  | { kind: 'tool_result'; callId: string; output: unknown }; // 핸들러 결과 주입

/** 세션에서 클라이언트가 받는 이벤트 */
export type ServerEvent =
  | { kind: 'audio_delta'; pcmBase64: string }
  | { kind: 'transcript'; role: 'user' | 'assistant'; text: string; final: boolean }
  | { kind: 'tool_call'; callId: string; name: ToolName; args: unknown }
  | { kind: 'status'; status: LiveStatus }
  | { kind: 'error'; code: string; message: string };

/** use-live-session 훅이 화면에 노출하는 인터페이스(계약) */
export interface LiveSessionApi {
  status: LiveStatus;
  start: (config: LiveSessionConfig) => Promise<void>;
  stop: () => void;
  sendText: (text: string) => void;
  pushFrame: (jpegBase64: string) => void; // 카메라 프레임 수동 전송
}
