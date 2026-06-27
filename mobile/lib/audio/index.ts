// audio — 마이크 캡처(PCM16 청크) + 모델 음성(PCM16) 재생 래퍼.
//
// 주의(PRD §6.1): 저수준 PCM 스트리밍/재생은 Expo Go 한계로 커스텀 네이티브
// 모듈(개발 빌드)이 필요하다. 여기서는 use-live-session 이 의존하는 **인터페이스**를
// 확정하고, 권한/라이프사이클은 expo-audio 로 처리한다. PCM 송출/재생 지점은
// 개발 빌드에서 네이티브 브리지가 채우는 seam 으로 명시(no-op 폴백).
import {
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
} from 'expo-audio';

export const PCM_SAMPLE_RATE = 24_000; // OpenAI Realtime 기본 pcm16 24kHz

export async function requestMicPermission(): Promise<boolean> {
  const current = await getRecordingPermissionsAsync();
  if (current.granted) return true;
  const res = await requestRecordingPermissionsAsync();
  return res.granted;
}

export interface MicCapture {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  isRunning: () => boolean;
}

/**
 * 마이크 PCM16 청크 캡처. onChunk 는 base64(pcm16, 24kHz mono) 를 받는다.
 * 개발 빌드의 네이티브 스트리밍 모듈이 onChunk 를 구동한다(seam).
 * Expo Go 폴백: 권한만 확보하고 청크는 비활성(연결·UI 검증은 가능).
 */
export function createMicCapture(_onChunk: (pcmBase64: string) => void): MicCapture {
  let running = false;
  return {
    isRunning: () => running,
    start: async () => {
      const ok = await requestMicPermission();
      if (!ok) throw new Error('mic-permission-denied');
      running = true;
      // NATIVE SEAM: 개발 빌드에서 PCM16 스트림 → _onChunk(base64)
    },
    stop: async () => {
      running = false;
      // NATIVE SEAM: 네이티브 스트림 정지
    },
  };
}

export interface PcmPlayer {
  enqueue: (pcmBase64: string) => void;
  reset: () => void;
}

/**
 * 모델 음성(pcm16 24kHz) 청크 재생 큐.
 * 개발 빌드의 네이티브 PCM 플레이어가 enqueue 를 소비한다(seam).
 */
export function createPcmPlayer(): PcmPlayer {
  const queue: string[] = [];
  return {
    enqueue: (pcmBase64: string) => {
      queue.push(pcmBase64);
      // NATIVE SEAM: 네이티브 PCM 플레이어로 flush
    },
    reset: () => {
      queue.length = 0;
    },
  };
}
