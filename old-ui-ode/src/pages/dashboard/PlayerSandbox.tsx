import { useEffect, useMemo, useState } from 'react';
import { Wheel } from 'react-custom-roulette';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  Gift,
  Phone,
  Play,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Smartphone,
  Trophy,
  User,
} from 'lucide-react';
import type { Prize } from '../../types';
import {
  getCampaignPreviewTheme,
  getCampaignStatusBadge,
  Phase2PageHeader,
  Phase2PlayerCard,
  Phase2PlayerFrame,
  Phase2PlayerNotice,
  Phase2SectionCard,
  Phase2StatusPill,
  toAlphaColor,
} from '../../features/phase2-ui';
import { useCampaigns } from '../../hooks/useCampaigns';
import { usePrizes } from '../../hooks/usePrizes';
import { useQuizQuestions } from '../../hooks/useQuizQuestions';

type SandboxScreen = 'landing' | 'game' | 'result';
type SandboxOutcome = 'random' | 'win' | 'lose';

interface SandboxPlayerData {
  name: string;
  phone: string;
  consent: boolean;
}

const SEGMENT_COLORS = [
  '#7C3AED',
  '#4F46E5',
  '#2563EB',
  '#0891B2',
  '#0D9488',
  '#059669',
  '#65A30D',
  '#D97706',
  '#DC2626',
  '#E11D48',
];

const inputClassName =
  'touch-target w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10';

function buildSandboxCoupon(prizeName: string) {
  return `SBX-${prizeName.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase() || 'PRIZE'}-2026`;
}

function pickPreviewPrize(prizes: Prize[], outcome: SandboxOutcome): Prize | null {
  if (prizes.length === 0) return null;

  if (outcome === 'lose') return null;

  if (outcome === 'win') {
    return prizes[0] ?? null;
  }

  return Math.random() > 0.5 ? prizes[Math.floor(Math.random() * prizes.length)] ?? null : null;
}

function isValidPhone(phoneNumber: string) {
  const cleaned = phoneNumber.replace(/\s/g, '');
  return /^(0[567]\d{8})$/.test(cleaned);
}

