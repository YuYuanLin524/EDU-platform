"use client";

import { AuthGuard } from "@/components/auth-guard";
import { StudentConversationSidebar } from "@/components/student/student-conversation-sidebar";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["student"]}>
      <div className="flex h-screen bg-gray-50">
        <StudentConversationSidebar />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </AuthGuard>
  );
}
