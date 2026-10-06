import { Ruler } from "lucide-react";
import { CheckAllSizes } from "../preview/CheckAllSizes";
import { useLayoutWarnings } from "../preview/useLayoutReport";
import { useStudio } from "../StudioContext";
import { IssueGroup, IssueRow } from "./IssueRow";

// The layout part of the validation panel (T6.10): what breaks, or is cut short, at the size
// on show in the preview, and the check of every size. Warnings only: they never block.
export function LayoutSection() {
  const warnings = useLayoutWarnings();
  const size = useStudio((state) => state.layoutSize);
  return (
    <>
      <IssueGroup title="At this size" count={warnings.length}>
        {warnings.map((warning) => (
          <li key={warning.id}>
            <IssueRow
              level="warning"
              message={warning.message}
              path={warning.path}
              context={
                <span className="mr-1.5 inline-flex items-center gap-1 rounded-md bg-card-bg-subtle px-1.5 text-[10px] font-bold tabular-nums text-brand-text-muted ring-1 ring-card-border">
                  <Ruler className="size-3" aria-hidden />
                  At {warning.sizeLabel}
                </span>
              }
            />
          </li>
        ))}
      </IssueGroup>
      {warnings.length === 0 && size && (
        <p className="text-xs text-brand-text-muted">
          Nothing breaks at {size.width}×{size.height}, the size on show.
        </p>
      )}
      <CheckAllSizes />
    </>
  );
}
