import { Send } from "lucide-react";
import {
  Badge,
  Field,
  SelectInput,
  SettingsCard,
  TextInput,
} from "./SettingsUi";

// The Team tab. Inviting teammates and changing roles have no backend yet: the invite form is
// shown but cannot be sent, and the list holds the one member the page knows of — the person
// signed in, with their real role. Nothing here is made up.

const ROLES = [
  {
    id: "owner",
    label: "Owner",
    description:
      "Full access, including billing, the team and deleting the organization.",
  },
  {
    id: "admin",
    label: "Admin",
    description: "Manages campaigns, rewards, integrations and the team.",
  },
  {
    id: "editor",
    label: "Editor",
    description:
      "Creates and edits campaigns and rewards, with no access to settings.",
  },
  { id: "viewer", label: "Viewer", description: "Read-only access." },
] as const;

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Editor",
  editor: "Editor",
  viewer: "Viewer",
};

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function TeamTab({
  me,
  soonLabel,
}: {
  me: { fullName: string; email: string; role: string } | null;
  soonLabel: string;
}) {
  const role = me ? (ROLE_LABELS[me.role] ?? me.role) : "";
  return (
    <>
      <SettingsCard
        labelledBy="card-invite"
        title="Invite a teammate"
        description="They receive an email with a link to join your organization."
        aside={<Badge tone="neutral">{soonLabel}</Badge>}
      >
        <div className="os-flex-row">
          <Field
            id="invite-email"
            label="Work email"
            className="os-invite-email"
          >
            <TextInput
              id="invite-email"
              type="email"
              placeholder="name@company.com"
              disabled
            />
          </Field>
          <Field id="invite-role" label="Role" className="os-invite-role">
            <SelectInput
              id="invite-role"
              value="editor"
              onChange={() => {}}
              disabled
              options={ROLES.filter((item) => item.id !== "owner").map(
                (item) => ({ value: item.id, label: item.label }),
              )}
            />
          </Field>
          <button type="button" className="os-btn os-btn-primary" disabled>
            <Send aria-hidden strokeWidth={2} />
            Send invite
          </button>
        </div>
      </SettingsCard>

      <SettingsCard labelledBy="card-members" title="Members" flush>
        {me ? (
          <div className="os-row">
            <span aria-hidden className="os-avatar" data-me="">
              {initials(me.fullName)}
            </span>
            <div className="os-row-main">
              <p className="os-row-title" dir="auto">
                {me.fullName}
                <span className="os-optional"> · you</span>
              </p>
              <p className="os-row-sub">{me.email}</p>
            </div>
            <Badge tone="brand">{role}</Badge>
            <Badge tone="ok" className="os-status">
              Active
            </Badge>
          </div>
        ) : (
          <div className="os-row">
            <span className="os-skeleton os-avatar" aria-hidden />
            <div className="os-row-main">
              <span
                aria-hidden
                className="os-skeleton"
                style={{ display: "block", height: 14, width: 180 }}
              />
            </div>
          </div>
        )}
      </SettingsCard>

      <SettingsCard labelledBy="card-roles" title="What each role can do">
        <div className="os-grid os-grid-roles">
          {ROLES.map((item) => (
            <div key={item.id}>
              <Badge tone="brand">{item.label}</Badge>
              <p className="os-card-desc">{item.description}</p>
            </div>
          ))}
        </div>
      </SettingsCard>
    </>
  );
}
