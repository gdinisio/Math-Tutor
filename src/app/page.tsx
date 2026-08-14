"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  FileQuestion,
  Lightbulb,
  Loader2,
  ScrollText,
  Send,
  X,
} from "lucide-react";
import { FeedbackPanel } from "@/components/feedback-panel";
import { ImageUpload } from "@/components/image-upload";
import { SiteHeader } from "@/components/site-header";
import { prepareImages } from "@/lib/image";
import { splitStreamError } from "@/lib/stream";
import { cn } from "@/lib/utils";
import type {
  ExamType,
  FeedbackDepth,
  SubmissionMode,
  UploadedImage,
} from "@/lib/types";

const EXAM_TYPES: { value: ExamType; label: string }[] = [
  { value: "SMC", label: "SMC" },
  { value: "BMO", label: "BMO" },
  { value: "STEP", label: "STEP" },
  { value: "MAT", label: "MAT" },
  { value: "TMUA", label: "TMUA" },
  { value: "AIME", label: "AIME" },
  { value: "Olympiad", label: "Olympiad" },
  { value: "Other", label: "Other" },
];

const DEPTHS: {
  value: FeedbackDepth;
  label: string;
  hint: string;
  icon: typeof Lightbulb;
}[] = [
  {
    value: "hint",
    label: "Hint only",
    hint: "A nudge, no solution",
    icon: Lightbulb,
  },
  {
    value: "full",
    label: "Full review",
    hint: "Marked, with solution",
    icon: ScrollText,
  },
];

/** Coalesce stream updates so React isn't re-parsing markdown on every token. */
const STREAM_FLUSH_MS = 50;

type Stage = "idle" | "preparing" | "streaming";

