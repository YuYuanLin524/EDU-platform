"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useAuthStore } from "@/stores/auth";
import { getDefaultRoute } from "@/lib/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { LazyParticleBackground } from "@/components/effects/LazyParticleBackground";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Code2,
  Sparkles,
  BookOpen,
  MessageSquare,
  Rocket,
  Boxes,
  ChevronRight,
  Zap,
} from "lucide-react";

type LoginEntry = "student" | "teacher";
type StudentLoginIntent = "stay_home" | "go_chat";

function HomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Use selectors to only subscribe to needed state
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const logout = useAuthStore((s) => s.logout);

  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [loginEntry, setLoginEntry] = useState<LoginEntry>("student");
  const [studentLoginIntent, setStudentLoginIntent] = useState<StudentLoginIntent>("stay_home");

  const isStudentAuthenticated = isAuthenticated && user?.role === "student";
  const shouldRedirectToDefaultRoute = Boolean(
    isAuthenticated && user && user.role !== "student" && !mustChangePassword
  );
  const studentDisplayName = user?.display_name || user?.username || "同学";
  const studentInitial = studentDisplayName.slice(0, 1);

  const openLoginDialog = useCallback(
    (entry: LoginEntry, intent: StudentLoginIntent = "stay_home"): void => {
      setLoginEntry(entry);
      setStudentLoginIntent(entry === "student" ? intent : "stay_home");
      setLoginDialogOpen(true);
    },
    []
  );

  const handleAuthSuccess = useCallback((): void => {
    setLoginDialogOpen(false);

    if (loginEntry === "student" && studentLoginIntent === "go_chat") {
      router.push("/student/chat");
    }
  }, [loginEntry, router, studentLoginIntent]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const queryEntry = searchParams.get("login");
    if (isLoading || isAuthenticated) return;
    if (queryEntry !== "student" && queryEntry !== "teacher") return;

    if (queryEntry === "student") {
      openLoginDialog("student", "stay_home");
    } else {
      openLoginDialog("teacher");
    }

    router.replace("/", { scroll: false });
  }, [isLoading, isAuthenticated, searchParams, openLoginDialog, router]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;

    if (user.role !== "student" && !mustChangePassword) {
      router.push(getDefaultRoute(user.role));
    }
  }, [isAuthenticated, isLoading, user, mustChangePassword, router]);

  // Respect user's motion preferences for accessibility
  const shouldReduceMotion = useReducedMotion();

  if (isLoading || shouldRedirectToDefaultRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary"></div>
      </div>
    );
  }

  // Variants that respect reduced motion preferences
  const containerVariants = {
    hidden: { opacity: shouldReduceMotion ? 1 : 0 },
    visible: {
      opacity: 1,
      transition: shouldReduceMotion
        ? {}
        : {
            staggerChildren: 0.15,
            delayChildren: 0.2,
          },
    },
  };

  const itemVariants = {
    hidden: { opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: shouldReduceMotion
        ? { duration: 0 }
        : {
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1] as const,
          },
    },
  };

  return (
    <div className="min-h-screen bg-white text-foreground overflow-x-hidden">
      {/* Particle Background */}
      <LazyParticleBackground />

      {/* Navbar */}
      <nav className="fixed top-6 left-0 right-0 z-50 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-card/80 backdrop-blur-md border border-border rounded-xl px-6 py-3 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-lg">
                <Code2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">SocraticCode</span>
            </div>

            <div className="flex items-center gap-4">
              {isStudentAuthenticated ? (
                <>
                  <div className="hidden sm:flex flex-col text-right leading-tight">
                    <span className="text-sm font-medium text-foreground">
                      {studentDisplayName}
                    </span>
                    <span className="text-xs text-muted-foreground">学生已登录</span>
                  </div>
                  <Avatar className="size-9 border border-border">
                    <AvatarFallback className="text-xs font-semibold">
                      {studentInitial}
                    </AvatarFallback>
                  </Avatar>
                  <Button variant="ghost" size="sm" onClick={logout}>
                    退出登录
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" onClick={() => openLoginDialog("student", "stay_home")}>
                    学生登录
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden md:inline-flex"
                    onClick={() => openLoginDialog("teacher")}
                  >
                    教师入口
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <DialogContent className="max-w-md border-none bg-transparent p-0 shadow-none">
          <Card className="border-border shadow-lg">
            <CardHeader className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="bg-primary rounded-lg p-3">
                  <Code2 className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">苏格拉底式编程助手</CardTitle>
              <CardDescription>通过引导式对话帮助你掌握编程技能</CardDescription>
            </CardHeader>
            <CardContent>
              <AuthForm
                initialEntry={loginEntry}
                showEntrySwitcher={false}
                onSuccess={handleAuthSuccess}
              />
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      {/* Hero Section */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="pt-40 pb-20 px-4 relative z-10"
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-left relative">
              <motion.h1
                variants={itemVariants}
                className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-8 text-foreground tracking-tight"
              >
                玩转代码
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70">
                  解锁未来
                </span>
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-lg"
              >
                SocraticCode 不只是一个工具，而是你的 24小时 AI 编程私教。
                通过苏格拉底式问答，带你领略编程的逻辑之美。
              </motion.p>

              <motion.div variants={itemVariants} className="flex flex-wrap items-start gap-6">
                <div className="flex w-[220px] flex-col gap-3">
                  {isStudentAuthenticated ? (
                    <Link href="/student/chat" className="w-full">
                      <Button
                        size="lg"
                        className="card-hover h-16 w-full justify-between px-6 text-lg"
                      >
                        开启探索之旅
                        <Rocket className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      size="lg"
                      className="card-hover h-16 w-full justify-between px-6 text-lg"
                      onClick={() => openLoginDialog("student", "go_chat")}
                    >
                      开启探索之旅
                      <Rocket className="ml-2 h-5 w-5" />
                    </Button>
                  )}

                  <Button
                    size="lg"
                    variant="outline"
                    className="card-hover h-16 w-full justify-between bg-background px-6 text-lg hover:bg-background"
                    asChild
                  >
                    <Link href="/toolbox">
                      算法实验室
                      <Boxes className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>

                <div className="flex h-16 w-[220px] items-center justify-between rounded-lg border border-border bg-card/50 px-3 text-xs text-muted-foreground">
                  <div className="flex -space-x-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-7 w-7 rounded-full border-2 border-background bg-muted"
                        style={{
                          backgroundImage: `url(https://api.dicebear.com/7.x/avataaars/svg?seed=${i})`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="font-medium">快来加入我们吧！</span>
                </div>
              </motion.div>
            </div>

            <motion.div variants={itemVariants} className="relative">
              <div className="bg-card border border-border rounded-xl p-8 shadow-lg transition-transform hover:scale-[1.02] duration-300">
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg animate-pulse z-10">
                  <Zap className="w-8 h-8 text-primary-foreground" />
                </div>

                <div className="flex flex-col gap-6">
                  {/* Chat Mockup */}
                  <div className="flex gap-4 items-end">
                    <div className="w-12 h-12 rounded-full bg-muted border-2 border-background shadow-sm overflow-hidden">
                      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
                    </div>
                    <div className="bg-muted px-6 py-4 rounded-xl rounded-bl-none text-foreground text-sm max-w-[70%]">
                      为什么我的代码跑不通？这里的逻辑好像有点乱... 🤯
                    </div>
                  </div>

                  <div className="flex gap-4 flex-row-reverse items-end">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center border-2 border-background shadow-sm">
                      <Code2 className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="bg-primary text-primary-foreground px-6 py-4 rounded-xl rounded-br-none text-sm max-w-[70%]">
                      别担心！试着把问题拆解一下。你觉得这行循环的终止条件是什么？🤔
                    </div>
                  </div>

                  <div className="mt-2 pt-4 border-t border-border flex gap-3">
                    <div className="flex-1 bg-muted/50 rounded-lg px-4 py-3 text-sm text-muted-foreground border border-border">
                      正在输入...
                    </div>
                    <Button size="icon" className="w-12 h-12">
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-foreground">
              为什么选择 SocraticCode?
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              告别枯燥，让编程学习变得像玩游戏一样有趣
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card border border-border rounded-xl p-10 hover:-translate-y-2 transition-all duration-300 shadow-sm hover:shadow-md">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-8">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-foreground">启发式引导</h3>
              <p className="text-muted-foreground leading-relaxed">
                我们不直接给答案。AI
                导师通过巧妙的提问，引导你自己找到解决问题的钥匙，真正掌握编程思维。
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-10 hover:-translate-y-2 transition-all duration-300 shadow-sm hover:shadow-md">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-8">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-foreground">个性化辅导</h3>
              <p className="text-muted-foreground leading-relaxed">
                无论你是初学者还是进阶玩家，AI 都会根据你的水平调整教学节奏，为你量身定制学习路径。
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-10 hover:-translate-y-2 transition-all duration-300 shadow-sm hover:shadow-md">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-8">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-foreground">实时反馈</h3>
              <p className="text-muted-foreground leading-relaxed">
                写代码不再孤单。实时获得代码审查和优化建议，每一个 bug
                都是成长的机会，让进步看得见。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-muted/50 border-t border-border relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-3 mb-6">
            <div className="bg-primary p-2 rounded-lg">
              <Code2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">SocraticCode</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Designed for the builders of tomorrow.
            <br />
            由你们亲爱的郭老师开发
          </p>
        </div>
      </footer>
    </div>
  );
}

function HomePageLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary"></div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomePageLoadingFallback />}>
      <HomePageInner />
    </Suspense>
  );
}
