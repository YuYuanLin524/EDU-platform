"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { settingsApi } from "@/lib/api/settings";
import { Eye, EyeOff, RefreshCw, Loader2, Globe } from "lucide-react";
import { toast } from "sonner";
import type { LLMConfigUpdateRequest } from "@/lib/api/types";

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();

  // Form state
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // Track if there are unsaved changes
  const [isDirty, setIsDirty] = useState(false);

  // Fetch current config
  const configQuery = useQuery({
    queryKey: ["llm-config"],
    queryFn: () => settingsApi.getLLMConfig(),
  });

  // Update form when data loads
  useEffect(() => {
    if (configQuery.data) {
      setBaseUrl(configQuery.data.base_url || "");
      setModelName(configQuery.data.model_name || "");
      // Don't set apiKey - it comes masked
      setApiKey("");
      setIsDirty(false);
    }
  }, [configQuery.data]);

  // Update config mutation
  const updateMutation = useMutation({
    mutationFn: (data: LLMConfigUpdateRequest) => settingsApi.updateLLMConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["llm-config"] });
      setIsDirty(false);
      setApiKey(""); // Clear the API key field after successful save
      toast.success("配置已保存", {
        description: "LLM API 配置已成功更新",
      });
    },
    onError: (error) => {
      toast.error("保存失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    },
  });

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: () =>
      settingsApi.testLLMConnection({
        base_url: baseUrl || undefined,
        api_key: apiKey || undefined,
        model_name: modelName || undefined,
      }),
    onSuccess: (data) => {
      if (data.success) {
        toast.success("连接成功", {
          description: `延迟: ${data.latency_ms}ms`,
        });
      } else {
        toast.error("连接失败", {
          description: data.message,
        });
      }
    },
    onError: (error) => {
      toast.error("测试失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    },
  });

  const handleSave = () => {
    const data: LLMConfigUpdateRequest = {};
    if (baseUrl !== (configQuery.data?.base_url || "")) {
      data.base_url = baseUrl;
    }
    if (apiKey) {
      data.api_key = apiKey;
    }
    if (modelName !== (configQuery.data?.model_name || "")) {
      data.model_name = modelName;
    }

    if (Object.keys(data).length === 0) {
      toast.info("没有需要保存的更改");
      setIsDirty(false);
      return;
    }

    updateMutation.mutate(data);
  };

  const handleInputChange = (
    setter: (value: string) => void,
    value: string
  ) => {
    setter(value);
    setIsDirty(true);
  };

  const hasConfig = configQuery.data?.has_api_key && configQuery.data?.base_url;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">系统设置</h1>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">
              大模型 API 配置
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Base URL */}
          <div className="space-y-2">
            <Label htmlFor="base-url">API 接口地址</Label>
            <Input
              id="base-url"
              placeholder="https://openrouter.ai/api/v1/chat/completions"
              value={baseUrl}
              onChange={(e) => handleInputChange(setBaseUrl, e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              请添加具体带有路径的网址，如: https://openrouter.ai/api/v1
              {" "}
              <a
                href="https://platform.openai.com/docs/api-reference"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                更多说明
              </a>
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showApiKey ? "text" : "password"}
                placeholder={
                  configQuery.data?.has_api_key
                    ? `已配置 (${configQuery.data.api_key_masked})`
                    : "请输入 API Key"
                }
                value={apiKey}
                onChange={(e) => handleInputChange(setApiKey, e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showApiKey ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
            {configQuery.data?.has_api_key && (
              <p className="text-xs text-muted-foreground">
                留空则保持现有 API Key 不变
              </p>
            )}
          </div>

          {/* Model Name */}
          <div className="space-y-2">
            <Label htmlFor="model-name">模型名称</Label>
            <Input
              id="model-name"
              placeholder="deepseek-chat/deepseek-resoner"
              value={modelName}
              onChange={(e) => handleInputChange(setModelName, e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending || (!hasConfig && !apiKey)}
            >
              {testMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              测试连接
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (configQuery.data) {
                  setBaseUrl(configQuery.data.base_url || "");
                  setModelName(configQuery.data.model_name || "");
                  setApiKey("");
                  setIsDirty(false);
                }
              }}
              disabled={!isDirty}
            >
              重置
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isDirty || updateMutation.isPending}
              loading={updateMutation.isPending}
            >
              保存配置
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
