# Math Tutor

An AI-powered maths tutor for competition problems — upload photos of SMC, STEP, BMO, AIME, and olympiad questions with your working, and get detailed feedback on your approach.

![Next.js](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Vercel AI SDK](https://img.shields.io/badge/Vercel-AI%20SDK-black)

## Features

- **Single question or full test** — upload one problem or multiple pages
- **Exam type selection** — SMC, STEP, BMO, AIME, Olympiad, or Other
- **Image uploads** — drag-and-drop, browse, or camera capture
- **Streaming feedback** — real-time tutor response with structured sections
- **Vision AI** — reads handwritten and printed maths from photos

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up AI Gateway

This app uses [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) with GPT-4o for vision analysis.

Create a `.env.local` file:

```bash
AI_GATEWAY_API_KEY=your_key_here
```

Get your key from the [Vercel AI Gateway dashboard](https://vercel.com/dashboard/ai-gateway).

When deployed on Vercel, add `AI_GATEWAY_API_KEY` as an environment variable in your project settings.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the project in [Vercel](https://vercel.com/new)
3. Add the `AI_GATEWAY_API_KEY` environment variable
4. Deploy

Vercel will auto-detect Next.js and configure the build.

## How it works

1. Upload question image(s) and your answer image(s)
2. Select the exam type for context-aware feedback
3. Optionally add notes about where you got stuck
4. The AI tutor analyses your working and streams structured feedback:
   - Summary
   - Question analysis
   - Review of your work
   - Correct solution
   - Tips for improvement

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router)
- [Vercel AI SDK](https://sdk.vercel.ai/) + AI Gateway
- [Tailwind CSS 4](https://tailwindcss.com/)
- TypeScript

## License

MIT
