"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { api, UserRole, UserStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import {
  Upload,
  UserPlus,
  Download,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  Pencil,
  Trash2,
  Users,
  X,
} from "lucide-react";

interface UserToImport {
  username: string;
  password?: string;
  display_name?: string;
  role: UserRole;
  class_name?: string;
}

interface ImportedUser {
  username: string;
  display_name?: string;
  role: UserRole;
  initial_password: string;
  class_name?: string;
}

interface ImportResponse {
  created_count: number;
  users: ImportedUser[];
  errors: string[];
}

interface AdminUserListItem {
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

interface ResetPasswordResult {
  user_id: number;
  username: string;
  new_password: string;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();

  const [importMethod, setImportMethod] = useState<"form" | "json">("form");
  const [jsonInput, setJsonInput] = useState("");
  const [formUsers, setFormUsers] = useState<UserToImport[]>([
    { username: "", display_name: "", role: "student", class_name: "" },
  ]);
  const [importResults, setImportResults] = useState<ImportResponse | null>(null);

  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editStatus, setEditStatus] = useState<UserStatus>("active");
  const [resettingUserId, setResettingUserId] = useState<number | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState("");
  const [resetResult, setResetResult] = useState<ResetPasswordResult | null>(null);

  const [managingTeacherId, setManagingTeacherId] = useState<number | null>(null);
  const [teacherClassIds, setTeacherClassIds] = useState<number[]>([]);

  // Fetch classes for dropdown
  const { data: classesData } = useQuery({
    queryKey: ["classes", "admin"],
    queryFn: () => api.getClasses(0, 100),
  });

  const classes = classesData?.items || [];

  const usersQuery = useQuery({
    queryKey: ["adminUsers", roleFilter, page, pageSize],
    queryFn: () =>
      api.listUsers(
        roleFilter === "all" ? undefined : roleFilter,
        page,
        pageSize
      ),
  });

