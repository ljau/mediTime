import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import es from '../locales/es.json';

export const LANGUAGE_STORAGE_KEY = '@meditime/language';
export type AppLanguage = 'en' | 'es';

const deviceLanguage = Localization.getLocales()[0]?.languageCode ?? 'en';
const defaultLanguage: AppLanguage = deviceLanguage === 'es' ? 'es' : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: defaultLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export async function loadSavedLanguage(): Promise<AppLanguage | null> {
  const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved === 'en' || saved === 'es') {
    return saved;
  }
  return null;
}

export async function persistLanguage(language: AppLanguage): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

export function getAppLocale(): string {
  return i18n.language === 'es' ? 'es-419' : 'en-US';
}

export default i18n;
