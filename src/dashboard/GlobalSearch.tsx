// The top bar's search: finds the sections, campaigns and rewards already loaded in the browser.
// "/" jumps to it, unless someone is already typing in a field.
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

import { useLanguage } from "../contexts/LanguageContext";
import { searchable } from "../lib/searchText";
import { useDashboard } from "./DashboardContext";
import { PATHS } from "./paths";

const MAX_PER_GROUP = 5;

interface SearchResult {
  id: string;
  label: string;
  to: string;
  group: string;
}

export function GlobalSearch() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { campaigns, prizes } = useDashboard();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const sections = useMemo(
    () => [
      { label: t("nav.overview", "Overview"), to: PATHS.home },
      { label: t("nav.campaigns", "Campaign Radios"), to: PATHS.campaigns },
      { label: t("nav.rewards", "Reward Library"), to: PATHS.prizes },
      { label: t("nav.analytics", "Analytics Desk"), to: PATHS.analytics },
      { label: t("nav.billing", "Billing & Quota"), to: PATHS.billing },
      { label: t("nav.playerScreen", "Player Studio"), to: PATHS.studio },
      { label: t("nav.organization", "Organization"), to: PATHS.account },
    ],
    [t],
  );

  const term = query.trim();
  const results = useMemo<SearchResult[]>(() => {
    const words = searchable(term).split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    const matches = (text: string) => {
      const haystack = searchable(text);
      return words.every((word) => haystack.includes(word));
    };
    return [
      ...sections
        .filter((section) => matches(section.label))
        .map((section) => ({
          id: `section-${section.to}`,
          label: section.label,
          to: section.to,
          group: t("search.sections", "Sections"),
        })),
      ...campaigns
        .filter((campaign) =>
          matches(`${campaign.name} ${campaign.arabicName}`),
        )
        .slice(0, MAX_PER_GROUP)
        .map((campaign) => ({
          id: `campaign-${campaign.id}`,
          label: campaign.name,
          to: PATHS.campaign(campaign.id),
          group: t("search.campaigns", "Campaigns"),
        })),
      ...prizes
        .filter((prize) => matches(prize.name))
        .slice(0, MAX_PER_GROUP)
        .map((prize) => ({
          id: `reward-${prize.id}`,
          label: prize.name,
          to: PATHS.rewardCodes(prize.id),
          group: t("search.rewards", "Rewards"),
        })),
    ];
  }, [term, sections, campaigns, prizes, t]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey)
        return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']"))
        return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const go = (to: string) => {
    close();
    inputRef.current?.blur();
    navigate(to);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (results.length === 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex(
        (index) => (index + step + results.length) % results.length,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(results[activeIndex]?.to ?? results[0].to);
    }
  };

  const showPanel = open && term !== "";
  return (
    <div
      ref={rootRef}
      className="dz-search"
      role="search"
      data-tour="topbar-search"
    >
      <Search size={18} strokeWidth={1.75} className="dz-icon" aria-hidden />
      <label htmlFor="dz-search" className="sr-only">
        {t("search.label", "Search")}
      </label>
      <input
        ref={inputRef}
        id="dz-search"
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="dz-search-results"
        aria-autocomplete="list"
        aria-activedescendant={
          showPanel && results[activeIndex]
            ? `dz-search-${results[activeIndex].id}`
            : undefined
        }
        placeholder={t(
          "search.placeholder",
          "Search campaigns, rewards, pages",
        )}
        autoComplete="off"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <kbd aria-hidden>/</kbd>
      {showPanel && (
        <div id="dz-search-results" className="dz-pop dz-search-pop">
          {results.length === 0 ? (
            <div>
              <p className="dz-search-group ov-strong" role="status">
                {t("search.noResults", "No results for")} “{term}”
              </p>
              <p className="dz-search-suggest ov-caption">
                {t(
                  "search.suggestions",
                  "Check the spelling, or go straight to a section:",
                )}
              </p>
              {sections.slice(1, 4).map((section) => (
                <Link
                  key={section.to}
                  to={section.to}
                  className="dz-pop-item"
                  onClick={close}
                >
                  {section.label}
                </Link>
              ))}
            </div>
          ) : (
            <div role="listbox" aria-label={t("search.results", "Results")}>
              {results.map((result, index) => (
                <div key={result.id}>
                  {result.group !== results[index - 1]?.group && (
                    <p className="dz-search-group ov-caption">{result.group}</p>
                  )}
                  <div
                    id={`dz-search-${result.id}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    data-active={index === activeIndex || undefined}
                    className="dz-pop-item"
                    dir="auto"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => go(result.to)}
                  >
                    {result.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
