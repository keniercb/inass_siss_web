import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import common_esCU from './locales/es-CU/common.json';
import common_esES from './locales/es-ES/common.json';
import common_enUS from './locales/en-US/common.json';
import auth_esCU from './locales/es-CU/auth.json';
import auth_esES from './locales/es-ES/auth.json';
import auth_enUS from './locales/en-US/auth.json';

// Feature: catalogs
import catalogs_esCU from '@/features/catalogs/i18n/locales/es-CU/catalogs.json';
import catalogs_esES from '@/features/catalogs/i18n/locales/es-ES/catalogs.json';
import catalogs_enUS from '@/features/catalogs/i18n/locales/en-US/catalogs.json';

// Feature: municipalities
import municipalities_esCU from '@/features/municipalities/i18n/locales/es-CU/municipalities.json';
import municipalities_esES from '@/features/municipalities/i18n/locales/es-ES/municipalities.json';
import municipalities_enUS from '@/features/municipalities/i18n/locales/en-US/municipalities.json';

// Feature: agencies
import agencies_esCU from '@/features/agencies/i18n/locales/es-CU/agencies.json';
import agencies_esES from '@/features/agencies/i18n/locales/es-ES/agencies.json';
import agencies_enUS from '@/features/agencies/i18n/locales/en-US/agencies.json';

// Feature: people
import people_esCU from '@/features/people/i18n/locales/es-CU/people.json';
import people_esES from '@/features/people/i18n/locales/es-ES/people.json';
import people_enUS from '@/features/people/i18n/locales/en-US/people.json';

// Feature: organizations (entities, offices, signatures)
import organizations_esCU from '@/features/organizations/i18n/locales/es-CU/organizations.json';
import organizations_esES from '@/features/organizations/i18n/locales/es-ES/organizations.json';
import organizations_enUS from '@/features/organizations/i18n/locales/en-US/organizations.json';

// Feature: legal-basis
import legalBasis_esCU from '@/features/legal-basis/i18n/locales/es-CU/legal-basis.json';
import legalBasis_esES from '@/features/legal-basis/i18n/locales/es-ES/legal-basis.json';
import legalBasis_enUS from '@/features/legal-basis/i18n/locales/en-US/legal-basis.json';

// Feature: settings
import settings_esCU from '@/features/settings/i18n/locales/es-CU/settings.json';
import settings_esES from '@/features/settings/i18n/locales/es-ES/settings.json';
import settings_enUS from '@/features/settings/i18n/locales/en-US/settings.json';

export const SUPPORTED_LANGUAGES = ['es-CU', 'es-ES', 'en-US'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'es-CU';

// En entorno de tests, forzar español-Cuba (jsdom defaultea a en-US)
const IS_TEST_ENV =
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') ||
  (typeof import.meta !== 'undefined' &&
    (import.meta as { env?: { MODE?: string } }).env?.MODE === 'test');

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'es-CU': {
        common: common_esCU, auth: auth_esCU, catalogs: catalogs_esCU,
        municipalities: municipalities_esCU, agencies: agencies_esCU,
        settings: settings_esCU, people: people_esCU,
        organizations: organizations_esCU, 'legal-basis': legalBasis_esCU,
      },
      'es-ES': {
        common: common_esES, auth: auth_esES, catalogs: catalogs_esES,
        municipalities: municipalities_esES, agencies: agencies_esES,
        settings: settings_esES, people: people_esES,
        organizations: organizations_esES, 'legal-basis': legalBasis_esES,
      },
      'en-US': {
        common: common_enUS, auth: auth_enUS, catalogs: catalogs_enUS,
        municipalities: municipalities_enUS, agencies: agencies_enUS,
        settings: settings_enUS, people: people_enUS,
        organizations: organizations_enUS, 'legal-basis': legalBasis_enUS,
      },
    },
    // En tests: forzar es-CU. En dev/prod: usar detector.
    lng: IS_TEST_ENV ? DEFAULT_LANGUAGE : undefined,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    ns: ['common', 'auth', 'catalogs', 'municipalities', 'agencies', 'settings', 'people', 'organizations', 'legal-basis'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: IS_TEST_ENV
      ? undefined
      : {
          order: ['localStorage', 'navigator', 'htmlTag'],
          lookupLocalStorage: 'sgp.lang',
          caches: ['localStorage'],
        },
  });

export default i18n;
