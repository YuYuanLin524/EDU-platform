"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Users,
  FileText,
  Download,
  Settings,
  LogOut,
  BookOpen,
  UserPlus,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatContext } from "@/app/student/chat/ChatContext";
import { formatRelativeTime } from "@/lib/utils";
import { getConversationTitle } from "@/lib/chat/conversationTitle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const studentNav: NavItem[] = [
  { label: "对话", href: "/student/chat", icon: <MessageSquare size={20} /> },
];

const teacherNav: NavItem[] = [
  { label: "我的班级", href: "/teacher/classes", icon: <Users size={20} /> },
  { label: "提示词", href: "/teacher/prompts", icon: <FileText size={20} /> },
  { label: "导出", href: "/teacher/exports", icon: <Download size={20} /> },
];

const adminNav: NavItem[] = [
  { label: "用户管理", href: "/admin/users", icon: <UserPlus size={20} /> },
  { label: "班级管理", href: "/admin/classes", icon: <BookOpen size={20} /> },
  { label: "系统设置", href: "/admin/settings", icon: <Settings size={20} /> },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  // Use selectors to only subscribe to needed state
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const isStudentChat = pathname.startsWith("/student/chat");
  const chatState = useChatContext();

  const getNavItems = (): NavItem[] => {
    switch (user?.role) {
      case "student":
        return studentNav;
      case "teacher":
        return teacherNav;
      case "admin":
        return adminNav;
      default:
        return [];
    }
  };

  const handleLogout = () => {
    queryClient.clear();
    logout();
    router.push("/login");
  };

  const navItems = getNavItems();

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col border-r border-border bg-card",
        isStudentChat ? "w-96" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-semibold text-foreground">Socratic Tutor</h1>
        <p className="text-sm text-muted-foreground">{user?.display_name || user?.username}</p>
        <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
          {user?.role === "admin" ? "管理员" : user?.role === "teacher" ? "教师" : "学生"}
        </span>
      </div>

      {/* Navigation */}
      <nav className={cn("p-4 space-y-1", isStudentChat ? "pb-0" : "flex-1")}>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {isStudentChat && chatState ? (
        <div className="flex flex-1 min-h-0 flex-col">
          <div className="px-4 pt-4 pb-3 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground">对话列表</h2>
              <Button
                size="sm"
                onClick={chatState.handleNewConversation}
                disabled={chatState.classes.length === 0}
              >
                <Plus size={16} className="mr-1" />
                新对话
              </Button>
            </div>
            {chatState.classes.length > 1 && (
              <Select
                value={chatState.selectedClassId !== null ? String(chatState.selectedClassId) : "all"}
                onValueChange={(value) =>
                  chatState.setSelectedClassId(value === "all" ? null : Number(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部班级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部班级</SelectItem>
                  {chatState.classes.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            {chatState.conversationsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : chatState.conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                <MessageSquare className="mx-auto mb-2 text-muted-foreground" size={32} />
                <p>暂无对话</p>
                <p className="text-xs mt-1">点击"新对话"开始学习</p>
              </div>
            ) : (
              <div className="space-y-2">
                {chatState.conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => chatState.setSelectedConversation(conv)}
                    className={cn(
                      "w-full p-4 text-left rounded-lg border border-transparent card-hover",
                      chatState.selectedConversation?.id === conv.id
                        ? "bg-primary/10 border-primary/20"
                        : "bg-card hover:bg-muted border-border"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          chatState.selectedConversation?.id === conv.id
                            ? "bg-primary"
                            : "bg-muted-foreground"
                        )}
                      />
                      <span className="font-medium text-sm text-foreground truncate">
                        {getConversationTitle(conv)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
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
      ) : null}

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="flex items-center gap-3 w-full justify-start px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-muted-foreground"
        >
          <LogOut size={20} />
          退出登录
        </Button>
      </div>
    </div>
  );
}
