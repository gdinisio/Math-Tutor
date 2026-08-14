"use client";

import { useState } from "react";
import {
  BookOpen,
  FileQuestion,
  Loader2,
  Send,
  Sigma,
} from "lucide-react";
import { FeedbackPanel } from "@/components/feedback-panel";
import { ImageUpload } from "@/components/image-upload";
import { cn, fileToDataUrl } from "@/lib/utils";
import type { ExamType, SubmissionMode, UploadedImage } from "@/lib/types";

const EXAM_TYPES: { value: ExamType; label: string; desc: string }[] = [
  { value: "SMC", label: "SMC", desc: "Senior Mathematical Challenge" },
  { value: "STEP", label: "STEP", desc: "Cambridge STEP" },
  { value: "BMO", label: "BMO", desc: "British Mathematical Olympiad" },
  { value: "AIME", label: "AIME", desc: "AIME" },
  { value: "Olympiad", label: "Olympiad", desc: "General Olympiad" },
  { value: "Other", label: "Other", desc: "Any competition" },
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
      <header className="border-b border-[var(--color-border)] bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-ink)] text-white">
              <Sigma className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-2xl leading-none text-[var(--color-ink)]">
                Math Tutor
              </h1>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Competition maths feedback
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-[var(--color-ink-muted)] sm:flex">
            <BookOpen className="h-3.5 w-3.5" />
            SMC · STEP · BMO · Olympiad
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="mb-10 animate-fade-up">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[var(--color-accent)]">
            Upload &amp; learn
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--color-ink)] sm:text-5xl">
            Get expert feedback on your maths
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--color-ink-muted)]">
            Photograph a question and your working. Our tutor reads your
            handwriting, checks your approach, and guides you toward the full
            solution.
          </p>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="animate-fade-up space-y-6" style={{ animationDelay: "0.1s" }}>
            <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-6 shadow-sm">
              <p className="mb-3 text-sm font-medium text-[var(--color-ink-muted)]">
                Submission type
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode("single")}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all",
                    mode === "single"
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                      : "border-[var(--color-border)] hover:border-[var(--color-ink-muted)]",
                  )}
                >
                  <FileQuestion className="h-5 w-5 shrink-0 text-[var(--color-accent)]" />
                  <div>
                    <p className="text-sm font-semibold">Single question</p>
                    <p className="text-xs text-[var(--color-ink-muted)]">
                      One problem + answer
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("test")}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all",
                    mode === "test"
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                      : "border-[var(--color-border)] hover:border-[var(--color-ink-muted)]",
                  )}
                >
                  <BookOpen className="h-5 w-5 shrink-0 text-[var(--color-accent)]" />
                  <div>
                    <p className="text-sm font-semibold">Full test</p>
                    <p className="text-xs text-[var(--color-ink-muted)]">
                      Multiple pages
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-6 shadow-sm">
              <p className="mb-3 text-sm font-medium text-[var(--color-ink-muted)]">
                Exam type
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {EXAM_TYPES.map((exam) => (
                  <button
                    key={exam.value}
                    type="button"
                    onClick={() => setExamType(exam.value)}
                    title={exam.desc}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-center transition-all",
                      examType === exam.value
                        ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                        : "border-[var(--color-border)] hover:border-[var(--color-ink-muted)]",
                    )}
                  >
                    <span className="block text-sm font-semibold">
                      {exam.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {mode === "single" && (
              <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-6 shadow-sm">
                <label
                  htmlFor="question-label"
                  className="mb-2 block text-sm font-medium text-[var(--color-ink-muted)]"
                >
                  Question number (optional)
                </label>
                <input
                  id="question-label"
                  type="text"
                  placeholder="e.g. Q7, 2023 Paper 1 Q3"
                  value={questionLabel}
                  onChange={(e) => setQuestionLabel(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
                />
              </div>
            )}

            <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-6 shadow-sm">
              <ImageUpload
                label="Question"
                description={
                  mode === "single"
                    ? "Photo of the question — handwritten or printed"
                    : "Upload all question pages (multiple images OK)"
                }
                images={questionImages}
                onChange={setQuestionImages}
                multiple={mode === "test"}
              />
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-6 shadow-sm">
              <ImageUpload
                label="Your answer"
                description={
                  mode === "single"
                    ? "Photo of your working and final answer"
                    : "Upload all answer pages matching the questions"
                }
                images={answerImages}
                onChange={setAnswerImages}
                multiple={mode === "test"}
              />
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-6 shadow-sm">
              <label
                htmlFor="notes"
                className="mb-2 block font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]"
              >
                Notes (optional)
              </label>
              <p className="mb-3 text-sm text-[var(--color-ink-muted)]">
                Where you got stuck, what you tried, or specific areas you want
                feedback on.
              </p>
              <textarea
                id="notes"
                rows={3}
                placeholder="I wasn't sure how to start part (b)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-semibold transition-all",
                canSubmit
                  ? "bg-[var(--color-ink)] text-white hover:bg-[var(--color-ink)]/90 active:scale-[0.99]"
                  : "cursor-not-allowed bg-[var(--color-paper-dark)] text-[var(--color-ink-muted)]",
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analysing your work…
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
            className="animate-fade-up lg:sticky lg:top-8 lg:self-start"
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

      <footer className="mt-16 border-t border-[var(--color-border)] py-6 text-center text-xs text-[var(--color-ink-muted)]">
        Built for competition maths practice · Deploy on Vercel
      </footer>
    </div>
  );
}
