import { MessageInfo } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";

interface MessageBubbleProps {
  message: MessageInfo;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <Card
        className={cn("max-w-[80%] p-4", isUser ? "bg-primary text-primary-foreground" : "bg-card")}
      >
        <div className="message-content whitespace-pre-wrap">{message.content}</div>
        <div
          className={cn(
            "text-xs mt-2",
            isUser ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {formatRelativeTime(message.created_at)}
        </div>
      </Card>
    </div>
  );
}
