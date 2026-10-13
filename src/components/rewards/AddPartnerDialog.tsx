import React, { useEffect, useId, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  PARTNER_LIMITS,
  validatePartner,
  type PartnerErrors,
} from "../../lib/partnerValidation";
import type { RewardPartnerInput } from "../../types";

interface AddPartnerDialogProps {
  onClose: () => void;
  /** Throws an Error with a message fit for the brand when the partner cannot be added. */
  onSubmit: (input: RewardPartnerInput) => Promise<unknown>;
}

const EMPTY: RewardPartnerInput = {
  name: "",
  description: "",
  websiteUrl: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
};

const inputClass = (invalid: boolean) =>
  `w-full rounded-xl border bg-card-bg px-3 py-2 text-sm text-brand-text placeholder-brand-textMuted focus:outline-none focus:ring-2 ${
    invalid
      ? "border-red-500/60 focus:ring-red-500/20"
      : "border-card-border focus:border-emerald-500 focus:ring-emerald-500/20"
  }`;

export const AddPartnerDialog: React.FC<AddPartnerDialogProps> = ({
  onClose,
  onSubmit,
}) => {
  const titleId = useId();
  const [values, setValues] = useState<RewardPartnerInput>(EMPTY);
  const [errors, setErrors] = useState<PartnerErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const set =
    (field: keyof RewardPartnerInput) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
      if (errors[field]) {
        setErrors((current) => ({ ...current, [field]: undefined }));
      }
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    const found = validatePartner(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit(values);
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "We could not add this partner. Please try again.",
      );
      setSubmitting(false);
    }
  };

  const field = (
    key: keyof RewardPartnerInput,
    label: string,
    options: {
      type?: string;
      placeholder?: string;
      required?: boolean;
      autoComplete?: string;
    } = {},
  ) => {
    const id = `${titleId}-${key}`;
    return (
      <div>
        <label
          htmlFor={id}
          className="mb-1 block text-[11px] font-black uppercase tracking-wider text-brand-textMuted"
        >
          {label}
          {options.required && (
            <span className="text-red-500" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </label>
        <input
          id={id}
          ref={key === "name" ? nameRef : undefined}
          type={options.type ?? "text"}
          value={values[key]}
          onChange={set(key)}
          placeholder={options.placeholder}
          autoComplete={options.autoComplete ?? "off"}
          required={options.required}
          aria-invalid={Boolean(errors[key])}
          aria-describedby={errors[key] ? `${id}-error` : undefined}
          className={inputClass(Boolean(errors[key]))}
        />
        {errors[key] && (
          <p
            id={`${id}-error`}
            role="alert"
            className="mt-1 text-xs text-red-500"
          >
            {errors[key]}
          </p>
        )}
      </div>
    );
  };

  const descriptionId = `${titleId}-description`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        noValidate
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-card-border bg-card-bg text-brand-text shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-card-border p-6">
          <div>
            <h3 id={titleId} className="text-lg font-black">
              Add a partner
            </h3>
            <p className="mt-1 text-xs text-brand-textMuted">
              Keep track of a partner you work with. Nothing is connected to it
              yet: this only saves its details in your library.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-card-border bg-card-bg-subtle text-brand-textMuted transition-colors hover:text-brand-text disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-6">
          {field("name", "Partner name", {
            required: true,
            placeholder: "e.g. Acme Gifts",
          })}

          <div>
            <label
              htmlFor={descriptionId}
              className="mb-1 block text-[11px] font-black uppercase tracking-wider text-brand-textMuted"
            >
              What they offer
            </label>
            <textarea
              id={descriptionId}
              value={values.description}
              onChange={set("description")}
              rows={3}
              maxLength={PARTNER_LIMITS.description + 50}
              placeholder="Gift cards, mobile top-ups, ride credits..."
              aria-invalid={Boolean(errors.description)}
              aria-describedby={
                errors.description ? `${descriptionId}-error` : undefined
              }
              className={`${inputClass(Boolean(errors.description))} resize-none`}
            />
            <div className="mt-1 flex items-center justify-between gap-2">
              {errors.description ? (
                <p
                  id={`${descriptionId}-error`}
                  role="alert"
                  className="text-xs text-red-500"
                >
                  {errors.description}
                </p>
              ) : (
                <span />
              )}
              <span className="text-[10px] text-brand-textMuted">
                {values.description.length}/{PARTNER_LIMITS.description}
              </span>
            </div>
          </div>

          {field("websiteUrl", "Website", {
            type: "url",
            placeholder: "https://",
            autoComplete: "url",
          })}

          <div className="grid gap-4 sm:grid-cols-2">
            {field("contactName", "Contact person", {
              autoComplete: "name",
            })}
            {field("contactPhone", "Contact phone", {
              type: "tel",
              placeholder: "05 51 23 45 67",
              autoComplete: "tel",
            })}
          </div>

          {field("contactEmail", "Contact email", {
            type: "email",
            autoComplete: "email",
          })}

          {submitError && (
            <p
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-500"
            >
              {submitError}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-card-border bg-card-bg-subtle p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl px-4 py-2 text-xs font-bold text-brand-textMuted transition-colors hover:text-brand-text disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white transition-all hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Adding..." : "Add partner"}
          </button>
        </div>
      </form>
    </div>
  );
};
