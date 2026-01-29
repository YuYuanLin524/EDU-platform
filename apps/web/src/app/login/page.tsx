"use client";

import React from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, mustChangePassword, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !mustChangePassword) {
      redirectByRole();
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            苏格拉底式编程助手
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            通过引导式对话帮助你掌握编程技能
          </p>
        </CardHeader>
        <CardContent>
          <AuthForm initialEntry="student" onSuccess={redirectByRole} />
        </CardContent>
      </Card>
    </div>
  );
}
