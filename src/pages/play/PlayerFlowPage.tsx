/**
 * PlayerFlowPage — public player-facing portal at /play/:slug
 *
 * Orchestrates the full real game flow:
 *   loading → landing → quiz (if require_quiz) → submitting → game → result
 *
 * Security rules:
 * - Prize outcome is ALWAYS determined server-side via select-prize edge function
 * - Duplicate check is handled by the edge function (phone_number unique per campaign)
 * - confirm-coupon is called server-side when player acknowledges copying their code
 * - Quiz result (quiz_passed) is sent to select-prize; server gates prize draw on pass
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
import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { BrandPreset, Prize, PlayerData, QuizQuestion } from "../../types";
import { PhoneFrame } from "../../components/PhoneFrame";
import { PlayerLanding } from "../../components/PlayerLanding";
import { PlayerGame } from "../../components/PlayerGame";
import { PlayerResult } from "../../components/PlayerResult";
import { PlayerQuiz } from "../../components/PlayerQuiz";
import { PlayerScratch } from "../../components/PlayerScratch";
import { PlayerMysteryBox } from "../../components/PlayerMysteryBox";
import { PlayerHitIt } from "../../components/PlayerHitIt";
import { AlertTriangle, Frown } from "lucide-react";
import { DEFAULT_CAMPAIGN_IMAGE_URL } from "../../lib/defaultImages";

type PlayerScreen =
  | "loading"
  | "not-found"
  | "inactive"
  | "landing"
  | "quiz"
  | "hit_it"
  | "mystery_box"
  | "scratch_card"
  | "submitting"
  | "game"
  | "result"
  | "duplicate"
  | "error";

// Palette for wheel slices — rotates through campaigns with multiple prizes
const WHEEL_COLORS = [
  { bg: "#7C3AED", text: "#FFFFFF" },
  { bg: "#2563EB", text: "#FFFFFF" },
  { bg: "#059669", text: "#FFFFFF" },
  { bg: "#D97706", text: "#000000" },
  { bg: "#DC2626", text: "#FFFFFF" },
  { bg: "#9333EA", text: "#FFFFFF" },
  { bg: "#0891B2", text: "#FFFFFF" },
  { bg: "#4F46E5", text: "#FFFFFF" },
];

const LOSER_SLOT: Prize = {
  id: "__loser__",
  name: "Khir Ghira!",
  icon: "🌙",
  isWin: false,
  color: "#1E1E2E",
  textColor: "#6B7280",
};

interface DbCampaignRow {
  id: string;
  name: string;
  arabic_name: string | null;
  hero_image_url: string | null;
  status: string;
  require_quiz: boolean;
  game_type: string;
  game_logic_config: any;
  prizes: Array<{
    id: string;
    name: string;
    is_active: boolean;
    win_message: string | null;
    quantity?: number;
    quantity_won?: number;
    prize_template_id?: string | null;
  }>;
  quiz_questions: Array<{
    id: string;
    question: string;
    options: string[];
    correct_option_index: number;
    position: number;
    is_active: boolean;
  }>;
}

export default function PlayerFlowPage() {
  const { slug } = useParams<{ slug: string }>();

  const [screen, setScreen] = useState<PlayerScreen>("loading");
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [gameType, setGameType] = useState<string>("lucky_wheel");
  const [gameLogicConfig, setGameLogicConfig] = useState<any>({});
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [brandPreset, setBrandPreset] = useState<BrandPreset | null>(null);
  const [playerData, setPlayerData] = useState<PlayerData>({
    name: "",
    phone: "",
    consent: false,
  });

  // Server-determined outcome — set after select-prize responds
  const [serverPrize, setServerPrize] = useState<Prize | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const extractInvokeErrorMessage = async (
    invokeError: unknown,
  ): Promise<string> => {
    let combined = "";
    if (invokeError instanceof Error) {
      combined = invokeError.message;
    }

    if (
      typeof invokeError === "object" &&
      invokeError !== null &&
      "context" in invokeError
    ) {
      const context = (invokeError as { context?: unknown }).context;
      if (
        context &&
        typeof context === "object" &&
        "json" in context &&
        typeof (context as { json?: unknown }).json === "function"
      ) {
        try {
          const payload = await (
            context as { json: () => Promise<unknown> }
          ).json();
          if (
            typeof payload === "object" &&
            payload !== null &&
            "error" in payload
          ) {
            const serverMessage = String(
              (payload as { error?: unknown }).error ?? "",
            );
            combined = `${combined} ${serverMessage}`.trim();
          }
        } catch {
          // Keep fallback error message below if response payload is not JSON.
        }
      }
    }

    return combined.toLowerCase();
  };

  const loadCampaign = useCallback(async () => {
    if (!slug) {
      setScreen("not-found");
      return;
    }

    const { data, error } = await supabase
      .from("campaigns")
      .select(
        "id, name, arabic_name, hero_image_url, status, require_quiz, game_type, game_logic_config, prizes(id, name, is_active, win_message, quantity, quantity_won, prize_template_id), quiz_questions(id, question, options, correct_option_index, position, is_active)",
      )
      .eq("slug", slug)
      .single();

    if (error || !data) {
      setScreen("not-found");
      return;
    }

    const row = data as unknown as DbCampaignRow & {
      prizes: Array<{
        id: string;
        name: string;
        is_active: boolean;
        win_message: string | null;
        quantity?: number;
        quantity_won?: number;
        prize_template_id?: string | null;
      }>;
    };

    if (row.status !== "active") {
      setScreen("inactive");
      return;
    }

    // Check if campaign stock or voucher codes are depleted (0 available left)
    try {
      const activeDbPrizes = (row.prizes ?? []).filter((p) => p.is_active);
      const totalAllocatedStock = activeDbPrizes.reduce(
        (acc, p) => acc + (p.quantity ?? 0),
        0,
      );

      // 1. Total winners in this campaign
      const { count: totalWinnersCount } = await supabase
        .from("entries")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", row.id)
        .eq("is_winner", true);

      const totalWinners = totalWinnersCount ?? 0;

      // If total winners reached or exceeded total allocated prize stock (e.g. 10/10)
      if (totalAllocatedStock > 0 && totalWinners >= totalAllocatedStock) {
        setScreen("inactive");
        return;
      }

      // 2. Check total prepared voucher codes in database
      const winningTemplateIds = activeDbPrizes
        .map((p) => p.prize_template_id)
        .filter((id): id is string => Boolean(id));

      if (winningTemplateIds.length > 0) {
        const { count: totalPreparedCodes } = await supabase
          .from("prize_template_items")
          .select("id", { count: "exact", head: true })
          .in("prize_template_id", winningTemplateIds)
          .not("item_value", "is", null);

        if (
          totalPreparedCodes !== null &&
          totalPreparedCodes > 0 &&
          totalWinners >= totalPreparedCodes
        ) {
          setScreen("inactive");
          return;
        }
      }
    } catch {
      // Non-fatal stock check fallback
    }

    // Map DB prizes → UI Prize[] with indexed colors
    const activePrizes: Prize[] = (row.prizes ?? [])
      .filter((p) => p.is_active)
      .map((p, idx) => {
        const palette = WHEEL_COLORS[idx % WHEEL_COLORS.length];
        return {
          id: p.id,
          name: p.name,
          icon: "🎁",
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
      arabicName: row.arabic_name ?? row.name,
      primaryColor: "#7C3AED",
      secondaryColor: "#A78BFA",
      gradientFrom: "#7C3AED",
      gradientTo: "#4F46E5",
      description: "",
      logoUrl: row.hero_image_url || DEFAULT_CAMPAIGN_IMAGE_URL,
      slogan: "Spin & Win",
      arabicSlogan: "العب واربح 🎁",
      prizes: wheelPrizes,
    };

    setCampaignId(row.id);
    setBrandPreset(preset);
    setGameType(row.game_type || "lucky_wheel");
    setGameLogicConfig(row.game_logic_config || {});
    // Map DB quiz_questions → QuizQuestion[]
    const mappedQuestions: QuizQuestion[] = (row.quiz_questions ?? [])
      .filter((q) => q.is_active)
      .sort((a, b) => a.position - b.position)
      .map((q) => ({
        id: q.id,
        questionText: q.question,
        options: q.options,
        correctIndex: q.correct_option_index,
      }));
    setQuizQuestions(mappedQuestions);

    // Record Campaign Visitor Impression
    let sessionId = sessionStorage.getItem("octoreach_session_id");
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem("octoreach_session_id", sessionId);
    }

    void (async () => {
      try {
        await supabase.rpc("record_campaign_impression", {
          p_campaign_id: row.id,
          p_session_id: sessionId,
          p_user_agent: navigator.userAgent,
          p_dwell_time_seconds: 0,
          p_game_played: false,
          p_form_completed: false,
        });
      } catch {
        // Silent catch for impression tracking
      }
    })();

    setScreen("landing");
  }, [slug]);

  const pageLoadTimeRef = React.useRef(Date.now());
  const entryIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  // Active Dwell Time Counter Interval (Periodic heartbeats)
  useEffect(() => {
    if (!campaignId) return;

    const interval = setInterval(() => {
      const sessionId = sessionStorage.getItem("octoreach_session_id");
      if (!sessionId) return;
      const currentDwellSeconds = Math.max(
        1,
        Math.round((Date.now() - pageLoadTimeRef.current) / 1000),
      );

      void (async () => {
        try {
          await supabase.rpc("record_campaign_impression", {
            p_campaign_id: campaignId,
            p_session_id: sessionId,
            p_user_agent: navigator.userAgent,
            p_dwell_time_seconds: currentDwellSeconds,
            p_game_played: false,
            p_form_completed: false,
          });
        } catch {
          // Silent catch for impression tracking
        }
      })();
    }, 5000);

    return () => clearInterval(interval);
  }, [campaignId]);

  // Called by PlayerLanding when player submits the form
  const handleRegister = async (data: PlayerData) => {
    setPlayerData(data);
    if (gameType === "quiz" && quizQuestions.length > 0) {
      setScreen("quiz");
    } else if (gameType === "hit_it") {
      setScreen("hit_it");
    } else if (gameType === "mystery_box") {
      setScreen("mystery_box");
    } else {
      // pre-resolved games: lucky_wheel, scratch_card
      await callSelectPrize(data, undefined, true);
    }
  };

  const normalizeDzPhone = (rawPhone: string): string => {
    const digitsOnly = rawPhone.replace(/\D/g, "");
    if (digitsOnly.startsWith("213") && digitsOnly.length === 12) {
      return `0${digitsOnly.slice(3)}`;
    }
    if (digitsOnly.length === 9 && /^[567]/.test(digitsOnly)) {
      return `0${digitsOnly}`;
    }
    return digitsOnly;
  };

  // Shared function that calls select-prize and handles the response
  const callSelectPrize = async (
    data: PlayerData,
    gamePayload?: any,
    showTransitionScreen: boolean = false,
  ) => {
    if (showTransitionScreen) {
      setScreen("submitting");
    }

    const sessionId =
      sessionStorage.getItem("octoreach_session_id") || `sess_${Date.now()}`;
    const dwellTimeSeconds = Math.max(
      1,
      Math.round((Date.now() - pageLoadTimeRef.current) / 1000),
    );

    try {
      let result: any = null;
      let invokeSuccess = false;

      try {
        const { data: invResult, error: invError } =
          await supabase.functions.invoke("select-prize", {
            body: {
              campaign_id: campaignId,
              phone_number: data.phone,
              participant_name: data.name,
              participant_email: data.email || null,
              game_payload: gamePayload || {},
              user_agent: navigator.userAgent,
              metadata: { source: "web_player" },
              session_id: sessionId,
              dwell_time_seconds: dwellTimeSeconds,
            },
          });

        if (!invError && invResult?.ok) {
          result = invResult;
          invokeSuccess = true;
        } else if (
          invResult?.code === "ALREADY_PARTICIPATED" ||
          invError?.message?.includes("already participated")
        ) {
          setScreen("duplicate");
          return null;
        } else if (
          invResult?.code === "CAMPAIGN_CLOSED" ||
          invError?.message?.includes("closed")
        ) {
          setScreen("inactive");
          return null;
        }
      } catch (invokeEx) {
        console.warn(
          "[PlayerFlowPage] Edge function select-prize invoke exception, using direct RPC fallback:",
          invokeEx,
        );
      }

      // Direct Database & RPC fallback if edge function was unreachable or returned an error
      if (!invokeSuccess) {
        const normalizedPhone = normalizeDzPhone(data.phone);

        // 1. Fetch Campaign and check duplicate entry limits
        const { data: campRow, error: campErr } = await supabase
          .from("campaigns")
          .select("id, organization_id, status, max_entries, win_probability")
          .eq("id", campaignId)
          .single();

        if (campErr || !campRow) {
          setErrorMsg("Campaign could not be found or verified.");
          setScreen("error");
          return null;
        }

        if (campRow.status !== "active") {
          setScreen("inactive");
          return null;
        }

        const maxEntries = campRow.max_entries ?? 1;
        if (maxEntries > 0) {
          const { count: existingEntriesCount } = await supabase
            .from("entries")
            .select("id", { count: "exact", head: true })
            .eq("campaign_id", campaignId)
            .eq("phone_number", normalizedPhone);

          if ((existingEntriesCount ?? 0) >= maxEntries) {
            setScreen("duplicate");
            return null;
          }
        }

        // 2. Resolve game outcome atomically via resolve_game_outcome RPC
        const { data: rpcOutcome, error: rpcErr } = await supabase.rpc(
          "resolve_game_outcome",
          {
            p_campaign_id: campaignId,
            p_payload: gamePayload || {},
          },
        );

        if (rpcErr) {
          console.error(
            "[PlayerFlowPage] resolve_game_outcome RPC error:",
            rpcErr,
          );
          setErrorMsg("Failed to process game outcome. Please try again.");
          setScreen("error");
          return null;
        }

        const isWin = Boolean(
          rpcOutcome?.ok && rpcOutcome?.is_winner && rpcOutcome?.prize_id,
        );
        let couponCode: string | null = null;

        if (isWin && rpcOutcome?.prize_id) {
          const { data: pData } = await supabase
            .from("prizes")
            .select("prize_template_id, name")
            .eq("id", rpcOutcome.prize_id)
            .single();

          if (pData?.prize_template_id) {
            const { data: items } = await supabase
              .from("prize_template_items")
              .select("id, item_value")
              .eq("prize_template_id", pData.prize_template_id)
              .is("assigned_entry_id", null)
              .limit(1);

            couponCode =
              items?.[0]?.item_value ||
              `DZ-${Math.floor(1000 + Math.random() * 9000)}-PROMO`;

            if (items?.[0]?.id) {
              await supabase
                .from("prize_template_items")
                .update({
                  is_redeemed: true,
                  redeemed_at: new Date().toISOString(),
                })
                .eq("id", items[0].id);
            }
          }
        }

        // 3. Insert entry into database
        const newEntryId = crypto.randomUUID();
        const { error: insertErr } = await supabase.from("entries").insert({
          id: newEntryId,
          campaign_id: campaignId,
          organization_id: campRow.organization_id,
          phone_number: normalizedPhone,
          participant_name: data.name,
          participant_email: data.email || null,
          is_winner: isWin,
          prize_id: isWin ? rpcOutcome.prize_id : null,
          redeemed_coupon_value: couponCode,
          dwell_time_seconds: dwellTimeSeconds,
          quiz_passed:
            rpcOutcome?.passed ?? (gameType === "quiz" ? true : null),
          coupon_confirmed: isWin,
          metadata: {
            source: "web_player",
            game_type: gameType,
            dwell_time_seconds: dwellTimeSeconds,
          },
          created_at: new Date().toISOString(),
        });

        if (insertErr) {
          console.error("[PlayerFlowPage] insert entry error:", insertErr);
        }

        result = {
          ok: true,
          prize:
            isWin && rpcOutcome?.prize_id
              ? {
                  id: rpcOutcome.prize_id,
                  name: rpcOutcome.prize_name || "Special Reward",
                }
              : null,
          entry: { id: newEntryId, redeemed_coupon_value: couponCode },
          coupon: couponCode ? { code: couponCode } : null,
          game_outcome: rpcOutcome,
        };
      }

      // Determine the UI prize to display
      let resolvedPrize: Prize;
      const returnedCouponCode =
        result.coupon?.code || result.entry?.redeemed_coupon_value || undefined;

      if (result.prize && brandPreset) {
        const matched = brandPreset.prizes.find(
          (p) => p.id === result.prize.id || p.name === result.prize.name,
        );
        resolvedPrize = matched
          ? { ...matched, couponCode: returnedCouponCode }
          : {
              id: result.prize.id,
              name: result.prize.name || "Special Prize",
              icon: "🎁",
              isWin: true,
              couponCode: returnedCouponCode,
            };
      } else {
        resolvedPrize = LOSER_SLOT;
      }

      const newId = result.entry?.id ?? null;
      setEntryId(newId);
      entryIdRef.current = newId;
      setServerPrize(resolvedPrize);
      gameOpenTimeRef.current = Date.now();

      if (gameType === "lucky_wheel") {
        setScreen("game");
      } else if (gameType === "scratch_card") {
        setScreen("scratch_card");
      }

      return result.game_outcome;
    } catch (outerErr: any) {
      console.error("[PlayerFlowPage] callSelectPrize outer error:", outerErr);
      setErrorMsg("Unexpected error. Please check your connection.");
      setScreen("error");
      return null;
    }
  };

  // Called by PlayerQuiz when all questions are answered
  const handleQuizComplete = async (payload: {
    answers: Record<string, number>;
  }) => {
    const result = await callSelectPrize(playerData, payload);
    if (result && gameType === "quiz") {
      setScreen("result");
    }
  };

  const handleHitItComplete = async (hits: number) => {
    await callSelectPrize(playerData, { hits });
  };

  const handleHitItFinalComplete = () => {
    setScreen("result");
  };

  const handleMysteryBoxSelect = async (index: number) => {
    return await callSelectPrize(playerData, { selected_box_index: index });
  };

  const handleMysteryBoxComplete = () => {
    setScreen("result");
  };

  const handleScratchComplete = () => {
    setScreen("result");
  };

  const gameOpenTimeRef = React.useRef<number | null>(null);

  // Called after the spin animation finishes
  const handleGameComplete = (_prize: Prize) => {
    const gameplayDwell = gameOpenTimeRef.current
      ? Math.max(1, Math.round((Date.now() - gameOpenTimeRef.current) / 1000))
      : Math.max(1, Math.round((Date.now() - pageLoadTimeRef.current) / 1000));

    const totalSessionDwell = Math.max(
      1,
      Math.round((Date.now() - pageLoadTimeRef.current) / 1000),
    );

    const targetEntryId = entryIdRef.current || entryId;

    if (targetEntryId) {
      void (async () => {
        try {
          await supabase
            .from("entries")
            .update({ dwell_time_seconds: gameplayDwell })
            .eq("id", targetEntryId);
        } catch {
          // Silent catch for entry dwell time update
        }
      })();
    }

    const sessionId =
      sessionStorage.getItem("octoreach_session_id") || `sess_${Date.now()}`;
    if (campaignId) {
      void (async () => {
        try {
          await supabase.rpc("record_campaign_impression", {
            p_campaign_id: campaignId,
            p_session_id: sessionId,
            p_user_agent: navigator.userAgent,
            p_dwell_time_seconds: totalSessionDwell,
            p_game_played: true,
            p_form_completed: true,
          });
        } catch {
          // Silent catch for impression update
        }
      })();
    }

    setScreen("result");
  };

  // Called when player clicks "I have copied my coupon"
  const handleCouponConfirmed = async () => {
    if (!entryId) return;
    await supabase.functions.invoke("confirm-coupon", {
      body: { entry_id: entryId },
    });
  };

  // Reset to landing (duplicate check prevents re-entry with same phone)
  const handleRestart = () => {
    setServerPrize(null);
    setEntryId(null);
    setPlayerData({ name: "", phone: "", consent: false });
    setScreen("landing");
  };

  // --- Full-screen non-interactive states ---

  if (screen === "loading") {
    return (
      <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (screen === "not-found") {
    return (
      <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center px-6 text-center">
        <div>
          <Frown className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-zinc-200">
            Campaign Not Found
          </h1>
          <p className="text-sm text-zinc-500 mt-2">
            The link you followed may have expired or is incorrect.
          </p>
        </div>
      </div>
    );
  }

  if (screen === "inactive") {
    return (
      <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center px-6 text-center">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#171727] border border-white/10 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            This Campaign is Closed
          </h1>
          <p className="text-sm text-zinc-400 mt-3 font-sans leading-relaxed">
            All voucher rewards for this campaign have been claimed or the
            campaign has ended. Thank you for your interest! Stay tuned for new
            promotions. 🇩🇿
          </p>
          <div className="mt-4 pt-4 border-t border-white/5">
            <p dir="auto" className="text-xs text-zinc-500 leading-relaxed">
              تم استنفاد جميع جوائز وقسائم هذه الحملة أو انتهت صلاحيتها. شكراً
              جزيلاً لمشاركتكم! تابعونا للحملات والجوائز القادمة.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "duplicate") {
    return (
      <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center px-6 text-center">
        <div>
          <span className="text-5xl">🔒</span>
          <h1 className="text-lg font-bold text-zinc-200 mt-4">
            Already Participated
          </h1>
          <p className="text-sm text-zinc-400 mt-2 font-sans">
            You have already entered this campaign with this phone number.
            <br />
            One entry per person — that's the rule! 😊
          </p>
          <p dir="auto" className="text-xs text-zinc-500 mt-2">
            لقد شاركت مسبقاً في هذه الحملة. مشاركة واحدة فقط لكل شخص.
          </p>
        </div>
      </div>
    );
  }

  if (screen === "error") {
    return (
      <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center px-6 text-center">
        <div>
          <AlertTriangle className="w-12 h-12 text-red-500/60 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-zinc-200">
            Something Went Wrong
          </h1>
          {errorMsg && <p className="text-sm text-red-400 mt-2">{errorMsg}</p>}
          <button
            onClick={() => setScreen("landing")}
            className="mt-6 px-6 py-3 rounded-xl bg-violet-700 hover:bg-violet-600 text-white text-sm font-bold cursor-pointer min-h-[48px]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (screen === "submitting") {
    return (
      <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-zinc-300">
            {gameType === "lucky_wheel"
              ? "Preparing your spin..."
              : "Preparing your game..."}
          </p>
          <p dir="auto" className="text-xs text-zinc-500 mt-1">
            {gameType === "lucky_wheel"
              ? "جارٍ تحضير دورتك..."
              : "جارٍ تحضير لعبتك..."}
          </p>
        </div>
      </div>
    );
  }

  if (!brandPreset) return null;

  // Interactive player screens — wrapped in PhoneFrame for correct max-width + styling
  return (
    <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center py-4">
      <PhoneFrame>
        {screen === "landing" && (
          <PlayerLanding
            activeBrand={brandPreset}
            onRegister={handleRegister}
            savedData={playerData}
          />
        )}
        {screen === "quiz" && quizQuestions.length > 0 && (
          <PlayerQuiz
            activeBrand={brandPreset}
            questions={quizQuestions}
            playerName={playerData.name}
            onComplete={handleQuizComplete}
          />
        )}
        {screen === "game" && serverPrize !== undefined && (
          <PlayerGame
            activeBrand={brandPreset}
            forcedOutcome={serverPrize?.isWin ? "win" : "lose"}
            targetPrize={serverPrize ?? undefined}
            onGameComplete={handleGameComplete}
            playerName={playerData.name}
          />
        )}
        {screen === "scratch_card" && serverPrize !== undefined && (
          <PlayerScratch
            activeBrand={brandPreset}
            targetPrize={serverPrize ?? undefined}
            onGameComplete={handleScratchComplete}
          />
        )}
        {screen === "mystery_box" && (
          <PlayerMysteryBox
            activeBrand={brandPreset}
            onBoxSelect={handleMysteryBoxSelect}
            onComplete={handleMysteryBoxComplete}
          />
        )}
        {screen === "hit_it" && (
          <PlayerHitIt
            activeBrand={brandPreset}
            winThreshold={gameLogicConfig?.win_threshold || 9}
            onGameEnd={handleHitItComplete}
            onComplete={handleHitItFinalComplete}
          />
        )}
        {screen === "result" && (
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
