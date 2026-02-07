"use client";

import { AuthGuard } from "@/components/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";
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
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main
          className={cn(
            "flex-1 min-h-0 min-w-0",
            mainOverflow === "hidden" ? "overflow-hidden" : "overflow-auto"
          )}
        >
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
