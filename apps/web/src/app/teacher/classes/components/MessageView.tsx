"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

interface MessageViewProps {
  conversationId: number;
  title: string;
  onBack: () => void;
}

export function MessageView({ conversationId, title, onBack }: MessageViewProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["teacher-messages", conversationId],
    queryFn: () => api.getConversationMessagesForTeacher(conversationId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const messages = data?.messages || [];

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft size={20} />
        返回
      </button>
      <h1 className="text-2xl font-bold text-foreground mb-6">{title}</h1>
      <Card>
        <CardContent className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground">暂无消息</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "p-4 rounded-lg",
                  msg.role === "user"
                    ? "bg-primary/10 ml-8"
                    : msg.role === "assistant"
                      ? "bg-muted mr-8"
                      : "bg-muted/50"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-1 rounded",
                      msg.role === "user"
                        ? "bg-primary/20 text-primary"
                        : msg.role === "assistant"
                          ? "bg-muted text-muted-foreground"
                          : "bg-muted/70 text-muted-foreground"
                    )}
                  >
                    {msg.role === "user" ? "学生" : msg.role === "assistant" ? "AI助手" : "系统"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(msg.created_at)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-foreground">{msg.content}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
