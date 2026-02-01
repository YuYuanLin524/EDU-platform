import { apiClient } from "./client";
import type {
  ConversationInfo,
  MessageInfo,
  SendMessageResponse,
  PromptInfo,
  EffectivePrompt,
  ExportJobInfo,
  ScopeType,
  PaginatedResponse,
} from "./types";

const client = apiClient.getClient();

export const chatApi = {
  // Conversation endpoints
  async getConversations(
    classId?: number,
    skip = 0,
    limit = 50
  ): Promise<PaginatedResponse<ConversationInfo>> {
    const response = await client.get<PaginatedResponse<ConversationInfo>>("/conversations/", {
      params: { class_id: classId, skip, limit },
    });
    return response.data;
  },

  async createConversation(classId: number, title?: string): Promise<ConversationInfo> {
    const response = await client.post<ConversationInfo>("/conversations/", {
      class_id: classId,
      title,
    });
    return response.data;
  },

  async getConversationMessages(
    conversationId: number
  ): Promise<{ conversation_id: number; messages: MessageInfo[] }> {
    const response = await client.get<{
      conversation_id: number;
      messages: MessageInfo[];
    }>(`/conversations/${conversationId}/messages`);
    return response.data;
  },

  async sendMessage(conversationId: number, content: string): Promise<SendMessageResponse> {
    const response = await client.post<SendMessageResponse>(
      `/conversations/${conversationId}/messages`,
      { content }
    );
    return response.data;
  },

  // Teacher conversation endpoints
  async getStudentConversations(
    classId: number,
    studentId: number,
    skip = 0,
    limit = 50
  ): Promise<PaginatedResponse<ConversationInfo>> {
    const response = await client.get<PaginatedResponse<ConversationInfo>>(
      `/teacher/classes/${classId}/students/${studentId}/conversations`,
      { params: { skip, limit } }
    );
    return response.data;
  },

  async getConversationMessagesForTeacher(
    conversationId: number
  ): Promise<{ conversation_id: number; messages: MessageInfo[] }> {
    const response = await client.get<{
      conversation_id: number;
      messages: MessageInfo[];
    }>(`/teacher/conversations/${conversationId}/messages`);
    return response.data;
  },

  // Prompt endpoints
  async getPrompts(
    scopeType?: ScopeType,
    classId?: number,
    skip = 0,
    limit = 50
  ): Promise<PaginatedResponse<PromptInfo>> {
    const response = await client.get<PaginatedResponse<PromptInfo>>("/prompts/", {
      params: { scope_type: scopeType, class_id: classId, skip, limit },
    });
    return response.data;
  },

  async createPrompt(
    content: string,
    scopeType: ScopeType = "global",
    classId?: number,
    autoActivate = true
  ): Promise<PromptInfo> {
    const response = await client.post<PromptInfo>("/prompts/", {
      content,
      scope_type: scopeType,
      class_id: classId,
      auto_activate: autoActivate,
    });
    return response.data;
  },

  async activatePrompt(promptId: number): Promise<void> {
    await client.post(`/prompts/${promptId}/activate`);
  },

  async getEffectivePrompt(classId: number): Promise<EffectivePrompt> {
    const response = await client.get<EffectivePrompt>(`/prompts/effective/${classId}`);
    return response.data;
  },

  // Export endpoints
  async createExport(
    classId?: number,
    studentId?: number,
    startDate?: string,
    endDate?: string
  ): Promise<ExportJobInfo> {
    const response = await client.post<ExportJobInfo>("/exports/", {
      class_id: classId,
      student_id: studentId,
      start_date: startDate,
      end_date: endDate,
    });
    return response.data;
  },

  async getExports(skip = 0, limit = 50): Promise<PaginatedResponse<ExportJobInfo>> {
    const response = await client.get<PaginatedResponse<ExportJobInfo>>("/exports/", {
      params: { skip, limit },
    });
    return response.data;
  },

  async downloadExport(jobId: number): Promise<Blob> {
    const response = await client.get(`/exports/${jobId}/download`, {
      responseType: "blob",
    });
    return response.data;
  },

  async deleteExport(jobId: number): Promise<{ message: string }> {
    const response = await client.delete<{ message: string }>(`/exports/${jobId}`);
    return response.data;
  },
};
