// The full product documentation, on a page of its own (/docs, /docs/:pageId). The sidebar's
// "Full documentation" opens it in a new browser tab. On the left the table of contents
// (chapters and pages, with a search), on the right the page being read, with its kind,
// audience, last update, a link to the screen it documents, previous / next, and a
// "Was this helpful?" vote (remembered per page in this browser). Every page has its own URL,
// so a page can be bookmarked or sent to a teammate.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  ExternalLink,
  Search,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

import { useTheme } from "../../contexts/ThemeContext";
import { PATHS } from "../../dashboard/paths";
import {
  ALL_DOC_PAGES,
  DOC_CHAPTERS,
  DOCS_LAST_UPDATED,
  DOCS_VERSION,
  findDocPage,
  searchDocPages,
  type DocKind,
} from "./docsContent";

const FEEDBACK_KEY = "dashboard-docs-feedback";

const KIND_STYLE: Record<DocKind, string> = {
  Tutorial: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  "How-to": "bg-blue-500/12 text-blue-700 dark:text-blue-300",
  Reference: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  Explanation: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

function readFeedback(): Record<string, "yes" | "no"> {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    return raw ? (JSON.parse(raw) as Record<string, "yes" | "no">) : {};
  } catch {
    return {};
  }
}

function writeFeedback(value: Record<string, "yes" | "no">) {
  try {
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(value));
  } catch {
    // Private mode or blocked storage: the vote is only kept for this visit.
  }
}

