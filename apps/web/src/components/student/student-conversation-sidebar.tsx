"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useStudentChatUIStore } from "@/stores/student-chat-ui";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, LogOut } from "lucide-react";

export function StudentConversationSidebar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const {
    selectedConversationId,
    selectedClassId,
    setSelectedConversationId,
    setSelectedClassId,
    startNewDraft,
  } = useStudentChatUIStore();

  const { data: classesData } = useQuery({
    queryKey: ["classes", user?.role, user?.id],
    queryFn: () => api.getClasses(),
  });

  const classes = classesData?.items || [];

  useEffect(() => {
    const items = classesData?.items || [];
    if (items.length === 1 && selectedClassId == null) {
      setSelectedClassId(items[0].id);
    }
  }, [classesData?.items, selectedClassId, setSelectedClassId]);

  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ["conversations", selectedClassId],
    queryFn: () => api.getConversations(selectedClassId ?? undefined),
  });

  const conversations = (conversationsData?.items || []).filter(
    (c) => (c.message_count ?? 0) > 0
  );

  // 自动重置无效的对话 ID（例如对话已被删除）
  useEffect(() => {
    if (selectedConversationId !== null && conversations.length > 0) {
      const exists = conversations.some((c) => c.id === selectedConversationId);
      if (!exists) {
        startNewDraft(); // 重置为"新对话"状态
      }
    }
  }, [selectedConversationId, conversations, startNewDraft]);

  const handleLogout = () => {
    queryClient.clear();
    logout();
    router.push("/login");
  };

  return (
    <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold text-gray-900 truncate">
              Socratic Tutor
            </div>
            <div className="text-sm text-gray-500 truncate">
              {user?.display_name || user?.username}
            </div>
            <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
              学生
            </span>
          </div>
          <Button size="sm" onClick={startNewDraft} disabled={classes.length === 0}>
            <Plus size={16} className="mr-1" />
            新对话
          </Button>
        </div>

        {classes.length > 1 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              班级筛选
            </label>
            <select
              className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
          </div>
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
            <p className="text-xs mt-1">发送第一条消息后才会生成对话列表</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversationId(conv.id)}
                className={cn(
                  "w-full p-4 text-left hover:bg-gray-50 transition-colors",
                  selectedConversationId === conv.id && "bg-blue-50"
                )}
              >
                <div className="font-medium text-sm text-gray-900 truncate">
                  {conv.title || `对话 #${conv.id}`}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500 truncate">
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

      {/* 底部用户信息和退出登录 */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.display_name || user?.username}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.username}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="ml-3 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            title="退出登录"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
