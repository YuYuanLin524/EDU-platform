"use client";

import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Pencil, KeyRound, Users, Trash2 } from "lucide-react";
import { UserStatus } from "@/lib/api";
import type { AdminUserListItem } from "../types";
import { EditUserInputs } from "./UserModals";

interface UserTableProps {
  users: AdminUserListItem[];
  isLoading: boolean;
  isError: boolean;
  editingUserId: number | null;
  editUsername: string;
  setEditUsername: (value: string) => void;
  editDisplayName: string;
  setEditDisplayName: (value: string) => void;
  editStatus: UserStatus;
  setEditStatus: (value: UserStatus) => void;
  updateUserMutation: {
    mutate: (params: {
      userId: number;
      username: string;
      display_name: string;
      status: UserStatus;
    }) => void;
    isPending: boolean;
  };
  deleteUserMutation: {
    isPending: boolean;
  };
  setStudentClassMutation: {
    isPending: boolean;
  };
  setTeacherClassesMutation: {
    isPending: boolean;
  };
  startEditUser: (user: AdminUserListItem) => void;
  cancelEditUser: () => void;
  openResetPassword: (userId: number) => void;
  openTeacherClasses: (user: AdminUserListItem) => void;
  openStudentClass: (user: AdminUserListItem) => void;
  handleDeleteUser: (userId: number, username: string) => void;
  // Pagination
  page: number;
  setPage: (value: number) => void;
  pageSize: number;
  totalUsers: number;
  totalPages: number;
}

export function UserTable({
  users,
  isLoading,
  isError,
  editingUserId,
  editUsername,
  setEditUsername,
  editDisplayName,
  setEditDisplayName,
  editStatus,
  setEditStatus,
  updateUserMutation,
  deleteUserMutation,
  setStudentClassMutation,
  setTeacherClassesMutation,
  startEditUser,
  cancelEditUser,
  openResetPassword,
  openTeacherClasses,
  openStudentClass,
  handleDeleteUser,
  page,
  setPage,
  totalUsers,
  totalPages,
}: UserTableProps) {
  if (isLoading) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">正在加载用户列表...</div>
    );
  }

  if (isError) {
    return <div className="py-10 text-center text-sm text-destructive">用户列表加载失败</div>;
  }

  const editInputs = EditUserInputs({
    editUsername,
    setEditUsername,
    editDisplayName,
    setEditDisplayName,
    editStatus,
    setEditStatus,
  });

  return (
    <>
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
            {users.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-muted-foreground">
                  当前无用户
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isEditing = editingUserId === u.id;
                const roleLabel =
                  u.role === "admin" ? "管理员" : u.role === "teacher" ? "教师" : "学生";
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
                      {isEditing ? editInputs.usernameInput : u.username}
                    </td>
                    <td className="py-2">
                      {isEditing ? editInputs.displayNameInput : u.display_name || "-"}
                    </td>
                    <td className="py-2">{roleLabel}</td>
                    <td className="py-2">{classLabel}</td>
                    <td className="py-2">
                      {isEditing ? (
                        editInputs.statusSelect
                      ) : (
                        <span
                          className={u.status === "disabled" ? "text-destructive" : "text-primary"}
                        >
                          {statusLabel}
                        </span>
                      )}
                    </td>
                    <td className="py-2">
                      {u.must_change_password ? (
                        <span className="text-primary">是</span>
                      ) : (
                        <span className="text-muted-foreground">否</span>
                      )}
                    </td>
                    <td className="py-2">{u.created_at ? formatDate(u.created_at) : "-"}</td>
                    <td className="py-2">{u.last_login_at ? formatDate(u.last_login_at) : "-"}</td>
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
                          <Button size="sm" variant="outline" onClick={() => startEditUser(u)}>
                            <Pencil size={14} className="mr-1" />
                            修改
                          </Button>
                          {u.role === "student" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openStudentClass(u)}
                              disabled={setStudentClassMutation.isPending}
                            >
                              <Users size={14} className="mr-1" />
                              调整班级
                            </Button>
                          )}
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
        <p className="text-sm text-muted-foreground">
          共 {totalUsers} 个用户 · 第 {page} / {totalPages} 页
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            上一页
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            下一页
          </Button>
        </div>
      </div>
    </>
  );
}
