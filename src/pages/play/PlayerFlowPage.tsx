/**
 * PlayerFlowPage — public player-facing portal at /play/:slug
 *
 * Orchestrates the full real game flow:
 *   loading → landing → (select-prize call) → game → result
 *
 * Security rules:
 * - Prize outcome is ALWAYS determined server-side via select-prize edge function
 * - Duplicate check is handled by the edge function (phone_number unique per campaign)
 * - confirm-coupon is called server-side when player acknowledges copying their code
 *
 * Manual Supabase action required:
 * - Ensure campaigns table has anon SELECT policy for active campaigns:
 *   CREATE POLICY "Public read active campaigns"
 *   ON campaigns FOR SELECT TO anon
 *   USING (status = 'active');
 * - Same policy needed for prizes table (read-only, for wheel display):
 *   CREATE POLICY "Public read prizes for active campaigns"
 *   ON prizes FOR SELECT TO anon
 *   USING (EXISTS (
 *     SELECT 1 FROM campaigns c
 *     WHERE c.id = prizes.campaign_id AND c.status = 'active'
 *   ));
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { BrandPreset, Prize, PlayerData } from '../../types';
import { PhoneFrame } from '../../components/PhoneFrame';
import { PlayerLanding } from '../../components/PlayerLanding';
import { PlayerGame } from '../../components/PlayerGame';
import { PlayerResult } from '../../components/PlayerResult';
import { AlertTriangle, Frown } from 'lucide-react';

type PlayerScreen = 'loading' | 'not-found' | 'inactive' | 'landing' | 'submitting' | 'game' | 'result' | 'duplicate' | 'error';

// Palette for wheel slices — rotates through campaigns with multiple prizes
const WHEEL_COLORS = [
  { bg: '#7C3AED', text: '#FFFFFF' },
  { bg: '#2563EB', text: '#FFFFFF' },
  { bg: '#059669', text: '#FFFFFF' },
  { bg: '#D97706', text: '#000000' },
  { bg: '#DC2626', text: '#FFFFFF' },
  { bg: '#9333EA', text: '#FFFFFF' },
  { bg: '#0891B2', text: '#FFFFFF' },
  { bg: '#4F46E5', text: '#FFFFFF' },
];

const LOSER_SLOT: Prize = {
  id: '__loser__',
  name: 'Khir Ghira!',
  icon: '🌙',
  isWin: false,
  color: '#1E1E2E',
  textColor: '#6B7280',
};

interface DbCampaignRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  prizes: Array<{ id: string; name: string; is_active: boolean; win_message: string | null }>;
}

export default function PlayerFlowPage() {
  const { slug } = useParams<{ slug: string }>();

  const [screen, setScreen] = useState<PlayerScreen>('loading');
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [brandPreset, setBrandPreset] = useState<BrandPreset | null>(null);
  const [playerData, setPlayerData] = useState<PlayerData>({ name: '', phone: '', consent: false });

  // Server-determined outcome — set after select-prize responds
  const [serverPrize, setServerPrize] = useState<Prize | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadCampaign = useCallback(async () => {
    if (!slug) { setScreen('not-found'); return; }

    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, description, status, prizes(id, name, is_active, win_message)')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      setScreen('not-found');
      return;
    }

    const row = data as unknown as DbCampaignRow;

    if (row.status !== 'active') {
      setScreen('inactive');
      return;
    }

    // Map DB prizes → UI Prize[] with indexed colors
    const activePrizes: Prize[] = (row.prizes ?? [])
      .filter((p) => p.is_active)
      .map((p, idx) => {
        const palette = WHEEL_COLORS[idx % WHEEL_COLORS.length];
        return {
          id: p.id,
          name: p.name,
          icon: '🎁',
          isWin: true,
          color: palette.bg,
          textColor: palette.text,
        };
      });

    // Always add one loser slot so the wheel has a "no prize" segment
    const wheelPrizes: Prize[] = [...activePrizes, LOSER_SLOT];

    const preset: BrandPreset = {
      id: row.id,
      name: row.name,
      arabicName: row.description ?? row.name,
      primaryColor: '#7C3AED',
      secondaryColor: '#A78BFA',
      gradientFrom: '#7C3AED',
      gradientTo: '#4F46E5',
      description: row.description ?? '',
      slogan: 'Spin & Win',
      arabicSlogan: 'العب واربح 🎁',
      prizes: wheelPrizes,
    };

    setCampaignId(row.id);
    setBrandPreset(preset);
    setScreen('landing');
  }, [slug]);

  useEffect(() => { loadCampaign(); }, [loadCampaign]);

  // Called by PlayerLanding when player submits the form
  const handleRegister = async (data: PlayerData) => {
    setPlayerData(data);
    setScreen('submitting');

    try {
      const { data: result, error } = await supabase.functions.invoke('select-prize', {
        body: {
          campaign_id: campaignId,
          phone_number: data.phone,
          participant_name: data.name,
          user_agent: navigator.userAgent,
        },
      });

      if (error) {
        setErrorMsg('Connection error. Please try again.');
        setScreen('error');
        return;
      }

      if (!result.ok) {
        const msg: string = result.error ?? '';
        if (msg.toLowerCase().includes('already participated')) {
          setScreen('duplicate');
          return;
        }
        if (msg.toLowerCase().includes('not active') || msg.toLowerCase().includes('not found')) {
          setScreen('inactive');
          return;
        }
        setErrorMsg(msg || 'An error occurred. Please try again.');
        setScreen('error');
        return;
      }

      // Determine the UI prize to land on
      let resolvedPrize: Prize;
      if (result.prize && brandPreset) {
        // Find matching prize by id or name in the wheel
        const matched = brandPreset.prizes.find(
          (p) => p.id === result.prize.id || p.name === result.prize.name,
        );
        resolvedPrize = matched
          ? { ...matched, couponCode: result.coupon?.code ?? undefined }
          : { ...LOSER_SLOT, isWin: false };
      } else {
        // Player lost — wheel will land on the loser slot
        resolvedPrize = LOSER_SLOT;
      }

      setEntryId(result.entry?.id ?? null);
      setServerPrize(resolvedPrize);
      setScreen('game');
    } catch (err) {
      setErrorMsg('Unexpected error. Please check your connection.');
      setScreen('error');
    }
  };

  // Called after the spin animation finishes
  const handleGameComplete = (_prize: Prize) => {
    setScreen('result');
  };

  // Called when player clicks "I have copied my coupon"
  const handleCouponConfirmed = async () => {
    if (!entryId) return;
    await supabase.functions.invoke('confirm-coupon', {
      body: { entry_id: entryId },
    });
  };

  // Reset to landing (player can view campaign page again — duplicate check prevents re-entry)
  const handleRestart = () => {
    setServerPrize(null);
    setEntryId(null);
    setPlayerData({ name: '', phone: '', consent: false });
    setScreen('landing');
  };

  // --- Full-screen non-interactive states ---

  if (screen === 'loading') {
    return (
      <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (screen === 'not-found') {
    return (
      <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center px-6 text-center">
        <div>
          <Frown className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-zinc-200">Campaign Not Found</h1>
          <p className="text-sm text-zinc-500 mt-2">The link you followed may have expired or is incorrect.</p>
        </div>
      </div>
    );
  }

  if (screen === 'inactive') {
    return (
      <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center px-6 text-center">
        <div>
          <AlertTriangle className="w-12 h-12 text-amber-500/60 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-zinc-200">Campaign Closed</h1>
          <p className="text-sm text-zinc-500 mt-2 font-sans">
            This campaign is no longer active. Check back later for new promotions! 🇩🇿
          </p>
          <p dir="auto" className="text-xs text-zinc-600 mt-1">الحملة غير نشطة حالياً. تابعونا للحملات القادمة!</p>
        </div>
      </div>
    );
  }

  if (screen === 'duplicate') {
    return (
      <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center px-6 text-center">
        <div>
          <span className="text-5xl">🔒</span>
          <h1 className="text-lg font-bold text-zinc-200 mt-4">Already Participated</h1>
          <p className="text-sm text-zinc-400 mt-2 font-sans">
            You have already entered this campaign with this phone number.
            <br />One entry per person — that's the rule! 😊
          </p>
          <p dir="auto" className="text-xs text-zinc-500 mt-2">
            لقد شاركت مسبقاً في هذه الحملة. مشاركة واحدة فقط لكل شخص.
          </p>
        </div>
      </div>
    );
  }

  if (screen === 'error') {
    return (
      <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center px-6 text-center">
        <div>
          <AlertTriangle className="w-12 h-12 text-red-500/60 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-zinc-200">Something Went Wrong</h1>
          {errorMsg && <p className="text-sm text-red-400 mt-2">{errorMsg}</p>}
          <button
            onClick={() => setScreen('landing')}
            className="mt-6 px-6 py-3 rounded-xl bg-violet-700 hover:bg-violet-600 text-white text-sm font-bold cursor-pointer min-h-[48px]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'submitting') {
    return (
      <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-zinc-300">Preparing your spin...</p>
          <p dir="auto" className="text-xs text-zinc-500 mt-1">جارٍ تحضير دورتك...</p>
        </div>
      </div>
    );
  }

  if (!brandPreset) return null;

  // Interactive player screens — wrapped in PhoneFrame for correct max-width + styling
  return (
    <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center py-4">
      <PhoneFrame>
        {screen === 'landing' && (
          <PlayerLanding
            activeBrand={brandPreset}
            onRegister={handleRegister}
            savedData={playerData}
          />
        )}
        {screen === 'game' && serverPrize !== undefined && (
          <PlayerGame
            activeBrand={brandPreset}
            forcedOutcome={serverPrize?.isWin ? 'win' : 'lose'}
            targetPrize={serverPrize ?? undefined}
            onGameComplete={handleGameComplete}
            playerName={playerData.name}
          />
        )}
        {screen === 'result' && (
          <PlayerResult
            activeBrand={brandPreset}
            prize={serverPrize?.isWin ? serverPrize : null}
            onRestart={handleRestart}
            playerName={playerData.name}
            entryId={entryId ?? undefined}
            onCouponConfirmed={handleCouponConfirmed}
          />
        )}
      </PhoneFrame>
    </div>
  );
}

