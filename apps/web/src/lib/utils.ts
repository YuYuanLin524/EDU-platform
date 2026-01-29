import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  // 后端大多返回“无时区标记”的 UTC 时间（例如 2026-01-29T13:55:59.907872）。
  // JS 对这种字符串会按“本地时间”解析，导致显示偏差（CST 会少 8 小时）。
  // 这里把“无时区标记”的时间按 UTC 解析。
  const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(dateString);
  const date = new Date(hasTz ? dateString : `${dateString}Z`);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(dateString: string): string {
  const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(dateString);
  const date = new Date(hasTz ? dateString : `${dateString}Z`);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return formatDate(dateString);
}