export default function Home() {
  const [mode, setMode] = useState<SubmissionMode>("single");
  const [examType, setExamType] = useState<ExamType>("SMC");
  const [depth, setDepth] = useState<FeedbackDepth>("full");
  const [questionLabel, setQuestionLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [questionImages, setQuestionImages] = useState<UploadedImage[]>([]);
  const [answerImages, setAnswerImages] = useState<UploadedImage[]>([]);
  const [feedback, setFeedback] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const isLoading = stage !== "idle";
  const canSubmit =
    questionImages.length > 0 && answerImages.length > 0 && !isLoading;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    const controller = new AbortController();
    abortRef.current = controller;

    setStage("preparing");
    setFeedback("");
    setError(null);

    try {
      // Compress before serialising: raw phone photos exceed the request
      // body limit long before they reach the model.
      const [questionData, answerData] = await Promise.all([
        prepareImages(questionImages.map((img) => img.file)),
        prepareImages(answerImages.map((img) => img.file)),
      ]);

      if (controller.signal.aborted) return;
      setStage("streaming");

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          mode,
          examType,
          depth,
          questionImages: questionData,
          answerImages: answerData,
          notes: notes.trim() || undefined,
          questionLabel: questionLabel.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let accumulated = "";
      let flushQueued = false;

      const flush = () => {
        flushQueued = false;
        // A timer queued just before the user hit Stop would otherwise land
        // after the next submission has already cleared the panel.
        if (controller.signal.aborted) return;
        const { text, error: streamError } = splitStreamError(accumulated);
        setFeedback(text);
        if (streamError) setError(streamError);
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        if (!flushQueued) {
          flushQueued = true;
          setTimeout(flush, STREAM_FLUSH_MS);
        }
      }

      flush();
    } catch (err) {
      // An abort is the user pressing Stop, not a failure worth reporting.
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      abortRef.current = null;
      setStage("idle");
    }
  }, [
    canSubmit,
    mode,
    examType,
    depth,
    notes,
    questionLabel,
    questionImages,
    answerImages,
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void handleSubmit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSubmit]);

  // Don't leave a request running against a page that's going away.
  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <div className="paper-grid min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 animate-fade-up">
          <h1 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--color-ink)] sm:text-4xl">
            Get feedback on your maths
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-ink-muted)]">
            Upload a question and your working. We&apos;ll review your approach
            and guide you toward the full solution.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <div
            className="animate-fade-up space-y-5"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-white/80 p-5 shadow-sm">
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
                  Submission type
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {(
                    [
                      {
                        value: "single",
                        label: "Single question",
                        hint: "One problem",
                        icon: FileQuestion,
                      },
                      {
                        value: "test",
                        label: "Full paper",
                        hint: "Multiple pages",
                        icon: BookOpen,
                      },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMode(option.value)}
                      aria-pressed={mode === option.value}
                      className={cn(
                        "flex min-h-[4.5rem] flex-col items-start justify-center gap-1 rounded-xl border-2 px-3.5 py-3 text-left transition-all",
                        mode === option.value
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                          : "border-[var(--color-border)] hover:border-[var(--color-ink-muted)]",
                      )}
                    >
                      <option.icon className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                      <p className="text-sm font-semibold leading-tight">
                        {option.label}
                      </p>
                      <p className="text-[11px] leading-snug text-[var(--color-ink-muted)]">
                        {option.hint}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
                  Exam type
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXAM_TYPES.map((exam) => (
                    <button
                      key={exam.value}
                      type="button"
                      onClick={() => setExamType(exam.value)}
                      aria-pressed={examType === exam.value}
                      className={cn(
                        "min-h-[2.5rem] rounded-lg border px-3.5 py-2 text-xs font-semibold transition-all sm:text-sm",
                        examType === exam.value
                          ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                          : "border-[var(--color-border)] hover:border-[var(--color-ink-muted)]",
                      )}
                    >
                      {exam.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
                  How much to reveal
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {DEPTHS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDepth(option.value)}
                      aria-pressed={depth === option.value}
                      className={cn(
                        "flex min-h-[4.5rem] flex-col items-start justify-center gap-1 rounded-xl border-2 px-3.5 py-3 text-left transition-all",
                        depth === option.value
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                          : "border-[var(--color-border)] hover:border-[var(--color-ink-muted)]",
                      )}
                    >
                      <option.icon className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                      <p className="text-sm font-semibold leading-tight">
                        {option.label}
                      </p>
                      <p className="text-[11px] leading-snug text-[var(--color-ink-muted)]">
                        {option.hint}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {mode === "single" && (
                <div>
                  <label
                    htmlFor="question-label"
                    className="mb-2 block text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]"
                  >
                    Question number (optional)
                  </label>
                  <input
                    id="question-label"
                    type="text"
                    placeholder="e.g. Q7, or STEP 2 2014 Q5"
                    value={questionLabel}
                    onChange={(e) => setQuestionLabel(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
                  />
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-5 shadow-sm">
              <ImageUpload
                label="Question"
                description={
                  mode === "single"
                    ? "Photo of the question"
                    : "All question pages"
                }
                images={questionImages}
                onChange={setQuestionImages}
                multiple={mode === "test"}
              />
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-5 shadow-sm">
              <ImageUpload
                label="Your answer"
                description={
                  mode === "single"
                    ? "Photo of your working"
                    : "All answer pages"
                }
                images={answerImages}
                onChange={setAnswerImages}
                multiple={mode === "test"}
              />
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-5 shadow-sm">
              <label
                htmlFor="notes"
                className="mb-1 block text-sm font-semibold text-[var(--color-ink)]"
              >
                Notes (optional)
              </label>
              <p className="mb-3 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                Where you got stuck or what you want feedback on.
              </p>
              <textarea
                id="notes"
                rows={3}
                placeholder="I wasn't sure how to start part (b)…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-white px-3.5 py-3 text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
              />
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-all",
                  canSubmit
                    ? "bg-[var(--color-ink)] text-white hover:bg-[var(--color-ink)]/90 active:scale-[0.99]"
                    : "cursor-not-allowed bg-[var(--color-paper-dark)] text-[var(--color-ink-muted)]",
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {stage === "preparing" ? "Preparing images…" : "Analysing…"}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Get Feedback
                  </>
                )}
              </button>

              {isLoading && (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3.5 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink-muted)]"
                >
                  <X className="h-4 w-4" />
                  Stop
                </button>
              )}
            </div>

            <p className="text-center text-xs text-[var(--color-ink-muted)]">
              Tip: press{" "}
              <kbd className="rounded border border-[var(--color-border)] bg-white px-1.5 py-0.5 font-sans text-[11px]">
                ⌘
              </kbd>{" "}
              +{" "}
              <kbd className="rounded border border-[var(--color-border)] bg-white px-1.5 py-0.5 font-sans text-[11px]">
                ↵
              </kbd>{" "}
              to submit
            </p>
          </div>

          <div
            className="feedback-sticky animate-fade-up lg:sticky lg:self-start"
            style={{ animationDelay: "0.2s" }}
          >
            <FeedbackPanel
              feedback={feedback}
              isLoading={isLoading}
              error={error}
              filenameHint={questionLabel.trim() || examType}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
