"use client";

import { RoleLayout } from "@/components/layout/RoleLayout";
import { ChatProvider } from "@/app/student/chat/ChatContext";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <RoleLayout allowedRoles={["student"]} mainOverflow="hidden">
        {children}
      </RoleLayout>
    </ChatProvider>
  );
}