export default function DocumentationPage() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const page = (pageId && findDocPage(pageId)) || ALL_DOC_PAGES[0];
  const index = ALL_DOC_PAGES.findIndex((p) => p.id === page.id);
  const previous = index > 0 ? ALL_DOC_PAGES[index - 1] : null;
  const next =
    index < ALL_DOC_PAGES.length - 1 ? ALL_DOC_PAGES[index + 1] : null;

  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState(readFeedback);
  const [tocOpen, setTocOpen] = useState(false);
  const articleRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(
    () => new Set(searchDocPages(query).map((p) => p.id)),
    [query],
  );
  const searching = query.trim() !== "";

  // A new page starts at the top, with its title in the browser tab.
  useEffect(() => {
    if (articleRef.current) articleRef.current.scrollTop = 0;
    document.title = `${page.title} · Aktera documentation`;
  }, [page]);

  // "/" focuses the search, as on most documentation sites.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (event.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const goTo = (id: string) => {
    setTocOpen(false);
    navigate(`${PATHS.docs}/${id}`);
  };

  const vote = (value: "yes" | "no") => {
    const updated = { ...feedback, [page.id]: value };
    setFeedback(updated);
    writeFeedback(updated);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-brand-dark font-sans text-brand-text">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-card-border bg-card-bg px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => setTocOpen((value) => !value)}
          className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-card-border text-brand-text-muted hover:text-brand-text md:hidden"
          aria-label="Show contents"
          aria-expanded={tocOpen}
        >
          <i className="fa-solid fa-list" aria-hidden />
        </button>
        <Link
          to={PATHS.docs}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <BookOpen className="size-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-black tracking-tight">
              Aktera documentation
            </span>
            <span className="block truncate text-[11px] text-brand-text-muted">
              {DOCS_VERSION} · Last updated {DOCS_LAST_UPDATED} · English
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-card-border text-brand-text-muted hover:text-brand-text"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          <i
            className={`fa-solid ${theme === "dark" ? "fa-sun text-amber-400" : "fa-moon"}`}
            aria-hidden
          />
        </button>
        <Link
          to={PATHS.home}
          className="hidden items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 sm:flex"
        >
          Go to dashboard
          <ExternalLink className="size-3" aria-hidden />
        </Link>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Table of contents */}
        <aside
          className={`${
            tocOpen ? "flex" : "hidden"
          } absolute inset-y-0 left-0 z-10 w-[280px] flex-col border-r border-card-border bg-card-bg shadow-xl md:static md:flex md:w-[280px] md:shrink-0 md:shadow-none`}
        >
          <div className="shrink-0 p-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-brand-text-muted"
                aria-hidden
              />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the docs…"
                aria-label="Search the documentation"
                className="w-full rounded-lg border border-card-border bg-card-bg-subtle py-2 pl-8 pr-8 text-[13px] text-brand-text outline-none focus:border-blue-500"
              />
              <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-card-border px-1.5 text-[10px] text-brand-text-muted">
                /
              </kbd>
            </div>
          </div>
          <nav
            aria-label="Documentation contents"
            className="min-h-0 flex-1 space-y-5 overflow-y-auto px-2 pb-6"
          >
            {DOC_CHAPTERS.map((chapter) => {
              const pages = chapter.pages.filter((p) => matches.has(p.id));
              if (pages.length === 0) return null;
              return (
                <div key={chapter.id}>
                  <p className="mb-1.5 flex items-center gap-2 px-2 text-[11px] font-black uppercase tracking-wider text-brand-text-muted">
                    <i
                      className={`${chapter.icon} w-3.5 text-center`}
                      aria-hidden
                    />
                    {chapter.title}
                  </p>
                  <ul className="space-y-0.5">
                    {pages.map((p) => {
                      const active = p.id === page.id;
                      return (
                        <li key={p.id}>
                          <Link
                            to={`${PATHS.docs}/${p.id}`}
                            onClick={() => setTocOpen(false)}
                            aria-current={active ? "page" : undefined}
                            className={`block w-full rounded-lg border-l-2 px-3 py-1.5 text-left text-[13px] transition-colors ${
                              active
                                ? "border-blue-600 bg-blue-600/10 font-bold text-blue-700 dark:text-blue-300"
                                : "border-transparent text-brand-text/80 hover:bg-card-hover hover:text-brand-text"
                            }`}
                          >
                            {p.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            {searching && matches.size === 0 && (
              <p className="px-2 text-xs text-brand-text-muted">
                No page matches “{query}”.
              </p>
            )}
          </nav>
        </aside>

        {/* Page */}
        <main ref={articleRef} className="min-w-0 flex-1 overflow-y-auto">
          <article className="mx-auto max-w-[800px] px-5 py-8 sm:px-10">
            <nav
              aria-label="Breadcrumb"
              className="mb-3 flex items-center gap-1 text-[11px] font-semibold text-brand-text-muted"
            >
              <Link to={PATHS.docs} className="hover:text-brand-text">
                Docs
              </Link>
              <ChevronRight className="size-3" aria-hidden />
              <span>{page.chapter.title}</span>
            </nav>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              {page.title}
            </h1>
            <p className="mt-1.5 text-[14px] text-brand-text/70">
              {page.summary}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-card-border pb-5">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${KIND_STYLE[page.kind]}`}
              >
                {page.kind}
              </span>
              {page.audience.map((audience) => (
                <span
                  key={audience}
                  className="rounded-full border border-card-border px-2.5 py-0.5 text-[11px] font-semibold text-brand-text-muted"
                >
                  {audience}
                </span>
              ))}
              {page.open && (
                <Link
                  to={page.open.to}
                  className="ml-auto flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                >
                  {page.open.label}
                  <ExternalLink className="size-3" aria-hidden />
                </Link>
              )}
            </div>

            <div className="pt-6">{page.body}</div>

            {/* Feedback */}
            <div className="mt-10 flex flex-wrap items-center gap-3 rounded-xl border border-card-border bg-card-bg px-4 py-3">
              <p className="text-[13px] font-semibold">
                Was this page helpful?
              </p>
              {feedback[page.id] ? (
                <p className="text-[13px] text-brand-text-muted" role="status">
                  Thanks for your feedback.{" "}
                  {feedback[page.id] === "no" &&
                    "Tell us what was missing through Client support."}
                </p>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => vote("yes")}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-card-border px-3 py-1 text-xs font-semibold hover:bg-card-hover"
                  >
                    <ThumbsUp className="size-3.5" aria-hidden /> Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => vote("no")}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-card-border px-3 py-1 text-xs font-semibold hover:bg-card-hover"
                  >
                    <ThumbsDown className="size-3.5" aria-hidden /> No
                  </button>
                </div>
              )}
            </div>

            {/* Previous / next */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {previous ? (
                <button
                  type="button"
                  onClick={() => goTo(previous.id)}
                  className="cursor-pointer rounded-xl border border-card-border bg-card-bg px-4 py-3 text-left hover:border-blue-500/50 hover:bg-card-hover"
                >
                  <span className="flex items-center gap-1 text-[11px] text-brand-text-muted">
                    <ArrowLeft className="size-3" aria-hidden /> Previous
                  </span>
                  <span className="text-[13px] font-bold">
                    {previous.title}
                  </span>
                </button>
              ) : (
                <span />
              )}
              {next && (
                <button
                  type="button"
                  onClick={() => goTo(next.id)}
                  className="cursor-pointer rounded-xl border border-card-border bg-card-bg px-4 py-3 text-right hover:border-blue-500/50 hover:bg-card-hover"
                >
                  <span className="flex items-center justify-end gap-1 text-[11px] text-brand-text-muted">
                    Next <ArrowRight className="size-3" aria-hidden />
                  </span>
                  <span className="text-[13px] font-bold">{next.title}</span>
                </button>
              )}
            </div>
          </article>
        </main>
      </div>
    </div>
  );
}
