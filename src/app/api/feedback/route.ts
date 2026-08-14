import { gateway } from "@ai-sdk/gateway";
import { streamText } from "ai";
import { z } from "zod";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts";

export const maxDuration = 60;

const feedbackSchema = z.object({
  mode: z.enum(["single", "test"]),
  examType: z.enum(["SMC", "STEP", "BMO", "AIME", "Olympiad", "Other"]),
  questionImages: z.array(z.string()).min(1, "At least one question image is required"),
  answerImages: z.array(z.string()).min(1, "At least one answer image is required"),
  notes: z.string().optional(),
  questionLabel: z.string().optional(),
});

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image data URL");
  }
  return { mediaType: match[1], data: match[2] };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    const request = parsed.data;
    const userText = buildUserPrompt(request);

    const content: Array<
      | { type: "text"; text: string }
      | { type: "image"; image: string; mediaType?: string }
    > = [{ type: "text", text: userText }];

    content.push({ type: "text", text: "\n\n--- Question image(s) ---" });
    for (const img of request.questionImages) {
      const { mediaType, data } = parseDataUrl(img);
      content.push({ type: "image", image: data, mediaType });
    }

    content.push({ type: "text", text: "\n\n--- Student answer image(s) ---" });
    for (const img of request.answerImages) {
      const { mediaType, data } = parseDataUrl(img);
      content.push({ type: "image", image: data, mediaType });
    }

    const result = streamText({
      model: gateway("openai/gpt-4o"),
      system: buildSystemPrompt(request.examType),
      messages: [{ role: "user", content }],
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Feedback error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate feedback. Check your API key is configured.",
      },
      { status: 500 },
    );
  }
}
