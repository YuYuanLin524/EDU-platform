"use client";

import { RoleLayout } from "@/components/layout/RoleLayout";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayout allowedRoles={["student"]} mainOverflow="hidden">
      {children}
    </RoleLayout>
  );
}
