"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";
import { Users, ChevronRight, ArrowLeft } from "lucide-react";

interface StudentListProps {
  classId: number;
  className: string;
  onBack: () => void;
  onSelectStudent: (studentId: number, studentName: string) => void;
}

export function StudentList({ classId, className, onBack, onSelectStudent }: StudentListProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["class-students", classId],
    queryFn: () => api.getClassStudents(classId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const students = data || [];

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft size={20} />
        返回班级列表
      </button>
      <h1 className="text-2xl font-bold text-foreground mb-6">{className} - 学生列表</h1>
      {students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="mx-auto mb-4 text-muted-foreground/40" size={48} />
            <p>该班级暂无学生</p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-card rounded-lg border border-border divide-y divide-border">
          {students.map((student) => (
            <div
              key={student.id}
              className="p-4 hover:bg-muted cursor-pointer flex items-center justify-between"
              onClick={() => onSelectStudent(student.id, student.display_name || student.username)}
            >
              <div>
                <p className="font-medium text-foreground">
                  {student.display_name || student.username}
                </p>
                <p className="text-sm text-muted-foreground">学号: {student.username}</p>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  最后登录：
                  {student.last_login_at ? formatRelativeTime(student.last_login_at) : "从未登录"}
                </span>
                <ChevronRight className="text-muted-foreground" size={20} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
