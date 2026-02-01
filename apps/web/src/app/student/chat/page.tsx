"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ConversationInfo, MessageInfo, ClassInfo } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { Plus, Send, MessageSquare } from "lucide-react";

export default function StudentChatPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationInfo | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch classes for the dropdown
  const { data: classesData } = useQuery({
    queryKey: ["classes", user?.role, user?.id],
    queryFn: () => api.getClasses(),
  });

  // Fetch conversations
  const { data: conversationsData, isLoading: conversationsLoading } = useQuery(
    {
      queryKey: ["conversations", selectedClassId],
      queryFn: () => api.getConversations(selectedClassId ?? undefined),
    }
  );

  // Fetch messages for selected conversation
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ["messages", selectedConversation?.id],
    queryFn: () =>
      selectedConversation
        ? api.getConversationMessages(selectedConversation.id)
        : null,
    enabled: !!selectedConversation,
  });

  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: (classId: number) => api.createConversation(classId),
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setSelectedConversation(newConversation);
    },
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: number; content: string }) =>
      api.sendMessage(conversationId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["messages", selectedConversation?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setMessageInput("");
    },
  });

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData?.messages]);

  // Set default class if only one
  useEffect(() => {
    if (classesData?.items?.length === 1 && !selectedClassId) {
      setSelectedClassId(classesData.items[0].id);
    }
  }, [classesData, selectedClassId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;
    sendMessageMutation.mutate({
      conversationId: selectedConversation.id,
      content: messageInput.trim(),
    });
  };

  const handleNewConversation = () => {
    if (!selectedClassId && classesData?.items?.[0]) {
      setSelectedClassId(classesData.items[0].id);
      createConversationMutation.mutate(classesData.items[0].id);
    } else if (selectedClassId) {
      createConversationMutation.mutate(selectedClassId);
    }
  };

  const conversations = conversationsData?.items || [];
  const messages = messagesData?.messages || [];
  const classes = classesData?.items || [];

  return (
    <div className="flex h-full">
      {/* Conversation List Sidebar */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">对话列表</h2>
            <Button
              size="sm"
              onClick={handleNewConversation}
              disabled={classes.length === 0}
            >
              <Plus size={16} className="mr-1" />
              新对话
            </Button>
          </div>
          {classes.length > 1 && (
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              value={selectedClassId || ""}
              onChange={(e) =>
                setSelectedClassId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">全部班级</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversationsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              <MessageSquare className="mx-auto mb-2 text-gray-400" size={32} />
              <p>暂无对话</p>
              <p className="text-xs mt-1">点击"新对话"开始学习</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={cn(
                    "w-full p-4 text-left hover:bg-gray-50 transition-colors",
                    selectedConversation?.id === conv.id && "bg-blue-50"
                  )}
                >
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {conv.title || `对话 #${conv.id}`}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {conv.class_name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {conv.last_message_at
                        ? formatRelativeTime(conv.last_message_at)
                        : formatRelativeTime(conv.created_at)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {conv.message_count} 条消息
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                {selectedConversation.title || `对话 #${selectedConversation.id}`}
              </h3>
              <p className="text-sm text-gray-500">
                {selectedConversation.class_name}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <p className="text-lg mb-2">开始你的编程学习之旅</p>
                  <p className="text-sm">
                    输入你的编程问题，AI助手会通过提问引导你思考
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 bg-white border-t border-gray-200"
            >
              <div className="flex gap-3">
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="输入你的问题..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <Button
                  type="submit"
                  disabled={!messageInput.trim() || sendMessageMutation.isPending}
                  loading={sendMessageMutation.isPending}
                  className="self-end"
                >
                  <Send size={18} />
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                按 Enter 发送，Shift + Enter 换行
              </p>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="mx-auto mb-4 text-gray-300" size={64} />
              <p className="text-lg">选择一个对话或创建新对话</p>
              <p className="text-sm mt-2">
                AI助手会通过苏格拉底式提问帮助你学习编程
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: MessageInfo }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <Card
        className={cn(
          "max-w-[80%] p-4",
          isUser ? "bg-blue-600 text-white" : "bg-white"
        )}
      >
        <div className="message-content whitespace-pre-wrap">{message.content}</div>
        <div
          className={cn(
            "text-xs mt-2",
            isUser ? "text-blue-200" : "text-gray-400"
          )}
        >
          {formatRelativeTime(message.created_at)}
        </div>
      </Card>
    </div>
  );
}
