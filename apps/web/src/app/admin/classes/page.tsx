"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { Plus, Users } from "lucide-react";
import { useClassManagement } from "./hooks/useClassManagement";

export default function AdminClassesPage() {
  const {
    classes,
    classDetail,
    isLoading,
    showCreateForm,
    setShowCreateForm,
    newClassName,
    setNewClassName,
    newClassGrade,
    setNewClassGrade,
    selectedClass,
    setSelectedClass,
    createClassMutation,
    handleCloseCreateForm,
  } = useClassManagement();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">班级管理</h1>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus size={16} className="mr-1" />
          创建班级
        </Button>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>创建班级</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>班级名称</Label>
                <Input
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="如：初一1班"
                />
              </div>
              <div className="space-y-2">
                <Label>年级（可选）</Label>
                <Input
                  value={newClassGrade}
                  onChange={(e) => setNewClassGrade(e.target.value)}
                  placeholder="如：七年级"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleCloseCreateForm}>
                  取消
                </Button>
                <Button
                  onClick={() => createClassMutation.mutate()}
                  loading={createClassMutation.isPending}
                  disabled={!newClassName.trim()}
                >
                  创建
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Class Detail Modal */}
      {selectedClass && classDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{classDetail.name}</CardTitle>
                <Button variant="ghost" onClick={() => setSelectedClass(null)}>
                  关闭
                </Button>
              </div>
              {classDetail.grade && (
                <p className="text-sm text-muted-foreground">{classDetail.grade}</p>
              )}
            </CardHeader>
            <CardContent className="overflow-y-auto">
              {/* Teachers */}
              <div className="mb-6">
                <h3 className="font-semibold text-foreground mb-3">
                  教师 ({classDetail.teachers.length})
                </h3>
                {classDetail.teachers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无教师</p>
                ) : (
                  <div className="space-y-2">
                    {classDetail.teachers.map((teacher) => (
                      <div
                        key={teacher.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{teacher.display_name || teacher.username}</p>
                          <p className="text-sm text-muted-foreground">工号: {teacher.username}</p>
                        </div>
                        <span className="text-xs text-muted-foreground/60">只读</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Students */}
              <div>
                <h3 className="font-semibold text-foreground mb-3">
                  学生 ({classDetail.students.length})
                </h3>
                {classDetail.students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无学生</p>
                ) : (
                  <div className="space-y-2">
                    {classDetail.students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{student.display_name || student.username}</p>
                          <p className="text-sm text-muted-foreground">学号: {student.username}</p>
                        </div>
                        <span className="text-xs text-muted-foreground/60">只读</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground mt-6">
                提示：要添加学生或教师到班级，请使用API接口或在用户导入时指定班级
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : classes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="mx-auto mb-4 text-muted-foreground/40" size={48} />
            <p>暂无班级</p>
            <p className="text-sm mt-1">点击"创建班级"开始添加</p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-card rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  班级名称
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  年级
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  学生数
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  教师数
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  创建时间
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {classes.map((cls) => (
                <tr key={cls.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium text-foreground">{cls.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{cls.grade || "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{cls.student_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">{cls.teacher_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(cls.created_at)}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => setSelectedClass(cls)}>
                      查看详情
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
