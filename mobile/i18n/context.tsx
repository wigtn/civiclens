// 언어 선택 상태를 앱 전역에 제공하는 컨텍스트.
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { I18nKey, LangCode } from './index';
import { DEFAULT_LANG, translate } from './index';

interface I18nContextValue {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: I18nKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<LangCode>(DEFAULT_LANG);
  const t = useCallback((key: I18nKey) => translate(lang, key), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>');
  return ctx;
}
