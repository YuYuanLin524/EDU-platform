"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserManagement } from "./hooks/useUserManagement";
import { UserFilters } from "./components/UserFilters";
import { UserTable } from "./components/UserTable";
import {
  ResetPasswordModal,
  ResetPasswordResultBanner,
  TeacherClassesModal,
  StudentClassModal,
} from "./components/UserModals";
import {
  ImportResultsCard,
  NoClassWarning,
  ImportMethodTabs,
  FormImportCard,
  JsonImportCard,
} from "./components/UserImport";

export default function AdminUsersPage() {
  const {
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

    queryClient,
  } = useUserManagement();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">用户管理</h1>

      {/* User List Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>已创建用户</CardTitle>
        </CardHeader>
        <CardContent>
          <UserFilters
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            searchText={searchText}
            setSearchText={setSearchText}
            pageSize={pageSize}
            setPageSize={setPageSize}
            setPage={setPage}
            queryClient={queryClient}
          />

          {/* Reset Password Result Banner */}
          {resetResult && (
            <ResetPasswordResultBanner
              resetResult={resetResult}
              onClose={() => setResetResult(null)}
              copyToClipboard={copyToClipboard}
            />
          )}

          {/* Reset Password Modal */}
          {resettingUserId !== null && (
            <ResetPasswordModal
              resettingUserId={resettingUserId}
              resetPasswordInput={resetPasswordInput}
              setResetPasswordInput={setResetPasswordInput}
              resetPasswordMutation={resetPasswordMutation}
              onClose={closeResetPassword}
            />
          )}

          {/* Teacher Classes Modal */}
          {managingTeacherId !== null && (
            <TeacherClassesModal
              managingTeacherId={managingTeacherId}
              classes={classes}
              teacherClassIds={teacherClassIds}
              toggleTeacherClass={toggleTeacherClass}
              setTeacherClassesMutation={setTeacherClassesMutation}
              onClose={() => {
                setManagingTeacherId(null);
                setTeacherClassIds([]);
              }}
            />
          )}

          {/* Student Class Modal */}
          {managingStudentId !== null && (
            <StudentClassModal
              managingStudentId={managingStudentId}
              classes={classes}
              studentClassId={studentClassId}
              setStudentClassId={setStudentClassId}
              setStudentClassMutation={setStudentClassMutation}
              onClose={() => {
                setManagingStudentId(null);
                setStudentClassId(null);
              }}
            />
          )}

          {/* User Table */}
          <UserTable
            users={filteredUsers}
            isLoading={usersQuery.isLoading}
            isError={usersQuery.isError}
            editingUserId={editingUserId}
            editUsername={editUsername}
            setEditUsername={setEditUsername}
            editDisplayName={editDisplayName}
            setEditDisplayName={setEditDisplayName}
            editStatus={editStatus}
            setEditStatus={setEditStatus}
            updateUserMutation={updateUserMutation}
            deleteUserMutation={deleteUserMutation}
            setStudentClassMutation={setStudentClassMutation}
            setTeacherClassesMutation={setTeacherClassesMutation}
            startEditUser={startEditUser}
            cancelEditUser={cancelEditUser}
            openResetPassword={openResetPassword}
            openTeacherClasses={openTeacherClasses}
            openStudentClass={openStudentClass}
            handleDeleteUser={handleDeleteUser}
            page={page}
            setPage={setPage}
            pageSize={pageSize}
            totalUsers={totalUsers}
            totalPages={totalPages}
          />
        </CardContent>
      </Card>

      {/* No Class Warning */}
      <NoClassWarning show={showNoClassWarning} />

      {/* Import Results */}
      {importResults && (
        <ImportResultsCard
          importResults={importResults}
          onDownload={handleDownloadResults}
          onClose={() => setImportResults(null)}
        />
      )}

      {/* Import Method Tabs */}
      <ImportMethodTabs importMethod={importMethod} setImportMethod={setImportMethod} />

      {/* Form Import */}
      {importMethod === "form" && (
        <FormImportCard
          formUsers={formUsers}
          classes={classes}
          formValidUsers={formValidUsers}
          formCannotCreateStudentsNoClass={formCannotCreateStudentsNoClass}
          formHasStudentWithoutClass={formHasStudentWithoutClass}
          importMutation={importMutation}
          onAddUser={handleAddFormUser}
          onRemoveUser={handleRemoveFormUser}
          onUserChange={handleFormUserChange}
          onSubmit={handleFormSubmit}
        />
      )}

      {/* JSON Import */}
      {importMethod === "json" && (
        <JsonImportCard
          jsonInput={jsonInput}
          setJsonInput={setJsonInput}
          importMutation={importMutation}
          onSubmit={handleJsonSubmit}
          onDownloadTemplate={handleDownloadTemplate}
        />
      )}
    </div>
  );
}
