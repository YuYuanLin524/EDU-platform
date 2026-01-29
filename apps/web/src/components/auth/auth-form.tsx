"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Entry = "student" | "teacher";

export function AuthForm({
  initialEntry = "student",
  showEntrySwitcher = true,
  onSuccess,
  onCancel,
}: {
  initialEntry?: Entry;
  showEntrySwitcher?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const { login, isAuthenticated, mustChangePassword, user, changePassword } =
    useAuthStore();

  const [entry, setEntry] = useState<Entry>(initialEntry);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setEntry(initialEntry);
  }, [initialEntry]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (mustChangePassword) {
      setShowChangePassword(true);
      return;
    }
    onSuccess?.();
  }, [isAuthenticated, mustChangePassword, onSuccess]);

  const title = useMemo(() => {
    return entry === "teacher" ? "教师登录" : "学生登录";
  }, [entry]);

  const usernameLabel = useMemo(() => {
    return entry === "teacher" ? "工号" : "学号";
  }, [entry]);

  const usernamePlaceholder = useMemo(() => {
    return entry === "teacher" ? "请输入工号" : "请输入学号";
  }, [entry]);

  const hintText = useMemo(() => {
    return entry === "teacher" ? "请输入工号与密码" : "请输入学号与密码";
  }, [entry]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const needsPasswordChange = await login(username, password);
      if (needsPasswordChange) {
        setShowChangePassword(true);
      } else {
        onSuccess?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    if (newPassword.length < 6) {
      setError("新密码长度至少为6位");
      return;
    }

    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      onSuccess?.();
    } catch {
      setError("密码修改失败，请检查原密码是否正确");
    } finally {
      setLoading(false);
    }
  };

  if (showChangePassword) {
    return (
      <>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">首次登录请修改密码</CardTitle>
          <p className="text-sm text-slate-500 mt-2 font-medium">
            欢迎 {user?.display_name || user?.username}，为了账户安全，请设置新密码
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="原密码"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="请输入原密码"
              required
              autoComplete="current-password"
            />
            <Input
              label="新密码"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="请输入新密码（至少6位）"
              required
              autoComplete="new-password"
            />
            <Input
              label="确认新密码"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入新密码"
              required
              autoComplete="new-password"
            />

            {error && (
              <p className="text-sm text-red-600 text-center font-medium">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              确认修改
            </Button>
          </form>
        </CardContent>
      </>
    );
  }

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{title}</CardTitle>
        <p className="text-sm text-slate-500 mt-2 font-medium">{hintText}</p>
      </CardHeader>
      <CardContent>
        {showEntrySwitcher ? (
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={entry === "student" ? "primary" : "outline"}
              className={`flex-1 ${
                entry === "student"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setEntry("student")}
            >
              学生登录
            </Button>
            <Button
              type="button"
              variant={entry === "teacher" ? "secondary" : "outline"}
              className={`flex-1 ${
                entry === "teacher"
                  ? "bg-gray-700 hover:bg-gray-800 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setEntry("teacher")}
            >
              教师入口
            </Button>
          </div>
        ) : null}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label={usernameLabel}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={usernamePlaceholder}
            required
            autoComplete="username"
          />
          <Input
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            required
            autoComplete="current-password"
          />

          {error && (
            <p className="text-sm text-red-600 text-center font-medium">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            {onCancel ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => onCancel()}
              >
                取消
              </Button>
            ) : null}
            <Button type="submit" className="w-full" loading={loading}>
              登录
            </Button>
          </div>
        </form>
      </CardContent>
    </>
  );
}
