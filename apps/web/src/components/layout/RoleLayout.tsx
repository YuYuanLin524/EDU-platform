"use client";

import { AuthGuard } from "@/components/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import type { UserRole } from "@/lib/navigation";

interface RoleLayoutProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  /**
   * Main content overflow behavior
   * - "auto": scrollable (default for admin/teacher)
   * - "hidden": not scrollable (for student chat)
   */
  mainOverflow?: "auto" | "hidden";
}

/**
 * Unified layout component for role-based pages
 * Provides consistent structure: AuthGuard + Sidebar + Main content
 */
export function RoleLayout({ children, allowedRoles, mainOverflow = "auto" }: RoleLayoutProps) {
  return (
    <AuthGuard allowedRoles={allowedRoles}>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className={`flex-1 overflow-${mainOverflow}`}>{children}</main>
      </div>
    </AuthGuard>
  );
}
