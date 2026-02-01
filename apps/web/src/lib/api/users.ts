import { apiClient } from "./client";
import type {
  UserRole,
  UserStatus,
  AdminUserListItem,
  UserToImport,
  ImportResponse,
  ResetPasswordResult,
  PaginatedResponse,
} from "./types";

const client = apiClient.getClient();

export const usersApi = {
  async bulkImportUsers(users: UserToImport[]): Promise<ImportResponse> {
    const response = await client.post("/admin/users/bulk-import", { users });
    return response.data;
  },

  async resetUserPassword(userId: number, newPassword?: string): Promise<ResetPasswordResult> {
    const response = await client.post(`/admin/users/${userId}/reset-password`, {
      new_password: newPassword,
    });
    return response.data;
  },

  async listUsers(
    role?: UserRole,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<AdminUserListItem>> {
    const response = await client.get("/admin/users", {
      params: { role, page, page_size: pageSize },
    });
    return response.data;
  },

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
    const response = await client.patch(`/admin/users/${userId}`, data);
    return response.data;
  },

  async deleteUser(userId: number): Promise<{
    id: number;
    username: string;
    message: string;
  }> {
    const response = await client.delete(`/admin/users/${userId}`);
    return response.data;
  },

  async setTeacherClasses(
    teacherId: number,
    classIds: number[]
  ): Promise<{ teacher_id: number; class_names: string[] }> {
    const response = await client.put(`/admin/teachers/${teacherId}/classes`, {
      class_ids: classIds,
    });
    return response.data;
  },

  async setStudentClass(
    studentId: number,
    classId: number
  ): Promise<{ student_id: number; class_id: number; class_name: string }> {
    const response = await client.put(`/admin/students/${studentId}/class`, {
      class_id: classId,
    });
    return response.data;
  },
};
