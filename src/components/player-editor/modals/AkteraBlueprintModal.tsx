import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Layers,
  CheckCircle,
  BarChart3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AkteraLang } from "../aktera-i18n";
import { playClick } from "../aktera-audio";

interface AkteraBlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: AkteraLang;
  mode?: "dark" | "light";
}

export const AkteraBlueprintModal: React.FC<AkteraBlueprintModalProps> = ({
  isOpen,
  onClose,
  lang = "en",
  mode = "dark",
}) => {
  if (!isOpen) return null;
  const isLight = mode === "light";

  const slotsFr = [
    {
      num: 1,
      title: "Slot 1 • Brand Header",
      desc: "Logo SVG, Nom de marque, Badge 'Campagne Officielle' & Switcher langue (FR/AR/EN).",
      bench: "Augmente la confiance de +34%",
    },
    {
      num: 2,
      title: "Slot 2 • Hero Visual",
      desc: "Trophée 3D, badges flottants de gains ou compte à rebours de l'offre.",
      bench: "Capte l'attention en < 2s",
    },
    {
      num: 3,
      title: "Slot 3 • Titre Principal",
      desc: "Titre d'impact H1 en Plus Jakarta Sans / Alexandria (20-24px).",
      bench: "Clarté du message",
    },
    {
      num: 4,
      title: "Slot 4 • Copy d'Accompagnement",
      desc: "Explication de la règle en moins de 2 lignes avec promesse de valeur immédiate.",
      bench: "Réduit le taux de rebond",
    },
    {
      num: 5,
      title: "Slot 5 • Zone d'Interaction (Game Zone)",
      desc: "Moteur de jeu réactif (Roue, Quiz 15s, Grattage Canvas, Boîtes Mystères).",
      bench: "Engagement interactif 92%",
    },
    {
      num: 6,
      title: "Slot 6 • Renforcement & Jauges",
      desc: "Indicateurs de progression, micro-timers et '1 tentative restante'.",
      bench: "FOMO & sentiment d'urgence",
    },
    {
      num: 7,
      title: "Slot 7 • Boutons d'Action (CTA)",
      desc: "Bouton principal à haut contraste avec reflet brillant et action secondaire.",
      bench: "Taux de clic (CTR) 78%",
    },
    {
      num: 8,
      title: "Slot 8 • Légal & Utilitaires",
      desc: "Mentions légales réglementaires algériennes, CGU et watermark Aktera.",
      bench: "Conformité 100%",
    },
  ];

  const slotsEn = [
    {
      num: 1,
      title: "Slot 1 • Brand Header",
      desc: "Vector brand logo, verified campaign badge & trilingual switcher (EN/FR/AR).",
      bench: "Boosts brand trust by +34%",
    },
    {
      num: 2,
      title: "Slot 2 • Hero Visual",
      desc: "3D trophy orb, floating prize tags, or urgent promotional countdown.",
      bench: "Captures user attention in < 2s",
    },
    {
      num: 3,
      title: "Slot 3 • Primary Headline",
      desc: "High-impact H1 title in Plus Jakarta Sans / Alexandria display typography.",
      bench: "Immediate message clarity",
    },
    {
      num: 4,
      title: "Slot 4 • Value Proposition Copy",
      desc: "Two-line concise rule breakdown promising instant, tangible value.",
      bench: "Decreases drop-off rates",
    },
    {
      num: 5,
      title: "Slot 5 • Interactive Game Engine",
      desc: "Responsive game container (Spin Wheel, 15s Speed Quiz, Scratch Foil, Mystery Boxes).",
      bench: "92% interactive engagement",
    },
    {
      num: 6,
      title: "Slot 6 • Reinforcement & Progress",
      desc: "Live progression indicators, micro-timers, and '1 attempt remaining' cues.",
      bench: "Drives urgency & FOMO",
    },
    {
      num: 7,
      title: "Slot 7 • Action Buttons (CTA)",
      desc: "High-contrast action button with animated shimmer shine and ghost action.",
      bench: "78% click-through rate (CTR)",
    },
    {
      num: 8,
      title: "Slot 8 • Legal & Platform Footer",
      desc: "Regulatory consumer compliance text, terms modal link, and Aktera watermark.",
      bench: "100% legal compliance",
    },
  ];

  const slots = lang === "fr" ? slotsFr : slotsEn;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto border transition-colors ${
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
            className={`absolute top-5 right-5 p-2 rounded-full transition-colors cursor-pointer ${
              isLight
                ? "bg-slate-100 text-slate-500 hover:text-slate-900"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-lg shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2
                className={`text-xl font-black ${isLight ? "text-slate-900" : "text-white"}`}
              >
                {lang === "fr"
                  ? "Spécifications du Système 8-Slots Aktera"
                  : "Aktera 8-Slot Mobile Grammar Specifications"}
              </h2>
              <p
                className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}
              >
                {lang === "fr"
                  ? "Grammaire visuelle stricte et benchmarks de conversion pour campagnes mobiles."
                  : "Strict vertical hierarchy and conversion benchmarks for gamified B2B campaigns."}
              </p>
            </div>
          </div>

          {/* 8-Slot Hierarchy List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
            {slots.map((slot) => (
              <div
                key={slot.num}
                className={`p-3.5 rounded-2xl border flex flex-col justify-between transition-colors ${
                  isLight
                    ? "bg-slate-50 border-slate-200"
                    : "bg-slate-900/90 border-slate-800"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold ${isLight ? "text-slate-900" : "text-amber-400"}`}
                    >
                      {slot.title}
                    </span>
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 text-[10px] font-extrabold flex items-center justify-center font-mono">
                      #{slot.num}
                    </span>
                  </div>
                  <p
                    className={`text-[11px] leading-relaxed ${isLight ? "text-slate-600" : "text-slate-300"}`}
                  >
                    {slot.desc}
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200/40 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
                  <BarChart3 className="w-3 h-3" />
                  <span>{slot.bench}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Conversion Insights */}
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 mt-2 ${
              isLight
                ? "bg-amber-50/70 border-amber-300"
                : "bg-gradient-to-r from-amber-950/40 via-slate-900 to-blue-950/40 border-amber-500/30"
            }`}
          >
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4
                className={`text-xs font-bold ${isLight ? "text-amber-800" : "text-amber-300"}`}
              >
                {lang === "fr"
                  ? "Standard de Conversion Aktera B2B"
                  : "Aktera B2B Conversion Benchmark"}
              </h4>
              <p
                className={`text-[11px] leading-relaxed mt-0.5 ${isLight ? "text-slate-700" : "text-slate-300"}`}
              >
                {lang === "fr"
                  ? "Chaque écran mobile respecte scrupuleusement la règle des 8 slots verticaux afin de garantir un taux de rétention supérieur à 85% et un taux de capture de leads de 72% sur le marché algérien et nord-africain."
                  : "Every mobile player experience strictly adheres to the vertical 8-slot grammar, ensuring over 85% player retention and a verified 72% lead capture conversion rate."}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
