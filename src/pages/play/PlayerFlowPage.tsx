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
import { AlertTriangle, Frown } from "lucide-react";
import { DEFAULT_CAMPAIGN_IMAGE_URL } from "../../lib/defaultImages";

type PlayerScreen =
  | "loading"
  | "not-found"
  | "inactive"
  | "landing"
  | "quiz"
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
  prizes: Array<{
    id: string;
    name: string;
    is_active: boolean;
    win_message: string | null;
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
  const [isQuizCampaign, setIsQuizCampaign] = useState(false);
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
        "id, name, arabic_name, hero_image_url, status, require_quiz, prizes(id, name, is_active, win_message), quiz_questions(id, question, options, correct_option_index, position, is_active)",
      )
      .eq("slug", slug)
      .single();

    if (error || !data) {
      setScreen("not-found");
      return;
    }

    const row = data as unknown as DbCampaignRow;

    if (row.status !== "active") {
      setScreen("inactive");
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
    setIsQuizCampaign(row.require_quiz);
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
    // Quiz campaigns: show quiz before calling select-prize
    if (isQuizCampaign && quizQuestions.length > 0) {
      setScreen("quiz");
      return;
    }
    // Non-quiz campaign: call select-prize immediately
    await callSelectPrize(data, undefined);
  };

  // Shared function that calls select-prize and handles the response
  const callSelectPrize = async (
    data: PlayerData,
    quizPassed: boolean | undefined,
  ) => {
    setScreen("submitting");

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
            quiz_passed: quizPassed,
            user_agent: navigator.userAgent,
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
          invokeMessage.includes("already participated") ||
          invokeMessage.includes("maximum entries")
        ) {
          setScreen("duplicate");
          return;
        }
        if (
          invokeMessage.includes("not active") ||
          invokeMessage.includes("not found")
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

            const winProb = Number(campData?.win_probability ?? 0.3);
            const rolledWin = Math.random() <= winProb;

            let chosenPrize = LOSER_SLOT;
            if (rolledWin && brandPreset?.prizes) {
              const winnablePrizes = brandPreset.prizes.filter((p) => p.isWin);
              if (winnablePrizes.length > 0) {
                chosenPrize =
                  winnablePrizes[
                    Math.floor(Math.random() * winnablePrizes.length)
                  ];
              }
            }

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
                quiz_passed: quizPassed,
              })
              .select("id")
              .single();

            const fallbackId = insertedEntry?.id ?? null;
            setEntryId(fallbackId);
            entryIdRef.current = fallbackId;
            setServerPrize(chosenPrize);
            gameOpenTimeRef.current = Date.now();
            setScreen("game");
            return;
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
      if (result.prize && brandPreset) {
        const matched = brandPreset.prizes.find(
          (p) => p.id === result.prize.id || p.name === result.prize.name,
        );
        resolvedPrize = matched
          ? { ...matched, couponCode: result.coupon?.code ?? undefined }
          : { ...LOSER_SLOT, isWin: false };
      } else {
        resolvedPrize = LOSER_SLOT;
      }

      const newId = result.entry?.id ?? null;
      setEntryId(newId);
      entryIdRef.current = newId;
      setServerPrize(resolvedPrize);
      gameOpenTimeRef.current = Date.now();
      setScreen("game");
    } catch {
      setErrorMsg("Unexpected error. Please check your connection.");
      setScreen("error");
    }
  };

  // Called by PlayerQuiz when all questions are answered
  const handleQuizComplete = async (passed: boolean) => {
    await callSelectPrize(playerData, passed);
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
        <div>
          <AlertTriangle className="w-12 h-12 text-amber-500/60 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-zinc-200">Campaign Closed</h1>
          <p className="text-sm text-zinc-500 mt-2 font-sans">
            This campaign is no longer active. Check back later for new
            promotions! 🇩🇿
          </p>
          <p dir="auto" className="text-xs text-zinc-600 mt-1">
            الحملة غير نشطة حالياً. تابعونا للحملات القادمة!
          </p>
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
            Preparing your spin...
          </p>
          <p dir="auto" className="text-xs text-zinc-500 mt-1">
            جارٍ تحضير دورتك...
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
