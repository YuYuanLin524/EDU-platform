"use client";

import { memo } from "react";
import { MessageInfo } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { Lightbulb, User } from "lucide-react";

interface StreamableMessage extends MessageInfo {
  __stream?: boolean;
  __pending?: boolean;
  __hasDelta?: boolean;
}

interface MessageBubbleProps {
  message: StreamableMessage;
  index?: number;
}

// Loading dots component
function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="w-2 h-2 bg-current rounded-full animate-bounce"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="w-2 h-2 bg-current rounded-full animate-bounce"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="w-2 h-2 bg-current rounded-full animate-bounce"
        style={{ animationDelay: "300ms" }}
      />
    </span>
  );
}

// Custom comparison for memo - re-render when content or stream status changes
function arePropsEqual(
  prevProps: MessageBubbleProps,
  nextProps: MessageBubbleProps
): boolean {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.__stream === nextProps.message.__stream &&
    prevProps.message.__pending === nextProps.message.__pending &&
    prevProps.index === nextProps.index
  );
}

export const MessageBubble = memo(function MessageBubble({
  message,
  index = 0,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isStreaming = !!message.__stream;
  const isPending = !!message.__pending;
  const hasDelta = !!message.__hasDelta;

  const showLoading =
    isPending ||
    (!isUser && isStreaming && !hasDelta);
  const showCursor = !isUser && isStreaming && !showLoading;

  return (
    <div
      className={cn("flex gap-4 message-enter", isUser && "flex-row-reverse")}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Avatar */}
      {isUser ? (
        <div className="w-10 h-10 rounded-full bg-secondary border-2 border-background shadow-sm flex-shrink-0 flex items-center justify-center">
          <User className="w-5 h-5 text-muted-foreground" />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-full bg-primary flex-shrink-0 flex items-center justify-center shadow-sm animate-gentle-pulse">
          <Lightbulb className="w-5 h-5 text-primary-foreground" />
        </div>
      )}

      {/* Message Content */}
      <div className={cn("flex-1", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "max-w-[85%] p-4 shadow-sm",
            isUser
              ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-none"
              : "bg-secondary/50 border border-border rounded-2xl rounded-tl-none"
          )}
        >
          <div className="message-content text-sm leading-relaxed">
            {showLoading ? (
              <LoadingDots />
            ) : (
              <>
                {message.content}
                {showCursor && (
                  <span className="inline-block w-0.5 h-4 bg-current ml-0.5 animate-pulse" />
                )}
              </>
            )}
          </div>
        </div>
        <span
          className={cn("text-xs text-muted-foreground mt-2", isUser ? "text-right" : "block")}
        >
          {formatRelativeTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}, arePropsEqual);
