import {
  CircleAlert,
  Download,
  HardDrive,
  RotateCcw,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { hasBlockingIssues } from "../../domain/validation";
import { DEMO_CAMPAIGN_ID } from "../../presets/demoCampaign";
import { resetDemoEntries } from "../../services/createLocalServices";
import {
  downloadJson,
  exportFileName,
  MAX_IMPORT_BYTES,
  readImportedConfig,
} from "../shareFile";
import { useStudio } from "../StudioContext";
import { PanelBody, PanelHeader, PanelSection } from "./PanelLayout";

// Share (plan §9.2): take the configuration away as a file, bring one back, and clear the
// demo participations of this campaign (to play again with the same phone number).

const button =
  "flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40";

type Notice = { tone: "ok" | "error"; text: string; details?: string[] };

export function SharePanel() {
  const config = useStudio((state) => state.config);
  const campaign = useStudio((state) => state.campaign);
  const issues = useStudio((state) => state.issues);
  const replaceConfig = useStudio((state) => state.replaceConfig);
  const file = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const blocked = hasBlockingIssues(issues);

  const importFile = async (picked: File | undefined) => {
    if (!picked) return;
    if (picked.size > MAX_IMPORT_BYTES) {
      setNotice({
        tone: "error",
        text: "This file is too large to be a configuration.",
      });
      return;
    }
    const result = readImportedConfig(await picked.text());
    if (result.ok === false) {
      setNotice({
        tone: "error",
        text: result.message,
        details: result.details,
      });
      return;
    }
    replaceConfig(result.config);
    setNotice({
      tone: "ok",
      text: `“${picked.name}” imported. Undo (Ctrl+Z) brings the previous version back.`,
    });
  };

  return (
    <>
      <PanelHeader
        title="Export"
        description="Save a copy, bring one back, or start the demo over."
      />
      <PanelBody>
        <PanelSection
          title="Export and import"
          description="A JSON file with every setting of this experience."
        >
          {blocked && (
            <p
              role="alert"
              className="flex gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-800 dark:bg-red-500/10 dark:text-red-200"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              Fix required issues before sharing.
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <button
              type="button"
              disabled={blocked}
              onClick={() =>
                downloadJson(
                  exportFileName(campaign?.name ?? null, new Date()),
                  config,
                )
              }
              className={`${button} bg-blue-600 text-white shadow-sm hover:bg-blue-500`}
            >
              <Download className="size-4" aria-hidden />
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => file.current?.click()}
              className={`${button} border border-card-border text-brand-text hover:bg-card-hover`}
            >
              <Upload className="size-4" aria-hidden />
              Import JSON
            </button>
          </div>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-label="Configuration file"
            onChange={(event) => {
              void importFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {notice && (
            <div
              role={notice.tone === "error" ? "alert" : "status"}
              className={`rounded-xl px-3 py-2.5 text-xs leading-relaxed ${
                notice.tone === "error"
                  ? "bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-200"
                  : "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"
              }`}
            >
              <p className="font-semibold">{notice.text}</p>
              {notice.details && notice.details.length > 0 && (
                <ul className="mt-1.5 list-disc space-y-0.5 pl-4 font-mono text-[11px]">
                  {notice.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </PanelSection>

        <PanelSection
          title="Demo data"
          description="Demo games remember the phone numbers that played, like the real campaign does."
        >
          <button
            type="button"
            onClick={() => {
              resetDemoEntries(campaign?.id ?? DEMO_CAMPAIGN_ID);
              setNotice({
                tone: "ok",
                text: "Demo data cleared: every phone number can play again in the preview.",
              });
            }}
            className={`${button} w-full border border-card-border text-brand-text hover:bg-card-hover`}
          >
            <RotateCcw className="size-4" aria-hidden />
            Reset demo data
          </button>
          <p className="flex gap-2 text-xs text-brand-text-muted">
            <HardDrive className="mt-0.5 size-4 shrink-0" aria-hidden />
            This experience is saved in this browser only. Export it to keep a
            copy or to move it to another computer.
          </p>
        </PanelSection>
      </PanelBody>
    </>
  );
}
