import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Play,
  RefreshCw,
  ShieldCheck,
  Volume2,
  X,
} from 'lucide-react';
import { useCampaignBySlug } from '../../hooks/useCampaignBySlug';
import { usePrizes } from '../../hooks/usePrizes';
import { useQuizQuestions } from '../../hooks/useQuizQuestions';
import { usePlayer } from '../../context/PlayerContext';
import { supabase } from '../../lib/supabase';
import { toFriendlyErrorMessage } from '../../lib/errorMessages';
import {
  getCampaignPreviewTheme,
  Phase2PlayerCard,
  Phase2PlayerFrame,
  Phase2PlayerNotice,
  toAlphaColor,
} from '../../features/phase2-ui';

const WHEEL_COLORS = ['#7C3AED', '#5B4CFF', '#2563EB', '#0EA5A4', '#059669', '#F59E0B', '#EF4444', '#EC4899'];

const getFriendlyEntryError = (error: unknown): string => {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? '').toLowerCase();
  if (message.includes('duplicate_entry') || message.includes('already participated')) {
    return 'You have already participated in this campaign.';
  }
  return toFriendlyErrorMessage(error, {
    fallback: 'We could not process your participation right now. Please try again.',
  });
};

function getSlicePath(index: number, total: number, radius = 180) {
  const angle = 360 / total;
  const startAngle = index * angle;
  const endAngle = (index + 1) * angle;
  const radStart = (startAngle - 90) * (Math.PI / 180);
  const radEnd = (endAngle - 90) * (Math.PI / 180);
  const x1 = 200 + radius * Math.cos(radStart);
  const y1 = 200 + radius * Math.sin(radStart);
  const x2 = 200 + radius * Math.cos(radEnd);
  const y2 = 200 + radius * Math.sin(radEnd);
  return `M 200 200 L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
}

export default function Game() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { campaign, loading: campaignLoading } = useCampaignBySlug(slug);
  const { prizes, loading: prizesLoading } = usePrizes(campaign?.id ?? null);
  const { questions, loading: questionsLoading } = useQuizQuestions(campaign?.id ?? null);
  const { name, phone, setPlayer, campaignSlug, resetPlayer } = usePlayer();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const [processingEntry, setProcessingEntry] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ledFlash, setLedFlash] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  type SpinOutcome = {
    isWinner: boolean;
    prizeName: string | null;
    prizeId: string | null;
    entryId: string | null;
    couponCode: string | null;
    targetIndex: number;
  };

  useEffect(() => {
    if (!campaignLoading && campaignSlug !== slug) {
      navigate(`/play/${slug}`, { replace: true });
    }
  }, [campaignLoading, campaignSlug, slug, navigate]);

  useEffect(() => {
    const flashInterval = window.setInterval(() => {
      setLedFlash((previous) => !previous);
    }, 450);

    return () => window.clearInterval(flashInterval);
  }, []);

  const previewTheme = useMemo(
    () => getCampaignPreviewTheme(campaign ?? { name: 'YOUENGAGE', theme_color: null }),
    [campaign],
  );

  const playTickSound = (frequency = 440, duration = 0.05) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
      }

      const context = audioContextRef.current;
      if (!context) return;
      if (context.state === 'suspended') {
        void context.resume();
      }

      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      gainNode.gain.setValueAtTime(0.08, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
    } catch {
      // Audio is optional for the player experience.
    }
  };

  const spinWheelToIndex = (targetIndex: number, outcome: SpinOutcome) => {
    const segmentAngle = 360 / Math.max(prizes.length, 1);
    const centerOffset = segmentAngle / 2;
    const prizeAngle = 360 - (targetIndex * segmentAngle + centerOffset);
    const finalRotation = 6 * 360 + prizeAngle;

    setWheelRotation(finalRotation);
    setIsSpinning(true);
    playTickSound(650, 0.1);

    let speed = 40;
    const triggerTick = () => {
      if (speed > 800) return;
      playTickSound(450 + (1000 - speed) * 0.2, 0.02);
      speed *= 1.15;
      window.setTimeout(triggerTick, speed);
    };
    window.setTimeout(triggerTick, 100);

    window.setTimeout(() => {
      setIsSpinning(false);
      playTickSound(880, 0.25);
      setPlayer({
        hasWon: outcome.isWinner,
        prizeName: outcome.prizeName,
        prizeId: outcome.prizeId,
        entryId: outcome.entryId,
        couponCode: outcome.couponCode,
        quizCompleted: false,
      });
      navigate(`/play/${slug}/result`, { replace: true });
    }, 4200);
  };

  const processAndNavigate = async (forcePassedQuiz = false) => {
    if (!campaign) return;

    setProcessingEntry(true);
    setEntryError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('select-prize', {
        body: {
          campaign_id: campaign.id,
          phone_number: phone || '',
          participant_name: name || undefined,
          quiz_passed: campaign.require_quiz ? forcePassedQuiz : null,
          metadata: campaign.require_quiz ? { quiz_score: quizScore, total_questions: questions.length } : undefined,
        },
      });

      if (functionError || !data?.ok) {
        throw new Error(functionError?.message || data?.error || 'Failed to execute draw');
      }

      setPlayer({
        hasWon: data.entry?.is_winner,
        prizeName: data.prize?.name || null,
        prizeId: data.entry?.prize_id || null,
        entryId: data.entry?.id || null,
        couponCode: data.coupon?.code || null,
        quizCompleted: campaign.require_quiz,
      });

      navigate(`/play/${slug}/result`, { replace: true });
    } catch (error: unknown) {
      console.error('Error processing entry:', error);
      setEntryError(getFriendlyEntryError(error));
    } finally {
      setProcessingEntry(false);
    }
  };

  const handleSpin = async () => {
    if (isSpinning || processingEntry || !campaign) return;

    setProcessingEntry(true);
    setEntryError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('select-prize', {
        body: {
          campaign_id: campaign.id,
          phone_number: phone || '',
          participant_name: name || undefined,
          metadata: { game_type: 'wheel' },
        },
      });

      if (functionError || !data?.ok) {
        throw new Error(functionError?.message || data?.error || 'Failed to determine draw result');
      }

      const isWinner = data.entry?.is_winner;
      const prizeId = data.entry?.prize_id;
      const prizeNameResult = data.prize?.name || null;

      let targetIndex = 0;
      if (isWinner && prizeId && prizes.length > 0) {
        const foundIndex = prizes.findIndex((prize) => prize.id === prizeId);
        targetIndex = foundIndex >= 0 ? foundIndex : 0;
      } else {
        targetIndex = Math.floor(Math.random() * Math.max(prizes.length, 1));
      }

      const nextOutcome = {
        isWinner: Boolean(isWinner),
        prizeName: prizeNameResult,
        prizeId: prizeId || null,
        entryId: data.entry?.id || null,
        couponCode: data.coupon?.code || null,
        targetIndex,
      };

      spinWheelToIndex(targetIndex, nextOutcome);
    } catch (error: unknown) {
      console.error('Error in handleSpin:', error);
      setEntryError(getFriendlyEntryError(error));
    } finally {
      setProcessingEntry(false);
    }
  };

  const handleQuizAnswer = (optionIndex: number) => {
    if (answerSubmitted) return;
    setSelectedAnswer(optionIndex);
  };

  const submitQuizAnswer = () => {
    if (selectedAnswer === null || !questions[currentQuestionIndex]) return;
    const isCorrect = selectedAnswer === questions[currentQuestionIndex].correct_option_index;
    if (isCorrect) {
      setQuizScore((score) => score + 1);
    }
    setAnswerSubmitted(true);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((index) => index + 1);
      setSelectedAnswer(null);
      setAnswerSubmitted(false);
    } else {
      setQuizFinished(true);
    }
  };

  const isLoading = campaignLoading || prizesLoading || questionsLoading;

  const handleBackToStart = () => {
    resetPlayer();
    navigate(`/play/${slug}`, { replace: true });
  };

  if (isLoading) {
    return (
      <Phase2PlayerFrame accentColor={previewTheme.primaryColor}>
        <div className="flex min-h-full items-center justify-center px-5 py-8">
          <div className="text-center">
            <div
              className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-t-transparent"
              style={{ borderColor: toAlphaColor(previewTheme.primaryColor, 0.3), borderTopColor: 'transparent' }}
            />
            <p className="mt-4 text-sm text-zinc-400">Preparing the experience...</p>
          </div>
        </div>
      </Phase2PlayerFrame>
    );
  }

  if (!campaign) {
    return (
      <Phase2PlayerFrame accentColor={previewTheme.primaryColor}>
        <div className="flex min-h-full flex-col justify-center px-5 py-8">
          <Phase2PlayerCard className="text-center">
            <h1 className="text-2xl font-extrabold text-white">Campaign not found</h1>
            <button
              onClick={() => navigate(`/play/${slug}`)}
              className="touch-target mt-6 w-full rounded-2xl px-4 py-3 text-sm font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${previewTheme.gradientFrom}, ${previewTheme.gradientTo})` }}
            >
              Back to start
            </button>
          </Phase2PlayerCard>
        </div>
      </Phase2PlayerFrame>
    );
  }

  if (entryError) {
    return (
      <Phase2PlayerFrame accentColor={previewTheme.primaryColor}>
        <div className="flex min-h-full flex-col justify-center px-5 py-8">
          <Phase2PlayerCard>
            <Phase2PlayerNotice title="Preview blocked" description={entryError} tone="danger" />
            <button
              onClick={handleBackToStart}
              className="touch-target mt-6 w-full rounded-2xl px-4 py-3 text-sm font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${previewTheme.gradientFrom}, ${previewTheme.gradientTo})` }}
            >
              Back to start
            </button>
          </Phase2PlayerCard>
        </div>
      </Phase2PlayerFrame>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <Phase2PlayerFrame accentColor={previewTheme.primaryColor}>
      <div className="flex min-h-full flex-col gap-5 px-6 py-6">
        {campaign.require_quiz ? (
          <>
            {!quizFinished && currentQuestion ? (
              <Phase2PlayerCard>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                      Question {currentQuestionIndex + 1} / {questions.length}
                    </p>
                    <h2 className="mt-3 text-xl font-extrabold text-white" dir="auto">
                      {currentQuestion.question}
                    </h2>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold text-white">
                    Score: {quizScore}
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswer === index;
                    const isCorrect = index === currentQuestion.correct_option_index;
                    const showResult = answerSubmitted;
                    const classes = showResult
                      ? isCorrect
                        ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-100'
                        : isSelected
                          ? 'border-rose-500/35 bg-rose-500/10 text-rose-100'
                          : 'border-white/10 bg-black/20 text-white'
                      : 'border-white/10 bg-black/20 text-white';

                    return (
                      <button
                        key={index}
                        onClick={() => handleQuizAnswer(index)}
                        disabled={answerSubmitted}
                        className={`touch-target flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left text-sm transition ${classes}`}
                        style={
                          !answerSubmitted && isSelected
                            ? {
                                borderColor: toAlphaColor(previewTheme.primaryColor, 0.45),
                                backgroundColor: toAlphaColor(previewTheme.primaryColor, 0.14),
                              }
                            : undefined
                        }
                      >
                        <span dir="auto">{option}</span>
                        {showResult && isCorrect ? <Check className="h-4 w-4" /> : null}
                        {showResult && isSelected && !isCorrect ? <X className="h-4 w-4" /> : null}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={answerSubmitted ? nextQuestion : submitQuizAnswer}
                  disabled={!answerSubmitted && selectedAnswer === null}
                  className="touch-target mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${previewTheme.gradientFrom}, ${previewTheme.gradientTo})` }}
                >
                  <span>{answerSubmitted ? (currentQuestionIndex < questions.length - 1 ? 'Next question' : 'Finish quiz') : 'Submit answer'}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </Phase2PlayerCard>
            ) : (
              <Phase2PlayerCard className="text-center">
                <h2 className="text-2xl font-extrabold text-white">
                  {quizScore === questions.length ? 'Great job!' : 'Not this time'}
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  {quizScore === questions.length
                    ? 'You answered all questions correctly. Your participation can now be submitted.'
                    : `Score: ${quizScore}/${questions.length}. You must answer all questions correctly to qualify.`}
                </p>
                <div className="mt-6 grid grid-cols-1 gap-3">
                  {quizScore === questions.length ? (
                    <button
                      onClick={() => {
                        void processAndNavigate(true);
                      }}
                      disabled={processingEntry}
                      className="touch-target inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold text-white"
                      style={{ background: `linear-gradient(135deg, ${previewTheme.gradientFrom}, ${previewTheme.gradientTo})` }}
                    >
                      <ArrowRight className="h-4 w-4" />
                      <span>{processingEntry ? 'Saving...' : 'Confirm and finish'}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setCurrentQuestionIndex(0);
                          setQuizScore(0);
                          setQuizFinished(false);
                          setSelectedAnswer(null);
                          setAnswerSubmitted(false);
                        }}
                        className="touch-target inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold text-white"
                        style={{ background: `linear-gradient(135deg, ${previewTheme.gradientFrom}, ${previewTheme.gradientTo})` }}
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span>Try again</span>
                      </button>
                      <button
                        onClick={() => {
                          void processAndNavigate(false);
                        }}
                        disabled={processingEntry}
                        className="touch-target rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white"
                      >
                        {processingEntry ? 'Processing...' : 'Continue without retry'}
                      </button>
                    </>
                  )}
                </div>
              </Phase2PlayerCard>
            )}
          </>
        ) : (
          <>
            <div className="text-center pt-1">
              <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Active Player</p>
              <h3 className="mt-0.5 truncate text-sm font-bold text-zinc-200" style={{ color: previewTheme.primaryColor }}>
                {name ? `👋 Saha ${name}` : '👋 Saha Player'}
              </h3>
              <p dir="auto" className="mt-0.5 text-[11px] text-zinc-400">
                بصحتك المشاركة! اضغط على الزر لتجرب حظك
              </p>
            </div>

            <div className="relative flex flex-1 items-center justify-center overflow-hidden py-4">
              <div
                className="absolute h-72 w-72 rounded-full blur-[100px] opacity-20 transition-all duration-700"
                style={{ backgroundColor: previewTheme.primaryColor }}
              />

              <div
                className="relative flex h-[320px] w-[320px] items-center justify-center rounded-full border-[6px] border-[#1A1A2A] bg-zinc-950 p-2 shadow-[0_0_50px_rgba(0,0,0,0.8)] md:h-[340px] md:w-[340px]"
                style={{ boxShadow: `0 0 35px ${toAlphaColor(previewTheme.primaryColor, 0.14)}` }}
              >
                <div
                  className="relative h-full w-full overflow-hidden rounded-full"
                  style={{
                    transform: `rotate(${wheelRotation}deg)`,
                    transition: isSpinning ? 'transform 4200ms cubic-bezier(0.12, 0.85, 0.15, 1)' : 'none',
                  }}
                >
                  <svg viewBox="0 0 400 400" className="h-full w-full">
                    {prizes.map((prize, index) => {
                      const total = Math.max(prizes.length, 1);
                      const path = getSlicePath(index, total);
                      const angle = 360 / total;
                      const midAngle = index * angle + angle / 2 - 90;
                      const labelRadius = 110;
                      const radians = midAngle * (Math.PI / 180);
                      const tx = 200 + labelRadius * Math.cos(radians);
                      const ty = 200 + labelRadius * Math.sin(radians);

                      return (
                        <g key={prize.id}>
                          <path d={path} fill={WHEEL_COLORS[index % WHEEL_COLORS.length]} stroke="#0F0F1A" strokeWidth="3.5" />
                          <g transform={`translate(${tx}, ${ty}) rotate(${midAngle + 90})`}>
                            <text
                              textAnchor="middle"
                              fill="#FFFFFF"
                              fontSize="11.5"
                              fontWeight="700"
                              fontFamily="Poppins, system-ui"
                              className="tracking-wide text-center"
                            >
                              {prize.name.length > 15 ? `${prize.name.substring(0, 13)}...` : prize.name}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                    <circle cx="200" cy="200" r="32" fill="#0A0A10" stroke="#1F1F2F" strokeWidth="4" />
                    <circle cx="200" cy="200" r="18" fill={previewTheme.primaryColor} />
                    <circle cx="200" cy="200" r="6" fill="#FFFFFF" opacity="0.3" />
                  </svg>
                </div>

                {[...Array(12)].map((_, index) => {
                  const angle = (index * 360) / 12 - 90;
                  const radians = angle * (Math.PI / 180);
                  const radius = 143;
                  const lx = 145 + radius * Math.cos(radians);
                  const ly = 145 + radius * Math.sin(radians);
                  const isLit = ledFlash ? index % 2 === 0 : index % 2 !== 0;

                  return (
                    <div
                      key={index}
                      className="absolute h-2 w-2 rounded-full border border-black/10 transition-colors duration-200"
                      style={{
                        left: `${lx + 6}px`,
                        top: `${ly + 6}px`,
                        backgroundColor: isLit ? previewTheme.secondaryColor : '#1F1F2F',
                        boxShadow: isLit ? `0 0 8px ${previewTheme.secondaryColor}` : 'none',
                      }}
                    />
                  );
                })}
              </div>

              <div className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-[158px]">
                <svg width="28" height="38" viewBox="0 0 28 38" fill="none" className="drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
                  <path d="M14 38L0 12C0 12 4.5 0 14 0C23.5 0 28 12 28 12L14 38Z" fill="#FBBF24" />
                  <path d="M14 26L5 10C5 10 7.5 3 14 3C20.5 3 23 10 23 10L14 26Z" fill="#F59E0B" />
                  <circle cx="14" cy="10" r="4" fill="#0A0A10" />
                </svg>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="text-center">
                <p className="flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500">
                  <Volume2 className="h-3.5 w-3.5 text-slate-600" />
                  <span>Turn on sound for the full ticker effect</span>
                </p>
              </div>
              <button
                disabled={isSpinning || processingEntry || prizes.length === 0}
                onClick={handleSpin}
                className={`touch-target flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-extrabold tracking-wider text-white shadow-lg transition-all duration-300 ${
                  isSpinning || processingEntry || prizes.length === 0 ? 'cursor-not-allowed border border-[#2D2D3F] bg-[#1F1F2E] opacity-75' : ''
                }`}
                style={
                  !isSpinning && !processingEntry && prizes.length > 0
                    ? {
                        background: `linear-gradient(135deg, ${previewTheme.gradientFrom}, ${previewTheme.gradientTo})`,
                        boxShadow: `0 10px 25px ${toAlphaColor(previewTheme.primaryColor, 0.3)}`,
                      }
                    : undefined
                }
              >
                {isSpinning ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>SPINNING CHANCE / جاري السحب...</span>
                  </>
                ) : prizes.length === 0 ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/20" />
                    <span>NO PRIZES AVAILABLE YET</span>
                  </>
                ) : processingEntry ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>PREPARING DRAW...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-white" />
                    <span>SPIN THE WHEEL / أدر العجلة 🚀</span>
                  </>
                )}
              </button>
              <Phase2PlayerNotice
                title="Server-backed draw"
                description={
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" style={{ color: previewTheme.primaryColor }} />
                    <p>The outcome is still determined by the secure server flow before this wheel reveals it.</p>
                  </div>
                }
                tone="default"
              />
            </div>
          </>
        )}
      </div>
    </Phase2PlayerFrame>
  );
}
