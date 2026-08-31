import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { Campaign } from "../types";

// ── DB row shapes ────────────────────────────────────────────────────────────

interface DbPrizeRow {
  id: string;
  prize_template_id: string;
  quantity: number;
  quantity_won?: number;
  weight: number;
  is_active: boolean;
}

interface DbQuestionRow {
  id: string;
  question: string;
  options: string[];
  correct_option_index: number;
  position: number;
  is_active: boolean;
}

interface DbCampaignRow {
  id: string;
  organization_id: string;
  name: string;
  arabic_name: string | null;
  hero_image_url: string | null;
  slug: string;
  status: string;
  start_date: string;
  end_date: string;
  win_probability: string | number;
  max_entries: number | null;
  require_quiz: boolean;
  game_type: string;
  game_logic_config?: any;
  auto_pace_prizes?: boolean;
  auto_pace_enabled_at?: string | null;
  player_screen_config?: any;
  source_campaign_id: string | null;
  prizes: DbPrizeRow[];
  quiz_questions: DbQuestionRow[];
  created_at: string;
}

// ── Mapping ──────────────────────────────────────────────────────────────────

function mapToUi(
  row: DbCampaignRow,
  entryCount: number,
  winnerCount: number,
): Campaign {
  let status = row.status as Campaign["status"];
  // DB has 'ended'; map to 'archived' for UI display
  if ((status as string) === "ended") status = "archived";

  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    arabicName: row.arabic_name ?? "",
    heroImageUrl: row.hero_image_url ?? undefined,
    slug: row.slug,
    gameType: row.game_type as Campaign["gameType"],
    gameLogicConfig: row.game_logic_config ?? undefined,
    status,
    // DB stores 0-1 decimal, UI expects 0-100 integer percentage
    winProbability: Math.round(Number(row.win_probability) * 100),
    autoPacePrizes: Boolean(row.auto_pace_prizes),
    autoPaceEnabledAt: row.auto_pace_enabled_at ?? null,
    maxEntries:
      row.max_entries === 2 ? "2" : row.max_entries === 0 ? "unlimited" : "1",
    prizes: (row.prizes ?? [])
      .filter((p) => p.is_active)
      .map((p) => ({
        id: p.id,
        templateId: p.prize_template_id,
        quantity: p.quantity,
        quantity_won: p.quantity_won ?? 0,
        weight: p.weight,
      })),
    questions: (row.quiz_questions ?? [])
      .filter((q) => q.is_active)
      .sort((a, b) => a.position - b.position)
      .map((q) => ({
        id: q.id,
        questionText: q.question,
        options: q.options,
        correctIndex: q.correct_option_index,
      })),
    participantsCount: entryCount,
    rewardsClaimed: winnerCount,
    startDate: row.start_date.split("T")[0],
    endDate: row.end_date.split("T")[0],
    parentCampaignId: row.source_campaign_id ?? undefined,
    playerScreenConfig: row.player_screen_config ?? undefined,
    createdAt: row.created_at,
  };
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useCampaigns(organizationId: string | null) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!organizationId) {
      setCampaigns([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: rows, error: campErr } = await supabase
        .from("campaigns")
        .select(
          "id, organization_id, name, arabic_name, hero_image_url, slug, status, start_date, end_date, win_probability, max_entries, require_quiz, game_type, game_logic_config, auto_pace_prizes, auto_pace_enabled_at, player_screen_config, source_campaign_id, created_at, prizes(id, prize_template_id, quantity, quantity_won, weight, is_active), quiz_questions(id, question, options, correct_option_index, position, is_active)",
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (campErr) throw campErr;
      if (!rows || rows.length === 0) {
        setCampaigns([]);
        return;
      }

      // Fetch entry counts for all campaigns in one query
      const campIds = (rows as DbCampaignRow[]).map((r) => r.id);
      const { data: entryRows } = await supabase
        .from("entries")
        .select("campaign_id, is_winner")
        .in("campaign_id", campIds);

      const entryCounts: Record<string, number> = {};
      const winnerCounts: Record<string, number> = {};
      for (const e of entryRows ?? []) {
        entryCounts[e.campaign_id] = (entryCounts[e.campaign_id] ?? 0) + 1;
        if (e.is_winner)
          winnerCounts[e.campaign_id] = (winnerCounts[e.campaign_id] ?? 0) + 1;
      }

      setCampaigns(
        (rows as DbCampaignRow[]).map((r) =>
          mapToUi(r, entryCounts[r.id] ?? 0, winnerCounts[r.id] ?? 0),
        ),
      );
    } catch (err) {
      setError("Failed to load campaigns.");
      console.error("[useCampaigns]", err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { campaigns, loading, error, refetch: fetchData };
}
