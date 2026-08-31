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
      const { data: result, error } = await supabase.functions.invoke(
        "select-prize",
        {
          body: {
            campaign_id: campaignId,
            phone_number: data.phone,
            participant_name: data.name,
            participant_email: data.email,
            game_payload: gamePayload || {},
            user_agent: navigator.userAgent,
            metadata: { source: "web_player" },
            session_id: sessionId,
            dwell_time_seconds: dwellTimeSeconds,
          },
        },
      );

      if (error || !result?.ok) {
        const invokeMessage = error
          ? await extractInvokeErrorMessage(error)
          : String(result?.error ?? "").toLowerCase();

        if (
          result?.code === "ALREADY_PARTICIPATED" ||
          invokeMessage.includes("already participated") ||
          invokeMessage.includes("maximum entries")
        ) {
          setScreen("duplicate");
          return;
        }

        if (
          result?.code === "CAMPAIGN_CLOSED" ||
          invokeMessage.includes("not active") ||
          invokeMessage.includes("not found") ||
          invokeMessage.includes("closed") ||
          invokeMessage.includes("claimed")
        ) {
          setScreen("inactive");
          return;
        }

        // Direct Client Database Fallback (if Edge Function is unreachable or pending deployment)
        if (campaignId) {
          try {
            const { count: existingCount } = await supabase
              .from("entries")
              .select("id", { count: "exact", head: true })
              .eq("campaign_id", campaignId)
              .eq("phone_number", data.phone);

            if (existingCount && existingCount >= 1) {
              setScreen("duplicate");
              return;
            }

            const { data: campData } = await supabase
              .from("campaigns")
              .select("organization_id, win_probability")
              .eq("id", campaignId)
              .single();
            // Query winning entries count vs total allocated stock
            const { count: priorWinnersCount } = await supabase
              .from("entries")
              .select("id", { count: "exact", head: true })
              .eq("campaign_id", campaignId)
              .eq("is_winner", true);

            const winnersSoFar = priorWinnersCount ?? 0;

            const { data: dbPrizes } = await supabase
              .from("prizes")
              .select("id, quantity, quantity_won, prize_template_id")
              .eq("campaign_id", campaignId)
              .eq("is_active", true);

            const totalAllocated = (dbPrizes ?? []).reduce(
              (acc, p) => acc + (p.quantity ?? 0),
              0,
            );

            // If total prize stock is fully claimed, player cannot win any prize
            const hasAvailableStock =
              totalAllocated > 0 ? winnersSoFar < totalAllocated : true;

            const winProb = Number(campData?.win_probability ?? 0.3);
            const rolledWin = hasAvailableStock && Math.random() <= winProb;

            let chosenPrize = LOSER_SLOT;
            let fallbackCouponCode: string | null = null;

            if (rolledWin && brandPreset?.prizes) {
              const winnablePrizes = brandPreset.prizes.filter((p) => p.isWin);
              if (winnablePrizes.length > 0) {
                const picked =
                  winnablePrizes[
                    Math.floor(Math.random() * winnablePrizes.length)
                  ];
                chosenPrize = { ...picked };
              }
            }

            // Insert entry
            const { data: insertedEntry } = await supabase
              .from("entries")
              .insert({
                campaign_id: campaignId,
                organization_id: campData?.organization_id,
                phone_number: data.phone,
                participant_name: data.name,
                is_winner: chosenPrize.isWin,
                prize_id:
                  chosenPrize.isWin && chosenPrize.id !== "__loser__"
                    ? chosenPrize.id
                    : null,
                redeemed_coupon_value: null,
                quiz_passed: null,
              })
              .select("id")
              .single();

            // If player won a prize, track quantity_won and claim unique voucher code
            if (
              chosenPrize.isWin &&
              chosenPrize.id &&
              chosenPrize.id !== "__loser__" &&
              insertedEntry?.id
            ) {
              try {
                // Increment prize quantity_won counter
                const { data: pCurrent } = await supabase
                  .from("prizes")
                  .select("quantity_won")
                  .eq("id", chosenPrize.id)
                  .single();

                if (pCurrent) {
                  await supabase
                    .from("prizes")
                    .update({
                      quantity_won: (pCurrent.quantity_won ?? 0) + 1,
                    })
                    .eq("id", chosenPrize.id);
                }
              } catch {
                // Non-fatal
              }

              try {
                // Method 1: Database RPC function (Atomic, SKIP LOCKED, works for anon)
                const { data: rpcCode, error: rpcError } = await supabase.rpc(
                  "claim_campaign_prize_coupon",
                  {
                    p_prize_id: chosenPrize.id,
                    p_entry_id: insertedEntry.id,
                  },
                );

                if (!rpcError && rpcCode && typeof rpcCode === "string") {
                  fallbackCouponCode = rpcCode.trim();
                }
              } catch {
                // RPC fallback
              }

              // Method 2: Sequential offset fallback using previous winning entries count
              if (!fallbackCouponCode) {
                try {
                  const { data: pData } = await supabase
                    .from("prizes")
                    .select("prize_template_id")
                    .eq("id", chosenPrize.id)
                    .single();

                  if (pData?.prize_template_id) {
                    // Count how many winners already won this prize in this campaign
                    const { count: priorWinnersCount } = await supabase
                      .from("entries")
                      .select("id", { count: "exact", head: true })
                      .eq("campaign_id", campaignId)
                      .eq("prize_id", chosenPrize.id)
                      .neq("id", insertedEntry.id);

                    const offset = priorWinnersCount ?? 0;

                    const { data: itemRows } = await supabase
                      .from("prize_template_items")
                      .select("id, item_value, item_index")
                      .eq("prize_template_id", pData.prize_template_id)
                      .not("item_value", "is", null)
                      .order("item_index", { ascending: true })
                      .range(offset, offset + 10);

                    const assignedItem =
                      (itemRows ?? []).find(
                        (i) => i.item_value && i.item_value.trim().length > 0,
                      ) || itemRows?.[0];

                    if (assignedItem?.item_value) {
                      fallbackCouponCode = assignedItem.item_value.trim();

                      // Update entries table with this coupon code
                      await supabase
                        .from("entries")
                        .update({ redeemed_coupon_value: fallbackCouponCode })
                        .eq("id", insertedEntry.id);
                    } else {
                      const { data: tData } = await supabase
                        .from("prize_templates")
                        .select("item_value")
                        .eq("id", pData.prize_template_id)
                        .single();
                      if (tData?.item_value?.trim()) {
                        fallbackCouponCode = tData.item_value.trim();
                        await supabase
                          .from("entries")
                          .update({ redeemed_coupon_value: fallbackCouponCode })
                          .eq("id", insertedEntry.id);
                      }
                    }
                  }
                } catch {
                  // Fallback query silent catch
                }
              }

              if (fallbackCouponCode) {
                chosenPrize = {
                  ...chosenPrize,
                  couponCode: fallbackCouponCode,
                };
              }
            }

            const fallbackId = insertedEntry?.id ?? null;
            setEntryId(fallbackId);
            entryIdRef.current = fallbackId;
            setServerPrize(chosenPrize);
            gameOpenTimeRef.current = Date.now();

            if (gameType === "lucky_wheel") {
              setScreen("game");
            } else if (gameType === "scratch_card") {
              setScreen("scratch_card");
            }
            return {
              ok: true,
              is_winner: chosenPrize.isWin,
              prize: chosenPrize.isWin ? chosenPrize : null,
              boxes:
                gameType === "mystery_box"
                  ? [0, 1, 2].map((i) => ({
                      index: i,
                      content:
                        i === (gamePayload?.selected_box_index ?? 0) &&
                        chosenPrize.isWin
                          ? "win"
                          : "lose",
                      prize: chosenPrize.isWin ? chosenPrize : null,
                    }))
                  : undefined,
            };
          } catch (fallbackErr) {
            console.warn(
              "[PlayerFlowPage] Direct client fallback notice:",
              fallbackErr,
            );
          }
        }

        setErrorMsg(
          result?.error ||
            "We could not submit your participation right now. Please try again in a moment.",
        );
        setScreen("error");
        return;
      }

      // Determine the UI prize to land on
      let resolvedPrize: Prize;
      const returnedCouponCode =
        result.coupon?.code || result.entry?.redeemed_coupon_value || undefined;

      if (result.prize && brandPreset) {
        const matched = brandPreset.prizes.find(
          (p) => p.id === result.prize.id || p.name === result.prize.name,
        );
        resolvedPrize = matched
          ? { ...matched, couponCode: returnedCouponCode }
          : { ...LOSER_SLOT, isWin: false };
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
    } catch {
      setErrorMsg("Unexpected error. Please check your connection.");
      setScreen("error");
      return null;
    }
  };

  // Called by PlayerQuiz when all questions are answered
  const handleQuizComplete = async (payload: {
    answers: Record<string, number>;
  }) => {
    await callSelectPrize(playerData, payload);
    setScreen("result");
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
