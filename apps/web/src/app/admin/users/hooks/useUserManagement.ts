"use client";

import { useCallback } from "react";
import { useUserFilters } from "./useUserFilters";
import { useUserImport } from "./useUserImport";
import { useUserEditing } from "./useUserEditing";
import { useUserMutations } from "./useUserMutations";
import type { AdminUserListItem } from "../types";

/**
 * Aggregated hook for user management.
 * Combines smaller focused hooks to reduce re-renders.
 * 
 * @deprecated Consider using individual hooks (useUserFilters, useUserImport, useUserEditing, useUserMutations)
 * for better performance and tree-shaking.
 */
export function useUserManagement() {
  // Filter and data fetching
  const filters = useUserFilters();

  // Import functionality
  const importHook = useUserImport();

  // User editing and modal state
  const editing = useUserEditing();

  // Mutations with callbacks to clear modals
  const mutations = useUserMutations(editing.clearAllModals);

  // Wrapper functions that combine editing actions with classes data
  const wrappedOpenTeacherClasses = useCallback(
    (user: AdminUserListItem) => {
      editing.openTeacherClasses(user, importHook.classes);
    },
    [editing, importHook.classes]
  );

  const wrappedOpenStudentClass = useCallback(
    (user: AdminUserListItem) => {
      editing.openStudentClass(user, importHook.classes);
    },
    [editing, importHook.classes]
  );

  // Combine everything into a single return object (backward compatible)
  return {
    // Filter state
    roleFilter: filters.roleFilter,
    setRoleFilter: filters.setRoleFilter,
    searchText: filters.searchText,
    setSearchText: filters.setSearchText,
    page: filters.page,
    setPage: filters.setPage,
    pageSize: filters.pageSize,
    setPageSize: filters.setPageSize,
    queryClient: filters.queryClient,

    // Data
    usersQuery: filters.usersQuery,
    filteredUsers: filters.filteredUsers,
    totalUsers: filters.totalUsers,
    totalPages: filters.totalPages,
    classes: importHook.classes,

    // Import state
    importMethod: importHook.importMethod,
    setImportMethod: importHook.setImportMethod,
    jsonInput: importHook.jsonInput,
    setJsonInput: importHook.setJsonInput,
    formUsers: importHook.formUsers,
    setFormUsers: importHook.setFormUsers,
    formValidUsers: importHook.formValidUsers,
    formHasStudentWithoutClass: importHook.formHasStudentWithoutClass,
    formCannotCreateStudentsNoClass: importHook.formCannotCreateStudentsNoClass,
    showNoClassWarning: importHook.showNoClassWarning,
    hasStudents: importHook.hasStudents,
    importResults: importHook.importResults,
    setImportResults: importHook.setImportResults,

    // Edit state
    editingUserId: editing.editingUserId,
    editUsername: editing.editUsername,
    setEditUsername: editing.setEditUsername,
    editDisplayName: editing.editDisplayName,
    setEditDisplayName: editing.setEditDisplayName,
    editStatus: editing.editStatus,
    setEditStatus: editing.setEditStatus,
    resettingUserId: editing.resettingUserId,
    resetPasswordInput: editing.resetPasswordInput,
    setResetPasswordInput: editing.setResetPasswordInput,
    resetResult: editing.resetResult,
    setResetResult: editing.setResetResult,
    managingTeacherId: editing.managingTeacherId,
    setManagingTeacherId: editing.setManagingTeacherId,
    teacherClassIds: editing.teacherClassIds,
    setTeacherClassIds: editing.setTeacherClassIds,
    managingStudentId: editing.managingStudentId,
    setManagingStudentId: editing.setManagingStudentId,
    studentClassId: editing.studentClassId,
    setStudentClassId: editing.setStudentClassId,

    // Mutations
    importMutation: importHook.importMutation,
    updateUserMutation: mutations.updateUserMutation,
    resetPasswordMutation: mutations.resetPasswordMutation,
    deleteUserMutation: mutations.deleteUserMutation,
    setTeacherClassesMutation: mutations.setTeacherClassesMutation,
    setStudentClassMutation: mutations.setStudentClassMutation,

    // Handlers
    handleAddFormUser: importHook.handleAddFormUser,
    handleRemoveFormUser: importHook.handleRemoveFormUser,
    handleFormUserChange: importHook.handleFormUserChange,
    handleFormSubmit: importHook.handleFormSubmit,
    handleJsonSubmit: importHook.handleJsonSubmit,
    handleDownloadTemplate: importHook.handleDownloadTemplate,
    handleDownloadResults: importHook.handleDownloadResults,
    startEditUser: editing.startEditUser,
    cancelEditUser: editing.cancelEditUser,
    openResetPassword: editing.openResetPassword,
    closeResetPassword: editing.closeResetPassword,
    openTeacherClasses: wrappedOpenTeacherClasses,
    openStudentClass: wrappedOpenStudentClass,
    toggleTeacherClass: editing.toggleTeacherClass,
    handleDeleteUser: mutations.handleDeleteUser,
    copyToClipboard: mutations.copyToClipboard,
  };
}

// Re-export individual hooks for direct use
export { useUserFilters, useUserImport, useUserEditing, useUserMutations };
