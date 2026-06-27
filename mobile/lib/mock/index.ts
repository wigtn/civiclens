// contract mock — B/C 미완성 구간을 끝까지 진행하기 위한 목 응답.
// EXPO_PUBLIC_USE_MOCK=1 일 때 api-client 가 네트워크 대신 이걸 사용.
// 모든 반환값은 shared/contract 타입과 1:1 (불일치 0 — DoD).
import type {
  CreateSessionResponse,
  RagQueryResponse,
  RecognizeResponse,
  CreateRecordResponse,
  RecordEntry,
  OfficesNearbyResponse,
  BenchmarkResponse,
  LangCode,
} from '@contract/api';

const now = () => Date.now();

export function mockSession(_language: LangCode): CreateSessionResponse {
  // language 는 세션 config(LiveSessionConfig)로만 전달되고 응답 스키마엔 없음.
  return {
    sessionId: `mock-sess-${now()}`,
    clientSecret: 'ek_mock_disabled_in_offline_mode',
    expiresAt: now() + 60_000,
    model: 'gpt-realtime',
    voice: 'alloy',
    sessionToken: `mock-tok-${now()}`,
    limits: { maxDurationSec: 300, maxOutputTokens: 4000, maxTurns: 40 },
  };
}

export function mockRecognize(language: LangCode): RecognizeResponse {
  return {
    docType: language === 'ko' ? '전입신고서' : 'Move-in Report',
    docTypeId: 'move_in_report',
    confidence: 0.91,
    fields: [
      { label: '세대주', hint: '함께 사는 가구의 대표자 이름을 적어요.' },
      { label: '전입일', hint: '새 주소로 이사한 날짜를 적어요.' },
      { label: '새 주소', hint: '이사 온 집의 도로명 주소를 적어요.' },
    ],
    isKiosk: false,
  };
}

export function mockRag(query: string): RagQueryResponse {
  return {
    matches: [
      {
        term: query || '세대주',
        definition: '한 세대를 대표하며 주민등록표의 대표자로 기록되는 사람.',
        translation: 'Head of household — the representative of one household unit.',
        sourceLabel: 'AI Hub 행정용어 말뭉치(mock)',
        score: 0.88,
      },
    ],
  };
}

export function mockCreateRecord(): CreateRecordResponse {
  return { recordId: `mock-rec-${now()}`, createdAt: now(), piiScrubbed: true };
}

const SEED_RECORDS: RecordEntry[] = [
  {
    recordId: 'mock-rec-seed-1',
    language: 'ko',
    visits: [{ docTypeId: 'move_in_report', guidedFieldKeys: ['세대주', '전입일'] }],
    createdAt: now() - 86_400_000,
  },
];

export function mockRecordList(): RecordEntry[] {
  return SEED_RECORDS;
}

export function mockRecord(id: string): RecordEntry | null {
  return SEED_RECORDS.find((r) => r.recordId === id) ?? { ...SEED_RECORDS[0], recordId: id };
}

export function mockOffices(): OfficesNearbyResponse {
  return {
    offices: [
      {
        name: '역삼동 주민센터',
        type: '주민센터',
        address: '서울 강남구 역삼로 100',
        distanceM: 320,
        hours: '평일 09:00–18:00',
      },
      {
        name: '무인민원발급기 (지하철 역삼역)',
        type: '무인민원발급기',
        address: '서울 강남구 역삼역 1번 출구',
        distanceM: 540,
        hours: '06:00–23:00',
      },
    ],
  };
}

export function mockBenchmark(): BenchmarkResponse {
  return {
    overallTop1: 0.94,
    perDocType: [
      { docTypeId: 'move_in_report', accuracy: 0.96, n: 120 },
      { docTypeId: 'resident_registration', accuracy: 0.93, n: 110 },
      { docTypeId: 'kiosk_menu', accuracy: 0.9, n: 80 },
    ],
    perLang: [
      { lang: 'ko', translationBLEU: null },
      { lang: 'en', translationBLEU: 0.41 },
      { lang: 'zh', translationBLEU: 0.38 },
      { lang: 'vi', translationBLEU: 0.36 },
      { lang: 'th', translationBLEU: 0.33 },
    ],
    evaluatedAt: now(),
    datasetVersion: 'mock-2026.06',
  };
}
