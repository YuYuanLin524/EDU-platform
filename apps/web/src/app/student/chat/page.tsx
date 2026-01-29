"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, MessageInfo } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { useStudentChatUIStore } from "@/stores/student-chat-ui";
import { Send, MessageSquare } from "lucide-react";

export default function StudentChatPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const {
    selectedConversationId,
    selectedClassId,
    setSelectedConversationId,
    setSelectedClassId,
  } = useStudentChatUIStore();
  const [messageInput, setMessageInput] = useState("");
  const [localMessages, setLocalMessages] = useState<MessageInfo[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch classes for the dropdown
  const { data: classesData } = useQuery({
    queryKey: ["classes", user?.role, user?.id],
    queryFn: () => api.getClasses(),
  });

  const { data: conversationsData } = useQuery({
    queryKey: ["conversations", selectedClassId],
    queryFn: () => api.getConversations(selectedClassId ?? undefined),
  });

  const selectedConversation =
    conversationsData?.items?.find((c) => c.id === selectedConversationId) || null;

  // Fetch messages for selected conversation
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ["messages", selectedConversationId],
    queryFn: () =>
      selectedConversationId
        ? api.getConversationMessages(selectedConversationId)
        : null,
    enabled: !!selectedConversationId,
  });

  useEffect(() => {
    // 同步服务端消息，但不要在流式过程中覆盖本地乐观消息
    if (!selectedConversationId) {
      // 创建新对话的第一条消息时，selectedConversationId 还是 null；此时不要把本地乐观消息清掉
      if (!isStreaming) setLocalMessages([]);
      return;
    }
    if (!messagesData?.messages) return;
    if (isStreaming) return;
    setLocalMessages(messagesData.messages);
  }, [selectedConversationId, messagesData?.messages, isStreaming]);

  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: (classId: number) => api.createConversation(classId),
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      conversationId,
      content,
      assistantMessageId,
    }: {
      conversationId: number;
      content: string;
      assistantMessageId: number;
    }) => {
      await api.sendMessageStream(
        conversationId,
        content,
        (token) => {
          setLocalMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + token }
                : msg
            )
          );
        },
        (errorMessage) => {
          setLocalMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: errorMessage }
                : msg
            )
          );
        }
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setMessageInput("");
      setIsStreaming(false);
    },
    onError: () => {
      setIsStreaming(false);
    },
  });

  // Auto scroll to bottom when new messages arrive or during streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData?.messages, localMessages]);

  // Set default class if only one
  useEffect(() => {
    if (classesData?.items?.length === 1 && !selectedClassId) {
      setSelectedClassId(classesData.items[0].id);
    }
  }, [classesData, selectedClassId, setSelectedClassId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = messageInput.trim();
    if (!content) return;

    const classId = selectedClassId ?? classesData?.items?.[0]?.id ?? null;
    if (!classId) return;

    // 生成稳定的本地消息 ID，确保流式 token 更新到同一条 assistant 消息
    const baseId = Date.now();

    // 立即清空输入框
    setMessageInput("");
    if (textareaRef.current) textareaRef.current.value = "";

    // 立刻插入本地乐观消息，避免「第一条消息」在创建会话期间空白
    const now = new Date().toISOString();
    const optimisticUserMessage: MessageInfo = {
      id: baseId,
      role: "user",
      content,
      created_at: now,
      token_in: null,
      token_out: null,
    };
    const optimisticAssistantMessage: MessageInfo = {
      id: baseId + 1,
      role: "assistant",
      content: "",
      created_at: now,
      token_in: null,
      token_out: null,
    };
    setLocalMessages((prev) => [...prev, optimisticUserMessage, optimisticAssistantMessage]);
    setIsStreaming(true);

    try {
      let conversationId = selectedConversationId;
      if (!conversationId) {
        const newConversation = await createConversationMutation.mutateAsync(classId);
        conversationId = newConversation.id;
        setSelectedConversationId(conversationId);
      }

      await sendMessageMutation.mutateAsync({
        conversationId,
        content,
        assistantMessageId: optimisticAssistantMessage.id,
      });

      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch {
      return;
    }
  };

  const messages = localMessages;
  const classes = classesData?.items || [];

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="p-4 bg-white border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">
            {selectedConversation
              ? selectedConversation.title || `对话 #${selectedConversation.id}`
              : "新对话"}
          </h3>
          <p className="text-sm text-gray-500">
            {selectedConversation
              ? selectedConversation.class_name
              : classes.find((c) => c.id === selectedClassId)?.name ||
                classes[0]?.name ||
                "未选择班级"}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedConversationId || isStreaming || localMessages.length > 0 ? (
            messagesLoading && messages.length === 0 && !isStreaming ? (
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
              messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
            )
          ) : (
            <div className="flex items-center justify-center text-gray-500 py-16">
              <div className="text-center">
                <MessageSquare className="mx-auto mb-4 text-gray-300" size={64} />
                <p className="text-lg">开始一个新对话</p>
                <p className="text-sm mt-2">发送第一条消息后才会出现在左侧列表</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSendMessage}
          className="p-4 bg-white border-t border-gray-200"
        >
          <div className="flex gap-3">
            <textarea
              ref={textareaRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={classes.length === 0 ? "暂无班级，无法开始对话" : "输入你的问题..."}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              disabled={classes.length === 0}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSendMessage(e);
                }
              }}
            />
            <Button
              type="submit"
              disabled={
                classes.length === 0 ||
                !messageInput.trim() ||
                sendMessageMutation.isPending ||
                createConversationMutation.isPending ||
                isStreaming
              }
              loading={
                sendMessageMutation.isPending ||
                createConversationMutation.isPending ||
                isStreaming
              }
              className="self-end"
            >
              <Send size={18} />
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            按 Enter 发送，Shift + Enter 换行
          </p>
        </form>
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
