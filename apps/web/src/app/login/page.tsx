"use client";

import React from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Code2, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { getDefaultRoute } from "@/lib/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AuthForm } from "@/components/auth/auth-form";
import { ParticleBackground } from "@/components/effects/ParticleBackground";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, mustChangePassword, user } = useAuthStore();

  const redirectByRole = React.useCallback(() => {
    if (!user) return;
    router.push(getDefaultRoute(user.role));
  }, [user, router]);

  useEffect(() => {
    if (isAuthenticated && !mustChangePassword) {
      redirectByRole();
    }
  }, [isAuthenticated, mustChangePassword, redirectByRole]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      <ParticleBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>

        <Card className="shadow-lg border-border">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-primary p-3 rounded-lg">
                <Code2 className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">苏格拉底式编程助手</CardTitle>
            <CardDescription>通过引导式对话帮助你掌握编程技能</CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm initialEntry="student" onSuccess={redirectByRole} />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
