"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { api, UserRole, UserStatus } from "@/lib/api";
import type {
  UserToImport,
  ImportResponse,
  AdminUserListItem,
  ResetPasswordResult,
  ClassInfo,
} from "../types";

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

export function useUserManagement() {
  const queryClient = useQueryClient();

  // Import state
  const [importMethod, setImportMethod] = useState<"form" | "json">("form");
  const [jsonInput, setJsonInput] = useState("");
  const [formUsers, setFormUsers] = useState<UserToImport[]>([
    { username: "", display_name: "", role: "student", class_name: "" },
  ]);
  const [importResults, setImportResults] = useState<ImportResponse | null>(null);

  // Filter state
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Edit state
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editStatus, setEditStatus] = useState<UserStatus>("active");

  // Reset password state
  const [resettingUserId, setResettingUserId] = useState<number | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState("");
  const [resetResult, setResetResult] = useState<ResetPasswordResult | null>(null);

  // Manage class state
  const [managingTeacherId, setManagingTeacherId] = useState<number | null>(null);
  const [teacherClassIds, setTeacherClassIds] = useState<number[]>([]);
  const [managingStudentId, setManagingStudentId] = useState<number | null>(null);
  const [studentClassId, setStudentClassId] = useState<number | null>(null);

  // Fetch classes for dropdown
  const { data: classesData } = useQuery({
    queryKey: ["classes", "admin"],
    queryFn: () => api.getClasses(0, 100),
  });

  const classes = (classesData?.items || []) as ClassInfo[];

  // Fetch users
  const usersQuery = useQuery({
    queryKey: ["adminUsers", roleFilter, page, pageSize],
    queryFn: () => api.listUsers(roleFilter === "all" ? undefined : roleFilter, page, pageSize),
  });

  // Mutations
  const importMutation = useMutation({
    mutationFn: (users: UserToImport[]) => api.bulkImportUsers(users) as Promise<ImportResponse>,
    onSuccess: (data) => {
      setImportResults(data);
      setFormUsers([{ username: "", display_name: "", role: "student", class_name: "" }]);
      setJsonInput("");
    },
    onError: (error) => {
      alert("导入失败: " + (error as Error).message);
    },
  });

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
      setEditingUserId(null);
    },
    onError: (error) => {
      alert("更新失败: " + (error as Error).message);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (params: { userId: number; newPassword?: string }) =>
      api.resetUserPassword(params.userId, params.newPassword),
    onSuccess: (data) => {
      setResetResult(data);
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
    onError: (error) => {
      alert("重置密码失败: " + (error as Error).message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => api.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      alert("删除成功");
    },
    onError: (error) => {
      alert("删除失败: " + getErrorMessage(error));
    },
  });

  const setTeacherClassesMutation = useMutation({
    mutationFn: (params: { teacherId: number; classIds: number[] }) =>
      api.setTeacherClasses(params.teacherId, params.classIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      setManagingTeacherId(null);
      setTeacherClassIds([]);
    },
    onError: (error) => {
      alert("更新教师班级失败: " + getErrorMessage(error));
    },
  });

  const setStudentClassMutation = useMutation({
    mutationFn: (params: { studentId: number; classId: number }) =>
      api.setStudentClass(params.studentId, params.classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setManagingStudentId(null);
      setStudentClassId(null);
    },
    onError: (error) => {
      alert("调整班级失败: " + getErrorMessage(error));
    },
  });

  // Form handlers
  const handleAddFormUser = () => {
    setFormUsers([
      ...formUsers,
      { username: "", display_name: "", role: "student", class_name: "" },
    ]);
  };

  const handleRemoveFormUser = (index: number) => {
    setFormUsers(formUsers.filter((_, i) => i !== index));
  };

  const handleFormUserChange = (index: number, field: keyof UserToImport, value: string) => {
    const updated = [...formUsers];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "role" && value === "teacher") {
      updated[index].class_name = "";
    }
    setFormUsers(updated);
  };

  const handleFormSubmit = () => {
    const validUsers = formUsers.filter((u) => u.username.trim());
    if (validUsers.length === 0) {
      alert("请至少添加一个有效用户");
      return;
    }

    if (classes.length === 0 && validUsers.some((u) => u.role === "student")) {
      alert("尚未创建班级，无法创建学生账户。请先创建班级。");
      return;
    }

    const studentsWithoutClass = validUsers.filter(
      (u) => u.role === "student" && !String(u.class_name || "").trim()
    );
    if (studentsWithoutClass.length > 0) {
      alert("学生账户必须选择班级后才能创建");
      return;
    }

    const usersToImport = validUsers.map((u) => ({
      ...u,
      class_name: String(u.class_name || "").trim() || undefined,
    }));

    importMutation.mutate(usersToImport);
  };

  const handleJsonSubmit = () => {
    try {
      const users = JSON.parse(jsonInput);
      if (!Array.isArray(users)) {
        alert("JSON格式错误：需要一个数组");
        return;
      }
      const normalizedUsers: UserToImport[] = users
        .filter((u: unknown) => typeof u === "object" && u !== null)
        .map((u: unknown) => {
          const obj = u as Record<string, unknown>;
          return {
            username: String(obj.username || "").trim(),
            display_name: typeof obj.display_name === "string" ? obj.display_name : undefined,
            role: obj.role as UserRole,
            class_name: typeof obj.class_name === "string" ? obj.class_name.trim() : undefined,
          };
        })
        .filter((u) => u.username);

      if (normalizedUsers.length === 0) {
        alert("请至少提供一个有效用户");
        return;
      }

      const invalidRole = normalizedUsers.find((u) => u.role !== "student" && u.role !== "teacher");
      if (invalidRole) {
        alert("JSON 中存在无效角色（仅支持 student/teacher）");
        return;
      }

      if (classes.length === 0 && normalizedUsers.some((u) => u.role === "student")) {
        alert("尚未创建班级，无法导入学生账户。请先创建班级。");
        return;
      }

      const missingClass = normalizedUsers.filter((u) => u.role === "student" && !u.class_name);
      if (missingClass.length > 0) {
        alert("JSON 导入：学生账户必须提供 class_name");
        return;
      }

      importMutation.mutate(normalizedUsers);
    } catch {
      alert("JSON解析失败，请检查格式");
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      { username: "20240001", display_name: "张三", role: "student", class_name: "初一(1)班" },
      { username: "20240002", display_name: "李四", role: "student", class_name: "初一(1)班" },
      { username: "T20240001", display_name: "王老师", role: "teacher" },
    ];
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users_template.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadResults = () => {
    if (!importResults) return;
    const successContent = importResults.users
      .map(
        (r) =>
          `${r.username},${r.display_name || ""},${r.initial_password},${r.class_name || ""},成功`
      )
      .join("\n");
    const errorContent = importResults.errors.map((err) => `,,,,${err}`).join("\n");
    const content = [successContent, errorContent].filter(Boolean).join("\n");
    const blob = new Blob([`学号/工号,姓名,初始密码,班级,状态\n${content}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import_results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // User editing
  const startEditUser = (user: AdminUserListItem) => {
    setEditingUserId(user.id);
    setEditUsername(user.username);
    setEditDisplayName(user.display_name ?? "");
    setEditStatus(user.status === "disabled" ? "disabled" : "active");
    setResettingUserId(null);
    setResetResult(null);
    setResetPasswordInput("");
  };

  const cancelEditUser = () => {
    setEditingUserId(null);
    setEditUsername("");
    setEditDisplayName("");
    setEditStatus("active");
  };

  const openResetPassword = (userId: number) => {
    setResettingUserId(userId);
    setResetPasswordInput("");
    setResetResult(null);
    setEditingUserId(null);
  };

  const closeResetPassword = () => {
    setResettingUserId(null);
    setResetResult(null);
    setResetPasswordInput("");
  };

  const openTeacherClasses = (user: AdminUserListItem) => {
    if (user.role !== "teacher") return;
    const selectedIds = classes
      .filter((c) => (user.class_names || []).includes(c.name))
      .map((c) => c.id);
    setTeacherClassIds(selectedIds);
    setManagingTeacherId(user.id);
    setManagingStudentId(null);
    setStudentClassId(null);
    setEditingUserId(null);
    setResettingUserId(null);
    setResetResult(null);
  };

  const openStudentClass = (user: AdminUserListItem) => {
    if (user.role !== "student") return;
    if (classes.length === 0) {
      alert("当前暂无班级，请先创建班级后再调整学生班级。");
      return;
    }
    const currentClassName = user.class_names?.[0];
    const currentClass = classes.find((c) => c.name === currentClassName);
    setStudentClassId(currentClass ? currentClass.id : null);
    setManagingStudentId(user.id);
    setManagingTeacherId(null);
    setTeacherClassIds([]);
    setEditingUserId(null);
    setResettingUserId(null);
    setResetResult(null);
  };

  const toggleTeacherClass = (classId: number) => {
    setTeacherClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

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
    } catch {
      alert("复制失败，请手动复制");
    }
  };

  // Computed values
  const users = (usersQuery.data?.items ?? []) as AdminUserListItem[];
  const totalUsers = usersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));
  const normalizedSearch = searchText.trim().toLowerCase();
  const filteredUsers = normalizedSearch
    ? users.filter((u) => {
        const displayName = (u.display_name ?? "").toLowerCase();
        const username = u.username.toLowerCase();
        return username.includes(normalizedSearch) || displayName.includes(normalizedSearch);
      })
    : users;

  const hasStudents = formUsers.some((u) => u.role === "student");
  const showNoClassWarning = hasStudents && classes.length === 0;
  const formValidUsers = formUsers.filter((u) => u.username.trim());
  const formHasStudentWithoutClass = formValidUsers.some(
    (u) => u.role === "student" && !String(u.class_name || "").trim()
  );
  const formCannotCreateStudentsNoClass =
    classes.length === 0 && formValidUsers.some((u) => u.role === "student");

  return {
    // State
    importMethod,
    setImportMethod,
    jsonInput,
    setJsonInput,
    formUsers,
    importResults,
    setImportResults,
    roleFilter,
    setRoleFilter,
    searchText,
    setSearchText,
    page,
    setPage,
    pageSize,
    setPageSize,
    editingUserId,
    editUsername,
    setEditUsername,
    editDisplayName,
    setEditDisplayName,
    editStatus,
    setEditStatus,
    resettingUserId,
    resetPasswordInput,
    setResetPasswordInput,
    resetResult,
    setResetResult,
    managingTeacherId,
    setManagingTeacherId,
    teacherClassIds,
    setTeacherClassIds,
    managingStudentId,
    setManagingStudentId,
    studentClassId,
    setStudentClassId,

    // Data
    classes,
    usersQuery,
    filteredUsers,
    totalUsers,
    totalPages,

    // Computed
    showNoClassWarning,
    formValidUsers,
    formHasStudentWithoutClass,
    formCannotCreateStudentsNoClass,

    // Mutations
    importMutation,
    updateUserMutation,
    resetPasswordMutation,
    deleteUserMutation,
    setTeacherClassesMutation,
    setStudentClassMutation,

    // Handlers
    handleAddFormUser,
    handleRemoveFormUser,
    handleFormUserChange,
    handleFormSubmit,
    handleJsonSubmit,
    handleDownloadTemplate,
    handleDownloadResults,
    startEditUser,
    cancelEditUser,
    openResetPassword,
    closeResetPassword,
    openTeacherClasses,
    openStudentClass,
    toggleTeacherClass,
    handleDeleteUser,
    copyToClipboard,

    // Query client
    queryClient,
  };
}
