"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, mustChangePassword, user } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !mustChangePassword) {
      redirectByRole();
    } else if (isAuthenticated && mustChangePassword) {
      setShowChangePassword(true);
    }
  }, [isAuthenticated, mustChangePassword]);

  const redirectByRole = () => {
    if (!user) return;
    switch (user.role) {
      case "student":
        router.push("/student/chat");
        break;
      case "teacher":
        router.push("/teacher/classes");
        break;
      case "admin":
        router.push("/admin/users");
        break;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const needsPasswordChange = await login(username, password);
      if (needsPasswordChange) {
        setShowChangePassword(true);
      } else {
        redirectByRole();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  if (showChangePassword) {
    return <ChangePasswordForm onSuccess={redirectByRole} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Socratic Code Tutor</CardTitle>
          <p className="text-sm text-gray-500 mt-2">
            AI编程学习助手 - 通过苏格拉底式提问帮助你学习编程
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
             <Input
               label="学号/工号"
               type="text"
               value={username}
               onChange={(e) => setUsername(e.target.value)}
               placeholder="请输入学号/工号"
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
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
            <Button type="submit" className="w-full" loading={loading}>
              登录
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ChangePasswordForm({ onSuccess }: { onSuccess: () => void }) {
  const { changePassword, user } = useAuthStore();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
      onSuccess();
    } catch {
      setError("密码修改失败，请检查原密码是否正确");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">首次登录请修改密码</CardTitle>
          <p className="text-sm text-gray-500 mt-2">
            欢迎 {user?.display_name || user?.username}，为了账户安全，请设置新密码
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
            <Button type="submit" className="w-full" loading={loading}>
              确认修改
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
