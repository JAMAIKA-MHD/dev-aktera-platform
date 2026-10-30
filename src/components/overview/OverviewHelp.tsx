import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CircleHelp, X } from "lucide-react";

import { PATHS } from "../../dashboard/paths";
import { HELP_SUGGESTIONS } from "./overviewData";
import { ICON, ROUTES } from "./overviewParts";

export function OverviewHelp({ mode }: { mode: "full" | "empty" }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!helpOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setHelpOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [helpOpen]);

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className="ov-help-btn"
        aria-label="Need help?"
        aria-expanded={helpOpen}
        aria-controls="ov-help-panel"
        onClick={() => setHelpOpen((open) => !open)}
      >
        <CircleHelp {...ICON} />
        <span aria-hidden className="ov-help-label">
          Need help?
        </span>
      </button>

      {helpOpen && (
        <div
          id="ov-help-panel"
          className="ov-help-panel"
          role="region"
          aria-labelledby="ov-help-title"
        >
          <div className="ov-help-head">
            <h2 id="ov-help-title">Need help?</h2>
            <button
              type="button"
              className="dz-icon-btn"
              aria-label="Close help"
              title="Close help"
              onClick={() => {
                setHelpOpen(false);
                toggleRef.current?.focus();
              }}
            >
              <X {...ICON} />
            </button>
          </div>
          <label htmlFor="ov-help-search" className="sr-only">
            Search help articles
          </label>
          <input
            id="ov-help-search"
            type="search"
            className="ov-input"
            placeholder="Search help articles"
            autoComplete="off"
          />
          <p className="ov-eyebrow">Suggested for you</p>
          <ul className="ov-help-list">
            {HELP_SUGGESTIONS[mode].map((suggestion) => {
              const SuggestionIcon = suggestion.icon;
              return (
                <li key={suggestion.label}>
                  <Link
                    to={ROUTES[suggestion.to]}
                    className={suggestion.accent}
                  >
                    <span aria-hidden className="ov-tile">
                      <SuggestionIcon {...ICON} />
                    </span>
                    {suggestion.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link to={PATHS.support} className="ov-btn ov-btn-block">
            Contact support
          </Link>
        </div>
      )}
    </>
  );
}
