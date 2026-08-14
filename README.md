# Math Tutor

An AI-powered maths tutor for competition problems — photograph an SMC, STEP, BMO, MAT, TMUA, AIME or olympiad question together with your working, and get it marked.

![Next.js](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Vercel AI SDK](https://img.shields.io/badge/Vercel-AI%20SDK-black)

## Features

- **Single question or full paper** — upload one problem or a whole script
- **Exam-aware marking** — SMC, BMO, STEP, MAT, TMUA, AIME, Olympiad, or Other, each with its own mark scheme and failure modes
- **Hint mode** — ask for a nudge instead of the answer, so a problem you're mid-way through stays solvable
- **Rendered mathematics** — feedback is typeset with KaTeX, not printed as raw LaTeX
- **Image uploads** — drag-and-drop, browse, or camera capture, compressed in the browser before upload
- **Streaming feedback** — the review appears as it's written, and can be stopped, copied, or saved as Markdown

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Add your Anthropic API key

Create a `.env.local` file:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Get a key from the [Anthropic Console](https://console.anthropic.com/settings/keys), and make sure the account has credit — an unfunded key authenticates fine but every request fails.

`.env.local` is gitignored. **Never commit the key.** When deploying, add `ANTHROPIC_API_KEY` in **Project Settings → Environment Variables** on Vercel rather than putting it in a file you push.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Choosing a model

The model is the main quality lever here: competition marking needs one that can both read handwriting and reason rigorously. It defaults to `claude-opus-5` and is overridable:

```bash
MATH_TUTOR_MODEL=claude-sonnet-5
```

`claude-opus-5` is the strongest on olympiad and STEP proof work; `claude-sonnet-5` is roughly half the price and noticeably faster.

**On timeouts:** Claude 5 models think before answering, and that thinking counts against both the token budget and the wall clock. `maxDuration` in [route.ts](src/app/api/feedback/route.ts) is set to 60s because that is Vercel's Hobby ceiling — a deploy fails if it exceeds your plan's limit. If full-paper reviews time out, either raise it to 300 on Pro or switch to `claude-sonnet-5`.

Reasoning depth is set per request: `high` effort for a full review, `medium` for a hint, since a nudge needs less deliberation and benefits more from a fast reply.

## How it works

1. Upload the question image(s) and your working
2. Pick the exam type, and whether you want a hint or a full review
3. Optionally note where you got stuck
4. The tutor reads the question, **solves it independently before looking at your attempt** — so it isn't led into agreeing with your mistake — then marks your work against that exam's conventions

A full review comes back as a verdict and estimated mark, a restatement of the question (so you can check it read your handwriting correctly), a line-by-line walk of your working that pinpoints the *first* error and names the underlying misconception, the complete solution, and specific things to work on.

Hint mode withholds the solution and gives you the smallest nudge that unblocks you.

## Tests

The LaTeX delimiter normalisation in `src/lib/latex.ts` is fiddly enough to be worth pinning down — display maths silently degrades to inline, or swallows the rest of the document, if the fencing is wrong.

```bash
npm test
```

Uses the built-in Node test runner; no extra dependencies.

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router)
- [Vercel AI SDK](https://sdk.vercel.ai/) + [@ai-sdk/anthropic](https://www.npmjs.com/package/@ai-sdk/anthropic)
- [react-markdown](https://github.com/remarkjs/react-markdown) + [KaTeX](https://katex.org/) for typesetting
- [Tailwind CSS 4](https://tailwindcss.com/)
- TypeScript

## License

MIT
