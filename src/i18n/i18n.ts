import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { resources } from "./translations";

const savedLang = localStorage.getItem("i18nextLng") || "en";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang.startsWith("ar")
      ? "ar"
      : savedLang.startsWith("fr")
        ? "fr"
        : "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

// Apply document direction when language changes
const updateDocumentDirection = (lang: string) => {
  const isRtl = lang.startsWith("ar");
  document.documentElement.dir = isRtl ? "rtl" : "ltr";
  document.documentElement.lang = lang;
};

// Initial setup
updateDocumentDirection(i18n.language || "en");

// Listener for language changes
i18n.on("languageChanged", (lng) => {
  updateDocumentDirection(lng);
  localStorage.setItem("i18nextLng", lng);
});

export default i18n;
