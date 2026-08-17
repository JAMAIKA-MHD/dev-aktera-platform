import React, { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage, LanguageCode } from "../contexts/LanguageContext";

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "English", flag: "🇬🇧" },
  { code: "fr", label: "French", nativeLabel: "Français", flag: "🇫🇷" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", flag: "🇩🇿" },
];

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage =
    LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  const handleSelectLanguage = (code: LanguageCode) => {
    setLanguage(code);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-10 px-3 rounded-full border flex items-center gap-2 cursor-pointer transition-all shadow-sm hover:scale-105 select-none ${
          isDark
            ? "bg-[#151E30] border-slate-800 text-slate-200 hover:bg-slate-800"
            : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
        }`}
        title="Change language"
      >
        <span className="text-base leading-none">{currentLanguage.flag}</span>
        <span className="text-xs font-black uppercase tracking-wider">
          {currentLanguage.code}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 stroke-[2.5] text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-48 rounded-2xl shadow-2xl border py-1.5 z-[100] animate-in fade-in zoom-in-95 duration-150 ${
            isDark
              ? "bg-[#151E30] border-slate-700 text-white shadow-black/60"
              : "bg-white border-slate-200 text-slate-900 shadow-slate-400/40"
          }`}
        >
          <div className="px-3 py-1.5 border-b border-card-border mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-textMuted flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-blue-500" />
              Select Language
            </span>
          </div>

          {LANGUAGES.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelectLanguage(lang.code)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                  isSelected
                    ? isDark
                      ? "bg-blue-600/20 text-blue-400 font-black"
                      : "bg-blue-50 text-blue-600 font-black"
                    : isDark
                      ? "hover:bg-slate-800/80 text-slate-300 hover:text-white"
                      : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{lang.flag}</span>
                  <span>{lang.nativeLabel}</span>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 stroke-[3] text-blue-500" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
