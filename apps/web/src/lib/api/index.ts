// Re-export all types
export * from "./types";

// Re-export client utilities
export { apiClient } from "./client";

// Import individual API modules
import { apiClient } from "./client";
import { authApi } from "./auth";
import { usersApi } from "./users";
import { classesApi } from "./classes";
import { chatApi } from "./chat";

// Unified API object for backward compatibility
// This maintains the same interface as the original api.ts
export const api = {
  // Token management (delegated to apiClient)
  setToken: (token: string) => apiClient.setToken(token),
  clearToken: () => apiClient.clearToken(),
  loadToken: () => apiClient.loadToken(),

  // Auth endpoints
  login: authApi.login,
  changePassword: authApi.changePassword,
  getCurrentUser: authApi.getCurrentUser,

  // Class endpoints
  getClasses: classesApi.getClasses,
  getClass: classesApi.getClass,
  createClass: classesApi.createClass,
  addStudentsToClass: classesApi.addStudentsToClass,
  addTeachersToClass: classesApi.addTeachersToClass,
  removeStudentFromClass: classesApi.removeStudentFromClass,
  removeTeacherFromClass: classesApi.removeTeacherFromClass,
  getClassStudents: classesApi.getClassStudents,

  // Conversation endpoints
  getConversations: chatApi.getConversations,
  createConversation: chatApi.createConversation,
  getConversationMessages: chatApi.getConversationMessages,
  sendMessage: chatApi.sendMessage,
  getStudentConversations: chatApi.getStudentConversations,
  getConversationMessagesForTeacher: chatApi.getConversationMessagesForTeacher,

  // Prompt endpoints
  getPrompts: chatApi.getPrompts,
  createPrompt: chatApi.createPrompt,
  activatePrompt: chatApi.activatePrompt,
  getEffectivePrompt: chatApi.getEffectivePrompt,

  // Export endpoints
  createExport: chatApi.createExport,
  getExports: chatApi.getExports,
  downloadExport: chatApi.downloadExport,
  deleteExport: chatApi.deleteExport,

  // Admin/User endpoints
  bulkImportUsers: usersApi.bulkImportUsers,
  resetUserPassword: usersApi.resetUserPassword,
  listUsers: usersApi.listUsers,
  updateUser: usersApi.updateUser,
  deleteUser: usersApi.deleteUser,
  setTeacherClasses: usersApi.setTeacherClasses,
  setStudentClass: usersApi.setStudentClass,
};

// Also export individual API modules for direct usage
export { authApi, usersApi, classesApi, chatApi };
