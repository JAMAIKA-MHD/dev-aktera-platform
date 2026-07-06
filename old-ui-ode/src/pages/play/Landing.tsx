import { useParams, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckSquare,
  Clock,
  Gift,
  Phone,
  Square,
  User,
} from 'lucide-react';
import { useCampaignBySlug } from '../../hooks/useCampaignBySlug';
import { usePrizes } from '../../hooks/usePrizes';
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

export default function Landing() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { campaign, loading, error } = useCampaignBySlug(slug);
  const { prizes } = usePrizes(campaign?.id ?? null);
  const { setPlayer } = usePlayer();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const previewTheme = useMemo(
    () => getCampaignPreviewTheme(campaign ?? { name: 'YOUENGAGE', theme_color: null }),
    [campaign],
  );

  const now = new Date();

  const inputClassName =
    'touch-target w-full rounded-xl border border-[#2D2D3F] bg-[#1F1F2E]/80 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-600 transition-all duration-200 min-h-12 focus:outline-none focus:ring-1 focus:ring-[#6366F1]/20';

  const getCampaignState = () => {
    if (!campaign) return 'not_found';
    if (campaign.status === 'draft') return 'not_started';
    if (campaign.status === 'paused') return 'paused';
    if (campaign.status === 'ended' || campaign.status === 'archived') return 'ended';
    if (new Date(campaign.start_date) > now) return 'not_started';
    if (new Date(campaign.end_date) < now) return 'ended';
    if (campaign.status === 'active') return 'active';
    return 'not_found';
  };

  const campaignState = loading ? 'loading' : getCampaignState();

  const isValidPhone = (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/\s/g, '');
    return /^(0[567]\d{8})$/.test(cleaned);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Please enter your full name.');
      return;
    }

    if (campaign?.require_phone && !isValidPhone(phone)) {
      setFormError('Please enter a valid Algerian phone number (example: 0555123456).');
      return;
    }

    if (!consent) {
      setFormError('Please accept the terms and consent gate before continuing.');
      return;
    }

    setSubmitting(true);

    try {
      if (campaign?.require_phone && phone.trim()) {
        const normalizedPhone = phone.trim().replace(/\s/g, '');
        const { data: existing, error: existingError } = await supabase
          .from('entries')
          .select('id')
          .eq('campaign_id', campaign.id)
          .eq('phone_number', normalizedPhone)
          .maybeSingle();

        if (existingError) {
          throw existingError;
        }

        if (existing) {
          setFormError('You have already participated in this campaign with this phone number.');
          setSubmitting(false);
          return;
        }
      }

      setPlayer({
        name: name.trim(),
        phone: phone.trim(),
        consent: true,
        campaignSlug: slug ?? null,
      });

      navigate(`/play/${slug}/game`);
    } catch (submissionError: unknown) {
      setFormError(
        toFriendlyErrorMessage(submissionError, {
          fallback: 'We could not verify your participation right now. Please try again.',
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderState = ({
    icon: Icon,
    title,
    description,
    tone,
  }: {
    icon: typeof AlertCircle;
    title: string;
    description: string;
    tone: 'default' | 'danger' | 'success' | 'warning';
  }) => (
    <Phase2PlayerFrame accentColor={previewTheme.primaryColor}>
      <div className="flex min-h-full flex-col justify-center px-6 py-6">
        <Phase2PlayerCard className="text-center">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border"
            style={{
              borderColor: toAlphaColor(previewTheme.primaryColor, 0.28),
              backgroundColor: toAlphaColor(previewTheme.primaryColor, 0.14),
            }}
          >
            <Icon className="h-8 w-8" style={{ color: previewTheme.primaryColor }} />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold text-white">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
          <div className="mt-6">
            <Phase2PlayerNotice title="Availability update" description={description} tone={tone} />
          </div>
        </Phase2PlayerCard>
      </div>
    </Phase2PlayerFrame>
  );

  if (loading) {
    return (
      <Phase2PlayerFrame accentColor={previewTheme.primaryColor}>
        <div className="flex min-h-full items-center justify-center px-6 py-6">
          <div className="text-center">
            <div
              className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-t-transparent"
              style={{ borderColor: toAlphaColor(previewTheme.primaryColor, 0.3), borderTopColor: 'transparent' }}
            />
            <p className="mt-4 text-sm text-zinc-400">Loading campaign...</p>
          </div>
        </div>
      </Phase2PlayerFrame>
    );
  }

  if (error) {
    return renderState({ icon: AlertCircle, title: 'Error', description: error, tone: 'danger' });
  }

  if (campaignState === 'not_found') {
    return renderState({
      icon: AlertCircle,
      title: 'Campaign not found',
      description: 'This campaign does not exist or was removed.',
      tone: 'warning',
    });
  }

  if (campaignState === 'not_started') {
    return renderState({
      icon: Calendar,
      title: 'Campaign has not started yet',
      description: `This campaign starts on ${new Date(campaign!.start_date).toLocaleDateString('en-GB')}.`,
      tone: 'default',
    });
  }

  if (campaignState === 'ended') {
    return renderState({
      icon: Clock,
      title: 'Campaign ended',
      description: `This campaign ended on ${new Date(campaign!.end_date).toLocaleDateString('en-GB')}.`,
      tone: 'warning',
    });
  }

  if (campaignState === 'paused') {
    return renderState({
      icon: AlertCircle,
      title: 'Campaign paused',
      description: 'This campaign is temporarily paused. Please try again later.',
      tone: 'warning',
    });
  }

  return (
    <Phase2PlayerFrame accentColor={previewTheme.primaryColor}>
      <div id="player-landing-container" className="flex min-h-full flex-col justify-between bg-[#0F0F1A] px-6 py-6 text-zinc-100">
        <div className="flex flex-col items-center pt-2 text-center">
          <div
            className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-zinc-700/60 bg-gradient-to-tr from-zinc-800 to-zinc-900 p-0.5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
          >
            {campaign?.hero_image_url ? (
              <img
                src={campaign.hero_image_url}
                alt={campaign.name}
                className="h-full w-full rounded-[14px] object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center rounded-[14px] text-2xl font-black text-white"
                style={{ background: `linear-gradient(135deg, ${previewTheme.gradientFrom}, ${previewTheme.gradientTo})` }}
              >
                {campaign?.name?.slice(0, 1).toUpperCase() || 'Y'}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-1">
            <h2 className="font-sans text-xl font-extrabold uppercase tracking-tight" style={{ color: previewTheme.primaryColor }} dir="auto">
              {campaign!.name}
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
              {campaign!.require_quiz ? 'Quiz Challenge Experience' : 'Lucky Wheel Experience'}
            </p>
            {campaign!.description ? (
              <p dir="auto" className="mt-0.5 text-sm font-semibold text-zinc-300">
                {campaign!.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="my-5 rounded-[28px] border border-[#2D2D3F] bg-gradient-to-br from-[#1F1F2E] to-[#161625] p-5 shadow-lg">
          <div className="mb-2 flex items-center gap-2">
            <Gift className="h-4 w-4" style={{ color: previewTheme.primaryColor }} />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">Available Rewards</span>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-slate-300">
            {campaign!.require_quiz
              ? 'Join the quiz pipeline and unlock the secure prize flow if you qualify.'
              : 'Spin the live wheel for instant server-backed prize selection.'}
          </p>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {prizes.filter((prize) => prize.is_active).slice(0, 4).map((prize) => (
              <div
                key={prize.id}
                className="flex items-center gap-1.5 rounded-xl border border-[#2D2D3F]/50 bg-[#0F0F1A]/90 px-2.5 py-2 text-[10px] font-semibold text-slate-200"
              >
                <span className="truncate" dir="auto">{prize.name}</span>
              </div>
            ))}
            {prizes.length === 0 ? (
              <div className="col-span-2 rounded-xl border border-[#2D2D3F]/50 bg-[#0F0F1A]/90 px-3 py-3 text-[10px] text-slate-500">
                Rewards will appear here once this campaign is stocked.
              </div>
            ) : null}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col justify-end gap-3.5">
          {formError ? (
            <div className="rounded-xl border border-red-500/20 bg-red-950/40 p-3 text-center text-[11px] font-medium leading-normal text-red-300">
              {formError}
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Name</label>
            <div className="relative flex items-center">
              <User className="absolute left-4 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Mohamed Djelloul"
                className={inputClassName}
                style={{ borderColor: 'rgb(45 45 63)' }}
              />
            </div>
          </div>

          {campaign!.require_phone ? (
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
              <div className="relative flex items-center">
                <Phone className="absolute left-4 h-4 w-4 text-slate-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="e.g. 0555123456"
                  className={inputClassName}
                  style={{ borderColor: 'rgb(45 45 63)' }}
                />
              </div>
            </div>
          ) : null}

          <div
            onClick={() => setConsent((value) => !value)}
            className="group mt-1 flex min-h-12 cursor-pointer items-start gap-3 select-none"
          >
            <div className="mt-0.5 shrink-0 text-slate-400 transition-colors duration-150 group-hover:text-slate-200">
              {consent ? (
                <CheckSquare className="h-5 w-5" style={{ color: previewTheme.primaryColor }} />
              ) : (
                <Square className="h-5 w-5 text-[#2D2D3F]" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-sans text-[11px] font-medium leading-normal text-slate-300">
                I agree to participate in this campaign and receive rewards.
              </span>
              <span dir="auto" className="mt-0.5 font-sans text-[10px] text-slate-500">
                أوافق على المشاركة في الحملة الترويجية وتلقي الهدايا (قانون 18-07 حماية المعطيات)
              </span>
            </div>
          </div>

          <Phase2PlayerNotice
            title="Security layer preserved"
            description="Duplicate participation pre-check stays active before the player reaches the live game."
            tone="default"
          />

          <button
            type="submit"
            disabled={submitting || !consent}
            className="touch-target mt-2 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold tracking-wider text-white shadow-lg transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg, ${previewTheme.gradientFrom}, ${previewTheme.gradientTo})`,
              boxShadow: `0 10px 20px ${toAlphaColor(previewTheme.primaryColor, 0.2)}`,
            }}
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span>PREPARING SESSION...</span>
              </>
            ) : (
              <>
                <span>{campaign!.require_quiz ? 'CONTINUE TO QUIZ / ابدأ اللعب' : "LET'S SPIN & WIN! / ابدأ اللعب"}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </Phase2PlayerFrame>
  );
}
