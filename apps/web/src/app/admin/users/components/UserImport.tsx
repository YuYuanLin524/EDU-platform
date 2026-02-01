"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, UserPlus, Download, CheckCircle, AlertTriangle } from "lucide-react";
import { UserRole } from "@/lib/api";
import type { UserToImport, ImportResponse, ClassInfo } from "../types";

// Import Results Card
interface ImportResultsCardProps {
  importResults: ImportResponse;
  onDownload: () => void;
  onClose: () => void;
}

export function ImportResultsCard({ importResults, onDownload, onClose }: ImportResultsCardProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="text-primary" size={20} />
            导入完成 - 成功创建 {importResults.created_count} 个用户
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onDownload}>
              <Download size={14} className="mr-1" />
              下载结果
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">状态</th>
                <th className="text-left py-2">学号/工号</th>
                <th className="text-left py-2">姓名</th>
                <th className="text-left py-2">初始密码</th>
                <th className="text-left py-2">班级</th>
              </tr>
            </thead>
            <tbody>
              {importResults.users.map((user, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">
                    <CheckCircle className="text-primary" size={16} />
                  </td>
                  <td className="py-2">{user.username}</td>
                  <td className="py-2">{user.display_name || "-"}</td>
                  <td className="py-2 font-mono bg-muted px-2 rounded">{user.initial_password}</td>
                  <td className="py-2">{user.class_name || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {importResults.errors.length > 0 && (
            <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
              <p className="text-sm font-medium text-destructive mb-2">部分错误：</p>
              <ul className="text-sm text-destructive list-disc list-inside">
                {importResults.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground mt-4 flex items-center gap-1">
          <AlertTriangle size={14} />
          请及时下载并妥善保存初始密码，密码只显示一次
        </p>
      </CardContent>
    </Card>
  );
}

// No Class Warning
interface NoClassWarningProps {
  show: boolean;
}

export function NoClassWarning({ show }: NoClassWarningProps) {
  if (!show) return null;

  return (
    <Card className="mb-6 border-border bg-muted/50">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-muted-foreground flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-medium text-foreground">尚未创建班级</p>
            <p className="text-sm text-muted-foreground mt-1">
              当前没有可用的班级。创建学生账户前，建议先
              <a
                href="/admin/classes"
                className="underline font-medium text-foreground hover:text-primary"
              >
                创建班级
              </a>
              ，以便将学生分配到对应班级。
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Import Method Tabs
interface ImportMethodTabsProps {
  importMethod: "form" | "json";
  setImportMethod: (method: "form" | "json") => void;
}

export function ImportMethodTabs({ importMethod, setImportMethod }: ImportMethodTabsProps) {
  return (
    <div className="flex gap-2 mb-4">
      <Button
        variant={importMethod === "form" ? "default" : "outline"}
        onClick={() => setImportMethod("form")}
      >
        <UserPlus size={16} className="mr-1" />
        表单添加
      </Button>
      <Button
        variant={importMethod === "json" ? "default" : "outline"}
        onClick={() => setImportMethod("json")}
      >
        <Upload size={16} className="mr-1" />
        JSON批量导入
      </Button>
    </div>
  );
}

// Form Import Card
interface FormImportCardProps {
  formUsers: UserToImport[];
  classes: ClassInfo[];
  formValidUsers: UserToImport[];
  formCannotCreateStudentsNoClass: boolean;
  formHasStudentWithoutClass: boolean;
  importMutation: {
    isPending: boolean;
  };
  onAddUser: () => void;
  onRemoveUser: (index: number) => void;
  onUserChange: (index: number, field: keyof UserToImport, value: string) => void;
  onSubmit: () => void;
}

export function FormImportCard({
  formUsers,
  classes,
  formValidUsers,
  formCannotCreateStudentsNoClass,
  formHasStudentWithoutClass,
  importMutation,
  onAddUser,
  onRemoveUser,
  onUserChange,
  onSubmit,
}: FormImportCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>添加用户</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {formUsers.map((user, index) => (
            <div key={index} className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[150px]">
                <Label className="mb-1 block">学号/工号</Label>
                <Input
                  value={user.username}
                  onChange={(e) => onUserChange(index, "username", e.target.value)}
                  placeholder="请输入学号/工号"
                />
              </div>
              <div className="flex-1 min-w-[120px]">
                <Label className="mb-1 block">姓名</Label>
                <Input
                  value={user.display_name || ""}
                  onChange={(e) => onUserChange(index, "display_name", e.target.value)}
                  placeholder="选填"
                />
              </div>
              <div className="w-28">
                <Label className="mb-1 block">角色</Label>
                <Select
                  value={user.role}
                  onValueChange={(value) => onUserChange(index, "role", value as UserRole)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">学生</SelectItem>
                    <SelectItem value="teacher">教师</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {user.role === "student" && (
                <div className="w-40">
                  <Label className="mb-1 block">班级</Label>
                  <Select
                    value={user.class_name || ""}
                    onValueChange={(value) => onUserChange(index, "class_name", value)}
                    disabled={classes.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={classes.length === 0 ? "暂无班级" : "请选择班级"} />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.name}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formUsers.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveUser(index)}
                  className="mb-0.5"
                >
                  删除
                </Button>
              )}
            </div>
          ))}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onAddUser}>
              添加一行
            </Button>
            <Button
              onClick={onSubmit}
              loading={importMutation.isPending}
              disabled={
                importMutation.isPending ||
                formValidUsers.length === 0 ||
                formCannotCreateStudentsNoClass ||
                formHasStudentWithoutClass
              }
            >
              创建用户
            </Button>
          </div>
          {(formCannotCreateStudentsNoClass || formHasStudentWithoutClass) && (
            <p className="text-sm text-destructive">
              {formCannotCreateStudentsNoClass
                ? "尚未创建班级，无法创建学生账户"
                : "学生账户必须选择班级后才能创建"}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            密码将自动生成，创建后请下载结果并将密码分发给用户
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// JSON Import Card
interface JsonImportCardProps {
  jsonInput: string;
  setJsonInput: (value: string) => void;
  importMutation: {
    isPending: boolean;
  };
  onSubmit: () => void;
  onDownloadTemplate: () => void;
}

export function JsonImportCard({
  jsonInput,
  setJsonInput,
  importMutation,
  onSubmit,
  onDownloadTemplate,
}: JsonImportCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>JSON批量导入</CardTitle>
          <Button size="sm" variant="outline" onClick={onDownloadTemplate}>
            <Download size={14} className="mr-1" />
            下载模板
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Textarea
            className="h-64 font-mono text-sm"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={`[
  {
    "username": "20240001",
    "display_name": "张三",
    "role": "student",
    "class_name": "初一(1)班"
  },
  {
    "username": "T20240001",
    "display_name": "王老师",
    "role": "teacher"
  }
]`}
          />
          <Button
            onClick={onSubmit}
            loading={importMutation.isPending}
            disabled={!jsonInput.trim()}
          >
            导入用户
          </Button>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>支持的字段：</p>
            <ul className="list-disc list-inside ml-2">
              <li>
                <code className="bg-muted px-1 rounded">username</code> - 学号/工号（必填）
              </li>
              <li>
                <code className="bg-muted px-1 rounded">display_name</code> - 姓名（选填）
              </li>
              <li>
                <code className="bg-muted px-1 rounded">role</code> - 角色：student/teacher（必填）
              </li>
              <li>
                <code className="bg-muted px-1 rounded">class_name</code> -
                班级名称（学生必填，需先创建班级）
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
