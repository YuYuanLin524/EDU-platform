"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ClassInfo, ClassDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Plus, Users, Trash2, UserPlus } from "lucide-react";

export default function AdminClassesPage() {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassGrade, setNewClassGrade] = useState("");
  const [selectedClass, setSelectedClass] = useState<ClassDetail | null>(null);

  const { data: classesData, isLoading } = useQuery({
    queryKey: ["classes", "admin"],
    queryFn: () => api.getClasses(),
  });

  const createClassMutation = useMutation({
    mutationFn: () => api.createClass(newClassName, newClassGrade || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setShowCreateForm(false);
      setNewClassName("");
      setNewClassGrade("");
    },
  });

  const { data: classDetail } = useQuery({
    queryKey: ["class-detail", selectedClass?.id],
    queryFn: () => (selectedClass ? api.getClass(selectedClass.id) : null),
    enabled: !!selectedClass,
  });

  const removeStudentMutation = useMutation({
    mutationFn: ({ classId, studentId }: { classId: number; studentId: number }) =>
      api.removeStudentFromClass(classId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-detail"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });

  const removeTeacherMutation = useMutation({
    mutationFn: ({ classId, teacherId }: { classId: number; teacherId: number }) =>
      api.removeTeacherFromClass(classId, teacherId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-detail"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });

  const classes = classesData?.items || [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">班级管理</h1>
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
              <Input
                label="班级名称"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="如：初一1班"
              />
              <Input
                label="年级（可选）"
                value={newClassGrade}
                onChange={(e) => setNewClassGrade(e.target.value)}
                placeholder="如：七年级"
              />
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewClassName("");
                    setNewClassGrade("");
                  }}
                >
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
                <p className="text-sm text-gray-500">{classDetail.grade}</p>
              )}
            </CardHeader>
            <CardContent className="overflow-y-auto">
              {/* Teachers */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  教师 ({classDetail.teachers.length})
                </h3>
                {classDetail.teachers.length === 0 ? (
                  <p className="text-sm text-gray-500">暂无教师</p>
                ) : (
                  <div className="space-y-2">
                    {classDetail.teachers.map((teacher) => (
                      <div
                        key={teacher.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                         <div>
                           <p className="font-medium">
                             {teacher.display_name || teacher.username}
                           </p>
                           <p className="text-sm text-gray-500">
                             工号: {teacher.username}
                           </p>
                         </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            removeTeacherMutation.mutate({
                              classId: classDetail.id,
                              teacherId: teacher.id,
                            })
                          }
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Students */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  学生 ({classDetail.students.length})
                </h3>
                {classDetail.students.length === 0 ? (
                  <p className="text-sm text-gray-500">暂无学生</p>
                ) : (
                  <div className="space-y-2">
                    {classDetail.students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                         <div>
                           <p className="font-medium">
                             {student.display_name || student.username}
                           </p>
                           <p className="text-sm text-gray-500">
                             学号: {student.username}
                           </p>
                         </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            removeStudentMutation.mutate({
                              classId: classDetail.id,
                              studentId: student.id,
                            })
                          }
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-500 mt-6">
                提示：要添加学生或教师到班级，请使用API接口或在用户导入时指定班级
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : classes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Users className="mx-auto mb-4 text-gray-300" size={48} />
            <p>暂无班级</p>
            <p className="text-sm mt-1">点击"创建班级"开始添加</p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  班级名称
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  年级
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  学生数
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  教师数
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  创建时间
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {classes.map((cls) => (
                <tr key={cls.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {cls.name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{cls.grade || "-"}</td>
                  <td className="px-4 py-3 text-gray-500">{cls.student_count}</td>
                  <td className="px-4 py-3 text-gray-500">{cls.teacher_count}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(cls.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedClass(cls as any)}
                    >
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
