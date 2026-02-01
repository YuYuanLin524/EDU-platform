import { apiClient } from "./client";
import type { ClassInfo, ClassDetail, StudentInClass, PaginatedResponse } from "./types";

const client = apiClient.getClient();

export const classesApi = {
  async getClasses(skip = 0, limit = 50): Promise<PaginatedResponse<ClassInfo>> {
    const response = await client.get<PaginatedResponse<ClassInfo>>("/classes/", {
      params: { skip, limit },
    });
    return response.data;
  },

  async getClass(classId: number): Promise<ClassDetail> {
    const response = await client.get<ClassDetail>(`/classes/${classId}`);
    return response.data;
  },

  async createClass(name: string, grade?: string): Promise<ClassInfo> {
    const response = await client.post<ClassInfo>("/classes/", {
      name,
      grade,
    });
    return response.data;
  },

  async addStudentsToClass(classId: number, studentIds: number[]): Promise<void> {
    await client.post(`/classes/${classId}/students`, {
      student_ids: studentIds,
    });
  },

  async addTeachersToClass(classId: number, teacherIds: number[]): Promise<void> {
    await client.post(`/classes/${classId}/teachers`, {
      teacher_ids: teacherIds,
    });
  },

  async removeStudentFromClass(classId: number, studentId: number): Promise<void> {
    await client.delete(`/classes/${classId}/students/${studentId}`);
  },

  async removeTeacherFromClass(classId: number, teacherId: number): Promise<void> {
    await client.delete(`/classes/${classId}/teachers/${teacherId}`);
  },

  // Teacher-specific class endpoints
  async getClassStudents(classId: number): Promise<StudentInClass[]> {
    const response = await client.get<StudentInClass[]>(`/teacher/classes/${classId}/students`);
    return response.data;
  },
};
