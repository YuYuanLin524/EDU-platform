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
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const { user, logout } = useAuthStore();

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
    <div className="flex flex-col h-full w-64 bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-semibold text-foreground">Socratic Tutor</h1>
        <p className="text-sm text-muted-foreground">{user?.display_name || user?.username}</p>
        <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
          {user?.role === "admin" ? "管理员" : user?.role === "teacher" ? "教师" : "学生"}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
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
