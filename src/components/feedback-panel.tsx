"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, Download, Sparkles } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";

interface FeedbackPanelProps {
  feedback: string;
  isLoading: boolean;
  error: string | null;
  /** Shown in the download filename so saved reviews are distinguishable. */
  filenameHint?: string;
}

export function FeedbackPanel({
  feedback,
  isLoading,
  error,
  filenameHint,
}: FeedbackPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);
  const [copied, setCopied] = useState(false);

  // Follow the stream as it arrives, but stop fighting the user the moment
  // they scroll up to re-read something.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && pinnedToBottom.current) el.scrollTop = el.scrollHeight;
  }, [feedback]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    pinnedToBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(feedback);
      setCopied(true);
    } catch {
      // Clipboard access can be denied; leave the button in its idle state.
    }
  };

  const handleDownload = () => {
    const blob = new Blob([feedback], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    link.download = `feedback-${filenameHint ?? "review"}-${stamp}.md`
      .toLowerCase()
      .replace(/\s+/g, "-");
    link.click();
    URL.revokeObjectURL(url);
  };

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
        "flex max-h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white/80 shadow-sm backdrop-blur-sm",
        isLoading && "border-[var(--color-accent)]/30",
      )}
    >
      <div className="shrink-0 border-b border-[var(--color-border)]/60 px-6 py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)]">
            Tutor Feedback
          </h2>

          {isLoading && (
            <span className="animate-pulse-soft ml-auto text-xs font-medium text-[var(--color-accent)]">
              Analysing your work…
            </span>
          )}

          {!isLoading && feedback && (
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-paper-dark)] hover:text-[var(--color-ink)]"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[var(--color-success)]" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-paper-dark)] hover:text-[var(--color-ink)]"
                aria-label="Download feedback as Markdown"
              >
                <Download className="h-3.5 w-3.5" />
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="feedback-scroll min-h-0 flex-1 overflow-y-auto px-6 py-4"
      >
        {error && (
          <div className="mb-4 flex gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {feedback && (
          <div className="feedback-content max-w-none">
            <Markdown text={feedback} />
          </div>
        )}

        {isLoading && !feedback && (
          <div className="space-y-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-paper-dark)]" />
            <div className="h-4 w-full animate-pulse rounded bg-[var(--color-paper-dark)]" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--color-paper-dark)]" />
          </div>
        )}
      </div>
    </div>
  );
}
