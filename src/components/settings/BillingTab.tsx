import { Download, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PATHS } from "../../dashboard/paths";
import { useDashboard } from "../../dashboard/DashboardContext";
import { useBilling } from "../../hooks/useBilling";
import { PLAN_ALLOWANCES, type PlanKey } from "../../lib/planAllowances";
import {
  Badge,
  CompactCard,
  EmptyState,
  Note,
  SettingsCard,
  Skeleton,
} from "./SettingsUi";

// The Billing tab: the plan, what this period has used, the details invoices are made out to,
// and past invoices. It only reads: the plan's records (useBilling, as on the billing page),
// the allowances of each plan, and the campaigns and entries the dashboard already loaded.
// Changing the plan happens on the billing page; downloading an invoice has no backend yet.

const HIGH_USAGE = 0.8;

const CYCLE_LABELS: Record<string, string> = {
  monthly: "month",
  yearly: "year",
  one_time: "one-time payment",
};
const STATUS_TONES: Record<string, "ok" | "warn" | "danger" | "neutral"> = {
  paid: "ok",
  pending: "warn",
  failed: "danger",
  refunded: "neutral",
};

const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const amountLabel = (value: number | string) =>
  `${Number(value).toLocaleString("fr-DZ")} DA`;

function Meter({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null; // null: no limit on this plan
}) {
  const share = limit ? used / limit : 0;
  const high = limit !== null && share > HIGH_USAGE;
  return (
    <div className="os-meter">
      <div className="os-meter-head">
        <span className="os-row-title">{label}</span>
        <span className="os-row-sub">
          {limit === null
            ? `${used.toLocaleString()} · no limit`
            : `${used.toLocaleString()} of ${limit.toLocaleString()}`}
        </span>
      </div>
      <div
        className="os-progress"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit ?? used}
        aria-valuenow={used}
      >
        <div
          className="os-progress-fill"
          data-high={high ? "" : undefined}
          style={{ width: `${Math.min(100, Math.round(share * 100))}%` }}
        />
      </div>
      {high && <p className="os-meter-warn">Above 80% of your limit.</p>}
    </div>
  );
}

export function BillingTab({
  organizationId,
  plan,
  details,
  onGoToOrganization,
}: {
  organizationId: string | null;
  plan: PlanKey;
  details: { label: string; value: string }[]; // from the Organization profile
  onGoToOrganization: () => void;
}) {
  const navigate = useNavigate();
  const { records, loading } = useBilling(organizationId);
  const { campaigns, leads } = useDashboard();
  const allowance = PLAN_ALLOWANCES[plan];
  const latest = records[0];
  const activeCampaigns = campaigns.filter(
    (campaign) => campaign.status === "active",
  ).length;
  const codesIssued = leads.filter((lead) => Boolean(lead.couponCode)).length;
  const missingDetails = details.some((detail) => !detail.value.trim());

  return (
    <>
      <CompactCard
        labelledBy="card-plan"
        title={`${allowance.label} plan`}
        badge={
          latest ? (
            <Badge tone={STATUS_TONES[latest.status] ?? "neutral"}>
              {latest.status === "paid" ? "Active" : latest.status}
            </Badge>
          ) : (
            <Badge tone="ok">Active</Badge>
          )
        }
        description={
          loading ? (
            <Skeleton height={14} width={260} />
          ) : latest ? (
            `Renews on ${dateLabel(latest.period_end)} · ${amountLabel(latest.amount)} per ${CYCLE_LABELS[latest.billing_cycle] ?? latest.billing_cycle}`
          ) : (
            "No payment recorded yet for this plan."
          )
        }
        actions={
          <div className="os-logo-actions">
            <button
              type="button"
              className="os-btn os-btn-secondary"
              onClick={() => navigate(PATHS.billing)}
            >
              Compare plans
            </button>
            <button
              type="button"
              className="os-btn os-btn-primary"
              onClick={() => navigate(PATHS.billing)}
            >
              Change plan
            </button>
          </div>
        }
      />

      <SettingsCard
        labelledBy="card-usage"
        title="Usage this period"
        description="Your alerts warn you before you reach a limit."
      >
        <Meter
          label="Active campaigns"
          used={activeCampaigns}
          limit={allowance.activeCampaigns}
        />
        <Meter
          label="Players reached"
          used={leads.length}
          limit={allowance.entriesPerMonth}
        />
        <Meter label="Reward codes issued" used={codesIssued} limit={null} />
      </SettingsCard>

      <SettingsCard
        labelledBy="card-billing-details"
        title="Billing details"
        description="Taken from your Organization profile, so there is one place to keep them up to date."
      >
        <dl className="os-details">
          {details.map((detail) => (
            <div key={detail.label}>
              <dt>{detail.label}</dt>
              <dd dir="auto">
                {detail.value.trim() ? (
                  detail.value
                ) : (
                  <Badge tone="warn">Missing</Badge>
                )}
              </dd>
            </div>
          ))}
        </dl>
        {missingDetails && (
          <Note>
            Add your NIF and address so they can appear on your invoices.
          </Note>
        )}
        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            className="os-btn os-btn-secondary"
            onClick={onGoToOrganization}
          >
            Edit in Organization profile
          </button>
        </div>
      </SettingsCard>

      <SettingsCard
        labelledBy="card-invoices"
        title="Invoices"
        description="Download past invoices as PDF."
        flush={!loading && records.length > 0}
      >
        {loading ? (
          <Skeleton height={56} />
        ) : records.length === 0 ? (
          <EmptyState
            icon={<FileText strokeWidth={2} />}
            title="No invoices yet"
            description="Your first invoice appears here after your first billing date."
          />
        ) : (
          records.map((record) => (
            <div key={record.id} className="os-row">
              <div className="os-row-main">
                <p className="os-row-title os-mono">
                  INV-{record.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="os-row-sub">{dateLabel(record.period_start)}</p>
              </div>
              <span className="os-row-title">{amountLabel(record.amount)}</span>
              <Badge
                tone={STATUS_TONES[record.status] ?? "neutral"}
                className="os-status"
              >
                {record.status[0]!.toUpperCase() + record.status.slice(1)}
              </Badge>
              {/* No PDF is generated yet: the download waits for the backend. */}
              <button
                type="button"
                className="os-btn os-btn-secondary os-btn-sm"
                disabled
              >
                <Download aria-hidden strokeWidth={2} />
                Download PDF
              </button>
            </div>
          ))
        )}
      </SettingsCard>
    </>
  );
}
