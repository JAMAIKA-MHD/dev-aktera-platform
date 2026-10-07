// The conversation of a ticket: the comments of the client's team and the answers of the support
// team, oldest first, and the form to add one. A ticket that is resolved or cancelled shows its
// thread but takes no more comments: a new ticket starts afresh.
import { useEffect, useId, useState, type FormEvent } from "react";
import { AlertCircle, Loader2, MessageSquare, Send } from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import { useSupportComments } from "../../hooks/useSupportComments";
import {
  isTicketClosed,
  SUPPORT_COMMENT_MAX,
  validateSupportComment,
} from "../../lib/support";
import { cn } from "../../lib/utils";
import {
  addSupportCommentService,
  SupportTicketError,
} from "../../services/supportService";
import type { SupportTicket, SupportTicketComment } from "../../types";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { formatTicketDateTime } from "./supportTicketColumns";

function CommentItem({
  comment,
  mine,
}: {
  comment: SupportTicketComment;
  mine: boolean;
}) {
  const support = comment.authorType === "support";
  const author = support ? "Support team" : mine ? "You" : comment.authorName;
  return (
    <li
      className={cn(
        "space-y-1 rounded-xl border px-3 py-2.5",
        support
          ? "border-blue-500/30 bg-blue-500/10"
          : "border-border bg-muted",
      )}
      data-author-type={comment.authorType}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-xs font-bold text-foreground">
          {author || "A member of your team"}
        </span>
        <time
          dateTime={comment.createdAt}
          className="text-[11px] tabular-nums text-muted-foreground"
        >
          {formatTicketDateTime(comment.createdAt)}
        </time>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm text-foreground">
        {comment.body}
      </p>
    </li>
  );
}

export function SupportComments({
  ticket,
  onPosted,
  onDirtyChange,
}: {
  ticket: SupportTicket;
  /** A comment was added: the history shows one more. */
  onPosted?: () => void;
  /** Whether a comment is being written and not sent yet (to not lose it by mistake). */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { profile } = useAuth();
  const { comments, loading, error, refetch } = useSupportComments(ticket.id);
  const closed = isTicketClosed(ticket.state);

  const fieldId = useId();
  const [draft, setDraft] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    onDirtyChange?.(draft.trim() !== "");
  }, [draft, onDirtyChange]);
  // The window closing takes the draft with it: nothing is left to protect.
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const length = draft.trim().length;

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (submitting) return;
    const invalid = validateSupportComment(draft);
    if (invalid) {
      setProblem(invalid);
      return;
    }
    setProblem(null);
    setSubmitting(true);
    try {
      await addSupportCommentService(ticket.id, draft);
      setDraft("");
      await refetch();
      onPosted?.();
    } catch (err) {
      setProblem(
        err instanceof SupportTicketError
          ? err.message
          : "We could not send your comment. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-label="Comments" className="space-y-3">
      <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <MessageSquare className="size-3.5" aria-hidden />
        Comments
        {comments.length > 0 && (
          <span className="tabular-nums">({comments.length})</span>
        )}
      </h3>

      {loading ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Loading comments…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 text-sm text-destructive"
        >
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No comments yet.
          {!closed && " Add details or answer our questions here."}
        </p>
      ) : (
        <ol className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              mine={
                comment.authorId !== null && comment.authorId === profile?.id
              }
            />
          ))}
        </ol>
      )}

      {closed ? (
        <p
          role="note"
          className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground"
        >
          This ticket is closed, so it takes no more comments. Open a new ticket
          if the problem is back.
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-2">
          <label
            htmlFor={fieldId}
            className="text-sm font-semibold text-foreground"
          >
            Add a comment
          </label>
          <Textarea
            id={fieldId}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setProblem(null);
            }}
            onKeyDown={(event) => {
              // Ctrl+Enter (or Cmd+Enter) sends, as in most comment boxes.
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                void submit();
              }
            }}
            rows={3}
            maxLength={SUPPORT_COMMENT_MAX + 200}
            placeholder="Write a comment for the support team…"
            aria-invalid={problem ? true : undefined}
            aria-describedby={problem ? `${fieldId}-error` : undefined}
          />
          <div className="flex items-center justify-between gap-3">
            <p
              className={cn(
                "text-xs tabular-nums",
                length > SUPPORT_COMMENT_MAX
                  ? "font-semibold text-destructive"
                  : "text-muted-foreground",
              )}
              aria-live="polite"
            >
              {length} / {SUPPORT_COMMENT_MAX}
            </p>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Send aria-hidden />
              )}
              {submitting ? "Sending…" : "Add comment"}
            </Button>
          </div>
          {problem && (
            <p
              id={`${fieldId}-error`}
              role="alert"
              className="flex items-start gap-2 text-xs font-medium text-destructive"
            >
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {problem}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
