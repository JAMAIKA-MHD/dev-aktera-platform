import React from "react";
import { ChevronRight, Trophy } from "lucide-react";
import { formatRate } from "../../lib/campaignAnalyticsTransforms";
import { ProgramLeaderboardRow } from "../../types";
import { gameMeta, type GameType } from "../campaigns/campaignMeta";
import { type KpiTone } from "./KpiCards";
import "./kpiCards.css";

// One tone per game: it colours the entries bar and the mechanic icon of the row.
const GAME_TONE: Record<GameType, KpiTone | "rose"> = {
  lucky_wheel: "teal",
  scratch_card: "amber",
  quiz: "vio",
  mystery_box: "blue",
  hit_it: "rose",
};

const statusLabel = (status: string) =>
  status ? status.charAt(0).toUpperCase() + status.slice(1) : "—";

interface CampaignLeaderboardProps {
  /** Most entries first, as `get_program_analytics` returns them. */
  rows: ProgramLeaderboardRow[];
  onSelectCampaign: (campaignId: string) => void;
}

/** Campaigns ranked by entries; each row is a button that opens the campaign. */
export const CampaignLeaderboard: React.FC<CampaignLeaderboardProps> = ({
  rows,
  onSelectCampaign,
}) => {
  const maxEntries = Math.max(1, ...rows.map((row) => row.entries));

  return (
    <article className="kx kx-card">
      <div className="kx-ch">
        <span className="kx-chip kx-tone-amber">
          <Trophy className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3>Campaign leaderboard</h3>
          <p>
            Entries, completion rate and rewards won per campaign. Select a
            campaign to open it.
          </p>
        </div>
      </div>
      <div className="kx-dots" />

      {rows.length === 0 ? (
        <p className="px-[22px] py-8 text-center text-xs text-brand-text-muted">
          No campaigns yet.
        </p>
      ) : (
        <div className="kx-lb-scroll">
          <div className="kx-lb-table">
            <div className="kx-lb-head" aria-hidden>
              <span>#</span>
              <span>Campaign</span>
              <span>Entries</span>
              <span className="kx-lb-r">Completion</span>
              <span className="kx-lb-r">Rewards</span>
            </div>

            {rows.map((row, index) => {
              const game = gameMeta(row.game_type);
              const GameIcon = game.icon;
              const share = (row.entries / maxEntries) * 100;
              return (
                <button
                  key={row.campaign_id}
                  type="button"
                  className={`kx-lb-row kx-tone-${GAME_TONE[row.game_type] ?? "blue"}`}
                  onClick={() => onSelectCampaign(row.campaign_id)}
                >
                  <span
                    className={`kx-lb-rank ${index === 0 ? "is-top" : ""}`}
                    aria-label={`Rank ${index + 1}`}
                  >
                    {index + 1}
                  </span>

                  <span className="kx-lb-cn">
                    <b
                      className="kx-lb-name"
                      title={row.campaign_name}
                      dir="auto"
                    >
                      {row.campaign_name}
                    </b>
                    <span className="kx-lb-sub">
                      <GameIcon
                        className="h-3.5 w-3.5"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      <span>{game.label}</span>
                      <i className={`kx-lb-dot is-${row.status}`} />
                      <span>{statusLabel(row.status)}</span>
                    </span>
                  </span>

                  <span className="kx-lb-en">
                    <span
                      className="kx-seg"
                      role="meter"
                      aria-label="Entries, relative to the top campaign"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(share)}
                    >
                      <i style={{ width: `${share}%` }} />
                    </span>
                    <b className="kx-lb-num">{row.entries.toLocaleString()}</b>
                  </span>

                  <span
                    className="kx-lb-r kx-lb-mu"
                    title={
                      row.completion_rate === null
                        ? "No visitor sessions tracked in this period"
                        : `${row.completed_impressions.toLocaleString()} of ${row.impressions.toLocaleString()} visitors completed the form`
                    }
                  >
                    {formatRate(row.completion_rate)}
                  </span>

                  <span className="kx-lb-r">
                    <b className="kx-lb-num">{row.rewards.toLocaleString()}</b>
                    <ChevronRight
                      className="kx-lb-chev h-3.5 w-3.5"
                      aria-hidden
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
};
