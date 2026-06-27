// i18n — 키는 계약(@contract/i18n-keys), 값은 mobile 소유.
// 미번역 키는 en 폴백(PARALLEL_WORK_PLAN §5 Definition of Done).
import type { I18nKey } from '@contract/i18n-keys';
import { SUPPORTED_LANGS } from '@contract/i18n-keys';
import type { LangCode } from '@contract/api';

import { ko } from './ko';
import { en } from './en';
import { zh } from './zh';
import { vi } from './vi';
import { th } from './th';

const DICTS: Record<LangCode, Record<I18nKey, string>> = { ko, en, zh, vi, th };

export const LANG_LABELS: Record<LangCode, string> = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
  vi: 'Tiếng Việt',
  th: 'ภาษาไทย',
};

export const DEFAULT_LANG: LangCode = 'ko';
export const FALLBACK_LANG: LangCode = 'en';

/** 키를 해당 언어로 변환. 누락 시 en 폴백 → 그래도 없으면 키 자체 반환. */
export function translate(lang: LangCode, key: I18nKey): string {
  return DICTS[lang]?.[key] ?? DICTS[FALLBACK_LANG][key] ?? key;
}

export function isSupportedLang(value: string): value is LangCode {
  return (SUPPORTED_LANGS as readonly string[]).includes(value);
}

export { SUPPORTED_LANGS };
export type { LangCode, I18nKey };
