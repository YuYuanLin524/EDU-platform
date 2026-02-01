"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KeyRound, Users, X } from "lucide-react";
import { UserStatus } from "@/lib/api";
import type { ResetPasswordResult, ClassInfo } from "../types";

// Reset Password Modal
interface ResetPasswordModalProps {
  resettingUserId: number;
  resetPasswordInput: string;
  setResetPasswordInput: (value: string) => void;
  resetPasswordMutation: {
    mutate: (params: { userId: number; newPassword?: string }) => void;
    isPending: boolean;
  };
  onClose: () => void;
}

export function ResetPasswordModal({
  resettingUserId,
  resetPasswordInput,
  setResetPasswordInput,
  resetPasswordMutation,
  onClose,
}: ResetPasswordModalProps) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <KeyRound size={18} />
            重置密码
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={onClose}>
            关闭
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <Label className="mb-1 block">指定新密码（可选）</Label>
            <Input
              value={resetPasswordInput}
              onChange={(e) => setResetPasswordInput(e.target.value)}
              placeholder="留空则自动生成随机密码"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => resetPasswordMutation.mutate({ userId: resettingUserId })}
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
  );
}

// Reset Password Result
interface ResetPasswordResultBannerProps {
  resetResult: ResetPasswordResult;
  onClose: () => void;
  copyToClipboard: (text: string) => Promise<void>;
}

export function ResetPasswordResultBanner({
  resetResult,
  onClose,
  copyToClipboard,
}: ResetPasswordResultBannerProps) {
  return (
    <Card className="mb-4 border-border bg-muted/50">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="font-medium text-foreground">已重置密码：{resetResult.username}</p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">新密码：</span>
              <span className="font-mono bg-background px-2 py-1 rounded border border-border">
                {resetResult.new_password}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(resetResult.new_password)}
              >
                复制
              </Button>
              <Button size="sm" variant="ghost" onClick={onClose}>
                关闭
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            请及时分发新密码；用户下次登录将被要求修改密码
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Teacher Classes Modal
interface TeacherClassesModalProps {
  managingTeacherId: number;
  classes: ClassInfo[];
  teacherClassIds: number[];
  toggleTeacherClass: (classId: number) => void;
  setTeacherClassesMutation: {
    mutate: (params: { teacherId: number; classIds: number[] }) => void;
    isPending: boolean;
  };
  onClose: () => void;
}

export function TeacherClassesModal({
  managingTeacherId,
  classes,
  teacherClassIds,
  toggleTeacherClass,
  setTeacherClassesMutation,
  onClose,
}: TeacherClassesModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <Users size={18} />
              设置教师授课班级
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X size={16} className="mr-1" />
              关闭
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              当前暂无班级，请先创建班级后再为教师分配。
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {classes.map((cls) => {
                const checked = teacherClassIds.includes(cls.id);
                return (
                  <label
                    key={cls.id}
                    className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTeacherClass(cls.id)}
                    />
                    <span className="text-sm text-foreground">{cls.name}</span>
                    <span className="text-xs text-muted-foreground">{cls.grade || "-"}</span>
                  </label>
                );
              })}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
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
  );
}

// Student Class Modal
interface StudentClassModalProps {
  managingStudentId: number;
  classes: ClassInfo[];
  studentClassId: number | null;
  setStudentClassId: (value: number | null) => void;
  setStudentClassMutation: {
    mutate: (params: { studentId: number; classId: number }) => void;
    isPending: boolean;
  };
  onClose: () => void;
}

export function StudentClassModal({
  managingStudentId,
  classes,
  studentClassId,
  setStudentClassId,
  setStudentClassMutation,
  onClose,
}: StudentClassModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <Users size={18} />
              调整学生班级
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X size={16} className="mr-1" />
              关闭
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              当前暂无班级，请先创建班级后再调整学生班级。
            </p>
          ) : (
            <div>
              <Label className="mb-1 block">选择班级</Label>
              <Select
                value={studentClassId !== null ? String(studentClassId) : ""}
                onValueChange={(value) => {
                  setStudentClassId(value ? parseInt(value, 10) : null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={String(cls.id)}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={setStudentClassMutation.isPending}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                if (managingStudentId === null || studentClassId === null) return;
                setStudentClassMutation.mutate({
                  studentId: managingStudentId,
                  classId: studentClassId,
                });
              }}
              loading={setStudentClassMutation.isPending}
              disabled={classes.length === 0 || studentClassId === null}
            >
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Edit User Row (inline editing)
interface EditUserRowProps {
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
  userId: number;
  onCancel: () => void;
}

export function EditUserInputs({
  editUsername,
  setEditUsername,
  editDisplayName,
  setEditDisplayName,
  editStatus,
  setEditStatus,
}: Omit<EditUserRowProps, "updateUserMutation" | "userId" | "onCancel">) {
  return {
    usernameInput: (
      <Input
        className="h-9 font-mono"
        value={editUsername}
        onChange={(e) => setEditUsername(e.target.value)}
        placeholder="学号/工号"
      />
    ),
    displayNameInput: (
      <Input
        className="h-9"
        value={editDisplayName}
        onChange={(e) => setEditDisplayName(e.target.value)}
        placeholder="选填"
      />
    ),
    statusSelect: (
      <Select value={editStatus} onValueChange={(value) => setEditStatus(value as UserStatus)}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">正常</SelectItem>
          <SelectItem value="disabled">禁用</SelectItem>
        </SelectContent>
      </Select>
    ),
  };
}
