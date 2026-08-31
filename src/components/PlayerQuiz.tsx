/**
 * PlayerQuiz — quiz challenge screen for quiz-type campaigns.
 *
 * Shown between PlayerLanding (form submit) and the wheel spin.
 * Presents questions one at a time with brief visual feedback,
 * then calls onComplete(passed) when all questions are answered.
 *
 * Pass threshold: player must answer the majority (>50%) correctly.
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BrandPreset, QuizQuestion } from "../types";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  Trophy,
  Frown,
} from "lucide-react";

interface PlayerQuizProps {
  activeBrand: BrandPreset;
  questions: QuizQuestion[];
  playerName: string;
  onComplete: (payload: { answers: Record<string, number> }) => void;
}

type AnswerState = "idle" | "correct" | "wrong";

export const PlayerQuiz: React.FC<PlayerQuizProps> = ({
  activeBrand,
  questions,
  playerName,
  onComplete,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [phase, setPhase] = useState<"question" | "summary">("question");
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});

  const total = questions.length;
  const current = questions[currentIdx];
  const passThreshold = Math.ceil(total / 2); // majority correct

  const handleOptionClick = (optIdx: number) => {
    if (answerState !== "idle") return; // prevent double-click during feedback

    const isCorrect = optIdx === current.correctIndex;
    const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;

    setUserAnswers((prev) => ({ ...prev, [current.id]: optIdx }));
    setSelectedOption(optIdx);
    setAnswerState(isCorrect ? "correct" : "wrong");

    // After brief feedback (1.2s), advance to next question or summary
    setTimeout(() => {
      if (currentIdx + 1 < total) {
        setCurrentIdx(currentIdx + 1);
        setAnswerState("idle");
        setSelectedOption(null);
      } else {
        setCorrectCount(newCorrectCount);
        setPhase("summary");
      }
    }, 1200);

    if (isCorrect) setCorrectCount(newCorrectCount);
  };

  const passed = correctCount >= passThreshold;

  // ── Summary screen ─────────────────────────────────────────────────────────
  if (phase === "summary") {
    return (
      <div className="flex flex-col min-h-full bg-[#0F0F1A] px-5 py-8 items-center justify-center text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="flex flex-col items-center gap-4"
        >
          {passed ? (
            <>
              <span className="text-6xl">🎉</span>
              <Trophy className="w-10 h-10 text-amber-400" />
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Challenge Passed!
              </h2>
              <p className="text-sm text-zinc-400 max-w-xs">
                You got{" "}
                <span className="text-emerald-400 font-bold">
                  {correctCount} out of {total}
                </span>{" "}
                correct.
                <br />
                Ready to unlock your reward!
              </p>
              <p dir="auto" className="text-xs text-zinc-500 mt-1">
                أحسنت! احصل على مكافأتك الآن 🎁
              </p>
            </>
          ) : (
            <>
              <span className="text-6xl">😔</span>
              <Frown className="w-10 h-10 text-zinc-500" />
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Better Luck Next Time!
              </h2>
              <p className="text-sm text-zinc-400 max-w-xs">
                You got{" "}
                <span className="text-red-400 font-bold">
                  {correctCount} out of {total}
                </span>{" "}
                correct.
                <br />
                You needed {passThreshold} to qualify.
              </p>
              <p dir="auto" className="text-xs text-zinc-500 mt-1">
                حاول مرة أخرى في المرة القادمة! 🤞
              </p>
            </>
          )}

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => onComplete({ answers: userAnswers })}
            className="mt-4 w-full max-w-xs flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-extrabold text-sm text-white cursor-pointer min-h-[52px] shadow-lg"
            style={{ backgroundColor: activeBrand.primaryColor }}
          >
            <span>{passed ? "Claim Reward" : "View Results"}</span>
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ── Question screen ────────────────────────────────────────────────────────
  const progress = (currentIdx / total) * 100;

  return (
    <div className="flex flex-col min-h-full bg-[#0F0F1A]">
      {/* Header + progress */}
      <div className="px-5 pt-6 pb-4 bg-[#1E1E2E] border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-zinc-500 font-mono uppercase tracking-widest">
            Quiz Challenge
          </span>
          <span className="text-xs font-bold text-zinc-400 font-mono">
            {currentIdx + 1} / {total}
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: activeBrand.primaryColor }}
            initial={{ width: `${progress}%` }}
            animate={{ width: `${((currentIdx + 1) / total) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">
          Hey <span className="text-zinc-300 font-semibold">{playerName}</span>{" "}
          — answer to unlock the wheel!
        </p>
      </div>

      {/* Question card */}
      <div className="flex-1 flex flex-col px-5 pt-6 pb-6 gap-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-5"
          >
            {/* Question text */}
            <div className="bg-[#1E1E2E] rounded-2xl p-5 border border-white/5 shadow-md">
              <div className="flex items-start gap-3">
                <HelpCircle
                  className="w-5 h-5 mt-0.5 flex-shrink-0"
                  style={{ color: activeBrand.primaryColor }}
                />
                <p
                  dir="auto"
                  className="text-sm font-bold text-white leading-relaxed"
                >
                  {current.questionText}
                </p>
              </div>
            </div>

            {/* Answer options */}
            <div className="flex flex-col gap-3">
              {current.options.map((opt, idx) => {
                let optionClass = "bg-[#1E1E2E] border-white/10 text-zinc-200";

                if (answerState !== "idle" && selectedOption !== null) {
                  if (idx === current.correctIndex) {
                    // Always highlight correct answer once player has answered
                    optionClass =
                      "bg-emerald-950/80 border-emerald-500/50 text-emerald-200";
                  } else if (
                    idx === selectedOption &&
                    answerState === "wrong"
                  ) {
                    // Highlight wrong selection in red
                    optionClass =
                      "bg-red-950/80 border-red-500/50 text-red-300";
                  } else {
                    optionClass = "bg-[#1E1E2E] border-white/5 text-zinc-500";
                  }
                }

                const isCorrectAnswer =
                  answerState !== "idle" && idx === current.correctIndex;
                const isWrongAnswer =
                  answerState === "wrong" && idx === selectedOption;

                return (
                  <motion.button
                    key={idx}
                    whileTap={{ scale: answerState === "idle" ? 0.97 : 1 }}
                    onClick={() => handleOptionClick(idx)}
                    disabled={answerState !== "idle"}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border text-left font-semibold text-sm transition-colors duration-200 min-h-[52px] cursor-pointer ${optionClass}`}
                  >
                    <span dir="auto" className="flex-1">
                      {opt}
                    </span>
                    {isCorrectAnswer && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    )}
                    {isWrongAnswer && (
                      <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Feedback message */}
            <AnimatePresence>
              {answerState !== "idle" && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`text-center text-xs font-bold ${answerState === "correct" ? "text-emerald-400" : "text-red-400"}`}
                >
                  {answerState === "correct"
                    ? "✅ Correct! Next question..."
                    : "❌ Wrong answer!"}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