  const importMutation = useMutation({
    mutationFn: (users: UserToImport[]) => 
      api.bulkImportUsers(users) as Promise<ImportResponse>,
    onSuccess: (data) => {
      setImportResults(data);
      // Reset form after successful import
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

  const handleAddFormUser = () => {
    setFormUsers([
      ...formUsers,
      { username: "", display_name: "", role: "student", class_name: "" },
    ]);
  };

  const handleRemoveFormUser = (index: number) => {
    setFormUsers(formUsers.filter((_, i) => i !== index));
  };

  const handleFormUserChange = (
    index: number,
    field: keyof UserToImport,
    value: string
  ) => {
    const updated = [...formUsers];
    updated[index] = { ...updated[index], [field]: value };
    // Clear class_name if role changes to teacher
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

    // Remove empty class_name
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
        .map((u: any) => ({
          username: String(u.username || "").trim(),
          display_name: typeof u.display_name === "string" ? u.display_name : undefined,
          role: u.role as UserRole,
          class_name: typeof u.class_name === "string" ? u.class_name.trim() : undefined,
        }))
        .filter((u) => u.username);

      if (normalizedUsers.length === 0) {
        alert("请至少提供一个有效用户");
        return;
      }

      const invalidRole = normalizedUsers.find(
        (u) => u.role !== "student" && u.role !== "teacher"
      );
      if (invalidRole) {
        alert("JSON 中存在无效角色（仅支持 student/teacher）");
        return;
      }

      if (classes.length === 0 && normalizedUsers.some((u) => u.role === "student")) {
        alert("尚未创建班级，无法导入学生账户。请先创建班级。");
        return;
      }

      const missingClass = normalizedUsers.filter(
        (u) => u.role === "student" && !u.class_name
      );
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
      {
        username: "20240001",
        display_name: "张三",
        role: "student",
        class_name: "初一(1)班",
      },
      {
        username: "20240002",
        display_name: "李四",
        role: "student",
        class_name: "初一(1)班",
      },
      {
        username: "T20240001",
        display_name: "王老师",
        role: "teacher",
      },
    ];
    const blob = new Blob([JSON.stringify(template, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users_template.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadResults = () => {
    if (!importResults) return;
    
    // Create CSV content with successful users
    const successContent = importResults.users
      .map((r) => `${r.username},${r.display_name || ""},${r.initial_password},${r.class_name || ""},成功`)
      .join("\n");
    
    // Add errors if any
    const errorContent = importResults.errors
      .map((err) => `,,,,${err}`)
      .join("\n");
    
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

  // Check if we need to show a warning about no classes
  const hasStudents = formUsers.some((u) => u.role === "student");
  const showNoClassWarning = hasStudents && classes.length === 0;
  const formValidUsers = formUsers.filter((u) => u.username.trim());
  const formHasStudentWithoutClass = formValidUsers.some(
    (u) => u.role === "student" && !String(u.class_name || "").trim()
  );
  const formCannotCreateStudentsNoClass =
    classes.length === 0 && formValidUsers.some((u) => u.role === "student");

  const users = usersQuery.data?.items ?? [];
  const totalUsers = usersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));
  const normalizedSearch = searchText.trim().toLowerCase();
  const filteredUsers = normalizedSearch
    ? users.filter((u) => {
        const displayName = (u.display_name ?? "").toLowerCase();
        const username = u.username.toLowerCase();
        return (
          username.includes(normalizedSearch) || displayName.includes(normalizedSearch)
        );
      })
    : users;

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

  const openTeacherClasses = (user: AdminUserListItem) => {
    if (user.role !== "teacher") return;
    const selectedIds = classes
      .filter((c) => (user.class_names || []).includes(c.name))
      .map((c) => c.id);
    setTeacherClassIds(selectedIds);
    setManagingTeacherId(user.id);
    setEditingUserId(null);
    setResettingUserId(null);
    setResetResult(null);
  };

  const toggleTeacherClass = (classId: number) => {
    setTeacherClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const closeResetPassword = () => {
    setResettingUserId(null);
    setResetResult(null);
    setResetPasswordInput("");
  };

  const handleDeleteUser = (userId: number, username: string) => {
    if (confirm(`确定要删除用户 "${username}" 吗？\n\n此操作不可撤销，将同时删除该用户的所有班级关联。`)) {
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">用户管理</h1>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle>已创建用户</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["adminUsers"] })}
              >
                <RefreshCw size={14} className="mr-1" />
                刷新
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 flex-wrap mb-4">
            <div className="w-40">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                角色筛选
              </label>
              <select
                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as UserRole | "all");
                  setPage(1);
                }}
              >
                <option value="all">全部</option>
                <option value="student">学生</option>
                <option value="teacher">教师</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            <div className="flex-1 min-w-[220px]">
              <Input
                label="搜索"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="按学号/工号或姓名搜索（当前页）"
              />
            </div>
            <div className="w-36">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                每页数量
              </label>
              <select
                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {usersQuery.isLoading ? (
            <div className="py-10 text-center text-sm text-gray-500">
              正在加载用户列表...
            </div>
          ) : usersQuery.isError ? (
            <div className="py-10 text-center text-sm text-red-600">
              用户列表加载失败
            </div>
          ) : (
            <>
              {resetResult && (
                <Card className="mb-4 border-yellow-300 bg-yellow-50">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-medium text-yellow-900">
                          已重置密码：{resetResult.username}
                        </p>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-yellow-900">新密码：</span>
                          <span className="font-mono bg-white px-2 py-1 rounded border border-yellow-200">
                            {resetResult.new_password}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(resetResult.new_password)}
                          >
                            复制
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setResetResult(null)}
                          >
                            关闭
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-yellow-800">
                        请及时分发新密码；用户下次登录将被要求修改密码
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {resettingUserId !== null && (
                <Card className="mb-4">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <CardTitle className="flex items-center gap-2">
                        <KeyRound size={18} />
                        重置密码
                      </CardTitle>
                      <Button size="sm" variant="ghost" onClick={closeResetPassword}>
                        关闭
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-3 flex-wrap">
                      <div className="flex-1 min-w-[220px]">
                        <Input
                          label="指定新密码（可选）"
                          value={resetPasswordInput}
                          onChange={(e) => setResetPasswordInput(e.target.value)}
                          placeholder="留空则自动生成随机密码"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() =>
                            resetPasswordMutation.mutate({
                              userId: resettingUserId,
                            })
                          }
                          loading={resetPasswordMutation.isPending}
                        >
                          自动生成
                        </Button>
                        <Button
                          onClick={() =>
                            resetPasswordMutation.mutate({
                              userId: resettingUserId,
                              newPassword: resetPasswordInput.trim() || undefined,
                            })
                          }
                          loading={resetPasswordMutation.isPending}
                          disabled={!resetPasswordInput.trim()}
                        >
                          使用此密码
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {managingTeacherId !== null && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <Card className="w-full max-w-2xl mx-4">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <CardTitle className="flex items-center gap-2">
                          <Users size={18} />
                          设置教师授课班级
                        </CardTitle>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setManagingTeacherId(null);
                            setTeacherClassIds([]);
                          }}
                        >
                          <X size={16} className="mr-1" />
                          关闭
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {classes.length === 0 ? (
                        <p className="text-sm text-gray-600">
                          当前暂无班级，请先创建班级后再为教师分配。
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {classes.map((cls) => {
                            const checked = teacherClassIds.includes(cls.id);
                            return (
                              <label
                                key={cls.id}
                                className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer select-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleTeacherClass(cls.id)}
                                />
                                <span className="text-sm text-gray-900">{cls.name}</span>
                                <span className="text-xs text-gray-500">{cls.grade || "-"}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex justify-end gap-3 mt-6">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setManagingTeacherId(null);
                            setTeacherClassIds([]);
                          }}
                          disabled={setTeacherClassesMutation.isPending}
                        >
                          取消
                        </Button>
                        <Button
                          onClick={() =>
                            setTeacherClassesMutation.mutate({
                              teacherId: managingTeacherId,
                              classIds: teacherClassIds,
                            })
                          }
                          loading={setTeacherClassesMutation.isPending}
                          disabled={classes.length === 0}
                        >
                          保存
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">学号/工号</th>
                      <th className="text-left py-2">姓名</th>
                      <th className="text-left py-2">角色</th>
                      <th className="text-left py-2">班级</th>
                      <th className="text-left py-2">状态</th>
                      <th className="text-left py-2">需改密</th>
                      <th className="text-left py-2">创建时间</th>
                      <th className="text-left py-2">最近登录</th>
                      <th className="text-left py-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-gray-500">
                          当前无用户
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isEditing = editingUserId === u.id;
                        const roleLabel =
                          u.role === "admin"
                            ? "管理员"
                            : u.role === "teacher"
                            ? "教师"
                            : "学生";
                        const classLabel =
                          u.role === "student"
                            ? u.class_names?.[0] || "-"
                            : u.role === "teacher"
                            ? u.class_names?.join("、") || "-"
                            : "-";
                        const statusLabel = u.status === "disabled" ? "禁用" : "正常";
                        return (
                          <tr key={u.id} className="border-b align-top">
                            <td className="py-2 font-mono">
                              {isEditing ? (
                                <input
                                  className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm font-mono"
                                  value={editUsername}
                                  onChange={(e) => setEditUsername(e.target.value)}
                                  placeholder="学号/工号"
                                />
                              ) : (
                                u.username
                              )}
                            </td>
                            <td className="py-2">
                              {isEditing ? (
                                <input
                                  className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm"
                                  value={editDisplayName}
                                  onChange={(e) => setEditDisplayName(e.target.value)}
                                  placeholder="选填"
                                />
                              ) : (
                                u.display_name || "-"
                              )}
                            </td>
                            <td className="py-2">{roleLabel}</td>
                            <td className="py-2">{classLabel}</td>
                            <td className="py-2">
                              {isEditing ? (
                                <select
                                  className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm"
                                  value={editStatus}
                                  onChange={(e) =>
                                    setEditStatus(e.target.value as UserStatus)
                                  }
                                >
                                  <option value="active">正常</option>
                                  <option value="disabled">禁用</option>
                                </select>
                              ) : (
                                <span
                                  className={
                                    u.status === "disabled"
                                      ? "text-red-600"
                                      : "text-green-700"
                                  }
                                >
                                  {statusLabel}
                                </span>
                              )}
                            </td>
                            <td className="py-2">
                              {u.must_change_password ? (
                                <span className="text-yellow-700">是</span>
                              ) : (
                                <span className="text-gray-600">否</span>
                              )}
                            </td>
                            <td className="py-2">{u.created_at ? formatDate(u.created_at) : "-"}</td>
                            <td className="py-2">
                              {u.last_login_at ? formatDate(u.last_login_at) : "-"}
                            </td>
                            <td className="py-2">
                              {isEditing ? (
                                <div className="flex gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      updateUserMutation.mutate({
                                        userId: u.id,
                                        username: editUsername.trim(),
                                        display_name: editDisplayName.trim(),
                                        status: editStatus,
                                      })
                                    }
                                    loading={updateUserMutation.isPending}
                                  >
                                    保存
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelEditUser}
                                    disabled={updateUserMutation.isPending}
                                  >
                                    取消
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => startEditUser(u)}
                                  >
                                    <Pencil size={14} className="mr-1" />
                                    修改
                                  </Button>
                                  {u.role === "teacher" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openTeacherClasses(u)}
                                      disabled={setTeacherClassesMutation.isPending}
                                    >
                                      <Users size={14} className="mr-1" />
                                      管理班级
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openResetPassword(u.id)}
                                  >
                                    <KeyRound size={14} className="mr-1" />
                                    重置密码
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteUser(u.id, u.username)}
                                    disabled={deleteUserMutation.isPending}
                                  >
                                    <Trash2 size={14} className="mr-1" />
                                    删除
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap mt-4">
                <p className="text-sm text-gray-500">
                  共 {totalUsers} 个用户 · 第 {page} / {totalPages} 页
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    上一页
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* No Classes Warning */}
      {showNoClassWarning && (
        <Card className="mb-6 border-yellow-300 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-medium text-yellow-800">尚未创建班级</p>
                <p className="text-sm text-yellow-700 mt-1">
                  当前没有可用的班级。创建学生账户前，建议先
                  <a href="/admin/classes" className="underline font-medium">创建班级</a>
                  ，以便将学生分配到对应班级。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResults && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="text-green-500" size={20} />
                导入完成 - 成功创建 {importResults.created_count} 个用户
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDownloadResults}>
                  <Download size={14} className="mr-1" />
                  下载结果
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setImportResults(null)}
                >
                  关闭
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">状态</th>
                    <th className="text-left py-2">学号/工号</th>
                    <th className="text-left py-2">姓名</th>
                    <th className="text-left py-2">初始密码</th>
                    <th className="text-left py-2">班级</th>
                  </tr>
                </thead>
                <tbody>
                  {importResults.users.map((user, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2">
                        <CheckCircle className="text-green-500" size={16} />
                      </td>
                      <td className="py-2">{user.username}</td>
                      <td className="py-2">{user.display_name || "-"}</td>
                      <td className="py-2 font-mono bg-gray-100 px-2 rounded">
                        {user.initial_password}
                      </td>
                      <td className="py-2">{user.class_name || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Show errors if any */}
              {importResults.errors.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-2">部分错误：</p>
                  <ul className="text-sm text-red-700 list-disc list-inside">
                    {importResults.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <p className="text-sm text-gray-500 mt-4 flex items-center gap-1">
              <AlertTriangle size={14} />
              请及时下载并妥善保存初始密码，密码只显示一次
            </p>
          </CardContent>
        </Card>
      )}

      {/* Import Method Tabs */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={importMethod === "form" ? "primary" : "outline"}
          onClick={() => setImportMethod("form")}
        >
          <UserPlus size={16} className="mr-1" />
          表单添加
        </Button>
        <Button
          variant={importMethod === "json" ? "primary" : "outline"}
          onClick={() => setImportMethod("json")}
        >
          <Upload size={16} className="mr-1" />
          JSON批量导入
        </Button>
      </div>

      {/* Form Import */}
      {importMethod === "form" && (
        <Card>
          <CardHeader>
            <CardTitle>添加用户</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formUsers.map((user, index) => (
                <div key={index} className="flex items-end gap-3 flex-wrap">
                  <div className="flex-1 min-w-[150px]">
                    <Input
                      label="学号/工号"
                      value={user.username}
                      onChange={(e) =>
                        handleFormUserChange(index, "username", e.target.value)
                      }
                      placeholder="请输入学号/工号"
                    />
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <Input
                      label="姓名"
                      value={user.display_name || ""}
                      onChange={(e) =>
                        handleFormUserChange(index, "display_name", e.target.value)
                      }
                      placeholder="选填"
                    />
                  </div>
                  <div className="w-28">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      角色
                    </label>
                    <select
                      className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      value={user.role}
                      onChange={(e) =>
                        handleFormUserChange(
                          index,
                          "role",
                          e.target.value as UserRole
                        )
                      }
                    >
                      <option value="student">学生</option>
                      <option value="teacher">教师</option>
                    </select>
                  </div>
                  
                  {/* Class selection - only for students */}
                  {user.role === "student" && (
                    <div className="w-40">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        班级
                      </label>
                      <select
                        className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        value={user.class_name || ""}
                        onChange={(e) =>
                          handleFormUserChange(index, "class_name", e.target.value)
                        }
                        disabled={classes.length === 0}
                      >
                        <option value="">
                          {classes.length === 0 ? "暂无班级" : "请选择班级"}
                        </option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.name}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formUsers.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFormUser(index)}
                      className="mb-0.5"
                    >
                      删除
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleAddFormUser}>
                  添加一行
                </Button>
                <Button
                  onClick={handleFormSubmit}
                  loading={importMutation.isPending}
                  disabled={
                    importMutation.isPending ||
                    formValidUsers.length === 0 ||
                    formCannotCreateStudentsNoClass ||
                    formHasStudentWithoutClass
                  }
                >
                  创建用户
                </Button>
              </div>
              {(formCannotCreateStudentsNoClass || formHasStudentWithoutClass) && (
                <p className="text-sm text-red-600">
                  {formCannotCreateStudentsNoClass
                    ? "尚未创建班级，无法创建学生账户"
                    : "学生账户必须选择班级后才能创建"}
                </p>
              )}
              <p className="text-sm text-gray-500">
                密码将自动生成，创建后请下载结果并将密码分发给用户
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* JSON Import */}
      {importMethod === "json" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>JSON批量导入</CardTitle>
              <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
                <Download size={14} className="mr-1" />
                下载模板
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <textarea
                className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={`[
  {
    "username": "20240001",
    "display_name": "张三",
    "role": "student",
    "class_name": "初一(1)班"
  },
  {
    "username": "T20240001",
    "display_name": "王老师",
    "role": "teacher"
  }
]`}
              />
              <Button
                onClick={handleJsonSubmit}
                loading={importMutation.isPending}
                disabled={!jsonInput.trim()}
              >
                导入用户
              </Button>
              <div className="text-sm text-gray-500 space-y-1">
                <p>支持的字段：</p>
                <ul className="list-disc list-inside ml-2">
                  <li><code className="bg-gray-100 px-1 rounded">username</code> - 学号/工号（必填）</li>
                  <li><code className="bg-gray-100 px-1 rounded">display_name</code> - 姓名（选填）</li>
                  <li><code className="bg-gray-100 px-1 rounded">role</code> - 角色：student/teacher（必填）</li>
                  <li><code className="bg-gray-100 px-1 rounded">class_name</code> - 班级名称（学生必填，需先创建班级）</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
