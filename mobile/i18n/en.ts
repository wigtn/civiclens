import type { I18nKey } from '@contract/i18n-keys';

// English (FR-007) — also the fallback locale for untranslated keys.
export const en: Record<I18nKey, string> = {
  'landing.title': "Let's handle paperwork together",
  'landing.subtitle': 'Point your camera at a form and ask in your language. AI guides you field by field.',
  'landing.selectLanguage': 'Choose your language',
  'landing.start': 'Get started',

  'session.connecting': 'Connecting…',
  'session.permissionDenied': 'Camera and microphone access is required. Please allow it in Settings.',
  'session.aimAtDocument': 'Point the camera at a document or screen',
  'session.reshoot': "I can't read it clearly. Please hold it steady and try again.",
  'session.end': 'End',

  'records.empty': 'No records yet. Let’s tackle your first task together.',
  'records.title': 'My visit records',
  'record.guidedFields': 'Guided fields',

  'benchmark.accuracy': 'Form recognition accuracy',
  'benchmark.noPermission': 'This screen is for administrators only.',

  'state.loading': 'Loading…',
  'state.error': 'Something went wrong. Please try again shortly.',
  'state.noPermission': 'You don’t have access to this.',
  'error.rateLimited': 'Too many requests. Please try again in a moment.',
  'error.budgetExceeded': 'Today’s usage limit is reached. Please come back tomorrow.',
};
