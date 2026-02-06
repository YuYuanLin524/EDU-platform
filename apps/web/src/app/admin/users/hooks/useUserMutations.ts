"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { UserStatus } from "../types";

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

interface UseUserMutationsReturn {
  updateUserMutation: ReturnType<typeof useMutation>;
  resetPasswordMutation: ReturnType<typeof useMutation>;
  deleteUserMutation: ReturnType<typeof useMutation>;
  setTeacherClassesMutation: ReturnType<typeof useMutation>;
  setStudentClassMutation: ReturnType<typeof useMutation>;
  handleDeleteUser: (userId: number, username: string) => void;
  copyToClipboard: (text: string) => Promise<void>;
}

export function useUserMutations(
  onSuccess?: () => void
): UseUserMutationsReturn {
  const queryClient = useQueryClient();

  const updateUserMutation = useMutation({
    mutationFn: (params: {
      userId: number;
      username: string;
      display_name: string;
      status: UserStatus;
    }) =>
      api.updateUser(params.userId, {
        username: params.username,
        display_name: params.display_name,
        status: params.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("更新失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (params: { userId: number; newPassword?: string }) =>
      api.resetUserPassword(params.userId, params.newPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
    onError: (error) => {
      toast.error("重置密码失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => api.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("删除成功");
    },
    onError: (error) => {
      toast.error("删除失败", {
        description: getErrorMessage(error),
      });
    },
  });

  const setTeacherClassesMutation = useMutation({
    mutationFn: (params: { teacherId: number; classIds: number[] }) =>
      api.setTeacherClasses(params.teacherId, params.classIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("更新教师班级失败", {
        description: getErrorMessage(error),
      });
    },
  });

  const setStudentClassMutation = useMutation({
    mutationFn: (params: { studentId: number; classId: number }) =>
      api.setStudentClass(params.studentId, params.classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("调整班级失败", {
        description: getErrorMessage(error),
      });
    },
  });

  const handleDeleteUser = (userId: number, username: string) => {
    if (
      confirm(
        `确定要删除用户 "${username}" 吗？\n\n此操作不可撤销，将同时删除该用户的所有班级关联。`
      )
    ) {
      deleteUserMutation.mutate(userId);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败，请手动复制");
    }
  };

  return {
    updateUserMutation,
    resetPasswordMutation,
    deleteUserMutation,
    setTeacherClassesMutation,
    setStudentClassMutation,
    handleDeleteUser,
    copyToClipboard,
  };
}
