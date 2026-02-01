"use client";

import { RoleLayout } from "@/components/layout/RoleLayout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleLayout allowedRoles={["admin"]}>{children}</RoleLayout>;
}
