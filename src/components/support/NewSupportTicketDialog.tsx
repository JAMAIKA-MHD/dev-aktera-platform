// The form that opens a support ticket. The account details are shown, never typed: the database
// copies them from the account when the ticket is created, so the support team reads verified
// data. The client only says where and what the problem is, how severe, and describes it.
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { AlertCircle, Loader2, Send } from "lucide-react";

import {
  planLabel,
  SUPPORT_DESCRIPTION_MAX,
  SUPPORT_DESCRIPTION_MIN,
  SUPPORT_SECTIONS,
  SUPPORT_SEVERITIES,
  SUPPORT_TYPES,
  validateSupportTicketInput,
  type SupportTicketErrors,
  type SupportTicketInput,
} from "../../lib/support";
import { cn } from "../../lib/utils";
import {
  createSupportTicketService,
  SupportTicketError,
} from "../../services/supportService";
import type { SupportTicket } from "../../types";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { NativeSelect } from "../ui/native-select";
import { Textarea } from "../ui/textarea";

/** The account of the client, as the database will copy it onto the ticket. */
export interface SupportAccount {
  email: string;
  clientId: string;
  plan: SupportTicket["plan"];
  phoneNumber: string | null;
}

const SEVERITY_TONE: Record<string, string> = {
  low: "data-[checked=true]:border-slate-400 data-[checked=true]:bg-slate-500/10",
  medium:
    "data-[checked=true]:border-blue-400 data-[checked=true]:bg-blue-500/10",
  high: "data-[checked=true]:border-amber-400 data-[checked=true]:bg-amber-500/15",
  urgent:
    "data-[checked=true]:border-red-400 data-[checked=true]:bg-red-500/10",
};

