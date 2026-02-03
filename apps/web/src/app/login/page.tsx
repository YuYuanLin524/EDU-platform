"use client";

import React from "react";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Code2, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { getDefaultRoute } from "@/lib/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AuthForm } from "@/components/auth/auth-form";
import { LazyParticleBackground } from "@/components/effects/LazyParticleBackground";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role");
  // Use selectors to only subscribe to needed state
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const user = useAuthStore((s) => s.user);
  // Respect user's motion preferences for accessibility
  const shouldReduceMotion = useReducedMotion();

  const entry = role === "teacher" ? "teacher" : "student";
  const isDefaultStudentLogin = !role || role === "student";

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
      <LazyParticleBackground />

      <motion.div
        initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5 }}
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
            <AuthForm
              initialEntry={entry}
              showEntrySwitcher={false}
              onSuccess={redirectByRole}
            />

            {isDefaultStudentLogin ? (
              <div className="mt-6 text-center text-sm text-muted-foreground">
                <Link href="/login?role=teacher" className="text-foreground hover:underline">
                  教师入口
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  // Next.js requires useSearchParams() to be wrapped in a Suspense boundary.
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary"></div>
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
