"use client";

import { useState } from "react";
import { BookOpen, FileQuestion, Loader2, Send } from "lucide-react";
import { FeedbackPanel } from "@/components/feedback-panel";
import { ImageUpload } from "@/components/image-upload";
import { SiteHeader } from "@/components/site-header";
import { cn, fileToDataUrl } from "@/lib/utils";
import type { ExamType, SubmissionMode, UploadedImage } from "@/lib/types";

const EXAM_TYPES: { value: ExamType; label: string }[] = [
  { value: "SMC", label: "SMC" },
  { value: "BMO", label: "BMO" },
  { value: "STEP", label: "STEP" },
  { value: "TMUA", label: "TMUA" },
  { value: "Other", label: "Other" },
];

export default function Home() {
  const [mode, setMode] = useState<SubmissionMode>("single");
  const [examType, setExamType] = useState<ExamType>("SMC");
  const [questionLabel, setQuestionLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [questionImages, setQuestionImages] = useState<UploadedImage[]>([]);
  const [answerImages, setAnswerImages] = useState<UploadedImage[]>([]);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    questionImages.length > 0 && answerImages.length > 0 && !isLoading;

  async function handleSubmit() {
    if (!canSubmit) return;

    setIsLoading(true);
    setFeedback("");
    setError(null);

    try {
      const payload = {
        mode,
        examType,
        questionImages: await Promise.all(
          questionImages.map((img) => fileToDataUrl(img.file)),
        ),
        answerImages: await Promise.all(
          answerImages.map((img) => fileToDataUrl(img.file)),
        ),
        notes: notes.trim() || undefined,
        questionLabel: questionLabel.trim() || undefined,
      };

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to get feedback");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setFeedback(accumulated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

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
            <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-5 shadow-sm">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
                Submission type
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMode("single")}
                  className={cn(
                    "flex min-h-[4.5rem] flex-col items-start justify-center gap-1 rounded-xl border-2 px-3.5 py-3 text-left transition-all",
                    mode === "single"
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                      : "border-[var(--color-border)] hover:border-[var(--color-ink-muted)]",
                  )}
                >
                  <FileQuestion className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                  <p className="text-sm font-semibold leading-tight">
                    Single question
                  </p>
                  <p className="text-[11px] leading-snug text-[var(--color-ink-muted)]">
                    One problem
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("test")}
                  className={cn(
                    "flex min-h-[4.5rem] flex-col items-start justify-center gap-1 rounded-xl border-2 px-3.5 py-3 text-left transition-all",
                    mode === "test"
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                      : "border-[var(--color-border)] hover:border-[var(--color-ink-muted)]",
                  )}
                >
                  <BookOpen className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                  <p className="text-sm font-semibold leading-tight">
                    Full test
                  </p>
                  <p className="text-[11px] leading-snug text-[var(--color-ink-muted)]">
                    Multiple pages
                  </p>
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-5 shadow-sm">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
                Exam type
              </p>
              <div className="grid grid-cols-5 gap-2">
                {EXAM_TYPES.map((exam) => (
                  <button
                    key={exam.value}
                    type="button"
                    onClick={() => setExamType(exam.value)}
                    className={cn(
                      "flex min-h-[2.75rem] items-center justify-center rounded-lg border px-1 py-2 text-center transition-all",
                      examType === exam.value
                        ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                        : "border-[var(--color-border)] hover:border-[var(--color-ink-muted)]",
                    )}
                  >
                    <span className="text-xs font-semibold leading-none sm:text-sm">
                      {exam.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {mode === "single" && (
              <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-5 shadow-sm">
                <label
                  htmlFor="question-label"
                  className="mb-2 block text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]"
                >
                  Question number (optional)
                </label>
                <input
                  id="question-label"
                  type="text"
                  placeholder="e.g. Q7"
                  value={questionLabel}
                  onChange={(e) => setQuestionLabel(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
                />
              </div>
            )}

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
                placeholder="I wasn't sure how to start part (b)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-white px-3.5 py-3 text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-all",
                canSubmit
                  ? "bg-[var(--color-ink)] text-white hover:bg-[var(--color-ink)]/90 active:scale-[0.99]"
                  : "cursor-not-allowed bg-[var(--color-paper-dark)] text-[var(--color-ink-muted)]",
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analysing…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Get Feedback
                </>
              )}
            </button>
          </div>

          <div
            className="animate-fade-up lg:sticky lg:top-6 lg:self-start"
            style={{ animationDelay: "0.2s" }}
          >
            <FeedbackPanel
              feedback={feedback}
              isLoading={isLoading}
              error={error}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
