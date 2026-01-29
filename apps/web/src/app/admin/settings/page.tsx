"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [provider] = useState("deepseek");
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com/v1");
  const [modelName, setModelName] = useState("deepseek-chat");
  const [apiKey, setApiKey] = useState("");
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    latency_ms: number;
    error?: string | null;
  } | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["adminLLMSettings"],
    queryFn: () => api.getLLMSettings(),
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    setBaseUrl(settingsQuery.data.base_url || "https://api.deepseek.com/v1");
    setModelName(settingsQuery.data.model_name || "deepseek-chat");
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: {
        provider: string;
        base_url: string;
        model_name: string;
        api_key?: string;
      } = { provider, base_url: baseUrl, model_name: modelName };
      if (apiKey.trim()) payload.api_key = apiKey.trim();
      return api.updateLLMSettings(payload);
    },
    onSuccess: async () => {
      setApiKey("");
      setTestResult(null);
      await queryClient.invalidateQueries({ queryKey: ["adminLLMSettings"] });
    },
  });

  const clearKeyMutation = useMutation({
    mutationFn: () => api.updateLLMSettings({ clear_api_key: true }),
    onSuccess: async () => {
      setApiKey("");
      setTestResult(null);
      await queryClient.invalidateQueries({ queryKey: ["adminLLMSettings"] });
    },
  });

  const testMutation = useMutation({
    mutationFn: () => api.testLLMSettings(),
    onSuccess: (data) => {
      setTestResult({ ok: data.ok, latency_ms: data.latency_ms, error: data.error });
    },
    onError: (e) => {
      setTestResult({ ok: false, latency_ms: 0, error: e instanceof Error ? e.message : "测试失败" });
    },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">系统设置</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>模型与 API 配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {settingsQuery.isLoading ? (
            <div className="text-sm text-gray-500">正在加载配置...</div>
          ) : settingsQuery.isError ? (
            <div className="text-sm text-red-600">配置加载失败</div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm text-gray-600">
                  API Key 状态：
                  <span
                    className={
                      settingsQuery.data?.api_key_configured
                        ? "ml-2 inline-flex px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium"
                        : "ml-2 inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium"
                    }
                  >
                    {settingsQuery.data?.api_key_configured ? "已配置" : "未配置"}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => settingsQuery.refetch()}
                  disabled={settingsQuery.isFetching}
                >
                  刷新
                </Button>
              </div>

              <Input
                label="模型"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="例如 deepseek-chat"
              />

              <Input
                label="Base URL"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="例如 https://api.deepseek.com/v1"
              />

              <Input
                label="API Key（仅本次提交会发送到服务端，不会回显）"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="请输入新的 API Key（留空表示不修改）"
                autoComplete="off"
              />

              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={() => saveMutation.mutate()}
                  loading={saveMutation.isPending}
                  disabled={!provider || !baseUrl || !modelName}
                >
                  保存配置
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testMutation.mutate()}
                  loading={testMutation.isPending}
                >
                  测试连通性
                </Button>
                <Button
                  variant="danger"
                  onClick={() => clearKeyMutation.mutate()}
                  loading={clearKeyMutation.isPending}
                >
                  清空 API Key
                </Button>
              </div>

              {testResult && (
                <div
                  className={
                    testResult.ok
                      ? "text-sm rounded-lg border border-green-200 bg-green-50 text-green-800 p-3"
                      : "text-sm rounded-lg border border-red-200 bg-red-50 text-red-800 p-3"
                  }
                >
                  {testResult.ok
                    ? `测试成功：延迟 ${testResult.latency_ms}ms`
                    : `测试失败：${testResult.error || "未知错误"}`}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
