// ============================================================
// shared/contract/i18n-keys.ts  — 🔒 공유 계약 (Day 0 동결)
// i18n "키"만 계약. 번역 "값"은 각 스트림(주로 A: mobile/i18n)에서 채움.
// 키 추가는 공유 머지, 값 채우기는 자유.
// ============================================================

export const I18N_KEYS = {
  // 랜딩 (app/index)
  'landing.title': 'landing.title',
  'landing.subtitle': 'landing.subtitle',
  'landing.selectLanguage': 'landing.selectLanguage',
  'landing.start': 'landing.start',

  // 세션 (app/session)
  'session.connecting': 'session.connecting',
  'session.permissionDenied': 'session.permissionDenied',
  'session.aimAtDocument': 'session.aimAtDocument',
  'session.reshoot': 'session.reshoot', // confidence<0.5 재촬영 유도(FR-014)
  'session.end': 'session.end',

  // 기록 (app/my, app/record/[id])
  'records.empty': 'records.empty',
  'records.title': 'records.title',
  'record.guidedFields': 'record.guidedFields',

  // 벤치마크 (app/benchmark)
  'benchmark.accuracy': 'benchmark.accuracy',
  'benchmark.noPermission': 'benchmark.noPermission',

  // 공통 상태/에러
  'state.loading': 'state.loading',
  'state.error': 'state.error',
  'state.noPermission': 'state.noPermission',
  'error.rateLimited': 'error.rateLimited',
  'error.budgetExceeded': 'error.budgetExceeded',
} as const;

export type I18nKey = keyof typeof I18N_KEYS;
export const SUPPORTED_LANGS = ['ko', 'en', 'zh', 'vi', 'th'] as const;
