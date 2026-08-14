import type { FeedbackRequest } from "./types";

const EXAM_CONTEXT: Record<string, string> = {
  SMC: "Senior Mathematical Challenge (UKMT) — multiple choice and proof-style questions for ages 16–18.",
  STEP: "Sixth Term Examination Paper — Cambridge entrance exam with rigorous proof-based questions.",
  BMO: "British Mathematical Olympiad — olympiad-level proof problems requiring deep insight.",
  AIME: "American Invitational Mathematics Examination — integer answers, clever algebraic and combinatorial problems.",
  Olympiad: "General mathematical olympiad — full written proofs expected with clear logical structure.",
  Other: "General advanced mathematics competition or problem set.",
};

export function buildSystemPrompt(examType: string): string {
  return `You are an expert mathematics tutor specialising in competition mathematics (UKMT, STEP, BMO, olympiads, etc.).

Exam context: ${EXAM_CONTEXT[examType] ?? EXAM_CONTEXT.Other}

Your role is to review a student's work on mathematics problems and give constructive, encouraging feedback.

Guidelines:
- Read the question image(s) carefully and identify what is being asked.
- Read the student's answer image(s) and assess their approach, working, and final answer.
- Use proper mathematical notation in LaTeX where helpful (inline with $...$ or display with $$...$$).
- Be specific: reference steps they got right, pinpoint errors, and explain why something is wrong.
- For competition maths, comment on elegance, alternative approaches, and exam technique where relevant.
- If the answer is correct, celebrate it and suggest extensions or harder variations.
- If partially correct, acknowledge progress and guide toward the full solution without giving away everything immediately unless they seem stuck.
- Structure your response clearly with headings.
- Be warm and supportive — this student is working hard on challenging problems.`;
}

export function buildUserPrompt(request: FeedbackRequest): string {
  const parts: string[] = [];

  if (request.mode === "single") {
    parts.push("The student is submitting a single question with their answer.");
    if (request.questionLabel) {
      parts.push(`Question reference: ${request.questionLabel}`);
    }
  } else {
    parts.push(
      "The student is submitting a full test or multiple questions with their answers.",
    );
    parts.push(
      "Review each question you can identify. If images contain multiple problems, address them in order.",
    );
  }

  parts.push(`Exam type: ${request.examType}`);

  if (request.notes?.trim()) {
    parts.push(`Student notes: ${request.notes.trim()}`);
  }

  parts.push(
    "Please analyse the question image(s) and answer image(s) provided, then give detailed feedback.",
  );

  parts.push(`Structure your response as:

## Summary
Brief overall assessment (1–2 sentences).

## Question Analysis
What the question is asking and key techniques needed.

## Your Work
Step-by-step review of the student's approach — what they did well and where they went wrong.

## Correct Solution
The full correct solution with clear reasoning.

## Tips & Next Steps
Specific advice for improvement and similar problems to try.`);

  return parts.join("\n\n");
}