export default function PlayerSandbox() {
  const { campaigns, loading, error } = useCampaigns(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [screen, setScreen] = useState<SandboxScreen>('landing');
  const [forcedOutcome, setForcedOutcome] = useState<SandboxOutcome>('random');
  const [hypeMode, setHypeMode] = useState(true);
  const [playerData, setPlayerData] = useState<SandboxPlayerData>({
    name: '',
    phone: '',
    consent: false,
  });
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [wheelIndex, setWheelIndex] = useState(0);
  const [mustSpin, setMustSpin] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [couponConfirmed, setCouponConfirmed] = useState(false);
  const [landingError, setLandingError] = useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  useEffect(() => {
    if (!selectedCampaignId && campaigns.length > 0) {
      setSelectedCampaignId(campaigns[0].id);
    }
  }, [campaigns, selectedCampaignId]);

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? campaigns[0] ?? null;
  const previewTheme = useMemo(
    () => getCampaignPreviewTheme(selectedCampaign ?? { name: 'YOUENGAGE', theme_color: null }),
    [selectedCampaign],
  );
  const campaignStatus = selectedCampaign ? getCampaignStatusBadge(selectedCampaign) : null;

  const { prizes, error: prizesError } = usePrizes(selectedCampaign?.id ?? null);
  const { questions, error: questionsError } = useQuizQuestions(selectedCampaign?.id ?? null);

  const wheelSegments =
    prizes.length > 0
      ? prizes.map((prize, index) => ({
          option: prize.name,
          style: {
            backgroundColor: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
            textColor: '#FFFFFF',
          },
        }))
      : [{ option: 'No rewards yet', style: { backgroundColor: '#374151', textColor: '#FFFFFF' } }];

  const resetPreview = () => {
    setScreen('landing');
    setSelectedPrize(null);
    setWheelIndex(0);
    setMustSpin(false);
    setSpinning(false);
    setCopiedCoupon(false);
    setCouponConfirmed(false);
    setLandingError(null);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setAnswerSubmitted(false);
    setQuizScore(0);
    setQuizFinished(false);
  };

  useEffect(() => {
    resetPreview();
  }, [selectedCampaignId]);

  const currentQuestion = questions[questionIndex];
  const sandboxCoupon = selectedPrize ? buildSandboxCoupon(selectedPrize.name) : null;

  const handleLandingSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setLandingError(null);

    if (!playerData.name.trim()) {
      setLandingError('Please enter a player name for the preview.');
      return;
    }

    if (selectedCampaign?.require_phone && !isValidPhone(playerData.phone)) {
      setLandingError('Use a valid Algerian phone format such as 06XXXXXXXX.');
      return;
    }

    if (!playerData.consent) {
      setLandingError('Consent must be checked before the preview can continue.');
      return;
    }

    setScreen('game');
  };

  const completePreview = (prize: Prize | null) => {
    setSelectedPrize(prize);
    setScreen('result');
  };

  const handleSpin = () => {
    if (spinning) return;
    const prize = pickPreviewPrize(prizes, forcedOutcome);
    const targetIndex = prize ? Math.max(0, prizes.findIndex((item) => item.id === prize.id)) : Math.floor(Math.random() * wheelSegments.length);
    setSelectedPrize(prize);
    setWheelIndex(targetIndex === -1 ? 0 : targetIndex);
    setMustSpin(true);
    setSpinning(true);
  };

  const handleWheelStop = () => {
    setMustSpin(false);
    setSpinning(false);
    completePreview(selectedPrize);
  };

  const handleQuizAnswer = (optionIndex: number) => {
    if (answerSubmitted) return;
    setSelectedAnswer(optionIndex);
  };

  const submitQuizAnswer = () => {
    if (selectedAnswer === null || !currentQuestion) return;
    const isCorrect = selectedAnswer === currentQuestion.correct_option_index;
    if (isCorrect) {
      setQuizScore((value) => value + 1);
    }
    setAnswerSubmitted(true);
  };

  const nextQuestion = () => {
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((value) => value + 1);
      setSelectedAnswer(null);
      setAnswerSubmitted(false);
      return;
    }
    setQuizFinished(true);
  };

  const finishQuizPreview = () => {
    const prize = quizScore === questions.length ? pickPreviewPrize(prizes, forcedOutcome === 'lose' ? 'lose' : forcedOutcome) : null;
    completePreview(prize);
  };

  const handleCopyCoupon = () => {
    if (!sandboxCoupon) return;
    navigator.clipboard.writeText(sandboxCoupon);
    setCopiedCoupon(true);
    window.setTimeout(() => setCopiedCoupon(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
        Failed to load sandbox campaigns: {error}
      </div>
    );
  }

  if (!selectedCampaign) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-600">
        No campaign is available yet. Create or publish a campaign first.
      </div>
    );
  }

  const previewIsQuiz = selectedCampaign.require_quiz;
  const liveDataWarning = prizesError || questionsError;

  return (
    <div className="space-y-6">
      <Phase2PageHeader
        eyebrow="Sandbox"
        title="Interactive Player Sandbox"
        description="Preview the new player experience with live campaign, prize, and quiz data while keeping the entire flow isolated from production entries and prize inventory."
        action={
          <button
            type="button"
            onClick={resetPreview}
            className="touch-target inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reset preview</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Phase2SectionCard
            title="Sandbox controls"
            description="Reuses real campaign content but never creates entries, coupon confirmations, or stock mutations."
            icon={SlidersHorizontal}
          >
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Active campaign
                </label>
                <select
                  value={selectedCampaign.id}
                  onChange={(event) => setSelectedCampaignId(event.target.value)}
                  className="touch-target w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white"
                >
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{selectedCampaign.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {previewIsQuiz ? 'Quiz-based participation' : 'Wheel-based participation'}
                    </p>
                  </div>
                  {campaignStatus ? (
                    <Phase2StatusPill label={campaignStatus.label} tone={campaignStatus.tone} />
                  ) : null}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600">
                  <div>
                    <p className="font-semibold text-slate-900">{prizes.length}</p>
                    <p>Preview rewards</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{questions.length}</p>
                    <p>Quiz questions</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Screen inspection
                </label>
                <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
                  {(['landing', 'game', 'result'] as SandboxScreen[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setScreen(value)}
                      className={`touch-target rounded-xl px-3 py-2 text-xs font-semibold capitalize transition ${
                        screen === value ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Preview outcome
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'random', label: 'Random' },
                    { key: 'win', label: 'Force win' },
                    { key: 'lose', label: 'Force lose' },
                  ] as const).map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setForcedOutcome(option.key)}
                      className={`touch-target rounded-2xl border px-3 py-3 text-xs font-semibold transition ${
                        forcedOutcome === option.key
                          ? 'border-indigo-200 bg-indigo-50 text-indigo-600'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Preview player
                </label>
                <div className="space-y-3">
                  <input
                    value={playerData.name}
                    onChange={(event) =>
                      setPlayerData((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Preview player name"
                    className="touch-target w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white"
                  />
                  <input
                    value={playerData.phone}
                    onChange={(event) =>
                      setPlayerData((current) => ({ ...current, phone: event.target.value }))
                    }
                    placeholder="06XXXXXXXX"
                    className="touch-target w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPlayerData((current) => ({ ...current, consent: !current.consent }))
                    }
                    className={`touch-target flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                      playerData.consent
                        ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border border-current/30">
                      {playerData.consent ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                    <span className="text-sm">
                      Keep consent checked to simulate the Loi 18-07 gate.
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setHypeMode((value) => !value)}
                className={`touch-target flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  hypeMode
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>Hype glow</span>
                </span>
                <span>{hypeMode ? 'On' : 'Off'}</span>
              </button>
            </div>
          </Phase2SectionCard>

          <Phase2SectionCard
            title="Safety boundary"
            description="This surface is intentionally disconnected from public entry creation."
            icon={ShieldCheck}
          >
            <div className="space-y-3 text-sm text-slate-600">
              <Phase2PlayerNotice
                title="No production mutation"
                description="The sandbox never calls select-prize, confirm-coupon, or any insert/update mutation. All outcome simulation stays in local state."
                tone="default"
              />
              {liveDataWarning ? (
                <Phase2PlayerNotice
                  title="Live-data warning"
                  description={prizesError || questionsError || 'Some live preview data could not be loaded.'}
                  tone="warning"
                />
              ) : null}
            </div>
          </Phase2SectionCard>
        </div>

        <Phase2SectionCard
          title="Mobile preview"
          description="Interactive design preview using the real campaign copy, reward names, and quiz content."
          icon={Smartphone}
        >
          <div className={`${hypeMode ? 'relative' : ''}`}>
            {hypeMode ? (
              <div
                className="pointer-events-none absolute inset-x-10 top-10 h-40 blur-3xl"
                style={{
                  background: `radial-gradient(circle at center, ${toAlphaColor(previewTheme.primaryColor, 0.18)} 0%, transparent 72%)`,
                }}
              />
            ) : null}
            <div className="mx-auto max-w-[480px]">
              <Phase2PlayerFrame accentColor={previewTheme.primaryColor}>
                {screen === 'landing' ? (
                  <div className="flex min-h-full flex-col gap-5 px-5 py-5">
                    <div
                      className="relative overflow-hidden rounded-[30px] border border-white/10 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.24)]"
                      style={{
                        background: selectedCampaign.hero_image_url
                          ? `linear-gradient(180deg, rgba(15,15,26,0.18), rgba(15,15,26,0.96)), url(${selectedCampaign.hero_image_url}) center/cover`
                          : `linear-gradient(135deg, ${previewTheme.gradientFrom}, ${previewTheme.gradientTo})`,
                      }}
                    >
                      <div className="relative pt-10">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">
                          <Sparkles className="h-4 w-4" />
                          <span>Sandbox preview</span>
                        </div>
                        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white" dir="auto">
                          {selectedCampaign.name}
                        </h1>
                        {selectedCampaign.description ? (
                          <p className="mt-3 text-sm leading-6 text-white/80" dir="auto">
                            {selectedCampaign.description}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <Phase2PlayerCard>
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                        <Gift className="h-4 w-4" style={{ color: previewTheme.primaryColor }} />
                        <span>Available rewards</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {prizes.slice(0, 4).map((prize) => (
                          <div
                            key={prize.id}
                            className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-left text-xs text-zinc-300"
                          >
                            <p className="font-semibold text-white" dir="auto">
                              {prize.name}
                            </p>
                            <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-zinc-500" dir="auto">
                              {prize.description || prize.win_message || 'Instant winner reveal on the result screen.'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </Phase2PlayerCard>

                    <Phase2PlayerCard>
                      <form onSubmit={handleLandingSubmit} className="space-y-4">
                        <div>
                          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                            First name
                          </label>
                          <div className="relative">
                            <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                            <input
                              value={playerData.name}
                              onChange={(event) =>
                                setPlayerData((current) => ({ ...current, name: event.target.value }))
                              }
                              placeholder="Preview player name"
                              className={`${inputClassName} pl-11`}
                            />
                          </div>
                        </div>

                        {selectedCampaign.require_phone ? (
                          <div>
                            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                              Phone number
                            </label>
                            <div className="relative">
                              <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                              <input
                                value={playerData.phone}
                                onChange={(event) =>
                                  setPlayerData((current) => ({ ...current, phone: event.target.value }))
                                }
                                placeholder="06XXXXXXXX"
                                className={`${inputClassName} pl-11`}
                              />
                            </div>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={() =>
                            setPlayerData((current) => ({ ...current, consent: !current.consent }))
                          }
                          className={`touch-target flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                            playerData.consent ? 'border-white/20 bg-white/10' : 'border-white/10 bg-black/10'
                          }`}
                        >
                          <span
                            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border"
                            style={{
                              borderColor: playerData.consent ? previewTheme.primaryColor : 'rgba(255,255,255,0.18)',
                              backgroundColor: playerData.consent ? previewTheme.primaryColor : 'transparent',
                            }}
                          >
                            {playerData.consent ? <Check className="h-3.5 w-3.5 text-white" /> : null}
                          </span>
                          <span className="text-sm text-zinc-300">
                            Consent gate preview. The CTA stays disabled until this is checked.
                          </span>
                        </button>

                        {landingError ? (
                          <Phase2PlayerNotice title="Preview blocked" description={landingError} tone="danger" />
                        ) : null}

                        <button
                          type="submit"
                          disabled={!playerData.consent}
                          className="touch-target flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                          style={{
                            background: `linear-gradient(135deg, ${previewTheme.gradientFrom}, ${previewTheme.gradientTo})`,
                            boxShadow: `0 16px 34px ${toAlphaColor(previewTheme.primaryColor, 0.28)}`,
                          }}
                        >
                          <span>{previewIsQuiz ? 'Continue to preview quiz' : 'Continue to preview wheel'}</span>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </form>
                    </Phase2PlayerCard>
                  </div>
                ) : null}

                {screen === 'game' ? (
                  <div className="flex min-h-full flex-col gap-5 px-5 py-5">
                    {previewIsQuiz ? (
                      questions.length > 0 && currentQuestion ? (
                        <>
                          <Phase2PlayerCard>
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                                  Question {questionIndex + 1} of {questions.length}
                                </p>
                                <h2 className="mt-2 text-xl font-bold text-white" dir="auto">
                                  {currentQuestion.question}
                                </h2>
                              </div>
                              <div
                                className="rounded-2xl border px-3 py-2 text-[11px] font-semibold text-zinc-200"
                                style={{
                                  borderColor: toAlphaColor(previewTheme.primaryColor, 0.3),
                                  backgroundColor: toAlphaColor(previewTheme.primaryColor, 0.12),
                                }}
                              >
                                Score: {quizScore}
                              </div>
                            </div>
                            <div className="mt-5 space-y-3">
                              {currentQuestion.options.map((option, index) => {
                                const isSelected = selectedAnswer === index;
                                const isCorrect = index === currentQuestion.correct_option_index;
                                const showResult = answerSubmitted;

                                let className = 'touch-target w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-left text-sm text-white transition';
                                if (showResult) {
                                  if (isCorrect) className = 'touch-target w-full rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-4 text-left text-sm text-emerald-100 transition';
                                  else if (isSelected && !isCorrect) className = 'touch-target w-full rounded-2xl border border-rose-500/35 bg-rose-500/10 px-4 py-4 text-left text-sm text-rose-100 transition';
                                }

                                return (
                                  <button
                                    key={`${currentQuestion.id}-${index}`}
                                    type="button"
                                    onClick={() => handleQuizAnswer(index)}
                                    disabled={answerSubmitted}
                                    className={className}
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
                                  </button>
                                );
                              })}
                            </div>
                            <div className="mt-6">
                              {!answerSubmitted ? (
                                <button
                                  type="button"
                                  onClick={submitQuizAnswer}
                                  disabled={selectedAnswer === null}
                                  className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                  style={{
                                    background: `linear-gradient(135deg, ${previewTheme.gradientFrom}, ${previewTheme.gradientTo})`,
                                    boxShadow: `0 16px 34px ${toAlphaColor(previewTheme.primaryColor, 0.28)}`,
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                  <span>Submit preview answer</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={nextQuestion}
                                  className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white"
                                  style={{
                                    background: `linear-gradient(135deg, ${previewTheme.gradientFrom}, ${previewTheme.gradientTo})`,
                                    boxShadow: `0 16px 34px ${toAlphaColor(previewTheme.primaryColor, 0.28)}`,
                                  }}
                                >
                                  <span>{questionIndex < questions.length - 1 ? 'Next question' : 'Finish preview quiz'}</span>
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </Phase2PlayerCard>

                          {quizFinished ? (
                            <button
                              type="button"
                              onClick={finishQuizPreview}
                              className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                            >
                              <ArrowRight className="h-4 w-4" />
                              <span>Continue to result preview</span>
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <Phase2PlayerCard>
                          <Phase2PlayerNotice
                            title="No quiz questions available"
                            description="This campaign requires a quiz, but no active questions are currently available for preview."
                            tone="warning"
                          />
                        </Phase2PlayerCard>
                      )
                    ) : (
                      <>
                        <Phase2PlayerCard>
                          <div className="text-center">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                              Wheel preview
                            </p>
                            <p className="mt-2 text-sm leading-6 text-zinc-400">
                              The sandbox simulates the reveal only. No secure draw is executed from this page.
                            </p>
                          </div>
                          <div className="relative mt-5 overflow-hidden rounded-[30px] border border-white/10 bg-black/20 px-3 py-6">
                            <div className="relative flex justify-center">
                              <div className="relative">
                                <Wheel
                                  mustStartSpinning={mustSpin}
                                  prizeNumber={wheelIndex}
                                  data={wheelSegments}
                                  onStopSpinning={handleWheelStop}
                                  fontSize={16}
                                  outerBorderColor="#2D2D4A"
                                  innerBorderColor="#1E1E32"
                                  radiusLineColor="#1E1E32"
                                  perpendicularText
                                  textDistance={60}
                                  outerBorderWidth={8}
                                  innerBorderWidth={30}
                                  innerRadius={40}
                                  radiusLineWidth={2}
                                  startingOptionIndex={0}
                                />
                                <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-2">
                                  <div
                                    className="h-0 w-0 border-l-[12px] border-r-[12px] border-t-[22px] border-l-transparent border-r-transparent"
                                    style={{ borderTopColor: previewTheme.primaryColor }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleSpin}
                            disabled={spinning}
                            className="touch-target mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                            style={{
                              background: `linear-gradient(135deg, ${previewTheme.gradientFrom}, ${previewTheme.gradientTo})`,
                              boxShadow: `0 16px 34px ${toAlphaColor(previewTheme.primaryColor, 0.28)}`,
                            }}
                          >
                            {spinning ? (
                              <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                                <span>Spinning preview...</span>
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 fill-white" />
                                <span>Spin preview wheel</span>
                              </>
                            )}
                          </button>
                        </Phase2PlayerCard>
                        <Phase2PlayerNotice
                          title="Outcome mode"
                          description={`Current mode: ${forcedOutcome}. Random uses local preview logic only.`}
                          tone="default"
                        />
                      </>
                    )}
                  </div>
                ) : null}

                {screen === 'result' ? (
                  <div className="flex min-h-full flex-col gap-5 px-5 py-5">
                    <div className="pt-2 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Sandbox Outcome</p>
                      {selectedPrize ? (
                        <>
                          <h2 className="mt-1 text-2xl font-extrabold uppercase tracking-tight text-white">Mabrouk Alik! 🎉</h2>
                          <p dir="auto" className="mt-0.5 text-xs font-semibold text-emerald-400">
                            معاينة فقط: لا يتم إنشاء كوبون حقيقي من هذا السطح
                          </p>
                        </>
                      ) : (
                        <>
                          <h2 className="mt-1 text-2xl font-extrabold uppercase tracking-tight text-zinc-300">Ma3liche! 🌙</h2>
                          <p dir="auto" className="mt-0.5 text-xs font-semibold text-zinc-400">
                            هذه معاينة لحالة عدم الفوز داخل الساندبوكس فقط
                          </p>
                        </>
                      )}
                    </div>

                    {selectedPrize ? (
                      <div className="relative overflow-hidden rounded-[32px] border border-[#2D2D3F] bg-gradient-to-br from-[#1F1F2E] via-[#161625] to-[#1F1F2E] p-6 text-center shadow-[0_0_35px_rgba(124,58,237,0.15)]">
                        <div
                          className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10 blur-[40px]"
                          style={{ backgroundColor: previewTheme.primaryColor }}
                        />
                        <div
                          className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 shadow-lg"
                          style={{
                            backgroundColor: previewTheme.primaryColor,
                            boxShadow: `0 10px 20px ${toAlphaColor(previewTheme.primaryColor, 0.3)}`,
                          }}
                        >
                          <Trophy className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="relative mt-4 text-lg font-extrabold uppercase tracking-tight text-slate-100" dir="auto">
                          {selectedPrize.name}
                        </h3>
                        <p className="relative mt-1 text-xs tracking-wide text-slate-400">
                          Sandbox coupon preview only
                        </p>

                        <div className="relative mt-6 flex flex-col gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sandbox Coupon Code</span>
                          <div className="relative flex items-center rounded-xl border border-[#2D2D3F] bg-[#0F0F1A] p-1">
                            <span className="flex-1 truncate pl-4 text-left font-mono text-xs font-bold text-slate-300 select-text">
                              {sandboxCoupon}
                            </span>
                            <button
                              type="button"
                              onClick={handleCopyCoupon}
                              className="touch-target flex min-h-10 items-center gap-1.5 rounded-lg border border-[#2D2D3F] bg-[#1F1F2E] px-3.5 text-xs font-semibold text-white transition-all duration-200 hover:border-slate-600 hover:bg-[#2D2D3F]"
                            >
                              {copiedCoupon ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                              <span>{copiedCoupon ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>

                        <div className="relative mt-5 border-t border-[#2D2D3F] pt-4 text-left text-[11px] leading-relaxed text-slate-400">
                          <p className="mb-1 text-center font-bold text-slate-300">Sandbox Safety / حدود المعاينة</p>
                          <p className="mt-1">• This preview never writes entries, confirms coupons, or mutates stock.</p>
                          <p dir="auto" className="mt-0.5 text-slate-500">
                            • هذه الشاشة للمعاينة فقط ولا تتصل بمسار الجوائز الحقيقي.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[32px] border border-[#2D2D3F] bg-gradient-to-br from-[#1F1F2E] to-[#161625] p-6 text-center shadow-lg">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#2D2D3F] bg-[#0F0F1A] text-3xl">
                          🌙
                        </div>
                        <h3 className="mt-4 text-base font-bold tracking-tight text-slate-300">No prize in preview</h3>
                        <p className="mt-2 text-xs leading-relaxed text-slate-400">
                          This is the non-winner sandbox state. Use the outcome controls to switch scenarios safely.
                        </p>
                      </div>
                    )}

                    {selectedPrize ? (
                      <button
                        type="button"
                        onClick={() => setCouponConfirmed((value) => !value)}
                        className={`touch-target inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold tracking-wider transition ${
                          couponConfirmed
                            ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
                            : 'border-[#2D2D3F] bg-[#1F1F2E] text-slate-300 hover:border-slate-600 hover:bg-[#2D2D3F]'
                        }`}
                      >
                        {couponConfirmed ? <Check className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4 text-slate-400" />}
                        <span>{couponConfirmed ? 'SANDBOX COUPON CONFIRMED' : 'MARK COUPON AS COPIED'}</span>
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={resetPreview}
                      className="touch-target inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Restart preview</span>
                    </button>
                  </div>
                ) : null}
              </Phase2PlayerFrame>
            </div>
          </div>
        </Phase2SectionCard>
      </div>
    </div>
  );
}
