"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth";
import { 
  Code2, 
  Sparkles, 
  BookOpen, 
  MessageSquare, 
  Rocket, 
  ChevronRight,
  Github
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user) {
      // Redirect based on role if already logged in
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3FF] text-[#2E1065] selection:bg-violet-200 font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/70 backdrop-blur-xl border-b border-violet-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-violet-600 p-2 rounded-xl shadow-lg shadow-violet-200">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-black tracking-tight text-violet-900">
                SocraticCode
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <Link 
                href="/login" 
                className="px-6 py-2.5 text-sm font-bold text-violet-600 hover:bg-violet-50 rounded-xl transition-all active:scale-95"
              >
                学生登录
              </Link>
              <Link 
                href="/login" 
                className="px-6 py-2.5 text-sm font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700 shadow-lg shadow-violet-200 hover:shadow-violet-300 active:scale-95 transition-all"
              >
                老师入口
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-bold mb-6 animate-bounce">
                <Rocket className="w-4 h-4" />
                <span>技能加点，从此开始！</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6 text-slate-900">
                别死磕代码了<br />
                让 <span className="text-violet-600">AI 助教</span><br />
                带你飞 🚀
              </h1>
              <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed font-medium">
                不会写作业？逻辑理不清？<br />
                SocraticCode 像个懂你的学长，不直接给答案，而是教你如何思考，让你在实战中变身编程大牛。
              </p>
              <div className="flex flex-wrap gap-4">
                <Link 
                  href="/login" 
                  className="px-10 py-5 bg-violet-600 text-white rounded-2xl font-black text-xl hover:bg-violet-700 transition-all hover:shadow-2xl hover:shadow-violet-300 flex items-center gap-3 group active:scale-95"
                >
                  立即开启挑战
                  <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm font-bold text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  Python
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Web 前端
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  C 语言
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-violet-400 to-fuchsia-400 rounded-[2rem] blur-2xl opacity-20 animate-pulse"></div>
              <div className="relative bg-white border-4 border-violet-100 rounded-[2.5rem] shadow-2xl p-6">
                <div className="flex flex-col gap-4">
                  {/* Chat Mockup */}
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0"></div>
                    <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none text-sm font-bold max-w-[80%]">
                      学长，我的 for 循环怎么一直报错呀？😭
                    </div>
                  </div>
                  <div className="flex gap-3 flex-row-reverse">
                    <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="bg-violet-600 text-white p-4 rounded-2xl rounded-tr-none text-sm font-bold max-w-[80%] shadow-lg shadow-violet-200">
                      别急！看看你的计数器是不是没更新？试试在纸上画一下执行流程？😉
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                    <div className="flex-1 bg-slate-50 rounded-xl p-3 text-xs text-slate-400 font-bold">
                      输入你的疑问...
                    </div>
                    <div className="bg-violet-600 w-10 h-10 rounded-xl flex items-center justify-center">
                      <ChevronRight className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Bento Grid */}
      <section id="features" className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">学编程，其实可以很有趣</h2>
            <p className="text-slate-500 font-bold">专门为想学真本事的你设计</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="md:col-span-2 p-8 rounded-[2rem] bg-indigo-50 border-4 border-indigo-100 hover:border-indigo-200 transition-all group">
              <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-100 group-hover:rotate-12 transition-transform">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-black mb-3 text-indigo-900">启发式问答</h3>
              <p className="text-indigo-700/80 font-bold leading-relaxed">
                不给现成代码，而是通过提问引导你发现错误。这种学到的本事才是你自己的！
              </p>
            </div>

            <div className="p-8 rounded-[2rem] bg-emerald-50 border-4 border-emerald-100 hover:border-emerald-200 transition-all group">
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-100 group-hover:scale-110 transition-transform">
                <Rocket className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-black mb-3 text-emerald-900">作业辅助</h3>
              <p className="text-emerald-700/80 font-bold text-sm">
                课后练习没思路？AI 帮你梳理逻辑，拒绝“粘贴复制”。
              </p>
            </div>

            <div className="p-8 rounded-[2rem] bg-amber-50 border-4 border-amber-100 hover:border-amber-200 transition-all group">
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-amber-100 group-hover:-rotate-12 transition-transform">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-black mb-3 text-amber-900">实操笔记</h3>
              <p className="text-amber-700/80 font-bold text-sm">
                自动整理你的错题和重点，复习再也不用翻厚书。
              </p>
            </div>

            <div className="p-8 rounded-[2rem] bg-fuchsia-50 border-4 border-fuchsia-100 hover:border-fuchsia-200 transition-all group">
              <div className="w-14 h-14 bg-fuchsia-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-fuchsia-100 group-hover:translate-y-[-4px] transition-transform">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-black mb-3 text-fuchsia-900">零基础友好</h3>
              <p className="text-fuchsia-700/80 font-bold text-sm">
                不管你基础多薄弱，AI 都会用最通俗易懂的话教你。
              </p>
            </div>

            <div className="md:col-span-3 p-8 rounded-[2rem] bg-slate-50 border-4 border-slate-100 hover:border-slate-200 transition-all group">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1">
                  <h3 className="text-2xl font-black mb-3 text-slate-900">掌握未来的钥匙</h3>
                  <p className="text-slate-600 font-bold leading-relaxed">
                    编程不仅仅是敲代码，更是解决问题的思维方式。在中职阶段打好基础，无论是就业还是升学，你都将领先一步。
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center">
                      <div className={`w-8 h-8 rounded-full ${i===1?'bg-violet-400':i===2?'bg-emerald-400':'bg-amber-400'} opacity-50 animate-pulse`}></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-2 mb-8">
            <div className="bg-violet-600 p-2 rounded-xl">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black text-violet-900">SocraticCode</span>
          </div>
          <p className="text-slate-400 font-bold text-sm">
            专门为中职学生打造的编程学习净土<br />
            © 2024 SocraticCode. 开启你的代码之旅。
          </p>
        </div>
      </footer>
    </div>
  );
}
