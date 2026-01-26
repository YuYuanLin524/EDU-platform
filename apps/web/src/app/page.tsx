"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // Redirect based on role
    switch (user?.role) {
      case "student":
        router.push("/student/chat");
        break;
      case "teacher":
        router.push("/teacher/classes");
        break;
      case "admin":
        router.push("/admin/users");
        break;
      default:
        router.push("/login");
    }
  }, [isAuthenticated, isLoading, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}
