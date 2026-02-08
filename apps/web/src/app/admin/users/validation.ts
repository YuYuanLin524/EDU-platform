import { z } from "zod";
import type { UserRole, UserStatus, UserToImport } from "./types";

const userRoleSchema = z.union([z.literal("student"), z.literal("teacher")]);
const userStatusSchema = z.union([z.literal("active"), z.literal("disabled")]);

export const usernameSchema = z
  .string()
  .trim()
  .min(1, "学号/工号不能为空")
  .max(100, "学号/工号长度不能超过100")
  .regex(/^[A-Za-z0-9_-]+$/, "学号/工号仅支持字母、数字、下划线和连字符");

export const displayNameSchema = z
  .string()
  .trim()
  .max(100, "姓名长度不能超过100")
  .optional()
  .or(z.literal(""));

const baseImportUserSchema = z.object({
  username: usernameSchema,
  display_name: displayNameSchema,
  role: userRoleSchema,
  class_name: z.string().trim().optional(),
});

export const importUserSchema = baseImportUserSchema.superRefine((value, ctx) => {
  if (value.role === "student" && (!value.class_name || value.class_name.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["class_name"],
      message: "学生账户必须选择班级后才能创建",
    });
  }
});

export const importUsersSchema = z.array(importUserSchema).min(1, "请至少添加一个有效用户");

const rawImportUserSchema = z.object({
  username: z.string(),
  display_name: z.string().optional(),
  role: userRoleSchema,
  class_name: z.string().optional(),
});

export const rawImportUsersSchema = z
  .array(rawImportUserSchema)
  .min(1, "请至少提供一个有效用户");

export const updateUserSchema = z.object({
  userId: z.number().int().positive(),
  username: usernameSchema,
  display_name: displayNameSchema,
  status: userStatusSchema,
});

export const resetPasswordSchema = z.object({
  userId: z.number().int().positive(),
  newPassword: z
    .string()
    .trim()
    .min(6, "密码长度至少为6位")
    .max(128, "密码长度不能超过128位")
    .optional(),
});

export function normalizeImportUsers(users: UserToImport[]): UserToImport[] {
  return users.map((user) => ({
    username: user.username.trim(),
    display_name: user.display_name?.trim() || undefined,
    role: user.role as UserRole,
    class_name: user.class_name?.trim() || undefined,
  }));
}

export function parseJsonImportUsers(input: string): { users: UserToImport[] } | { error: string } {
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch {
    return { error: "JSON 解析失败，请检查格式" };
  }

  const parsedArray = rawImportUsersSchema.safeParse(parsed);
  if (!parsedArray.success) {
    return { error: parsedArray.error.issues[0]?.message ?? "JSON 格式错误：需要一个数组" };
  }

  const users = parsedArray.data
    .map((user) => ({
      username: user.username.trim(),
      display_name: user.display_name?.trim() || undefined,
      role: user.role as UserRole,
      class_name: user.class_name?.trim() || undefined,
    }))
    .filter((user) => user.username.length > 0);

  if (users.length === 0) {
    return { error: "请至少提供一个有效用户" };
  }

  return { users };
}

export function validateUserImports(users: UserToImport[]): string | null {
  const parsed = importUsersSchema.safeParse(normalizeImportUsers(users));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "导入数据不合法";
  }

  return null;
}

export function validateUpdateUser(values: {
  userId: number;
  username: string;
  display_name: string;
  status: UserStatus;
}): string | null {
  const parsed = updateUserSchema.safeParse(values);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "用户信息不合法";
  }
  return null;
}

export function validateResetPassword(values: { userId: number; newPassword?: string }): string | null {
  const parsed = resetPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "密码不合法";
  }

  return null;
}
