// mock-realtime — 오프라인 mock 실시간 transport.
// EXPO_PUBLIC_USE_MOCK 일 때 실제 OpenAI WS 대신 사용해, 백엔드 B/C·OpenAI 없이
// 세션 플로우(연결→촬영→recognize_document→음성안내→기록)를 그대로 재현한다.
// 시그니처는 connectRealtime 과 동일(RealtimeTransport) — use-live-session 이 토글만 한다.
import type { LiveSessionConfig, ClientInput, ServerEvent } from '@contract/realtime';
import type { LangCode, RecognizeResponse, RagMatch } from '@contract/api';
import type { RealtimeTransport } from './realtime-ws';

// B 데모: 행정용어 질문이면 RAG(lookup_admin_term)로 grounding, 그 외엔 추정 답변.
const TERM_HINTS = [
  '세대주', '전입일', '확정일자', 'head of household', 'move-in', 'move in',
  '户主', '迁入', 'chủ hộ', 'chuyển đến', 'เจ้าบ้าน', 'ย้ายเข้า',
];
function isTermQuestion(text: string): boolean {
  const t = text.toLowerCase();
  return TERM_HINTS.some((h) => t.includes(h.toLowerCase()));
}
function groundedAnswer(match: RagMatch, lang: LangCode): string {
  return lang === 'ko' ? match.definition : match.translation || match.definition;
}
const UNGROUNDED: Record<LangCode, string> = {
  ko: '그건 상황마다 달라서 단정하긴 어려워요. 담당 창구에 한 번 확인해 보는 게 좋아요.',
  en: "That can vary case by case, so I can't say for sure — better to check with the clerk.",
  zh: '这要看具体情况，不能一概而论，最好向窗口确认。',
  vi: 'Điều đó tùy trường hợp, tôi không chắc chắn — bạn nên hỏi nhân viên quầy.',
  th: 'เรื่องนี้ขึ้นอยู่กับกรณี ไม่แน่ใจนัก ควรสอบถามเจ้าหน้าที่',
};

type Handler = (event: ServerEvent) => void;

const GREETING: Record<LangCode, string> = {
  ko: '안녕하세요! 서류나 화면을 비추고 촬영 버튼을 눌러 보세요.',
  en: 'Hi! Point at a document or screen and tap the shutter.',
  zh: '你好！把文件或屏幕对准镜头，然后按快门。',
  vi: 'Xin chào! Hướng vào tài liệu hoặc màn hình rồi nhấn nút chụp.',
  th: 'สวัสดี! ส่องไปที่เอกสารหรือหน้าจอแล้วกดปุ่มถ่าย',
};

function describeRecognition(doc: RecognizeResponse, lang: LangCode): string {
  const first = doc.fields[0];
  switch (lang) {
    case 'en':
      return `This looks like a "${doc.docType}". First, ${first ? `"${first.label}": ${first.hint}` : 'let me guide you field by field.'}`;
    case 'zh':
      return `这看起来是「${doc.docType}」。首先，${first ? `「${first.label}」：${first.hint}` : '我来逐栏为你说明。'}`;
    case 'vi':
      return `Đây có vẻ là "${doc.docType}". Trước tiên, ${first ? `"${first.label}": ${first.hint}` : 'tôi sẽ hướng dẫn từng ô.'}`;
    case 'th':
      return `นี่น่าจะเป็น "${doc.docType}" ก่อนอื่น ${first ? `"${first.label}": ${first.hint}` : 'ฉันจะอธิบายทีละช่อง'}`;
    default:
      return `이건 "${doc.docType}" 같아요. 먼저 ${first ? `"${first.label}" 칸은 ${first.hint}` : '칸별로 안내해 드릴게요.'}`;
  }
}

/** 실제 소켓 없이 ServerEvent 를 시간차로 방출하는 mock transport. */
export function connectMockRealtime(config: LiveSessionConfig, onEvent: Handler): RealtimeTransport {
  let open = true;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const at = (ms: number, fn: () => void) => {
    const id = setTimeout(() => {
      if (open) fn();
    }, ms);
    timers.push(id);
  };
  const lang = config.language;

  // 연결 시뮬레이션 + 인사 안내.
  at(250, () => onEvent({ kind: 'status', status: 'connected' }));
  at(700, () => onEvent({ kind: 'transcript', role: 'assistant', text: GREETING[lang], final: true }));

  let callSeq = 0;

  return {
    isOpen: () => open,
    close: () => {
      open = false;
      timers.forEach(clearTimeout);
      timers.length = 0;
    },
    send: (input: ClientInput) => {
      if (!open) return;
      switch (input.kind) {
        case 'image': {
          // 서류를 보고 recognize_document 를 호출하는 흐름을 재현.
          onEvent({ kind: 'status', status: 'speaking' });
          at(600, () =>
            onEvent({
              kind: 'tool_call',
              callId: `mock-call-${callSeq++}`,
              name: 'recognize_document',
              args: { language: lang, mode: 'document' },
            }),
          );
          break;
        }
        case 'text': {
          // 데모: 타이핑/칩 질문을 사용자 발화로 에코(실모드는 음성 전사가 담당).
          onEvent({ kind: 'transcript', role: 'user', text: input.text, final: true });
          onEvent({ kind: 'status', status: 'speaking' });
          if (isTermQuestion(input.text)) {
            // 행정용어 질문 → RAG grounding(B: 근거 ✓).
            at(550, () =>
              onEvent({
                kind: 'tool_call',
                callId: `mock-call-${callSeq++}`,
                name: 'lookup_admin_term',
                args: { term: input.text, targetLang: lang },
              }),
            );
          } else {
            // 근거 없는 일반/주관 질문 → 추정 답변(B: 추정 ⚠).
            at(750, () => {
              onEvent({ kind: 'transcript', role: 'assistant', text: UNGROUNDED[lang], final: true });
              onEvent({ kind: 'status', status: 'connected' });
            });
          }
          break;
        }
        case 'tool_result': {
          // recognize 결과(docType) 또는 RAG 결과(matches)를 받아 음성 안내 재현.
          const out = input.output as
            | (Partial<RecognizeResponse> & { matches?: RagMatch[] })
            | undefined;
          at(450, () => {
            if (out && typeof out.docType === 'string') {
              onEvent({
                kind: 'transcript',
                role: 'assistant',
                text: describeRecognition(out as RecognizeResponse, lang),
                final: true,
              });
            } else if (out && Array.isArray(out.matches) && out.matches.length > 0) {
              onEvent({
                kind: 'transcript',
                role: 'assistant',
                text: groundedAnswer(out.matches[0], lang),
                final: true,
              });
            }
            onEvent({ kind: 'status', status: 'connected' });
          });
          break;
        }
        case 'audio':
          // mock 에서는 마이크 PCM 경로가 없으므로 무시.
          break;
      }
    },
  };
}
