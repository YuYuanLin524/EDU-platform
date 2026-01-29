"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { Users, MessageSquare, ChevronRight, ArrowLeft } from "lucide-react";

type ViewState =
  | { type: "classes" }
  | { type: "students"; classId: number; className: string }
  | {
      type: "conversations";
      classId: number;
      className: string;
      studentId: number;
      studentName: string;
    }
  | {
      type: "messages";
      classId: number;
      className: string;
      studentId: number;
      studentName: string;
      conversationId: number;
      conversationTitle: string;
    };

export default function TeacherClassesPage() {
  const [viewState, setViewState] = useState<ViewState>({ type: "classes" });

  const renderContent = () => {
    switch (viewState.type) {
      case "classes":
        return (
          <ClassList
            onSelectClass={(classId, className) =>
              setViewState({ type: "students", classId, className })
            }
          />
        );
      case "students":
        return (
          <StudentList
            classId={viewState.classId}
            className={viewState.className}
            onBack={() => setViewState({ type: "classes" })}
            onSelectStudent={(studentId, studentName) =>
              setViewState({
                type: "conversations",
                classId: viewState.classId,
                className: viewState.className,
                studentId,
                studentName,
              })
            }
          />
        );
      case "conversations":
        return (
          <ConversationList
            classId={viewState.classId}
            studentId={viewState.studentId}
            studentName={viewState.studentName}
            onBack={() =>
              setViewState({
                type: "students",
                classId: viewState.classId,
                className: viewState.className,
              })
            }
            onSelectConversation={(conversationId, title) =>
              setViewState({
                type: "messages",
                classId: viewState.classId,
                className: viewState.className,
                studentId: viewState.studentId,
                studentName: viewState.studentName,
                conversationId,
                conversationTitle: title,
              })
            }
          />
        );
      case "messages":
        return (
          <MessageView
            conversationId={viewState.conversationId}
            title={viewState.conversationTitle}
            onBack={() =>
              setViewState({
                type: "conversations",
                classId: viewState.classId,
                className: viewState.className,
                studentId: viewState.studentId,
                studentName: viewState.studentName,
              })
            }
          />
        );
    }
  };

  return <div className="p-6">{renderContent()}</div>;
}

function ClassList({
  onSelectClass,
}: {
  onSelectClass: (classId: number, className: string) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ["classes", user?.role, user?.id],
    queryFn: () => api.getClasses(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const classes = data?.items || [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">我的班级</h1>
      {classes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Users className="mx-auto mb-4 text-gray-300" size={48} />
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
                  <ChevronRight className="text-gray-400" size={20} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-500 space-y-1">
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

function StudentList({
  classId,
  className,
  onBack,
  onSelectStudent,
}: {
  classId: number;
  className: string;
  onBack: () => void;
  onSelectStudent: (studentId: number, studentName: string) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["class-students", classId],
    queryFn: () => api.getClassStudents(classId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const students = data || [];

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft size={20} />
        返回班级列表
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {className} - 学生列表
      </h1>
      {students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Users className="mx-auto mb-4 text-gray-300" size={48} />
            <p>该班级暂无学生</p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {students.map((student) => (
            <div
              key={student.id}
              className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
              onClick={() =>
                onSelectStudent(
                  student.id,
                  student.display_name || student.username
                )
              }
            >
               <div>
                 <p className="font-medium text-gray-900">
                   {student.display_name || student.username}
                 </p>
                 <p className="text-sm text-gray-500">学号: {student.username}</p>
               </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>
                  最后登录：
                  {student.last_login_at
                    ? formatRelativeTime(student.last_login_at)
                    : "从未登录"}
                </span>
                <ChevronRight className="text-gray-400" size={20} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConversationList({
  classId,
  studentId,
  studentName,
  onBack,
  onSelectConversation,
}: {
  classId: number;
  studentId: number;
  studentName: string;
  onBack: () => void;
  onSelectConversation: (conversationId: number, title: string) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["student-conversations", classId, studentId],
    queryFn: () => api.getStudentConversations(classId, studentId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const conversations = data?.items || [];

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft size={20} />
        返回学生列表
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {studentName} 的对话记录
      </h1>
      {conversations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <MessageSquare className="mx-auto mb-4 text-gray-300" size={48} />
            <p>该学生暂无对话记录</p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className="p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() =>
                onSelectConversation(conv.id, conv.title || `对话 #${conv.id}`)
              }
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">
                  {conv.title || `对话 #${conv.id}`}
                </p>
                <ChevronRight className="text-gray-400" size={20} />
              </div>
              <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                <span>{conv.message_count} 条消息</span>
                <span>
                  创建于 {formatDate(conv.created_at)}
                </span>
                {conv.last_message_at && (
                  <span>
                    最后活动 {formatRelativeTime(conv.last_message_at)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MessageView({
  conversationId,
  title,
  onBack,
}: {
  conversationId: number;
  title: string;
  onBack: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["teacher-messages", conversationId],
    queryFn: () => api.getConversationMessagesForTeacher(conversationId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const messages = data?.messages || [];

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft size={20} />
        返回
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>
      <Card>
        <CardContent className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-center text-gray-500">暂无消息</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "p-4 rounded-lg",
                  msg.role === "user"
                    ? "bg-blue-50 ml-8"
                    : msg.role === "assistant"
                    ? "bg-gray-50 mr-8"
                    : "bg-yellow-50"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-1 rounded",
                      msg.role === "user"
                        ? "bg-blue-100 text-blue-700"
                        : msg.role === "assistant"
                        ? "bg-gray-200 text-gray-700"
                        : "bg-yellow-100 text-yellow-700"
                    )}
                  >
                    {msg.role === "user"
                      ? "学生"
                      : msg.role === "assistant"
                      ? "AI助手"
                      : "系统"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(msg.created_at)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-gray-800">{msg.content}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
