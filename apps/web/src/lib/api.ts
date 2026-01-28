import axios, { AxiosError, AxiosInstance } from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// Types matching backend schemas
export type UserRole = "admin" | "teacher" | "student";
export type UserStatus = "active" | "disabled";
export type MessageRole = "user" | "assistant" | "system";
export type ScopeType = "global" | "class";
export type ExportStatus = "pending" | "processing" | "completed" | "failed";

export interface UserInfo {
  id: number;
  username: string;
  display_name: string | null;
  role: UserRole;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  must_change_password: boolean;
  user: UserInfo;
}

export interface ConversationInfo {
  id: number;
  class_id: number;
  class_name: string | null;
  student_id: number;
  student_name: string | null;
  title: string | null;
  prompt_version: number | null;
  model_provider: string | null;
  model_name: string | null;
  created_at: string;
  last_message_at: string | null;
  message_count: number;
}

export interface MessageInfo {
  id: number;
  role: MessageRole;
  content: string;
  created_at: string;
  token_in: number | null;
  token_out: number | null;
}

export interface ClassInfo {
  id: number;
  name: string;
  grade: string | null;
  student_count: number;
  teacher_count: number;
  created_at: string;
}

export interface StudentInClass {
  id: number;
  username: string;
  display_name: string | null;
  last_login_at: string | null;
}

export interface ClassDetail {
  id: number;
  name: string;
  grade: string | null;
  students: StudentInClass[];
  teachers: { id: number; username: string; display_name: string | null }[];
  created_at: string;
}

export interface PromptInfo {
  id: number;
  scope_type: ScopeType;
  class_id: number | null;
  class_name: string | null;
  content: string;
  version: number;
  is_active: boolean;
  created_by: number;
  creator_name: string | null;
  created_at: string;
}

export interface EffectivePrompt {
  global_prompt: PromptInfo | null;
  class_prompt: PromptInfo | null;
  merged_content: string;
  version: number;
}

