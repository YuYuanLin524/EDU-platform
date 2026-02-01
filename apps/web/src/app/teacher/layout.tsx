"use client";

import { RoleLayout } from "@/components/layout/RoleLayout";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <RoleLayout allowedRoles={["teacher", "admin"]}>{children}</RoleLayout>;
}
