"use client";

import { useState } from "react";
import { PromptInfo } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Check, History } from "lucide-react";

interface PromptCardProps {
  prompt: PromptInfo;
  onActivate: () => void;
  isActivating: boolean;
}

export function PromptCard({ prompt, onActivate, isActivating }: PromptCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className={cn("transition-all", prompt.is_active && "ring-2 ring-primary")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {prompt.is_active && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-primary/15 text-primary text-xs rounded-full">
                  <Check size={12} />
                  当前激活
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                v{prompt.version} · {formatDate(prompt.created_at)}
              </span>
              {prompt.class_name && (
                <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                  {prompt.class_name}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              创建者：{prompt.creator_name || "未知"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!prompt.is_active && (
              <Button size="sm" variant="outline" onClick={onActivate} disabled={isActivating}>
                <History size={14} className="mr-1" />
                回滚到此版本
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)}>
              {expanded ? "收起" : "展开"}
            </Button>
          </div>
        </div>
        {expanded && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-mono">
              {prompt.content}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
