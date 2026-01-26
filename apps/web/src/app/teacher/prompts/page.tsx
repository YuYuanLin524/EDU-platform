"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, PromptInfo, ClassInfo, ScopeType } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { FileText, Plus, Check, History } from "lucide-react";

export default function TeacherPromptsPage() {
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPromptContent, setNewPromptContent] = useState("");
  const [newPromptScope, setNewPromptScope] = useState<ScopeType>("global");

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: () => api.getClasses(),
  });

  const { data: promptsData, isLoading } = useQuery({
    queryKey: ["prompts", selectedClassId],
    queryFn: () =>
      api.getPrompts(
        selectedClassId ? "class" : undefined,
        selectedClassId ?? undefined
      ),
  });

  const createPromptMutation = useMutation({
    mutationFn: () =>
      api.createPrompt(
        newPromptContent,
        newPromptScope,
        newPromptScope === "class" ? selectedClassId ?? undefined : undefined,
        true
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      setShowCreateForm(false);
      setNewPromptContent("");
    },
  });

  const activatePromptMutation = useMutation({
    mutationFn: (promptId: number) => api.activatePrompt(promptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
  });

  const classes = classesData?.items || [];
  const prompts = promptsData?.items || [];

  // Group prompts by scope
  const globalPrompts = prompts.filter((p) => p.scope_type === "global");
  const classPrompts = prompts.filter((p) => p.scope_type === "class");

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">提示词管理</h1>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus size={16} className="mr-1" />
          新建提示词
        </Button>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <select
          className="px-4 py-2 border border-gray-300 rounded-lg"
          value={selectedClassId || ""}
          onChange={(e) =>
            setSelectedClassId(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">全部提示词</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} 班级提示词
            </option>
          ))}
        </select>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle>新建提示词</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  作用范围
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  value={newPromptScope}
                  onChange={(e) => setNewPromptScope(e.target.value as ScopeType)}
                >
                  <option value="global">全局（所有班级）</option>
                  <option value="class">班级专属</option>
                </select>
              </div>
              {newPromptScope === "class" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    选择班级
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    value={selectedClassId || ""}
                    onChange={(e) =>
                      setSelectedClassId(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  >
                    <option value="">请选择班级</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  提示词内容
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg h-64 font-mono text-sm"
                  value={newPromptContent}
                  onChange={(e) => setNewPromptContent(e.target.value)}
                  placeholder="输入系统提示词内容..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewPromptContent("");
                  }}
                >
                  取消
                </Button>
                <Button
                  onClick={() => createPromptMutation.mutate()}
                  loading={createPromptMutation.isPending}
                  disabled={
                    !newPromptContent.trim() ||
                    (newPromptScope === "class" && !selectedClassId)
                  }
                >
                  创建并激活
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : prompts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <FileText className="mx-auto mb-4 text-gray-300" size={48} />
            <p>暂无提示词</p>
            <p className="text-sm mt-1">点击"新建提示词"开始创建</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Global Prompts */}
          {globalPrompts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                全局提示词
              </h2>
              <div className="space-y-3">
                {globalPrompts.map((prompt) => (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    onActivate={() => activatePromptMutation.mutate(prompt.id)}
                    isActivating={activatePromptMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Class Prompts */}
          {classPrompts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                班级提示词
              </h2>
              <div className="space-y-3">
                {classPrompts.map((prompt) => (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    onActivate={() => activatePromptMutation.mutate(prompt.id)}
                    isActivating={activatePromptMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PromptCard({
  prompt,
  onActivate,
  isActivating,
}: {
  prompt: PromptInfo;
  onActivate: () => void;
  isActivating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className={cn(
        "transition-all",
        prompt.is_active && "ring-2 ring-green-500"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {prompt.is_active && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                  <Check size={12} />
                  当前激活
                </span>
              )}
              <span className="text-xs text-gray-500">
                v{prompt.version} · {formatDate(prompt.created_at)}
              </span>
              {prompt.class_name && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                  {prompt.class_name}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              创建者：{prompt.creator_name || "未知"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!prompt.is_active && (
              <Button
                size="sm"
                variant="outline"
                onClick={onActivate}
                disabled={isActivating}
              >
                <History size={14} className="mr-1" />
                回滚到此版本
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "收起" : "展开"}
            </Button>
          </div>
        </div>
        {expanded && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
              {prompt.content}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
