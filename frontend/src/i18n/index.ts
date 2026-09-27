import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import common_esCU from './locales/es-CU/common.json';
import common_esES from './locales/es-ES/common.json';
import common_enUS from './locales/en-US/common.json';
import auth_esCU from './locales/es-CU/auth.json';
import auth_esES from './locales/es-ES/auth.json';
import auth_enUS from './locales/en-US/auth.json';

export const SUPPORTED_LANGUAGES = ['es-CU', 'es-ES', 'en-US'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'es-CU';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'es-CU': { common: common_esCU, auth: auth_esCU },
      'es-ES': { common: common_esES, auth: auth_esES },
      'en-US': { common: common_enUS, auth: auth_enUS },
    },
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    ns: ['common', 'auth'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React ya escapa
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'sgp.lang',
      caches: ['localStorage'],
    },
  });

export default i18n;
