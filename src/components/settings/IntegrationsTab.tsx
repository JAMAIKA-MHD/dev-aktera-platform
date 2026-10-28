import { KeyRound, Plug, Plus, Send } from "lucide-react";
import {
  Badge,
  CompactCard,
  EmptyState,
  IconTile,
  SettingsCard,
} from "./SettingsUi";

// The Integrations tab. The Telegram bot, API keys and webhooks have no backend yet: each is
// shown in its final layout, empty, with its actions unavailable. A key, once there is a
// backend, is only ever listed masked (.os-key).

export function IntegrationsTab({
  onGoToNotifications,
}: {
  onGoToNotifications: () => void;
}) {
  return (
    <>
      <CompactCard
        labelledBy="card-int-telegram"
        tile={
          <IconTile>
            <Send strokeWidth={2} />
          </IconTile>
        }
        title="Telegram operations bot"
        badge={<Badge tone="neutral">Not connected</Badge>}
        description="Instant winning-entry and code-redemption alerts in your team's Telegram channel."
        actions={
          <button
            type="button"
            className="os-btn os-btn-secondary"
            onClick={onGoToNotifications}
          >
            Set up in Notifications
          </button>
        }
      />

      <SettingsCard
        labelledBy="card-api-keys"
        title="API keys"
        description="Keys let your servers call the platform. Treat them like passwords."
        aside={
          <button
            type="button"
            className="os-btn os-btn-primary os-btn-sm"
            disabled
          >
            <Plus aria-hidden strokeWidth={2} />
            Create API key
          </button>
        }
      >
        <EmptyState
          icon={<KeyRound strokeWidth={2} />}
          title="No API keys yet"
          description="Create a key to let your own systems read campaigns and entries. It is shown once, then only masked."
        />
      </SettingsCard>

      <SettingsCard
        labelledBy="card-webhooks"
        title="Webhooks"
        description="Send events, such as new winners or redeemed codes, to your own server."
      >
        <EmptyState
          icon={<Plug strokeWidth={2} />}
          title="No webhook endpoints yet"
          description="Add an HTTPS address and choose which events it should receive."
          action={
            <button
              type="button"
              className="os-btn os-btn-secondary os-btn-sm"
              disabled
            >
              <Plus aria-hidden strokeWidth={2} />
              Add endpoint
            </button>
          }
        />
      </SettingsCard>
    </>
  );
}