function FormField({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs font-medium text-destructive"
        >
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function AccountDetails({ account }: { account: SupportAccount }) {
  const rows: [string, ReactNode][] = [
    ["Email", account.email || "—"],
    [
      "Client ID",
      <span key="id" className="break-all font-mono text-xs">
        {account.clientId}
      </span>,
    ],
    ["Plan", planLabel(account.plan)],
    [
      "Phone number",
      account.phoneNumber ?? (
        <span className="text-muted-foreground">Not set</span>
      ),
    ],
  ];
  return (
    <section
      aria-label="Account details"
      className="space-y-2 rounded-xl border border-border bg-muted p-3"
    >
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Account details
      </h3>
      <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
        {rows.map(([term, value]) => (
          <div key={term} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{term}</dt>
            <dd className="truncate text-sm font-medium text-foreground">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">
        Sent with your ticket so we can find your account. Change them in
        Organization settings.
      </p>
    </section>
  );
}

function TicketForm({
  account,
  onCreated,
  onClose,
}: {
  account: SupportAccount;
  onCreated: (ticket: SupportTicket) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<SupportTicketInput>({
    platformSection: "",
    type: "",
    severity: "",
    description: "",
  });
  const [errors, setErrors] = useState<SupportTicketErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  // Counts the failed attempts: the first field to fix gets the focus once the errors are drawn.
  const [focusInvalid, setFocusInvalid] = useState(0);
  useEffect(() => {
    if (focusInvalid === 0) return;
    form.current
      ?.querySelector<HTMLElement>(
        '[aria-invalid="true"], [data-invalid="true"]',
      )
      ?.focus();
  }, [focusInvalid]);

  const set = <K extends keyof SupportTicketInput>(
    key: K,
    value: SupportTicketInput[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const found = validateSupportTicketInput(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFocusInvalid((count) => count + 1);
      return;
    }
    setServerError(null);
    setSubmitting(true);
    try {
      const ticket = await createSupportTicketService(values);
      onCreated(ticket);
      onClose();
    } catch (error) {
      if (error instanceof SupportTicketError) {
        setServerError(error.message);
        setErrors(error.fieldErrors);
      } else {
        setServerError("We could not send your ticket. Please try again.");
      }
      setSubmitting(false);
    }
  };

  const descriptionLength = values.description.trim().length;

  return (
    <form ref={form} onSubmit={submit} noValidate className="space-y-4">
      <AccountDetails account={account} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="support-section"
          label="Platform section"
          error={errors.platformSection}
        >
          <NativeSelect
            id="support-section"
            data-autofocus
            value={values.platformSection}
            onChange={(event) =>
              set(
                "platformSection",
                event.target.value as SupportTicketInput["platformSection"],
              )
            }
            aria-invalid={errors.platformSection ? true : undefined}
            aria-describedby={
              errors.platformSection ? "support-section-error" : undefined
            }
          >
            <option value="">Choose a section…</option>
            {SUPPORT_SECTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </FormField>

        <FormField id="support-type" label="Type" error={errors.type}>
          <NativeSelect
            id="support-type"
            value={values.type}
            onChange={(event) =>
              set("type", event.target.value as SupportTicketInput["type"])
            }
            aria-invalid={errors.type ? true : undefined}
            aria-describedby={errors.type ? "support-type-error" : undefined}
          >
            <option value="">Choose a type…</option>
            {SUPPORT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </div>

      <div className="space-y-1.5">
        <span
          id="support-severity-label"
          className="text-sm font-semibold text-foreground"
        >
          Severity
        </span>
        <div
          role="radiogroup"
          aria-labelledby="support-severity-label"
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {SUPPORT_SEVERITIES.map((option, index) => {
            const checked = values.severity === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={checked}
                data-checked={checked}
                data-invalid={errors.severity && index === 0 ? true : undefined}
                // Only the checked one (or the first, when none is) is a tab stop.
                tabIndex={checked || (!values.severity && index === 0) ? 0 : -1}
                onClick={() => set("severity", option.value)}
                onKeyDown={(event) => {
                  const step =
                    event.key === "ArrowRight" || event.key === "ArrowDown"
                      ? 1
                      : event.key === "ArrowLeft" || event.key === "ArrowUp"
                        ? -1
                        : 0;
                  if (!step) return;
                  event.preventDefault();
                  const next =
                    SUPPORT_SEVERITIES[
                      (index + step + SUPPORT_SEVERITIES.length) %
                        SUPPORT_SEVERITIES.length
                    ];
                  set("severity", next.value);
                  (
                    event.currentTarget.parentElement?.querySelectorAll<HTMLElement>(
                      '[role="radio"]',
                    )[SUPPORT_SEVERITIES.indexOf(next)] ?? null
                  )?.focus();
                }}
                className={cn(
                  "min-h-9 cursor-pointer rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring",
                  SEVERITY_TONE[option.value],
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {errors.severity && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {errors.severity}
          </p>
        )}
      </div>

      <FormField
        id="support-description"
        label="Description"
        error={errors.description}
        hint={`Tell us what happened and what you expected, in ${SUPPORT_DESCRIPTION_MIN} to ${SUPPORT_DESCRIPTION_MAX} characters.`}
      >
        <Textarea
          id="support-description"
          value={values.description}
          onChange={(event) => set("description", event.target.value)}
          rows={5}
          maxLength={SUPPORT_DESCRIPTION_MAX + 200}
          placeholder="Describe the problem or your concern…"
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={
            errors.description ? "support-description-error" : undefined
          }
        />
        <p
          className={cn(
            "text-right text-xs tabular-nums",
            descriptionLength > SUPPORT_DESCRIPTION_MAX
              ? "font-semibold text-destructive"
              : "text-muted-foreground",
          )}
          aria-live="polite"
        >
          {descriptionLength} / {SUPPORT_DESCRIPTION_MAX}
        </p>
      </FormField>

      {serverError && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {serverError}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <Send aria-hidden />
          )}
          {submitting ? "Sending…" : "Send ticket"}
        </Button>
      </div>
    </form>
  );
}

export function NewSupportTicketDialog({
  open,
  onOpenChange,
  account,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: SupportAccount;
  onCreated: (ticket: SupportTicket) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Open a new support ticket"
      description="Tell us about a problem with the platform. We answer by email."
      className="max-w-xl"
    >
      {/* Mounted only while open: a new ticket always starts from an empty form. */}
      <TicketForm
        account={account}
        onCreated={onCreated}
        onClose={() => onOpenChange(false)}
      />
    </Dialog>
  );
}
