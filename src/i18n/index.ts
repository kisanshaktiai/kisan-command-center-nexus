import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import enAdmin from './locales/en/admin.json';
import hiCommon from './locales/hi/common.json';
import hiAdmin from './locales/hi/admin.json';
import mrCommon from './locales/mr/common.json';
import mrAdmin from './locales/mr/admin.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
] as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    defaultNS: 'common',
    ns: ['common', 'admin'],
    interpolation: { escapeValue: false },
    resources: {
      en: { common: enCommon, admin: enAdmin },
      hi: { common: hiCommon, admin: hiAdmin },
      mr: { common: mrCommon, admin: mrAdmin },
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'lovable_admin_lang',
    },
  });

export default i18n;
