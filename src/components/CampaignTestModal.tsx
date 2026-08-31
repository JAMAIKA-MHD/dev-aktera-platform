import React, { useState } from "react";
import { Campaign, PrizeTemplate } from "../types";
import {
  X,
  Play,
  Sparkles,
  Smartphone,
  Check,
  AlertCircle,
  Plus,
  RefreshCw,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";

interface CampaignTestModalProps {
  campaign: Campaign;
  prizes: PrizeTemplate[];
  isOpen: boolean;
  onClose: () => void;
  onDataInjected?: () => void;
}

export const CampaignTestModal: React.FC<CampaignTestModalProps> = ({
  campaign,
  isOpen,
  onClose,
  onDataInjected,
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [activeTab, setActiveTab] = useState<"interactive" | "generator">(
    "interactive",
  );

  // Interactive Form State
  const [customPhone, setCustomPhone] = useState("0550123456");
  const [customName, setCustomName] = useState("Karim Test");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playResult, setPlayResult] = useState<{
    success: boolean;
    is_winner?: boolean;
    prize_name?: string;
    coupon_code?: string;
    dwell_time?: number;
    error?: string;
  } | null>(null);

  // Bulk Generator State
  const [bulkCount, setBulkCount] = useState<number>(10);
  const [carrierMix, setCarrierMix] = useState<
    "all" | "mobilis" | "djezzy" | "ooredoo"
  >("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRandomizePhone = () => {
    const prefixes = ["0550", "0555", "0661", "0662", "0770", "0771"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const rest = Math.floor(100000 + Math.random() * 900000);
    setCustomPhone(`${prefix}${rest}`);

    const names = [
      "Amine Benali",
      "Yasmine Khelifi",
      "Karim Mansouri",
      "Sara Boumedienne",
      "Mohamed Belhadj",
      "Rania Zerrouki",
      "Walid Saidi",
      "Anis Chaabane",
    ];
    setCustomName(names[Math.floor(Math.random() * names.length)]);
  };

  const handleRunInteractivePlay = async () => {
    setIsPlaying(true);
    setPlayResult(null);

    try {
      // 1. Call atomic select-prize RPC / edge function
      const dwell =
        campaign.gameType === "quiz"
          ? Math.floor(15 + Math.random() * 45)
          : Math.floor(6 + Math.random() * 14);

      const { data: drawResult, error: drawError } = await supabase.rpc(
        "draw_and_claim_campaign_prize",
        {
          p_campaign_id: campaign.id,
          p_quiz_passed: campaign.gameType === "quiz" ? true : null,
        },
      );

      if (drawError) throw drawError;

      const isWinner = Boolean(drawResult?.is_winner && drawResult?.prize_id);
      let couponCode: string | null = null;

      if (isWinner && drawResult?.prize_id) {
        // Fetch prize details to get prize_template_id
        const { data: pData } = await supabase
          .from("prizes")
          .select("prize_template_id")
          .eq("id", drawResult.prize_id)
          .single();

        if (pData?.prize_template_id) {
          const { data: items } = await supabase
            .from("prize_template_items")
            .select("id, item_value")
            .eq("prize_template_id", pData.prize_template_id)
            .limit(1);

          couponCode =
            items?.[0]?.item_value ??
            `TEST-VOUCHER-${Math.floor(1000 + Math.random() * 9000)}`;
        }
      }

      // 2. Insert into entries
      const entryId = crypto.randomUUID();
      const carrier = customPhone.startsWith("05")
        ? "Ooredoo"
        : customPhone.startsWith("06")
          ? "Mobilis"
          : "Djezzy";

      const { error: insertErr } = await supabase.from("entries").insert({
        id: entryId,
        campaign_id: campaign.id,
        organization_id: campaign.organizationId,
        phone_number: customPhone,
        participant_name: customName,
        is_winner: isWinner,
        prize_id: isWinner ? drawResult.prize_id : null,
        redeemed_coupon_value: couponCode,
        dwell_time_seconds: dwell,
        quiz_passed: campaign.gameType === "quiz" ? true : null,
        coupon_confirmed: isWinner,
        metadata: {
          carrier,
          dwell_time_seconds: dwell,
          simulated_test: true,
          ip_city: "Algiers",
        },
        created_at: new Date().toISOString(),
      });

      if (insertErr) throw insertErr;

      setPlayResult({
        success: true,
        is_winner: isWinner,
        prize_name:
          drawResult?.prize_name || (isWinner ? "Winning Prize" : undefined),
        coupon_code: couponCode ?? undefined,
        dwell_time: dwell,
      });

      onDataInjected?.();
    } catch (err: any) {
      setPlayResult({
        success: false,
        error: err.message || "Failed to execute play.",
      });
    } finally {
      setIsPlaying(false);
    }
  };

  const handleBulkGenerate = async () => {
    setIsGenerating(true);
    setGenerateSuccess(null);
    setGenerateError(null);

    try {
      const names = [
        "Amine Benali",
        "Yasmine Khelifi",
        "Karim Mansouri",
        "Sara Boumedienne",
        "Mohamed Belhadj",
        "Rania Zerrouki",
        "Walid Saidi",
        "Anis Chaabane",
        "Meriem Tebboune",
        "Farid Hamidi",
        "Nour El Houda",
        "Lyes Benaissa",
      ];

      const entriesToInsert = [];

      for (let i = 1; i <= bulkCount; i++) {
        let prefix = "0550";
        if (carrierMix === "mobilis") prefix = "0661";
        else if (carrierMix === "djezzy") prefix = "0770";
        else if (carrierMix === "ooredoo") prefix = "0555";
        else {
          const arr = ["0550", "0661", "0770", "0555", "0662", "0771"];
          prefix = arr[i % arr.length];
        }

        const phone = `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
        const name = names[i % names.length];
        const dwell =
          campaign.gameType === "quiz"
            ? 15 + Math.floor(Math.random() * 45)
            : 6 + Math.floor(Math.random() * 14);

        // Run atomic prize draw
        const { data: drawResult } = await supabase.rpc(
          "draw_and_claim_campaign_prize",
          {
            p_campaign_id: campaign.id,
            p_quiz_passed: campaign.gameType === "quiz" ? i % 4 !== 0 : null,
          },
        );

        const isWin = Boolean(drawResult?.is_winner && drawResult?.prize_id);

        entriesToInsert.push({
          id: crypto.randomUUID(),
          campaign_id: campaign.id,
          organization_id: campaign.organizationId,
          phone_number: phone,
          participant_name: name,
          is_winner: isWin,
          prize_id: isWin ? drawResult.prize_id : null,
          redeemed_coupon_value: isWin
            ? `TEST-${Math.floor(100 + Math.random() * 900)}-PROMO`
            : null,
          dwell_time_seconds: dwell,
          quiz_passed: campaign.gameType === "quiz" ? i % 4 !== 0 : null,
          coupon_confirmed: isWin,
          metadata: {
            carrier: phone.startsWith("05")
              ? "Ooredoo"
              : phone.startsWith("06")
                ? "Mobilis"
                : "Djezzy",
            dwell_time_seconds: dwell,
            simulated_batch: true,
          },
          created_at: new Date(
            Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
          ).toISOString(),
        });
      }

      const { error: batchErr } = await supabase
        .from("entries")
        .insert(entriesToInsert);
      if (batchErr) throw batchErr;

      setGenerateSuccess(
        `✅ Successfully generated and injected ${bulkCount} test player entries into "${campaign.name}"!`,
      );
      onDataInjected?.();
    } catch (err: any) {
      setGenerateError(err.message || "Failed to generate test data.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className={`w-full max-w-2xl rounded-3xl p-6 sm:p-8 border shadow-2xl overflow-hidden transition-all ${
          isDark
            ? "bg-[#151E30] border-slate-800 text-white"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-500">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">
                UI Test & Simulation Console
              </h3>
              <p className="text-xs text-brand-textMuted mt-0.5">
                Inject test plays directly into{" "}
                <strong className="text-blue-500">{campaign.name}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mt-5 p-1 bg-slate-100 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("interactive")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "interactive"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Interactive Single Play</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("generator")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "generator"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Bulk Test Generator</span>
          </button>
        </div>

        {/* Tab 1: Interactive Play */}
        {activeTab === "interactive" && (
          <div className="mt-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-black uppercase text-brand-textMuted block mb-1.5">
                  Participant Name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Karim Mansouri"
                  className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark
                      ? "bg-slate-900 border-slate-700 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-black uppercase text-brand-textMuted">
                    Algerian Phone Number
                  </label>
                  <button
                    type="button"
                    onClick={handleRandomizePhone}
                    className="text-[10px] text-blue-500 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Randomize
                  </button>
                </div>
                <input
                  type="text"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  placeholder="05 / 06 / 07..."
                  className={`w-full px-4 py-2.5 rounded-xl text-sm font-mono font-semibold border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark
                      ? "bg-slate-900 border-slate-700 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>
            </div>

            <button
              type="button"
              disabled={isPlaying}
              onClick={handleRunInteractivePlay}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
            >
              {isPlaying ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Execute Play & Write to Database</span>
                </>
              )}
            </button>

            {/* Play Result Card */}
            {playResult && (
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  playResult.success
                    ? playResult.is_winner
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "bg-red-500/10 border-red-500/30 text-red-400"
                }`}
              >
                {playResult.success ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2 font-black text-sm">
                      <Check className="w-4 h-4" />
                      <span>
                        {playResult.is_winner
                          ? `🎉 WINNER: Awarded "${playResult.prize_name}"`
                          : "🌙 NON-WINNER: Received 'Khirha fi Ghirha' outcome"}
                      </span>
                    </div>
                    {playResult.coupon_code && (
                      <p className="font-mono text-[11px] mt-1">
                        Voucher Code: <strong>{playResult.coupon_code}</strong>
                      </p>
                    )}
                    <p className="text-slate-400 text-[11px]">
                      Recorded Game Dwell Time: {playResult.dwell_time}s • Entry
                      immediately saved to database & analytics table.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{playResult.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Bulk Test Generator */}
        {activeTab === "generator" && (
          <div className="mt-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-black uppercase text-brand-textMuted block mb-1.5">
                  Number of Test Plays
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 25, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setBulkCount(num)}
                      className={`py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        bulkCount === num
                          ? "bg-blue-600 border-blue-500 text-white"
                          : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-brand-textMuted block mb-1.5">
                  Carrier Prefix Mix
                </label>
                <select
                  value={carrierMix}
                  onChange={(e) => setCarrierMix(e.target.value as any)}
                  className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark
                      ? "bg-slate-900 border-slate-700 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                >
                  <option value="all">
                    Mixed (Mobilis 06, Djezzy 07, Ooredoo 05)
                  </option>
                  <option value="mobilis">Mobilis Only (0661...)</option>
                  <option value="djezzy">Djezzy Only (0770...)</option>
                  <option value="ooredoo">Ooredoo Only (0550...)</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              disabled={isGenerating}
              onClick={handleBulkGenerate}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-black text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
            >
              {isGenerating ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate & Inject {bulkCount} Test Entries</span>
                </>
              )}
            </button>

            {generateSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>{generateSuccess}</span>
              </div>
            )}

            {generateError && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{generateError}</span>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer Link */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-brand-textMuted">
          <span>
            Portal Test Slug:{" "}
            <code className="text-blue-400 font-mono">
              /play/{campaign.slug}
            </code>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer"
          >
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
};
