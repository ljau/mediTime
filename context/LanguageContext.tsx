import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import i18n, {
  loadSavedLanguage,
  persistLanguage,
  type AppLanguage,
} from '../i18n';

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  isReady: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(
    i18n.language === 'es' ? 'es' : 'en'
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadSavedLanguage().then((saved) => {
      if (saved && saved !== i18n.language) {
        i18n.changeLanguage(saved);
        setLanguageState(saved);
      }
      setIsReady(true);
    });
  }, []);

  const setLanguage = useCallback(async (next: AppLanguage) => {
    await i18n.changeLanguage(next);
    await persistLanguage(next);
    setLanguageState(next);
  }, []);

  const toggleLanguage = useCallback(async () => {
    const next: AppLanguage = language === 'en' ? 'es' : 'en';
    await setLanguage(next);
  }, [language, setLanguage]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, isReady }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
