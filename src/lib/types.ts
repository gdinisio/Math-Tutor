export type SubmissionMode = "single" | "test";

export type ExamType = "SMC" | "BMO" | "STEP" | "TMUA" | "Other";

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
