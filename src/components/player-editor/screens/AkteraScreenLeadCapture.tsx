import React, { useState } from "react";
import { motion } from "motion/react";
import { AkteraBrandPreset } from "../aktera-presets";
import { AkteraLang, AKTERA_I18N, ALGERIA_WILAYAS } from "../aktera-i18n";
import { playClick, playWin } from "../aktera-audio";
import { User, Phone, MapPin, ShieldCheck, CheckCircle2 } from "lucide-react";

interface AkteraScreenLeadCaptureProps {
  preset: AkteraBrandPreset;
  lang: AkteraLang;
  isLight?: boolean;
  onSubmit: (leadData: { name: string; phone: string; wilaya: string }) => void;
}

export const AkteraScreenLeadCapture: React.FC<
  AkteraScreenLeadCaptureProps
> = ({ preset, lang, isLight = false, onSubmit }) => {
  const [name, setName] = useState("Karim Benali");
  const [phone, setPhone] = useState("0555123456");
  const [wilaya, setWilaya] = useState("16 - Alger (الجزائر العاصمة)");
  const [consent, setConsent] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const t = AKTERA_I18N[lang];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playClick();

    if (!name.trim()) {
      setErrorMsg("Veuillez saisir votre nom / يرجى إدخال الاسم");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 9) {
      setErrorMsg("Numéro de téléphone invalide / رقم هاتف غير صالح");
      return;
    }

    setErrorMsg(null);
    playWin();
    onSubmit({ name, phone, wilaya });
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-2 py-1 select-none">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 my-auto">
        {/* Name Input */}
        <div className="flex flex-col gap-1 text-left">
          <label
            className={`text-[10px] font-bold flex items-center gap-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}
          >
            <User className="w-3 h-3 text-amber-500" />
            <span>{t.lead.nameLabel}</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.lead.namePlaceholder}
            className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold placeholder-slate-400 focus:border-amber-500 outline-none transition-colors shadow-inner ${
              isLight
                ? "bg-white border-slate-300 text-slate-900"
                : "bg-slate-900/90 border-slate-700 text-white"
            }`}
          />
        </div>

        {/* Phone Input with Algeria Flag */}
        <div className="flex flex-col gap-1 text-left">
          <label
            className={`text-[10px] font-bold flex items-center gap-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}
          >
            <Phone className="w-3 h-3 text-amber-500" />
            <span>{t.lead.phoneLabel}</span>
          </label>
          <div
            className={`flex items-center gap-1.5 border rounded-xl px-3 py-2 focus-within:border-amber-500 transition-colors shadow-inner ${
              isLight
                ? "bg-white border-slate-300"
                : "bg-slate-900/90 border-slate-700"
            }`}
          >
            <span
              className={`text-xs font-bold flex items-center gap-1 border-r pr-2 ${
                isLight
                  ? "text-slate-600 border-slate-300"
                  : "text-slate-400 border-slate-700"
              }`}
            >
              🇩🇿 +213
            </span>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.lead.phonePlaceholder}
              className={`w-full bg-transparent text-xs font-bold outline-none ${
                isLight
                  ? "text-slate-900 placeholder-slate-400"
                  : "text-white placeholder-slate-500"
              }`}
            />
          </div>
        </div>

        {/* 58 Wilayas Selector */}
        <div className="flex flex-col gap-1 text-left">
          <label
            className={`text-[10px] font-bold flex items-center gap-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}
          >
            <MapPin className="w-3 h-3 text-amber-500" />
            <span>{t.lead.wilayaLabel}</span>
          </label>
          <select
            value={wilaya}
            onChange={(e) => setWilaya(e.target.value)}
            className={`w-full border rounded-xl px-3 py-2 text-xs font-medium focus:border-amber-500 outline-none cursor-pointer ${
              isLight
                ? "bg-white border-slate-300 text-slate-900"
                : "bg-slate-900 border-slate-700 text-white"
            }`}
          >
            {ALGERIA_WILAYAS.map((w) => (
              <option
                key={w}
                value={w}
                className={
                  isLight
                    ? "bg-white text-slate-900"
                    : "bg-slate-900 text-white"
                }
              >
                {w}
              </option>
            ))}
          </select>
        </div>

        {/* Consent Checkbox */}
        <label className="flex items-start gap-2 cursor-pointer mt-1 text-left">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="w-4 h-4 rounded mt-0.5 accent-amber-500"
          />
          <span
            className={`text-[10px] font-medium leading-tight ${isLight ? "text-slate-600" : "text-slate-400"}`}
          >
            {t.lead.consentLabel}
          </span>
        </label>

        {errorMsg && (
          <p className="text-[11px] font-bold text-red-500 text-center animate-shake">
            {errorMsg}
          </p>
        )}

        {/* Security Badge */}
        <div
          className={`mt-1 p-2 rounded-xl border flex items-center gap-2 ${
            isLight
              ? "bg-white/80 border-slate-200"
              : "bg-slate-900/50 border-slate-800/80"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span
            className={`text-[9px] font-medium leading-tight ${isLight ? "text-slate-600" : "text-slate-400"}`}
          >
            {t.lead.securityBadge}
          </span>
        </div>
      </form>
    </div>
  );
};
