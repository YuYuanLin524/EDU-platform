"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Plus } from "lucide-react";
import { ScopeType } from "@/lib/api";
import { usePromptManagement } from "./hooks/usePromptManagement";
import { PromptCard } from "./components";

export default function TeacherPromptsPage() {
  const {
    classes,
    globalPrompts,
    classPrompts,
    isLoading,
    showCreateForm,
    setShowCreateForm,
    newPromptContent,
    setNewPromptContent,
    newPromptScope,
    setNewPromptScope,
    selectedClassId,
    setSelectedClassId,
    createPromptMutation,
    activatePromptMutation,
    handleCloseForm,
  } = usePromptManagement();

  const prompts = [...globalPrompts, ...classPrompts];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">提示词管理</h1>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus size={16} className="mr-1" />
          新建提示词
        </Button>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <Select
          value={selectedClassId?.toString() || "all"}
          onValueChange={(value) => setSelectedClassId(value === "all" ? null : Number(value))}
        >
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="全部提示词" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部提示词</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id.toString()}>
                {c.name} 班级提示词
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                <Label className="mb-2 block">作用范围</Label>
                <Select
                  value={newPromptScope}
                  onValueChange={(value) => setNewPromptScope(value as ScopeType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">全局（所有班级）</SelectItem>
                    <SelectItem value="class">班级专属</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newPromptScope === "class" && (
                <div>
                  <Label className="mb-2 block">选择班级</Label>
                  <Select
                    value={selectedClassId?.toString() || ""}
                    onValueChange={(value) => setSelectedClassId(value ? Number(value) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择班级" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="mb-2 block">提示词内容</Label>
                <Textarea
                  className="h-64 font-mono text-sm"
                  value={newPromptContent}
                  onChange={(e) => setNewPromptContent(e.target.value)}
                  placeholder="输入系统提示词内容..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleCloseForm}>
                  取消
                </Button>
                <Button
                  onClick={() => createPromptMutation.mutate()}
                  loading={createPromptMutation.isPending}
                  disabled={
                    !newPromptContent.trim() || (newPromptScope === "class" && !selectedClassId)
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : prompts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="mx-auto mb-4 text-muted-foreground/40" size={48} />
            <p>暂无提示词</p>
            <p className="text-sm mt-1">点击"新建提示词"开始创建</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Global Prompts */}
          {globalPrompts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">全局提示词</h2>
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
              <h2 className="text-lg font-semibold text-foreground mb-3">班级提示词</h2>
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
