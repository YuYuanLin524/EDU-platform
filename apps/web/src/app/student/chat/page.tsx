"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquare, Lightbulb } from "lucide-react";
import { useChatContext } from "./ChatContext";
import { CodeLabPanel, MessageBubble } from "./components";
import { getConversationTitle } from "@/lib/chat/conversationTitle";

export default function StudentChatPage() {
  const chatState = useChatContext();
  if (!chatState) return null;

  const {
    messages,
    messagesLoading,
    selectedConversation,
    messageInput,
    setMessageInput,
    messagesContainerRef,
    messagesEndRef,
    handleMessagesScroll,
    sendMessageMutation,
    handleSendMessage,
    isStreaming,
  } = chatState;

  const chatPanel = (
    <div className="flex-1 flex flex-col min-h-0">
      {selectedConversation ? (
        <>
          {/* Chat Header - Glass morphism */}
          <div className="glass border-b border-border p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-md animate-gentle-pulse">
                <Lightbulb className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-foreground">
                  {getConversationTitle(selectedConversation)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedConversation.class_name} · 苏格拉底式引导
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                在线
              </div>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
            className="flex-1 overflow-y-auto p-6 space-y-6"
          >
            {messages.length === 0 && messagesLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <div className="w-20 h-20 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                  <Lightbulb className="w-10 h-10 text-muted-foreground" />
                </div>
                <p className="text-lg mb-2">开始你的编程学习之旅</p>
                <p className="text-sm">输入你的编程问题，AI助手会通过提问引导你思考</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <MessageBubble key={msg.id} message={msg} index={index} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Glass morphism */}
          <div className="p-4">
            <form
              onSubmit={handleSendMessage}
              className="glass border border-border rounded-xl p-4 shadow-lg input-focus-ring"
            >
              <div className="flex gap-3">
                <div className="flex-1 bg-secondary/50 rounded-lg border border-border focus-within:border-primary/30 transition-colors">
                  <Textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="输入你的问题..."
                    className="flex-1 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!messageInput.trim() || sendMessageMutation.isPending}
                  loading={sendMessageMutation.isPending}
                  className="self-end h-10 px-4"
                >
                  发送
                  <Send size={16} className="ml-2" />
                </Button>
              </div>
              <div className="mt-2 flex justify-between items-center text-xs text-muted-foreground">
                <span>{isStreaming ? "AI 回复生成中..." : "按 Enter 发送，Shift + Enter 换行"}</span>
                <span>SocraticCode AI</span>
              </div>
            </form>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-secondary mx-auto mb-6 flex items-center justify-center">
              <MessageSquare className="text-muted-foreground/40" size={48} />
            </div>
            <p className="text-xl font-medium mb-2">选择一个对话或创建新对话</p>
            <p className="text-sm">AI助手会通过苏格拉底式提问帮助你学习编程</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full relative overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden lg:flex-row">
        <div className="min-h-0 flex flex-1 flex-col lg:basis-[60%] lg:min-w-[520px]">
          {chatPanel}
        </div>
        <div className="min-h-0 h-[42%] border-t border-border lg:h-auto lg:basis-[40%] lg:min-w-[400px] lg:border-t-0 lg:border-l flex flex-col">
          <CodeLabPanel
            messages={messages}
            selectedConversationId={selectedConversation?.id ?? null}
          />
        </div>
      </div>
    </div>
  );
}
