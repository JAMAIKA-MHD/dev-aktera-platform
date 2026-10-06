import { CheckCircle2, ShieldAlert } from "lucide-react";
import { PanelBody, PanelHeader } from "../panels/PanelLayout";
import { useStudio } from "../StudioContext";
import { IssueGroup, IssueRow } from "./IssueRow";
import { LayoutSection } from "./LayoutSection";

// Validation (plan §9.4, tasks.md T6.8): every design issue of the experience in one list,
// errors first. Each one names the panel where it is fixed and leads there, to the field.
// While an error remains, sharing is blocked and the panel says so plainly. Below, the layout
// warnings of the size on show and the check of every size (T6.10), which never block.

export function ValidationPanel() {
  const issues = useStudio((state) => state.issues);
  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warning");

  return (
    <>
      <PanelHeader
        title="Validation"
        description="What must be fixed, and what could be better, before players see it."
      />
      <PanelBody>
        {errors.length > 0 ? (
          <p
            role="alert"
            className="flex gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100"
          >
            <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span>
              <strong className="block">
                Fix required issues before sharing.
              </strong>
              {errors.length} error{errors.length > 1 ? "s" : ""} would break
              the game or the law for players. Export stays locked until they
              are fixed.
            </span>
          </p>
        ) : (
          <p className="flex gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span>
              <strong className="block">Ready to share.</strong>
              {warnings.length > 0
                ? "Nothing blocks it; the warnings below are advice."
                : "No issue found."}
            </span>
          </p>
        )}
        <IssueGroup title="Errors" count={errors.length}>
          {errors.map((issue) => (
            <li key={issue.id}>
              <IssueRow {...issue} />
            </li>
          ))}
        </IssueGroup>
        <IssueGroup title="Warnings" count={warnings.length}>
          {warnings.map((issue) => (
            <li key={issue.id}>
              <IssueRow {...issue} />
            </li>
          ))}
        </IssueGroup>
        <LayoutSection />
      </PanelBody>
    </>
  );
}
