export type SubmissionMode = "single" | "test";

export type ExamType =
  | "SMC"
  | "BMO"
  | "STEP"
  | "MAT"
  | "TMUA"
  | "AIME"
  | "Olympiad"
  | "Other";

/**
 * How much of the solution the tutor is allowed to reveal.
 * "hint" keeps the problem solvable by the student; "full" works it through.
 */
export type FeedbackDepth = "hint" | "full";

export interface FeedbackRequest {
  mode: SubmissionMode;
  examType: ExamType;
  depth: FeedbackDepth;
  questionImages: string[];
  answerImages: string[];
  notes?: string;
  questionLabel?: string;
}

export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
}
