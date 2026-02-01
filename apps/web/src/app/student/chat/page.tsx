"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { Plus, Send, MessageSquare } from "lucide-react";
import { useChatState } from "./hooks/useChatState";
import { MessageBubble } from "./components";

export default function StudentChatPage() {
  const {
    conversations,
    messages,
    classes,
    conversationsLoading,
    messagesLoading,
    selectedConversation,
    setSelectedConversation,
    selectedClassId,
    setSelectedClassId,
    messageInput,
    setMessageInput,
    messagesEndRef,
    sendMessageMutation,
    handleSendMessage,
    handleNewConversation,
  } = useChatState();

  return (
    <div className="flex h-full">
      {/* Conversation List Sidebar */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">对话列表</h2>
            <Button size="sm" onClick={handleNewConversation} disabled={classes.length === 0}>
              <Plus size={16} className="mr-1" />
              新对话
            </Button>
          </div>
          {classes.length > 1 && (
            <Select
              value={selectedClassId !== null ? String(selectedClassId) : ""}
              onValueChange={(value) => setSelectedClassId(value ? Number(value) : null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="全部班级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部班级</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversationsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              <MessageSquare className="mx-auto mb-2 text-muted-foreground" size={32} />
              <p>暂无对话</p>
              <p className="text-xs mt-1">点击"新对话"开始学习</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={cn(
                    "w-full p-4 text-left hover:bg-muted transition-colors",
                    selectedConversation?.id === conv.id && "bg-primary/10"
                  )}
                >
                  <div className="font-medium text-sm text-foreground truncate">
                    {conv.title || `对话 #${conv.id}`}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{conv.class_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {conv.last_message_at
                        ? formatRelativeTime(conv.last_message_at)
                        : formatRelativeTime(conv.created_at)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {conv.message_count} 条消息
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-muted">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-card border-b border-border">
              <h3 className="font-semibold text-foreground">
                {selectedConversation.title || `对话 #${selectedConversation.id}`}
              </h3>
              <p className="text-sm text-muted-foreground">{selectedConversation.class_name}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <p className="text-lg mb-2">开始你的编程学习之旅</p>
                  <p className="text-sm">输入你的编程问题，AI助手会通过提问引导你思考</p>
                </div>
              ) : (
                messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 bg-card border-t border-border">
              <div className="flex gap-3">
                <Textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="输入你的问题..."
                  className="flex-1 resize-none"
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
              <p className="text-xs text-muted-foreground mt-2">
                按 Enter 发送，Shift + Enter 换行
              </p>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="mx-auto mb-4 text-muted-foreground/40" size={64} />
              <p className="text-lg">选择一个对话或创建新对话</p>
              <p className="text-sm mt-2">AI助手会通过苏格拉底式提问帮助你学习编程</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
