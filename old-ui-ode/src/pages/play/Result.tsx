import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Home, MessageCircle, RotateCcw } from 'lucide-react';
import { useCampaignBySlug } from '../../hooks/useCampaignBySlug';
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

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
}

function Confetti() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const colors = ['#7C3AED', '#A78BFA', '#FCD34D', '#F59E0B', '#10B981', '#38BDF8'];
    const generatedParticles: Particle[] = [];

    for (let index = 0; index < 150; index += 1) {
      generatedParticles.push({
        id: index,
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * 200,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 8 + Math.random() * 8,
        speedX: (Math.random() - 0.5) * 3,
        speedY: 2 + Math.random() * 3,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    setParticles(generatedParticles);

    const interval = window.setInterval(() => {
      setParticles((previous) =>
        previous
          .map((particle) => ({
            ...particle,
            x: particle.x + particle.speedX,
            y: particle.y + particle.speedY,
            rotation: particle.rotation + particle.rotationSpeed,
            speedY: particle.speedY + 0.1,
          }))
          .filter((particle) => particle.y < window.innerHeight + 20),
      );
    }, 16);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size * 0.6,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg)`,
            borderRadius: '2px',
          }}
        />
      ))}
    </div>
  );
}

export default function Result() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { campaign, loading: campaignLoading } = useCampaignBySlug(slug);
  const { hasWon, prizeName, couponCode, entryId, name, resetPlayer, campaignSlug } = usePlayer();
  const [copiedCode, setCopiedCode] = useState(false);
  const [couponConfirmed, setCouponConfirmed] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const previewTheme = useMemo(
    () => getCampaignPreviewTheme(campaign ?? { name: 'YOUENGAGE', theme_color: null }),
    [campaign],
  );

  const handleCopyCoupon = () => {
    if (!couponCode) return;
    navigator.clipboard.writeText(couponCode);
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRedeemCoupon = async () => {
    if (!entryId) return;

    setRedeeming(true);
    setRedeemError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('confirm-coupon', {
        body: { entry_id: entryId },
      });

      if (fnError || !data?.ok) {
        throw new Error(fnError?.message || data?.error || 'Failed to confirm');
      }

      setCouponConfirmed(true);
      setShowRedeemModal(false);
    } catch (error: unknown) {
      setRedeemError(
        toFriendlyErrorMessage(error, {
          fallback: 'Could not confirm the coupon right now. Please try again.',
        }),
      );
    } finally {
      setRedeeming(false);
    }
  };

  const getWhatsAppShareLink = () => {
    const baseUrl = window.location.origin;
    const shareText = hasWon
      ? `I just won "${prizeName || 'a prize'}" thanks to ${campaign?.name || 'this game'}! Play now: `
      : `Join ${campaign?.name || 'this campaign'} and try your luck! `;

    return `https://wa.me/?text=${encodeURIComponent(shareText + `${baseUrl}/play/${slug}`)}`;
  };

  const handlePlayAgain = () => {
    resetPlayer();
    navigate(`/play/${slug}`, { replace: true });
  };

  if (campaignLoading) {
    return (
      <Phase2PlayerFrame accentColor={previewTheme.primaryColor}>
        <div className="flex min-h-full items-center justify-center px-5 py-8">
          <div className="text-center">
            <div
              className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-t-transparent"
              style={{
                borderColor: toAlphaColor(previewTheme.primaryColor, 0.3),
                borderTopColor: 'transparent',
              }}
            />
            <p className="mt-4 text-sm text-zinc-400">Loading your outcome...</p>
          </div>
        </div>
      </Phase2PlayerFrame>
    );
  }

  if (campaignSlug !== slug && !campaignLoading) {
    return (
      <Phase2PlayerFrame accentColor={previewTheme.primaryColor}>
        <div className="flex min-h-full flex-col justify-center px-5 py-8">
          <Phase2PlayerCard className="text-center">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border"
              style={{
                borderColor: toAlphaColor(previewTheme.primaryColor, 0.28),
                backgroundColor: toAlphaColor(previewTheme.primaryColor, 0.14),
              }}
            >
              <Home className="h-8 w-8" style={{ color: previewTheme.primaryColor }} />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold text-white">Session expired</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Please start again.</p>
            <button
              onClick={handlePlayAgain}
              className="touch-target mt-6 w-full rounded-2xl px-4 py-3 text-sm font-bold text-white"
              style={{
                background: `linear-gradient(135deg, ${previewTheme.gradientFrom}, ${previewTheme.gradientTo})`,
                boxShadow: `0 16px 34px ${toAlphaColor(previewTheme.primaryColor, 0.28)}`,
              }}
            >
              Play again
            </button>
          </Phase2PlayerCard>
        </div>
      </Phase2PlayerFrame>
    );
  }

  return (
    <Phase2PlayerFrame accentColor={previewTheme.primaryColor}>
      {hasWon ? <Confetti /> : null}
      <div id="player-result-container" className="flex min-h-full flex-col justify-between bg-[#0F0F1A] px-6 py-6 text-zinc-100">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex flex-1 flex-col justify-between"
        >
          <div id="result-header" className="pt-2 text-center">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">Campaign Outcome</p>

            {hasWon ? (
              <div>
                <h2 className="mt-1 text-2xl font-extrabold uppercase tracking-tight text-white">Mabrouk Alik! 🎉</h2>
                <p dir="auto" className="mt-0.5 text-xs font-semibold text-emerald-400">
                  مبروك عليك! لقد فزت بجائزة مميزة
                </p>
              </div>
            ) : (
              <div>
                <h2 className="mt-1 text-2xl font-extrabold uppercase tracking-tight text-zinc-300">Ma3liche! 🌙</h2>
                <p dir="auto" className="mt-0.5 text-xs font-semibold text-zinc-400">
                  خيرها في غيرها! حظ أوفر في المرة القادمة
                </p>
              </div>
            )}
          </div>

          <div className="my-6">
            {hasWon ? (
              <div className="relative overflow-hidden rounded-[32px] border border-[#2D2D3F] bg-gradient-to-br from-[#1F1F2E] via-[#161625] to-[#1F1F2E] p-6 text-center shadow-[0_0_35px_rgba(124,58,237,0.15)]">
                <div
                  className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10 blur-[40px]"
                  style={{ backgroundColor: previewTheme.primaryColor }}
                />
                <div
                  className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 text-3xl shadow-lg"
                  style={{
                    backgroundColor: previewTheme.primaryColor,
                    boxShadow: `0 10px 20px ${toAlphaColor(previewTheme.primaryColor, 0.3)}`,
                  }}
                >
                  🎁
                </div>

                <h3 className="relative mt-4 font-sans text-lg font-extrabold uppercase tracking-tight text-slate-100" dir="auto">
                  {prizeName || 'Mystery prize'}
                </h3>
                <p className="relative mt-1 text-xs tracking-wide text-slate-400">
                  Sponsored by {campaign?.name || 'YOUENGAGE'}
                </p>

                {couponCode ? (
                  <div id="coupon-display-box" className="relative mt-6 flex flex-col gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">Your Unique Coupon Code</span>
                    <div className="relative flex items-center rounded-xl border border-[#2D2D3F] bg-[#0F0F1A] p-1">
                      <span className="flex-1 truncate pl-4 text-left font-mono text-xs font-bold text-slate-300 select-text">
                        {couponCode}
                      </span>
                      <button
                        onClick={handleCopyCoupon}
                        className="touch-target flex min-h-10 items-center gap-1.5 rounded-lg border border-[#2D2D3F] bg-[#1F1F2E] px-3.5 text-xs font-semibold text-white transition-all duration-200 hover:border-slate-600 hover:bg-[#2D2D3F]"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="font-sans text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-sans">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="relative mt-5 border-t border-[#2D2D3F] pt-4 text-left font-sans text-[11px] leading-relaxed text-slate-400">
                  <p className="mb-1 text-center font-bold text-slate-300">How to Claim / طريقة الاستلام</p>
                  {couponCode ? (
                    <>
                      <p dir="auto" className="mt-1">• Copy the code above and present it to our partner agent or support desk.</p>
                      <p dir="auto" className="mt-0.5 text-slate-500">• انسخ الكود أعلاه وقدمه لأقرب وكيل تجاري للاستفادة من الهدية فوراً.</p>
                    </>
                  ) : (
                    <>
                      <p dir="auto" className="mt-1">• Keep your phone available. Our team will contact you about manual delivery.</p>
                      <p dir="auto" className="mt-0.5 text-slate-500">• احتفظ برقم الهاتف متاحاً، وسيتم التواصل معك لتأكيد الاستلام.</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-[32px] border border-[#2D2D3F] bg-gradient-to-br from-[#1F1F2E] to-[#161625] p-6 text-center shadow-lg">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#2D2D3F] bg-[#0F0F1A] text-3xl">
                  🌙
                </div>
                <h3 className="mt-4 font-sans text-base font-bold tracking-tight text-slate-300">No prize this spin!</h3>
                <p dir="auto" className="mt-2 px-2 text-xs leading-relaxed text-slate-400">
                  Ma3liche {name || 'Sadiqi'}! Algeria&apos;s lucky star is still shining. Come back later and try again.
                </p>
                <p dir="auto" className="mt-2.5 px-2 font-sans text-[11px] leading-relaxed text-slate-500">
                  معليش صديقي، لكل مجتهد نصيب! حاول مرة أخرى لاحقاً لزيادة فرص فوزك معنا
                </p>
              </div>
            )}
          </div>

          <div id="result-ctas" className="flex flex-col gap-3">
            {hasWon && couponCode ? (
              couponConfirmed ? (
                <div className="w-full rounded-2xl border border-emerald-500/40 bg-emerald-950/20 px-4 py-4 text-center text-xs font-bold tracking-wider text-emerald-300">
                  COUPON CLAIM CONFIRMED / تم حفظ الكود
                </div>
              ) : (
                <button
                  onClick={() => setShowRedeemModal(true)}
                  className="touch-target flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-[#2D2D3F] bg-[#1F1F2E] text-xs font-bold tracking-wider text-slate-300 transition-all duration-300 hover:border-slate-600 hover:bg-[#2D2D3F]"
                >
                  <Check className="h-4 w-4 text-slate-400" />
                  <span>I HAVE COPIED MY COUPON / لقد نسخت كود الهدية</span>
                </button>
              )
            ) : null}

            <a
              href={getWhatsAppShareLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-xs font-bold tracking-wider text-white shadow-lg shadow-emerald-950/20 transition-all duration-300 hover:bg-emerald-500"
            >
              <MessageCircle className="h-4 w-4 fill-white" />
              <span>SHARE TO WHATSAPP / شارك عبر الواتساب</span>
            </a>

            <button
              onClick={handlePlayAgain}
              className="touch-target flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-[#2D2D3F] bg-[#161625] text-xs font-bold tracking-wider text-slate-400 transition-all duration-200 hover:border-slate-600 hover:text-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>PLAY AGAIN / سحب جديد</span>
            </button>

            <button
              onClick={() => {
                window.location.href = '/';
              }}
              className="touch-target flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/20 text-xs font-bold tracking-wider text-zinc-200 transition hover:bg-white/5"
            >
              <Home className="h-4 w-4" />
              <span>HOME</span>
            </button>
          </div>

          {campaign ? (
            <p className="mt-4 text-center text-xs text-zinc-500">
              Campaign: <span dir="auto">{campaign.name}</span>
            </p>
          ) : null}
        </motion.div>

        {showRedeemModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4">
            <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#171726] p-6 shadow-2xl">
              <div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border"
                style={{
                  borderColor: toAlphaColor(previewTheme.primaryColor, 0.28),
                  backgroundColor: toAlphaColor(previewTheme.primaryColor, 0.14),
                }}
              >
                <Check className="h-8 w-8" style={{ color: previewTheme.primaryColor }} />
              </div>
              <h2 className="mt-4 text-center text-xl font-bold text-white">Confirm coupon copied</h2>
              <p className="mt-2 text-center text-sm leading-6 text-zinc-400">
                By confirming, you acknowledge that you have safely copied your coupon code. This action is recorded.
              </p>

              {redeemError ? (
                <div className="mt-4">
                  <Phase2PlayerNotice title="Confirmation failed" description={redeemError} tone="danger" />
                </div>
              ) : null}

              <div className="mt-6 space-y-3">
                <button
                  onClick={handleRedeemCoupon}
                  disabled={redeeming}
                  className="touch-target flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    background: `linear-gradient(135deg, ${previewTheme.gradientFrom}, ${previewTheme.gradientTo})`,
                    boxShadow: `0 16px 34px ${toAlphaColor(previewTheme.primaryColor, 0.28)}`,
                  }}
                >
                  {redeeming ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Yes, I have my coupon</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowRedeemModal(false)}
                  className="touch-target w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-zinc-300 transition hover:bg-white/5"
                >
                  Back to coupon
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Phase2PlayerFrame>
  );
}
