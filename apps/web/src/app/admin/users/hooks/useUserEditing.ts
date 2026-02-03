"use client";

import { useState, useCallback } from "react";
import type { AdminUserListItem, UserStatus, ClassInfo } from "../types";

interface UseUserEditingReturn {
  // Editing state
  editingUserId: number | null;
  editUsername: string;
  setEditUsername: (username: string) => void;
  editDisplayName: string;
  setEditDisplayName: (name: string) => void;
  editStatus: UserStatus;
  setEditStatus: (status: UserStatus) => void;
  
  // Reset password state
  resettingUserId: number | null;
  resetPasswordInput: string;
  setResetPasswordInput: (password: string) => void;
  resetResult: { username: string; new_password: string } | null;
  setResetResult: (result: { username: string; new_password: string } | null) => void;
  
  // Class management state
  managingTeacherId: number | null;
  teacherClassIds: number[];
  setTeacherClassIds: (ids: number[]) => void;
  managingStudentId: number | null;
  studentClassId: number | null;
  setStudentClassId: (id: number | null) => void;
  
  // Actions
  startEditUser: (user: AdminUserListItem) => void;
  cancelEditUser: () => void;
  openResetPassword: (userId: number) => void;
  closeResetPassword: () => void;
  openTeacherClasses: (user: AdminUserListItem, classes: ClassInfo[]) => void;
  openStudentClass: (user: AdminUserListItem, classes: ClassInfo[]) => void;
  toggleTeacherClass: (classId: number) => void;
  clearAllModals: () => void;
}

export function useUserEditing(): UseUserEditingReturn {
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editStatus, setEditStatus] = useState<UserStatus>("active");

  const [resettingUserId, setResettingUserId] = useState<number | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState("");
  const [resetResult, setResetResult] = useState<{ username: string; new_password: string } | null>(
    null
  );

  const [managingTeacherId, setManagingTeacherId] = useState<number | null>(null);
  const [teacherClassIds, setTeacherClassIds] = useState<number[]>([]);
  const [managingStudentId, setManagingStudentId] = useState<number | null>(null);
  const [studentClassId, setStudentClassId] = useState<number | null>(null);

  const clearAllModals = () => {
    setEditingUserId(null);
    setResettingUserId(null);
    setManagingTeacherId(null);
    setManagingStudentId(null);
    setResetResult(null);
  };

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

  const openTeacherClasses = useCallback((user: AdminUserListItem, availableClasses: ClassInfo[]) => {
    if (user.role !== "teacher") return;
    const selectedIds = availableClasses
      .filter((c) => (user.class_names || []).includes(c.name))
      .map((c) => c.id);
    setTeacherClassIds(selectedIds);
    setManagingTeacherId(user.id);
    setManagingStudentId(null);
    setStudentClassId(null);
    setEditingUserId(null);
    setResettingUserId(null);
    setResetResult(null);
  }, []);

  const openStudentClass = useCallback((user: AdminUserListItem, availableClasses: ClassInfo[]) => {
    if (user.role !== "student") return;
    if (availableClasses.length === 0) {
      alert("当前暂无班级，请先创建班级后再调整学生班级。");
      return;
    }
    const currentClassName = user.class_names?.[0];
    const currentClass = availableClasses.find((c) => c.name === currentClassName);
    setStudentClassId(currentClass ? currentClass.id : null);
    setManagingStudentId(user.id);
    setManagingTeacherId(null);
    setTeacherClassIds([]);
    setEditingUserId(null);
    setResettingUserId(null);
    setResetResult(null);
  }, []);

  const toggleTeacherClass = (classId: number) => {
    setTeacherClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  return {
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
    teacherClassIds,
    setTeacherClassIds,
    managingStudentId,
    studentClassId,
    setStudentClassId,
    startEditUser,
    cancelEditUser,
    openResetPassword,
    closeResetPassword,
    openTeacherClasses,
    openStudentClass,
    toggleTeacherClass,
    clearAllModals,
  };
}
