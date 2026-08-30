import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en/translation.json';
import translationAR from './locales/ar/translation.json';
import translationHE from './locales/he/translation.json';

const resources = {
  en: {
    translation: translationEN,
  },
  ar: {
    translation: translationAR,
  },
  he: {
    translation: translationHE,
  },
};

/**
 * Which language a first-time visitor gets.
 *
 * The browser's own language used to decide, and that was wrong for this shop:
 * plenty of customers in Jerusalem read Arabic on a phone set to English, and
 * they were landing on an English site for a shop called الفانوس السحري.
 *
 * So Arabic is the default — EXCEPT for a Hebrew browser, where the signal is
 * meaningful: a phone set to Hebrew is a Hebrew reader. An English phone is
 * not the same kind of evidence, so it does not override.
 *
 * Anyone who picks a language keeps it: this only runs when nothing has been
 * chosen before, since it sits last in the detection order.
 */
const arabicFirst = {
  name: 'arabicFirst',
  lookup(): string {
    try {
      const langs = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
      if (langs.some((l) => String(l).toLowerCase().startsWith('he'))) return 'he';
    } catch { /* no navigator: fall through to Arabic */ }
    return 'ar';
  },
  cacheUserLanguage() { /* nothing to store: this is a default, not a choice */ },
};

const detector = new LanguageDetector();
detector.addDetector(arabicFirst);

i18n
  .use(detector)
  .use(initReactI18next) // pass the i18n instance to react-i18next.
  .init({
    resources,
    fallbackLng: 'ar', // default language
    supportedLngs: ['ar', 'en', 'he'],
    // An explicit choice always wins — a link with ?lng=, then whatever they
    // picked last. Only a visitor with neither reaches the rule above.
    detection: {
      order: ['querystring', 'localStorage', 'cookie', 'arabicFirst'],
      lookupQuerystring: 'lng',
      caches: ['localStorage'],
    },
    debug: false,
    
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });

export default i18n;
