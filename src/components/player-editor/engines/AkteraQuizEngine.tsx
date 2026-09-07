import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { AkteraBrandPreset } from "../aktera-presets";
import { AkteraLang, AKTERA_I18N } from "../aktera-i18n";
import { playClick, playWin, playLose, playCountdown } from "../aktera-audio";
import { Timer, CheckCircle2, XCircle } from "lucide-react";

interface AkteraQuizEngineProps {
  preset: AkteraBrandPreset;
  lang: AkteraLang;
  isLight?: boolean;
  onWin: (prizeName: string, prizeVal: string) => void;
  onLose: () => void;
}

export const AkteraQuizEngine: React.FC<AkteraQuizEngineProps> = ({
  preset,
  lang,
  isLight = false,
  onWin,
  onLose,
}) => {
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const t = AKTERA_I18N[lang];
  const correctIndex = 0; // +213 is correct

  const options = [
    t.games.quiz.opt1,
    t.games.quiz.opt2,
    t.games.quiz.opt3,
    t.games.quiz.opt4,
  ];

  useEffect(() => {
    if (isAnswered) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeOut();
          return 0;
        }
        if (prev <= 5) {
          playCountdown();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAnswered]);

  const handleTimeOut = () => {
    setIsAnswered(true);
    playLose();
    setTimeout(() => {
      onLose();
    }, 1500);
  };

  const handleSelectOption = (index: number) => {
    if (isAnswered) return;
    playClick();
    setSelectedIndex(index);
    setIsAnswered(true);

    if (index === correctIndex) {
      playWin();
      setTimeout(() => {
        onWin("Quiz Master Voucher", "10 000 DA");
      }, 1500);
    } else {
      playLose();
      setTimeout(() => {
        onLose();
      }, 1500);
    }
  };

  const progressPercent = (timeLeft / 15) * 100;

  return (
    <div className="w-full flex flex-col items-center justify-center py-2 px-1">
      {/* 15-Second Progress Timer Bar */}
      <div className="w-full mb-3">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
          <div className="flex items-center gap-1">
            <Timer className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>{t.games.quiz.timer}</span>
          </div>
          <span className="font-mono text-amber-400 font-extrabold">
            {timeLeft} {t.games.quiz.sec}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
          <motion.div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progressPercent}%`,
              background:
                timeLeft <= 5
                  ? "#EF4444"
                  : timeLeft <= 9
                    ? "#F59E0B"
                    : preset.primaryColor,
            }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div
        className="w-full p-4 rounded-2xl border mb-3 shadow-lg text-center transition-colors"
        style={{
          background: isLight
            ? "rgba(255, 255, 255, 0.95)"
            : "rgba(15, 23, 42, 0.8)",
          borderColor: isLight
            ? `${preset.primaryColor}50`
            : `${preset.primaryColor}40`,
        }}
      >
        <p
          className={`text-xs sm:text-sm font-bold leading-relaxed ${isLight ? "text-slate-900" : "text-white"}`}
        >
          {t.games.quiz.questionDefault}
        </p>
      </div>

      {/* 4 Interactive Options */}
      <div className="w-full flex flex-col gap-2">
        {options.map((option, idx) => {
          const isSelected = selectedIndex === idx;
          const isCorrect = idx === correctIndex;

          let btnBg = isLight
            ? "bg-white border-slate-200 text-slate-800 hover:border-slate-400 shadow-sm"
            : "bg-slate-900/80 border-slate-800 text-slate-200 hover:border-slate-600";
          let icon = null;

          if (isAnswered) {
            if (isCorrect) {
              btnBg = isLight
                ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-emerald-500/10 font-bold"
                : "bg-emerald-950 border-emerald-500 text-emerald-200 shadow-emerald-500/20";
              icon = (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              );
            } else if (isSelected && !isCorrect) {
              btnBg = isLight
                ? "bg-red-50 border-red-500 text-red-800 shadow-red-500/10 font-bold"
                : "bg-red-950 border-red-500 text-red-200 shadow-red-500/20";
              icon = <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
            }
          }

          return (
            <motion.button
              key={idx}
              whileTap={!isAnswered ? { scale: 0.98 } : {}}
              onClick={() => handleSelectOption(idx)}
              disabled={isAnswered}
              className={`w-full py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer disabled:cursor-default ${btnBg}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isLight
                      ? "bg-slate-100 text-slate-600 border border-slate-200"
                      : "bg-black/40 border border-white/10 text-slate-400"
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-left font-medium">{option}</span>
              </div>
              {icon}
            </motion.button>
          );
        })}
      </div>

      {/* Feedback Banner */}
      {isAnswered && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-[11px] font-bold text-center"
        >
          {selectedIndex === correctIndex ? (
            <span className="text-emerald-400">✅ {t.games.quiz.correct}</span>
          ) : (
            <span className="text-red-400">❌ {t.games.quiz.wrong}</span>
          )}
        </motion.div>
      )}
    </div>
  );
};