export interface ExportJobInfo {
  id: number;
  requested_by: number;
  scope: Record<string, unknown>;
  status: ExportStatus;
  file_key: string | null;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface SendMessageResponse {
  user_message: MessageInfo;
  assistant_message: MessageInfo;
  policy_flags: Record<string, unknown> | null;
}

export interface PaginatedResponse<T> {
  total: number;
  items: T[];
}

// API Error type
export interface ApiError {
  detail: string;
}

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add auth token to requests
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Handle 401 errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
          this.clearToken();
          if (typeof window !== "undefined") {
            const pathname = window.location.pathname;
            const isPublicRoute = pathname === "/" || pathname === "/login";
            if (!isPublicRoute) {
              window.location.href = "/login";
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }

  loadToken() {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        this.token = token;
      }
    }
  }

  // Auth endpoints
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>(
      "/auth/login",
      { username, password }
    );
    return response.data;
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await this.client.post("/auth/change-password", {
      old_password: oldPassword,
      new_password: newPassword,
    });
  }

  async getCurrentUser(): Promise<UserInfo> {
    const response = await this.client.get<UserInfo>("/auth/me");
    return response.data;
  }

  // Class endpoints
  async getClasses(
    skip = 0,
    limit = 50
  ): Promise<PaginatedResponse<ClassInfo>> {
    const response = await this.client.get<PaginatedResponse<ClassInfo>>(
      "/classes/",
      { params: { skip, limit } }
    );
    return response.data;
  }

  async getClass(classId: number): Promise<ClassDetail> {
    const response = await this.client.get<ClassDetail>(`/classes/${classId}`);
    return response.data;
  }

  async createClass(name: string, grade?: string): Promise<ClassInfo> {
    const response = await this.client.post<ClassInfo>("/classes/", {
      name,
      grade,
    });
    return response.data;
  }

  async addStudentsToClass(classId: number, studentIds: number[]): Promise<void> {
    await this.client.post(`/classes/${classId}/students`, {
      student_ids: studentIds,
    });
  }

  async addTeachersToClass(classId: number, teacherIds: number[]): Promise<void> {
    await this.client.post(`/classes/${classId}/teachers`, {
      teacher_ids: teacherIds,
    });
  }

  async removeStudentFromClass(classId: number, studentId: number): Promise<void> {
    await this.client.delete(`/classes/${classId}/students/${studentId}`);
  }

  async removeTeacherFromClass(classId: number, teacherId: number): Promise<void> {
    await this.client.delete(`/classes/${classId}/teachers/${teacherId}`);
  }

  // Conversation endpoints
  async getConversations(
    classId?: number,
    skip = 0,
    limit = 50
  ): Promise<PaginatedResponse<ConversationInfo>> {
    const response = await this.client.get<PaginatedResponse<ConversationInfo>>(
      "/conversations/",
      { params: { class_id: classId, skip, limit } }
    );
    return response.data;
  }

  async createConversation(
    classId: number,
    title?: string
  ): Promise<ConversationInfo> {
    const response = await this.client.post<ConversationInfo>(
      "/conversations/",
      { class_id: classId, title }
    );
    return response.data;
  }

  async getConversationMessages(
    conversationId: number
  ): Promise<{ conversation_id: number; messages: MessageInfo[] }> {
    const response = await this.client.get<{
      conversation_id: number;
      messages: MessageInfo[];
    }>(`/conversations/${conversationId}/messages`);
    return response.data;
  }

  async sendMessage(
    conversationId: number,
    content: string
  ): Promise<SendMessageResponse> {
    const response = await this.client.post<SendMessageResponse>(
      `/conversations/${conversationId}/messages`,
      { content }
    );
    return response.data;
  }

  // Teacher endpoints
  async getClassStudents(classId: number): Promise<StudentInClass[]> {
    const response = await this.client.get<StudentInClass[]>(
      `/teacher/classes/${classId}/students`
    );
    return response.data;
  }

  async getStudentConversations(
    classId: number,
    studentId: number,
    skip = 0,
    limit = 50
  ): Promise<PaginatedResponse<ConversationInfo>> {
    const response = await this.client.get<PaginatedResponse<ConversationInfo>>(
      `/teacher/classes/${classId}/students/${studentId}/conversations`,
      { params: { skip, limit } }
    );
    return response.data;
  }

  async getConversationMessagesForTeacher(
    conversationId: number
  ): Promise<{ conversation_id: number; messages: MessageInfo[] }> {
    const response = await this.client.get<{
      conversation_id: number;
      messages: MessageInfo[];
    }>(`/teacher/conversations/${conversationId}/messages`);
    return response.data;
  }

  // Prompt endpoints
  async getPrompts(
    scopeType?: ScopeType,
    classId?: number,
    skip = 0,
    limit = 50
  ): Promise<PaginatedResponse<PromptInfo>> {
    const response = await this.client.get<PaginatedResponse<PromptInfo>>(
      "/prompts/",
      { params: { scope_type: scopeType, class_id: classId, skip, limit } }
    );
    return response.data;
  }

  async createPrompt(
    content: string,
    scopeType: ScopeType = "global",
    classId?: number,
    autoActivate = true
  ): Promise<PromptInfo> {
    const response = await this.client.post<PromptInfo>("/prompts/", {
      content,
      scope_type: scopeType,
      class_id: classId,
      auto_activate: autoActivate,
    });
    return response.data;
  }

  async activatePrompt(promptId: number): Promise<void> {
    await this.client.post(`/prompts/${promptId}/activate`);
  }

  async getEffectivePrompt(classId: number): Promise<EffectivePrompt> {
    const response = await this.client.get<EffectivePrompt>(
      `/prompts/effective/${classId}`
    );
    return response.data;
  }

  // Export endpoints
  async createExport(
    classId?: number,
    studentId?: number,
    startDate?: string,
    endDate?: string
  ): Promise<ExportJobInfo> {
    const response = await this.client.post<ExportJobInfo>("/exports/", {
      class_id: classId,
      student_id: studentId,
      start_date: startDate,
      end_date: endDate,
    });
    return response.data;
  }

  async getExports(
    skip = 0,
    limit = 50
  ): Promise<PaginatedResponse<ExportJobInfo>> {
    const response = await this.client.get<PaginatedResponse<ExportJobInfo>>(
      "/exports/",
      { params: { skip, limit } }
    );
    return response.data;
  }

  async downloadExport(jobId: number): Promise<Blob> {
    const response = await this.client.get(`/exports/${jobId}/download`, {
      responseType: "blob",
    });
    return response.data;
  }

  // Admin endpoints
  async bulkImportUsers(
    users: Array<{
      username: string;
      password?: string;
      display_name?: string;
      role: UserRole;
      class_name?: string;
    }>
  ): Promise<{
    created_count: number;
    users: Array<{
      username: string;
      display_name?: string;
      role: UserRole;
      initial_password: string;
      class_name?: string;
    }>;
    errors: string[];
  }> {
    const response = await this.client.post("/admin/users/bulk-import", { users });
    return response.data;
  }

  async resetUserPassword(
    userId: number,
    newPassword?: string
  ): Promise<{ user_id: number; username: string; new_password: string }> {
    const response = await this.client.post(`/admin/users/${userId}/reset-password`, {
      new_password: newPassword,
    });
    return response.data;
  }

  async listUsers(
    role?: UserRole,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    total: number;
    items: Array<{
      id: number;
      username: string;
      display_name: string | null;
      role: UserRole;
      status: string;
      must_change_password: boolean;
      created_at: string;
      last_login_at: string | null;
      class_names: string[];
    }>;
  }> {
    const response = await this.client.get("/admin/users", {
      params: { role, page, page_size: pageSize },
    });
    return response.data;
  }

  async updateUser(
    userId: number,
    data: {
      username?: string;
      display_name?: string;
      status?: UserStatus;
    }
  ): Promise<{
    id: number;
    username: string;
    display_name: string | null;
    role: UserRole;
    status: string;
    message: string;
  }> {
    const response = await this.client.patch(`/admin/users/${userId}`, data);
    return response.data;
  }

  async deleteUser(userId: number): Promise<{
    id: number;
    username: string;
    message: string;
  }> {
    const response = await this.client.delete(`/admin/users/${userId}`);
    return response.data;
  }

  async setTeacherClasses(
    teacherId: number,
    classIds: number[]
  ): Promise<{ teacher_id: number; class_names: string[] }> {
    const response = await this.client.put(`/admin/teachers/${teacherId}/classes`, {
      class_ids: classIds,
    });
    return response.data;
  }

  async setStudentClass(
    studentId: number,
    classId: number
  ): Promise<{ student_id: number; class_id: number; class_name: string }> {
    const response = await this.client.put(`/admin/students/${studentId}/class`, {
      class_id: classId,
    });
    return response.data;
  }
}

export const api = new ApiClient();
