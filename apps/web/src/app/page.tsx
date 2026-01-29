"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { AuthModal } from "@/components/auth/auth-modal";
import { 
  Code2, 
  Sparkles, 
  BookOpen, 
  MessageSquare, 
  Rocket, 
  ChevronRight,
  Zap,
  Star
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore();
  const [authOpen, setAuthOpen] = useState(false);
  const [authEntry, setAuthEntry] = useState<"student" | "teacher">("student");

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user) {
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
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading || (isAuthenticated && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F4F8]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-slate-900 selection:bg-blue-200 font-sans overflow-x-hidden">
      {/* Decorative Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] bg-slate-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-6 left-0 right-0 z-50 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="clay-card px-6 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-black tracking-tight text-blue-900">
                SocraticCode
              </span>
            </div>
            
             <div className="flex items-center gap-4">
               <button
                 type="button"
                 className="clay-btn px-6 py-2.5 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => {
                    setAuthEntry("student");
                    setAuthOpen(true);
                  }}
                >
                  学生登录
                </button>
                <button
                  type="button"
                 className="hidden md:block px-6 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
                  onClick={() => {
                    setAuthEntry("teacher");
                    setAuthOpen(true);
                  }}
                >
                  教师入口
                </button>
              </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-left relative">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-100 text-blue-900 text-sm font-bold mb-8 shadow-sm animate-bounce clay-btn border-none">
                <Star className="w-4 h-4 fill-blue-900" />
                <span>AI 驱动的沉浸式编程学习</span>
              </div>
              <h1 className="text-6xl md:text-7xl font-black leading-tight mb-8 text-slate-800 tracking-tight text-clay">
                玩转代码<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-500">
                  解锁未来
                </span>
              </h1>
              <p className="text-xl text-slate-600 mb-10 leading-relaxed font-medium max-w-lg">
                SocraticCode 不只是一个工具，而是你的 24小时 AI 编程私教。
                通过苏格拉底式问答，带你领略编程的逻辑之美。
              </p>
              <div className="flex flex-wrap gap-6">
                <button
                  type="button"
                  className="clay-btn px-10 py-5 bg-blue-600 text-white font-black text-xl hover:bg-blue-700 flex items-center gap-3 group"
                  onClick={() => {
                    setAuthEntry("student");
                    setAuthOpen(true);
                  }}
                >
                  开启探索之旅
                  <Rocket className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </button>
                <div className="flex items-center gap-4 text-sm font-bold text-slate-500 bg-white/50 px-6 py-2 rounded-2xl border border-white/40 backdrop-blur-sm">
                  <div className="flex -space-x-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200" style={{backgroundImage: `url(https://api.dicebear.com/7.x/avataaars/svg?seed=${i})`}}></div>
                    ))}
                  </div>
                  <span>1000+ 同学已加入</span>
                </div>
              </div>
            </div>

            <div className="relative perspective-1000">
              <div className="clay-card p-8 rotate-y-12 rotate-x-6 transform transition-transform hover:transform-none duration-500">
                <div className="absolute -top-6 -right-6 w-20 h-20 bg-sky-400 rounded-full flex items-center justify-center shadow-lg animate-pulse z-10 border-4 border-white">
                  <Zap className="w-10 h-10 text-white fill-white" />
                </div>
                
                <div className="flex flex-col gap-6">
                  {/* Chat Mockup */}
                  <div className="flex gap-4 items-end">
                    <div className="w-12 h-12 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
                       <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
                    </div>
                    <div className="clay-card px-6 py-4 rounded-bl-none text-slate-700 font-bold text-sm bg-white">
                      为什么我的代码跑不通？这里的逻辑好像有点乱... 🤯
                    </div>
                  </div>

                  <div className="flex gap-4 flex-row-reverse items-end">
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                      <Code2 className="w-7 h-7 text-white" />
                    </div>
                    <div className="clay-card-primary px-6 py-4 rounded-br-none text-sm font-bold">
                      别担心！试着把问题拆解一下。你觉得这行循环的终止条件是什么？🤔
                    </div>
                  </div>

                  <div className="mt-2 pt-4 border-t border-slate-100/50 flex gap-3">
                    <div className="flex-1 bg-slate-50/50 rounded-2xl px-4 py-3 text-sm text-slate-400 font-bold border border-slate-100 shadow-inner">
                      正在输入...
                    </div>
                    <div className="clay-btn bg-blue-600 w-12 h-12 flex items-center justify-center text-white">
                      <ChevronRight className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-black mb-6 text-slate-800 text-clay">为什么选择 SocraticCode?</h2>
            <p className="text-xl text-slate-500 font-bold">告别枯燥，让编程学习变得像玩游戏一样有趣</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="clay-card p-10 hover:-translate-y-2 transition-transform duration-300">
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-8 text-blue-600 clay-btn border-none">
                <MessageSquare className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black mb-4 text-blue-900">启发式引导</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                我们不直接给答案。AI 导师通过巧妙的提问，引导你自己找到解决问题的钥匙，真正掌握编程思维。
              </p>
            </div>

            <div className="clay-card p-10 hover:-translate-y-2 transition-transform duration-300">
              <div className="w-20 h-20 bg-cyan-50 rounded-3xl flex items-center justify-center mb-8 text-cyan-600 clay-btn border-none">
                <BookOpen className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black mb-4 text-cyan-900">个性化辅导</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                无论你是初学者还是进阶玩家，AI 都会根据你的水平调整教学节奏，为你量身定制学习路径。
              </p>
            </div>

            <div className="clay-card p-10 hover:-translate-y-2 transition-transform duration-300">
              <div className="w-20 h-20 bg-sky-50 rounded-3xl flex items-center justify-center mb-8 text-sky-600 clay-btn border-none">
                <Sparkles className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black mb-4 text-sky-900">实时反馈</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                写代码不再孤单。实时获得代码审查和优化建议，每一个 bug 都是成长的机会，让进步看得见。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white/50 backdrop-blur-sm border-t border-white/60">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-3 mb-6">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black text-blue-900">SocraticCode</span>
          </div>
          <p className="text-slate-500 font-bold text-sm">
            Designed for the builders of tomorrow.<br />
            © 2024 SocraticCode. All rights reserved.
          </p>
        </div>
      </footer>
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} entry={authEntry} />
    </div>
  );
}
