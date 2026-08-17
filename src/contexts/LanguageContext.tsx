import React, { createContext, useContext, useState, useEffect } from "react";
import i18n from "../i18n/i18n";
import { resources } from "../i18n/translations";

export type LanguageCode = "en" | "fr" | "ar";

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const getInitialLanguage = (): LanguageCode => {
    const saved =
      localStorage.getItem("i18nextLng") || localStorage.getItem("app_lang");
    if (saved?.startsWith("ar")) return "ar";
    if (saved?.startsWith("fr")) return "fr";
    return "en";
  };

  const [language, setLanguageState] =
    useState<LanguageCode>(getInitialLanguage);

  const applyLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem("i18nextLng", lang);
    localStorage.setItem("app_lang", lang);
    i18n.changeLanguage(lang);

    const isRtl = lang === "ar";
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.body.dir = isRtl ? "rtl" : "ltr";
  };

  useEffect(() => {
    applyLanguage(language);
  }, []);

  const setLanguage = (lang: LanguageCode) => {
    applyLanguage(lang);
  };

  // Fast translation resolver with dot notation support (e.g. 'nav.overview')
  const t = (key: string, fallback?: string): string => {
    const currentDict = (resources as any)[language]?.translation;
    if (!currentDict) return fallback || key;

    const parts = key.split(".");
    let cur = currentDict;
    for (const part of parts) {
      if (cur && typeof cur === "object" && part in cur) {
        cur = cur[part];
      } else {
        // Fallback to English dict
        let enCur = (resources as any)["en"]?.translation;
        for (const enPart of parts) {
          if (enCur && typeof enCur === "object" && enPart in enCur) {
            enCur = enCur[enPart];
          } else {
            return fallback || key;
          }
        }
        return typeof enCur === "string" ? enCur : fallback || key;
      }
    }
    return typeof cur === "string" ? cur : fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isRtl: language === "ar",
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
