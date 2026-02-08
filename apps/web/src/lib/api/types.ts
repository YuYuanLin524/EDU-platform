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

export interface CurrentUserResponse {
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
  first_user_message_preview: string | null;
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

// Admin user list item
export interface AdminUserListItem {
  id: number;
  username: string;
  display_name: string | null;
  role: UserRole;
  status: string;
  must_change_password: boolean;
  created_at: string;
  last_login_at: string | null;
  class_names: string[];
}

// Bulk import types
export interface UserToImport {
  username: string;
  password?: string;
  display_name?: string;
  role: UserRole;
  class_name?: string;
}

export interface ImportedUser {
  username: string;
  display_name?: string;
  role: UserRole;
  initial_password: string;
  class_name?: string;
}

export interface ImportResponse {
  created_count: number;
  users: ImportedUser[];
  errors: string[];
}

export interface ResetPasswordResult {
  user_id: number;
  username: string;
  new_password: string;
}

// LLM Configuration types
export interface LLMConfigResponse {
  provider_name: string;
  base_url: string;
  api_key_masked: string;
  model_name: string;
  has_api_key: boolean;
}

export interface LLMConfigUpdateRequest {
  provider_name?: string;
  base_url?: string;
  api_key?: string;
  model_name?: string;
}

export interface LLMConfigUpdateResponse {
  success: boolean;
  message: string;
  config: LLMConfigResponse;
}

export interface LLMTestRequest {
  provider_name?: string;
  base_url?: string;
  api_key?: string;
  model_name?: string;
}

export interface LLMTestResponse {
  success: boolean;
  message: string;
  latency_ms?: number;
  model?: string;
}
