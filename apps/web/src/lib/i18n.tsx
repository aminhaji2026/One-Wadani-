import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type Dict = Record<string, string>;

const en: Dict = {
  brand: 'WADDANI ONE',
  signIn: 'Sign in',
  register: 'Create account',
  forgot: 'Forgot password?',
  members: 'Members',
  supporters: 'Supporters',
  volunteers: 'Volunteers',
  staff: 'Staff',
  welcome: 'Welcome',
  emptyEvents: 'No published events yet — check back soon.',
  emptyTasks: 'No open tasks for your office yet.',
  emptyCampaigns: 'No active campaigns right now.',
  approvals: 'Approvals inbox',
  announcements: 'Announcements',
  notifications: 'Notifications',
  language: 'Language',
};

const so: Dict = {
  brand: 'WADDANI ONE',
  signIn: 'Gal',
  register: 'Samee akoon',
  forgot: 'Ma illowday erayga sirta?',
  members: 'Xubnaha',
  supporters: 'Taageerayaasha',
  volunteers: 'Mutadawiciinta',
  staff: 'Shaqaalaha',
  welcome: 'Soo dhawoow',
  emptyEvents: 'Weli ma jiraan dhacdooyin la daabacay.',
  emptyTasks: 'Weli ma jiraan hawlo xafiiskaaga ah.',
  emptyCampaigns: 'Weli ma jiraan ololeyaal firfircoon.',
  approvals: 'Sanduuqa oggolaanshaha',
  announcements: 'Ogeysiisyada',
  notifications: 'Ogeysiisyada gaarka ah',
  language: 'Luqadda',
};

type Lang = 'en' | 'so';

const I18nCtx = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof en) => string;
}>({
  lang: 'en',
  setLang: () => undefined,
  t: (k) => en[k],
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('waddani_lang');
    return saved === 'so' || saved === 'en' ? saved : 'en';
  });
  const setLang = (l: Lang) => {
    localStorage.setItem('waddani_lang', l);
    setLangState(l);
  };
  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: (key: keyof typeof en) => (lang === 'so' ? so[key] : en[key]) || en[key],
    }),
    [lang],
  );
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  return useContext(I18nCtx);
}
