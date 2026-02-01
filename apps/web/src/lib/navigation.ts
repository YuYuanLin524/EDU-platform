// Role-based navigation utilities
// Consolidates routing logic that was duplicated across pages

export const ROLE_ROUTES = {
  student: "/student/chat",
  teacher: "/teacher/classes",
  admin: "/admin/users",
} as const;

export type UserRole = keyof typeof ROLE_ROUTES;

/**
 * Get the default route for a user role
 * @param role - The user's role
 * @returns The default route path for that role, or "/login" if unknown
 */
export function getDefaultRoute(role: string): string {
  return ROLE_ROUTES[role as UserRole] ?? "/login";
}

/**
 * Get role display name in Chinese
 * @param role - The user's role
 * @returns Chinese display name for the role
 */
export function getRoleDisplayName(role: string): string {
  const names: Record<string, string> = {
    student: "学生",
    teacher: "教师",
    admin: "管理员",
  };
  return names[role] ?? "未知";
}
