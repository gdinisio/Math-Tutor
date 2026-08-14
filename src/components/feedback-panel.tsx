"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedbackPanelProps {
  feedback: string;
  isLoading: boolean;
  error: string | null;
}

function formatFeedback(text: string): string {
  return text
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\$\$([^$]+)\$\$/g, '<p class="my-2 font-mono text-[var(--color-ink)]">\\($1\\)</p>')
    .replace(/\$([^$]+)\$/g, '<code class="font-mono">\\($1\\)</code>')
    .replace(/^(?!<[hpuol]|<li|<code)(.+)$/gm, "<p>$1</p>")
    .replace(/<p><\/p>/g, "");
}

export function FeedbackPanel({
  feedback,
  isLoading,
  error,
}: FeedbackPanelProps) {
  if (!feedback && !isLoading && !error) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-white/40 p-8 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-paper-dark)]">
          <Sparkles className="h-6 w-6 text-[var(--color-accent)]" />
        </div>
        <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)]">
          Your feedback will appear here
        </h3>
        <p className="mt-2 max-w-sm text-sm text-[var(--color-ink-muted)]">
          Upload your question and answer, then click &ldquo;Get Feedback&rdquo;
          for a detailed review of your working.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-white/80 p-6 shadow-sm backdrop-blur-sm",
        isLoading && "border-[var(--color-accent)]/30",
      )}
    >
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)]">
          Tutor Feedback
        </h2>
        {isLoading && (
          <span className="ml-auto text-xs font-medium text-[var(--color-accent)] animate-pulse-soft">
            Analysing your work…
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {feedback && (
        <div
          className="feedback-content prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: formatFeedback(feedback) }}
        />
      )}

      {isLoading && !feedback && (
        <div className="space-y-3">
          <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-paper-dark)]" />
          <div className="h-4 w-full animate-pulse rounded bg-[var(--color-paper-dark)]" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--color-paper-dark)]" />
        </div>
      )}
    </div>
  );
}
