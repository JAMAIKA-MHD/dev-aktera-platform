import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AkteraBrandPreset } from "../aktera-presets";
import { AkteraLang, AKTERA_I18N } from "../aktera-i18n";
import { playClick } from "../aktera-audio";
import {
  X,
  QrCode,
  Copy,
  Check,
  Smartphone,
  Download,
  ExternalLink,
} from "lucide-react";

interface AkteraQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  preset: AkteraBrandPreset;
  lang: AkteraLang;
  mode?: "dark" | "light";
}

export const AkteraQrModal: React.FC<AkteraQrModalProps> = ({
  isOpen,
  onClose,
  preset,
  lang,
  mode = "dark",
}) => {
  const [copied, setCopied] = useState(false);
  const isLight = mode === "light";
  const campaignUrl = window.location.origin + `/play/${preset.id}`;

  if (!isOpen) return null;

  const handleCopyLink = () => {
    playClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(campaignUrl);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-md rounded-3xl p-6 shadow-2xl relative flex flex-col items-center text-center border transition-colors ${
            isLight
              ? "bg-white border-slate-200 text-slate-900"
              : "bg-[#0F172A] border-amber-500/40 text-white"
          }`}
        >
          {/* Close button */}
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className={`absolute top-4 right-4 p-2 rounded-full transition-colors cursor-pointer ${
              isLight
                ? "bg-slate-100 text-slate-500 hover:text-slate-900"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon Badge */}
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-3 shadow-lg">
            <QrCode className="w-6 h-6" />
          </div>

          <h3
            className={`text-lg font-black ${isLight ? "text-slate-900" : "text-white"}`}
          >
            {lang === "fr"
              ? "QR Code In-Store & PLV Magasin"
              : "In-Store & POS Counter QR Code"}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            {lang === "fr"
              ? "Imprimez ce QR Code sur vos affiches caisse, packagings ou comptoirs pour générer des scans instantanés."
              : "Print this QR Code on cashier posters, packaging, or counter displays to drive instant player engagement."}
          </p>

          {/* QR Card Mockup with Brand Theme */}
          <div className="w-full max-w-[260px] mt-4 p-4 rounded-2xl bg-white text-black shadow-2xl flex flex-col items-center border-4 border-slate-900">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[11px] font-extrabold tracking-wider uppercase">
                {preset.name}
              </span>
            </div>

            {/* Generated QR Image SVG Mockup */}
            <div className="w-44 h-44 bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(campaignUrl)}`}
                alt="Campaign QR Code"
                className="w-full h-full object-contain"
              />
            </div>

            <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 mt-2">
              {lang === "fr" ? "SCANNEZ POUR JOUER 🎁" : "SCAN TO PLAY NOW 🎁"}
            </span>
          </div>

          {/* Campaign Link bar */}
          <div
            className={`w-full mt-4 flex items-center gap-2 border p-1.5 rounded-xl text-left ${
              isLight
                ? "bg-slate-50 border-slate-200"
                : "bg-slate-900 border-slate-800"
            }`}
          >
            <input
              type="text"
              readOnly
              value={campaignUrl}
              className={`w-full bg-transparent text-[11px] font-mono px-2 outline-none truncate ${
                isLight ? "text-slate-800" : "text-slate-300"
              }`}
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>
                {copied
                  ? lang === "fr"
                    ? "Copié !"
                    : "Copied!"
                  : lang === "fr"
                    ? "Copier"
                    : "Copy"}
              </span>
            </button>
          </div>

          <div className="mt-4 flex gap-2 w-full">
            <a
              href={campaignUrl}
              target="_blank"
              rel="noreferrer"
              className={`flex-1 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                isLight
                  ? "border-slate-300 bg-white hover:bg-slate-100 text-slate-800 shadow-sm"
                  : "border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200"
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{lang === "fr" ? "Tester le lien" : "Test Live Link"}</span>
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
