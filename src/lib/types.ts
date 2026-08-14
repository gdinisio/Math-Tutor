export type SubmissionMode = "single" | "test";

export type ExamType =
  | "SMC"
  | "STEP"
  | "BMO"
  | "AIME"
  | "Olympiad"
  | "Other";

export interface FeedbackRequest {
  mode: SubmissionMode;
  examType: ExamType;
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
