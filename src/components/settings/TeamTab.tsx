import { useState } from "react";
import { AlertCircle, Check, Send, Trash2, Users } from "lucide-react";

import { useTeamMembers } from "../../hooks/useTeamMembers";
import { toFriendlyErrorMessage } from "../../lib/errorMessages";
import {
  inviteTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
} from "../../services/teamService";
import type { TeamMember, TeamRole } from "../../types";
import { EmptyState, ErrorState } from "../ui/EmptyState";
import {
  Badge,
  Field,
  Note,
  SelectInput,
  SettingsCard,
  Skeleton,
  TextInput,
} from "./SettingsUi";

// The Team tab: the organization's members, read from their profiles. Inviting, changing a role
// and removing go through the team-members Edge Function; an owner or admin sees those controls,
// and the server refuses them to anyone else.

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
    id: "manager",
    label: "Editor",
    description:
      "Creates and edits campaigns and rewards, with no access to settings.",
  },
  { id: "viewer", label: "Viewer", description: "Read-only access." },
] as const;

const ASSIGNABLE_ROLES = ROLES.filter((item) => item.id !== "owner").map(
  (item) => ({ value: item.id, label: item.label }),
);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const roleLabel = (role: string) =>
  ROLES.find((item) => item.id === role)?.label ?? role;

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "?";
}

function MemberRow({
  member,
  isMe,
  canChange,
  busy,
  onRoleChange,
  onRemove,
}: {
  member: TeamMember;
  isMe: boolean;
  canChange: boolean;
  busy: boolean;
  onRoleChange: (role: TeamRole) => void;
  onRemove: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const roleId = `member-role-${member.id}`;
  return (
    <div className="os-row">
      <span aria-hidden className="os-avatar" data-me={isMe ? "" : undefined}>
        {initials(member.fullName)}
      </span>
      <div className="os-row-main">
        <p className="os-row-title" dir="auto">
          {member.fullName}
          {isMe && <span className="os-optional"> · you</span>}
        </p>
        <p className="os-row-sub">{member.email}</p>
      </div>
      {canChange ? (
        <>
          <label htmlFor={roleId} className="sr-only">
            Role of {member.fullName}
          </label>
          <SelectInput
            id={roleId}
            value={member.role}
            disabled={busy}
            onChange={(role) => onRoleChange(role as TeamRole)}
            options={ASSIGNABLE_ROLES}
          />
        </>
      ) : (
        <Badge tone="brand">{roleLabel(member.role)}</Badge>
      )}
      <Badge tone={member.pending ? "warn" : "ok"} className="os-status">
        {member.pending ? "Invited" : "Active"}
      </Badge>
      {canChange &&
        (confirming ? (
          <>
            <button
              type="button"
              className="os-btn os-btn-secondary os-btn-sm"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Keep
            </button>
            <button
              type="button"
              className="os-btn os-btn-danger os-btn-sm"
              disabled={busy}
              onClick={onRemove}
            >
              {member.pending ? "Cancel invitation" : "Remove"}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="os-btn os-btn-secondary os-btn-sm"
            aria-label={`Remove ${member.fullName}`}
            title={`Remove ${member.fullName}`}
            disabled={busy}
            onClick={() => setConfirming(true)}
          >
            <Trash2 aria-hidden strokeWidth={2} />
          </button>
        ))}
    </div>
  );
}

export function TeamTab({
  organizationId,
  myId,
  canManage,
}: {
  organizationId: string | null;
  myId: string | null;
  /** An owner or admin: sees the controls that change the team. */
  canManage: boolean;
}) {
  const { members, loading, error, refetch } = useTeamMembers(organizationId);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("manager");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    tone: "ok" | "danger";
    text: string;
  } | null>(null);

  // One change at a time; the list is read again from the server after each.
  const run = async (change: () => Promise<void>, success: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await change();
      await refetch();
      setMessage({ tone: "ok", text: success });
    } catch (err) {
      setMessage({
        tone: "danger",
        text: toFriendlyErrorMessage(err, "This could not be done."),
      });
    } finally {
      setBusy(false);
    }
  };

  const target = email.trim().toLowerCase();
  const canSend = EMAIL.test(target) && !busy;
  const sendInvite = async () => {
    if (!canSend) return;
    await run(
      () => inviteTeamMember(target, role),
      `Invitation sent to ${target}.`,
    );
    setEmail("");
  };

  const firstLoad = loading && members.length === 0;
  const justMe = !loading && !error && members.length === 1;

  return (
    <>
      {message && (
        <Note
          tone={message.tone}
          icon={
            message.tone === "ok" ? (
              <Check aria-hidden />
            ) : (
              <AlertCircle aria-hidden />
            )
          }
          live
        >
          {message.text}
        </Note>
      )}

      {canManage && (
        <SettingsCard
          labelledBy="card-invite"
          title="Invite a teammate"
          description="They receive an email with a link to join your organization."
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
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => {
                  // This tab sits inside the settings form: Enter sends the invite, not the form.
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  void sendInvite();
                }}
              />
            </Field>
            <Field id="invite-role" label="Role" className="os-invite-role">
              <SelectInput
                id="invite-role"
                value={role}
                onChange={(value) => setRole(value as TeamRole)}
                options={ASSIGNABLE_ROLES}
              />
            </Field>
            <button
              type="button"
              className="os-btn os-btn-primary"
              disabled={!canSend}
              aria-busy={busy || undefined}
              onClick={() => void sendInvite()}
            >
              <Send aria-hidden strokeWidth={2} />
              {busy ? "Sending..." : "Send invite"}
            </button>
          </div>
        </SettingsCard>
      )}

      <SettingsCard labelledBy="card-members" title="Members" flush>
        {error ? (
          <ErrorState
            variant="inline"
            title="The team could not be loaded"
            onRetry={() => void refetch()}
          />
        ) : firstLoad ? (
          <div className="os-row">
            <Skeleton height={40} />
          </div>
        ) : (
          members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              isMe={member.id === myId}
              canChange={
                canManage && member.id !== myId && member.role !== "owner"
              }
              busy={busy}
              onRoleChange={(next) =>
                void run(
                  () => updateTeamMemberRole(member.id, next),
                  `${member.fullName} is now ${roleLabel(next)}.`,
                )
              }
              onRemove={() =>
                void run(
                  () => removeTeamMember(member.id),
                  `${member.fullName} was removed.`,
                )
              }
            />
          ))
        )}
        {justMe && (
          <EmptyState
            icon={Users}
            variant="inline"
            headingLevel={3}
            title="Just you for now"
            description="Invite teammates and assign roles to collaborate on campaigns."
            primaryAction={
              canManage
                ? {
                    label: "Invite a teammate",
                    onClick: () =>
                      document.getElementById("invite-email")?.focus(),
                  }
                : undefined
            }
          />
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
