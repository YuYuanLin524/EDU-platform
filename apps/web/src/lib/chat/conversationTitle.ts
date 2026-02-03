import type { ConversationInfo } from "@/lib/api/types";

function normalizeWhitespace(text: string): string {
  return text.replace(/[\s\u200b\ufeff]+/g, " ").trim();
}

export function getConversationTitle(
  conv: Pick<ConversationInfo, "title" | "first_user_message_preview" | "id">
): string {
  const title = normalizeWhitespace(conv.title ?? "");
  if (title) return title;

  const preview = normalizeWhitespace(conv.first_user_message_preview ?? "");
  if (preview) {
    const MAX = 24;
    return preview.length > MAX ? `${preview.slice(0, MAX)}...` : preview;
  }

  return "新对话";
}
