"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Entry = "student" | "teacher";

function PasswordField({
  id,
  label,
  value,
  placeholder,
  autoComplete,
  showPassword,
  showPasswordAriaLabel,
  hidePasswordAriaLabel,
  onChange,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  autoComplete: string;
  showPassword: boolean;
  showPasswordAriaLabel: string;
  hidePasswordAriaLabel: string;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          autoComplete={autoComplete}
          className="pr-10"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={showPassword ? hidePasswordAriaLabel : showPasswordAriaLabel}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

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
  // Use selectors to only subscribe to needed state
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const user = useAuthStore((s) => s.user);
  const pendingUser = useAuthStore((s) => s.pendingUser);
  const changePassword = useAuthStore((s) => s.changePassword);

  const [entry, setEntry] = useState<Entry>(initialEntry);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setEntry(initialEntry);
  }, [initialEntry]);

  useEffect(() => {
    if (mustChangePassword) {
      setShowChangePassword(true);
      return;
    }

    setShowChangePassword(false);

    if (!isAuthenticated) return;
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "密码修改失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  if (showChangePassword) {
    return (
      <>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">首次登录请修改密码</CardTitle>
          <p className="text-sm text-muted-foreground mt-2 font-medium">
            欢迎 {pendingUser?.display_name || pendingUser?.username || user?.display_name || user?.username}
            ，为了账户安全，请设置新密码
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <PasswordField
              id="old-password"
              label="原密码"
              value={oldPassword}
              onChange={setOldPassword}
              placeholder="请输入原密码"
              autoComplete="current-password"
              showPassword={showOldPassword}
              showPasswordAriaLabel="显示原密码"
              hidePasswordAriaLabel="隐藏原密码"
              onToggle={() => setShowOldPassword((prev) => !prev)}
            />
            <PasswordField
              id="new-password"
              label="新密码"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="请输入新密码（至少6位）"
              autoComplete="new-password"
              showPassword={showNewPassword}
              showPasswordAriaLabel="显示新密码"
              hidePasswordAriaLabel="隐藏新密码"
              onToggle={() => setShowNewPassword((prev) => !prev)}
            />
            <PasswordField
              id="confirm-password"
              label="确认新密码"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="请再次输入新密码"
              autoComplete="new-password"
              showPassword={showConfirmPassword}
              showPasswordAriaLabel="显示确认新密码"
              hidePasswordAriaLabel="隐藏确认新密码"
              onToggle={() => setShowConfirmPassword((prev) => !prev)}
            />

            {error && <p className="text-sm text-destructive text-center font-medium">{error}</p>}

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
        <p className="text-sm text-muted-foreground mt-2 font-medium">{hintText}</p>
      </CardHeader>
      <CardContent>
        {showEntrySwitcher ? (
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={entry === "student" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setEntry("student")}
            >
              学生登录
            </Button>
            <Button
              type="button"
              variant={entry === "teacher" ? "secondary" : "outline"}
              className="flex-1"
              onClick={() => setEntry("teacher")}
            >
              教师入口
            </Button>
          </div>
        ) : null}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="username">{usernameLabel}</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={usernamePlaceholder}
              required
              autoComplete="username"
            />
          </div>
          <PasswordField
            id="password"
            label="密码"
            value={password}
            onChange={setPassword}
            placeholder="请输入密码"
            autoComplete="current-password"
            showPassword={showLoginPassword}
            showPasswordAriaLabel="显示密码"
            hidePasswordAriaLabel="隐藏密码"
            onToggle={() => setShowLoginPassword((prev) => !prev)}
          />

          {error && <p className="text-sm text-destructive text-center font-medium">{error}</p>}

          <div className="flex gap-3">
            {onCancel ? (
              <Button type="button" variant="outline" className="w-full" onClick={() => onCancel()}>
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
