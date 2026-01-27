"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminSettingsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">系统设置</h1>
      <Card>
        <CardHeader>
          <CardTitle>开发中</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          当前版本暂未提供可配置项。
        </CardContent>
      </Card>
    </div>
  );
}

