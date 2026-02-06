"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getLatestAssistantCode } from "@/lib/codeRunner/extractCodeSnippet";
import { runJavaScript } from "@/lib/codeRunner/runJavaScript";
import type { ChatMessage } from "../hooks/useChatState";

const DEFAULT_SNIPPET = [
  "def greet(name: str) -> str:",
  "    return f\"你好，{name}\"",
  "",
  "print(greet(\"同学\"))",
].join("\n");

interface CodeLabPanelProps {
  messages: ChatMessage[];
  selectedConversationId: number | null;
}

function getStorageKey(conversationId: number | null): string {
  return conversationId === null
    ? "student-chat:codelab:global"
    : `student-chat:codelab:${conversationId}`;
}

export function CodeLabPanel({ messages, selectedConversationId }: CodeLabPanelProps) {
  const [activeTab, setActiveTab] = useState<"editor" | "output">("editor");
  const [code, setCode] = useState(DEFAULT_SNIPPET);
  const [output, setOutput] = useState("点击“运行 Python”查看结果。");
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunMs, setLastRunMs] = useState<number | null>(null);

  const storageKey = useMemo(
    () => getStorageKey(selectedConversationId),
    [selectedConversationId]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const draft = localStorage.getItem(storageKey);
    if (draft) {
      setCode(draft);
      return;
    }

    const latest = getLatestAssistantCode(messages);
    if (latest) {
      setCode(latest);
      return;
    }

    setCode(DEFAULT_SNIPPET);
  }, [messages, storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.setItem(storageKey, code);
  }, [code, storageKey]);

  const handleExtractLatest = () => {
    const latest = getLatestAssistantCode(messages);
    if (!latest) {
      toast.info("未检测到代码片段", {
        description: "未找到可导入的 Python 代码或填空框架。",
      });
      return;
    }

    setCode(latest);
    toast.success("已提取最新代码", {
      description: "你可以立即运行或继续修改。",
    });
  };

  const handleReset = () => {
    const latest = getLatestAssistantCode(messages);
    setCode(latest ?? DEFAULT_SNIPPET);
    setOutput("代码已重置，可再次运行验证。");
    setLastRunMs(null);
  };

  const handleRun = async () => {
    if (isRunning) {
      return;
    }

    setIsRunning(true);
    setActiveTab("output");

    const result = await runJavaScript(code, { timeoutMs: 3000 });
    setIsRunning(false);
    setLastRunMs(result.durationMs);
    setOutput(result.output);

    if (result.status === "error") {
      toast.error("代码运行失败", {
        description: "请查看输出面板中的报错信息。",
      });
      return;
    }

    if (result.status === "timeout") {
      toast.error("代码执行超时", {
        description: "请检查循环与递归逻辑。",
      });
      return;
    }

    toast.success("运行完成", {
      description: `执行耗时 ${result.durationMs}ms`,
    });
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-card/60 backdrop-blur-sm overflow-hidden">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              代码实验台
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">仅支持 Python：改代码 → 运行验证</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExtractLatest}
              disabled={isRunning}
            >
              导入 AI 框架
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset} disabled={isRunning}>
              <RotateCcw className="h-4 w-4" />
              重置草稿
            </Button>
            <Button size="sm" onClick={handleRun} loading={isRunning}>
              <Play className="h-4 w-4" />
              运行 Python
            </Button>
          </div>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "editor" | "output")}
        className="flex-1 min-h-0 p-4 gap-3 overflow-hidden"
      >
        <TabsList>
          <TabsTrigger value="editor">编辑器</TabsTrigger>
          <TabsTrigger value="output">输出</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="min-h-0 flex-1 overflow-hidden">
          <div className="h-full min-h-0 rounded-lg border border-border bg-background p-2">
            <Textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className={cn(
                "h-full min-h-0 resize-none border-0 bg-transparent font-mono text-sm",
                "focus-visible:ring-0 focus-visible:ring-offset-0"
              )}
              placeholder="在这里输入或粘贴 Python 代码"
              spellCheck={false}
            />
          </div>
        </TabsContent>

        <TabsContent value="output" className="min-h-0 flex-1 overflow-hidden">
          <div className="h-full min-h-0 rounded-lg border border-border bg-secondary/30 p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>运行结果</span>
              <span>{lastRunMs === null ? "尚未运行" : `${lastRunMs}ms`}</span>
            </div>
            <pre className="h-[calc(100%-1.5rem)] min-h-0 overflow-auto whitespace-pre-wrap break-words rounded-md bg-card p-3 text-xs leading-relaxed text-foreground">
              {output}
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
