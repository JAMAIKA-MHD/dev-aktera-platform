import { KeyRound, Plug, Plus } from "lucide-react";
import { EmptyState, SettingsCard } from "./SettingsUi";

// The Integrations tab. API keys and webhooks have no backend yet: each is shown in its final
// layout, empty, with its actions unavailable. A key, once there is a backend, is only ever
// listed masked (.os-key).

export function IntegrationsTab() {
  return (
    <>
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
