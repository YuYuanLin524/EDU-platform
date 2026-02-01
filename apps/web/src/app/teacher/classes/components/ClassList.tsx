"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ChevronRight } from "lucide-react";

interface ClassListProps {
  onSelectClass: (classId: number, className: string) => void;
}

export function ClassList({ onSelectClass }: ClassListProps) {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ["classes", user?.role, user?.id],
    queryFn: () => api.getClasses(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const classes = data?.items || [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">我的班级</h1>
      {classes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="mx-auto mb-4 text-muted-foreground/40" size={48} />
            <p>暂无班级</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <Card
              key={cls.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onSelectClass(cls.id, cls.name)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  {cls.name}
                  <ChevronRight className="text-muted-foreground" size={20} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>年级：{cls.grade || "-"}</p>
                  <p>学生数：{cls.student_count}</p>
                  <p>教师数：{cls.teacher_count}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
