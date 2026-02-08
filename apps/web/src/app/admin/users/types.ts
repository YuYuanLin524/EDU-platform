import type { UserRole, UserStatus, ResetPasswordResult } from "@/lib/api";

// Re-export types that are used from lib/api
export type {
  UserRole,
  UserStatus,
  UserToImport,
  ImportResponse,
  AdminUserListItem,
  ClassInfo,
  ResetPasswordResult,
} from "@/lib/api";

// Local types specific to admin/users page

// Filter state
export interface UserFiltersState {
  roleFilter: UserRole | "all";
  searchText: string;
  page: number;
  pageSize: number;
}

// Edit user state
export interface EditUserState {
  editingUserId: number | null;
  editUsername: string;
  editDisplayName: string;
  editStatus: UserStatus;
}

// Reset password state
export interface ResetPasswordState {
  resettingUserId: number | null;
  resetPasswordInput: string;
  resetResult: ResetPasswordResult | null;
}

// Manage class state
export interface ManageClassState {
  managingTeacherId: number | null;
  teacherClassIds: number[];
  managingStudentId: number | null;
  studentClassId: number | null;
}
