import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { z } from "zod";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts";
import { STREAM_ERROR_MARKER } from "@/lib/stream";

/**
 * Vercel caps this at 60s on Hobby; raise it to 300 on Pro if full-paper
 * reviews start timing out. Deploys fail if this exceeds your plan's limit.
 */
export const maxDuration = 60;

/**
 * Competition maths is the hard case for a vision model: it has to read
 * handwriting *and* reason rigorously, so this is the main quality lever in
 * the app. Override with MATH_TUTOR_MODEL to trade depth against cost and
 * latency — claude-sonnet-5 is roughly half the price and noticeably faster.
 */
const DEFAULT_MODEL = "claude-opus-5";

/** Guard rails that mirror the client-side compression budget. */
const MAX_IMAGES_PER_SIDE = 12;
const MAX_TOTAL_BASE64_BYTES = 4_000_000;

const DATA_URL = /^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/;

const imageDataUrl = z
  .string()
  .regex(DATA_URL, "One of the images could not be read. Please re-upload it.");

const feedbackSchema = z.object({
  mode: z.enum(["single", "test"]),
  examType: z.enum([
    "SMC",
    "BMO",
    "STEP",
    "MAT",
    "TMUA",
    "AIME",
    "Olympiad",
    "Other",
  ]),
  depth: z.enum(["hint", "full"]),
  questionImages: z
    .array(imageDataUrl)
    .min(1, "Add a photo of the question.")
    .max(MAX_IMAGES_PER_SIDE, `At most ${MAX_IMAGES_PER_SIDE} question images.`),
  answerImages: z
    .array(imageDataUrl)
    .min(1, "Add a photo of your working.")
    .max(MAX_IMAGES_PER_SIDE, `At most ${MAX_IMAGES_PER_SIDE} answer images.`),
  notes: z.string().max(2000).optional(),
  questionLabel: z.string().max(100).optional(),
});

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(DATA_URL);
  if (!match) throw new Error("Invalid image data URL");
  return { mediaType: match[1], data: match[2] };
}

function totalBytes(images: string[]): number {
  return images.reduce((sum, url) => {
    const base64 = url.slice(url.indexOf(",") + 1);
    return sum + Math.floor((base64.length * 3) / 4);
  }, 0);
}

/** Turns provider failures into something a student can act on. */
function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/api[_ ]?key|authentication|unauthorized|401/i.test(message)) {
    return "Anthropic rejected the request — check ANTHROPIC_API_KEY is set and valid.";
  }
  if (/rate.?limit|429/i.test(message)) {
    return "Rate limited by Anthropic. Wait a moment and try again.";
  }
  if (/credit|quota|billing|payment/i.test(message)) {
    return "Your Anthropic account is out of credit.";
  }
  if (/timeout|timed out|ETIMEDOUT|aborted/i.test(message)) {
    return "The model took too long to respond. Try a single question rather than a full paper, or switch MATH_TUTOR_MODEL to claude-sonnet-5.";
  }
  if (/not found|unknown model|invalid model|404/i.test(message)) {
    return `The model "${process.env.MATH_TUTOR_MODEL ?? DEFAULT_MODEL}" is not available on your Anthropic account.`;
  }
  return message || "The tutor failed to respond.";
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    // Without this the request fails deep inside the stream, where it used to
    // surface as an empty feedback panel with no explanation.
    return Response.json(
      {
        error:
          "ANTHROPIC_API_KEY is not set. Add it to .env.local (or your Vercel project settings) and restart.",
      },
      { status: 500 },
    );
  }

  let request: z.infer<typeof feedbackSchema>;

  try {
    const parsed = feedbackSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }
    request = parsed.data;
  } catch {
    return Response.json({ error: "Malformed request body" }, { status: 400 });
  }

  const payloadBytes =
    totalBytes(request.questionImages) + totalBytes(request.answerImages);

  if (payloadBytes > MAX_TOTAL_BASE64_BYTES) {
    return Response.json(
      {
        error:
          "Those images are too large. Try submitting fewer pages at a time.",
      },
      { status: 413 },
    );
  }

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image"; image: string; mediaType?: string }
  > = [{ type: "text", text: buildUserPrompt(request) }];

  content.push({ type: "text", text: "\n\n--- QUESTION ---" });
  for (const img of request.questionImages) {
    const { mediaType, data } = parseDataUrl(img);
    content.push({ type: "image", image: data, mediaType });
  }

  content.push({ type: "text", text: "\n\n--- THE STUDENT'S ATTEMPT ---" });
  for (const img of request.answerImages) {
    const { mediaType, data } = parseDataUrl(img);
    content.push({ type: "image", image: data, mediaType });
  }

  // streamText does not throw for failures that happen once streaming is under
  // way — `textStream` simply ends early and the error is delivered here. An
  // auth failure otherwise looks exactly like a very short answer.
  let streamError: unknown = null;

  const result = streamText({
    model: anthropic(process.env.MATH_TUTOR_MODEL ?? DEFAULT_MODEL),
    system: buildSystemPrompt(request.examType, request.depth),
    messages: [{ role: "user", content }],
    // Thinking is on by default on Claude 5 models and shares this budget with
    // the visible answer, so a cap sized for the prose alone truncates the
    // reply mid-sentence.
    maxOutputTokens: request.mode === "test" ? 24000 : 16000,
    providerOptions: {
      anthropic: {
        thinking: { type: "adaptive" },
        // A hint needs far less deliberation than marking a full solution, and
        // staying inside the serverless time limit matters more there.
        effort: request.depth === "hint" ? "medium" : "high",
      },
    },
    // Stop generating if the student navigates away or hits Cancel.
    abortSignal: req.signal,
    onError: ({ error }) => {
      streamError = error;
    },
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.textStream) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (error) {
        streamError ??= error;
      }

      if (streamError && !req.signal.aborted) {
        console.error("Feedback stream failed:", streamError);
        controller.enqueue(
          encoder.encode(STREAM_ERROR_MARKER + describeError(streamError)),
        );
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      // Streaming through a proxy that buffers would defeat the point.
      "X-Accel-Buffering": "no",
    },
  });
}
