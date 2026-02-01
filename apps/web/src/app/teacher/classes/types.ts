// Shared types for teacher/classes views

export type ViewState =
  | { type: "classes" }
  | { type: "students"; classId: number; className: string }
  | { type: "conversations"; classId: number; studentId: number; studentName: string }
  | { type: "messages"; conversationId: number; conversationTitle: string };
