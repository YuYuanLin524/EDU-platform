/**
 * Query key factory for TanStack Query
 * Centralizes query keys for better cache management and consistency
 */

export const queryKeys = {
  // Classes
  classes: {
    all: ["classes"] as const,
    admin: () => [...queryKeys.classes.all, "admin"] as const,
    byRole: (role?: string, userId?: number) => [...queryKeys.classes.all, role, userId] as const,
    detail: (classId: number) => ["class-detail", classId] as const,
    students: (classId: number) => ["class-students", classId] as const,
  },

  // Users (admin)
  users: {
    all: ["adminUsers"] as const,
    list: (filters: { role?: string; page: number; pageSize: number }) =>
      [...queryKeys.users.all, filters.role, filters.page, filters.pageSize] as const,
  },

  // Conversations
  conversations: {
    all: ["conversations"] as const,
    byClass: (classId?: number) => [...queryKeys.conversations.all, classId] as const,
    byStudent: (classId: number, studentId: number) =>
      [...queryKeys.conversations.all, classId, studentId] as const,
  },

  // Messages
  messages: {
    byConversation: (conversationId?: number) => ["messages", conversationId] as const,
  },

  // Prompts
  prompts: {
    all: ["prompts"] as const,
    byClass: (classId?: number) => [...queryKeys.prompts.all, classId] as const,
  },

  // Exports
  exports: {
    all: ["exports"] as const,
  },
} as const;
