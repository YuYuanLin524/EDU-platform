"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { MessageSquare, ChevronRight, ArrowLeft } from "lucide-react";

interface ConversationListProps {
  classId: number;
  studentId: number;
  studentName: string;
  onBack: () => void;
  onSelectConversation: (conversationId: number, title: string) => void;
}

export function ConversationList({
  classId,
  studentId,
  studentName,
  onBack,
  onSelectConversation,
}: ConversationListProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["student-conversations", classId, studentId],
    queryFn: () => api.getStudentConversations(classId, studentId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const conversations = data?.items || [];

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft size={20} />
        返回学生列表
      </button>
      <h1 className="text-2xl font-bold text-foreground mb-6">{studentName} 的对话记录</h1>
      {conversations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageSquare className="mx-auto mb-4 text-muted-foreground/40" size={48} />
            <p>该学生暂无对话记录</p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-card rounded-lg border border-border divide-y divide-border">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className="p-4 hover:bg-muted cursor-pointer"
              onClick={() => onSelectConversation(conv.id, getConversationTitle(conv))}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">{getConversationTitle(conv)}</p>
                <ChevronRight className="text-muted-foreground" size={20} />
              </div>
              <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                <span>{conv.message_count} 条消息</span>
                <span>创建于 {formatDate(conv.created_at)}</span>
                {conv.last_message_at && (
                  <span>最后活动 {formatRelativeTime(conv.last_message_at)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
import { getConversationTitle } from "@/lib/chat/conversationTitle";
