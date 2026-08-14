import { Sigma } from "lucide-react";

const EXAMS = ["SMC", "BMO", "STEP", "TMUA"] as const;

export function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-50">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-ink)] shadow-sm">
            <Sigma className="h-4 w-4 text-white" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-[family-name:var(--font-display)] text-lg leading-none text-[var(--color-ink)]">
              Math Tutor
            </p>
            <p className="mt-0.5 truncate text-[11px] tracking-wide text-[var(--color-ink-muted)]">
              Competition maths feedback
            </p>
          </div>
        </div>

        <nav
          aria-label="Supported exams"
          className="hidden items-center gap-1.5 sm:flex"
        >
          {EXAMS.map((exam) => (
            <span
              key={exam}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-paper)]/80 px-2.5 py-1 text-[11px] font-medium text-[var(--color-ink-muted)]"
            >
              {exam}
            </span>
          ))}
        </nav>
      </div>
    </header>
  );
}
