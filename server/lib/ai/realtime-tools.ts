// ============================================================
// server/lib/ai/realtime-tools.ts — 👤 C
// OpenAI Realtime 세션에 주입할 Function Calling 도구 "선언"
// + 민원 도우미 시스템 프롬프트(페르소나 + 환각 가드 FR-014).
// 도구 "이름/인자 타입"의 단일 출처는 shared/contract/tools.ts(import type).
// B(session route)가 이 선언을 세션 config.tools 로 그대로 전달.
// ============================================================

import type { ToolName } from '@contract/tools';
import type { LangCode } from '@contract/api';

/** OpenAI Realtime function tool 선언 형식 */
interface RealtimeTool {
  type: 'function';
  name: ToolName;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const REALTIME_TOOLS: RealtimeTool[] = [
  {
    type: 'function',
    name: 'recognize_document',
    description:
      '사용자가 카메라로 서류/안내문/무인민원발급기 화면을 비추며 "이거 뭐예요?", "어떻게 써요?" 처럼 물을 때만 호출. 임의로 호출하지 말 것. 보이는 것이 불확실하면 단정하지 말고 confidence를 낮게. 유명 서식으로 넘겨짚지 말 것.',
    parameters: {
      type: 'object',
      properties: {
        language: { type: 'string', description: '사용자 언어 코드 (ko/en/zh/vi/th)' },
        mode: { type: 'string', description: '"document"=일반 서류, "kiosk"=무인민원발급기 화면' },
      },
      required: ['language'],
    },
  },
  {
    type: 'function',
    name: 'explain_field',
    description:
      '인식된 서류의 특정 칸(fieldKey) 작성법을 사용자 모국어로 단계별 설명할 때 호출. 행정용어가 나오면 반드시 lookup_admin_term으로 검증된 정의를 사용.',
    parameters: {
      type: 'object',
      properties: {
        docTypeId: { type: 'string', description: 'recognize_document가 반환한 문서종류 ID' },
        fieldKey: { type: 'string', description: '설명할 칸의 키' },
        language: { type: 'string', description: '사용자 언어 코드' },
      },
      required: ['docTypeId', 'fieldKey', 'language'],
    },
  },
  {
    type: 'function',
    name: 'lookup_admin_term',
    description:
      '"세대주", "전입사유" 같은 한국 행정용어의 뜻/번역이 필요할 때 호출. 모델이 임의로 정의하지 말고 반드시 이 도구(AI Hub 검증 데이터)를 사용. 환각 방지의 핵심.',
    parameters: {
      type: 'object',
      properties: {
        term: { type: 'string', description: '조회할 한국어 행정용어' },
        targetLang: { type: 'string', description: '설명을 출력할 언어 코드' },
      },
      required: ['term', 'targetLang'],
    },
  },
  {
    type: 'function',
    name: 'translate_notice',
    description:
      '안내문/공문 문장을 사용자 모국어로 번역할 때 호출. AI Hub 법률 다국어 번역으로 grounding된 결과를 사용. 임의 의역 금지.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: '번역할 한국어 원문' },
        targetLang: { type: 'string', description: '대상 언어 코드' },
      },
      required: ['text', 'targetLang'],
    },
  },
  {
    type: 'function',
    name: 'create_record',
    description:
      '한 건의 민원 안내 세션이 끝나갈 때(사용자가 "끝", "고마워요" 등) 처리 기록을 생성. 개인식별정보는 포함하지 말 것(서버가 추가 마스킹함).',
    parameters: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: '현재 세션 ID' },
      },
      required: ['sessionId'],
    },
  },
  {
    type: 'function',
    name: 'discover_office',
    description: '사용자가 인근 주민센터/무인민원발급기 위치를 물을 때 호출.',
    parameters: {
      type: 'object',
      properties: {
        lat: { type: 'number', description: '위도' },
        lng: { type: 'number', description: '경도' },
        radiusKm: { type: 'number', description: '검색 반경(km), 기본 2' },
      },
      required: ['lat', 'lng'],
    },
  },
];

const LANG_NAME: Record<LangCode, string> = {
  ko: 'Korean',
  en: 'English',
  zh: 'Chinese',
  vi: 'Vietnamese',
  th: 'Thai',
};

/** 민원 도우미 페르소나 시스템 프롬프트. B의 session route가 language로 호출. */
export function getSystemInstruction(language: LangCode): string {
  const lang = LANG_NAME[language] ?? 'English';
  return `You are CivicLens, a warm, patient civil-affairs companion for foreign residents and digitally
vulnerable users in Korea. You help them understand and fill out Korean public documents and use
unmanned civil kiosks, speaking in ${lang}.

## Core rules
- ALWAYS respond in ${lang}. Speak slowly, simply, and kindly — like a helpful public servant.
- You see the user's camera. When they show a document/notice/kiosk and ask about it, call
  recognize_document. Do NOT call it unprompted.
- Guide field by field. For each field, say what goes there in plain ${lang}.
- For ANY Korean administrative term (e.g. 세대주, 전입사유), you MUST call lookup_admin_term —
  never invent a definition. For translating notices, call translate_notice.
- This is grounding-first: prefer verified AI Hub data over your own guesses.

## Anti-hallucination guard (critical)
- If the camera view is blurry or the document is uncertain (recognize_document confidence < 0.5),
  do NOT name a specific form. Describe only what you actually see and ask the user to re-aim/retake.
- Never default to a famous/common form based on superficial similarity.

## Wrap-up
- When the task is done, call create_record. Never include personal identifiers (names, addresses,
  registration numbers) in what you store.

## Scope
- You guide and accompany; you do NOT submit applications or give legal advice. If asked for legal
  interpretation, explain the form and suggest contacting the office.`;
}
