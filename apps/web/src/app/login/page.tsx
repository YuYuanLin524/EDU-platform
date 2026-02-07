"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role");
  const entry = role === "teacher" || role === "student" ? role : null;

  useEffect(() => {
    if (entry === null) {
      router.replace("/");
      return;
    }

    router.replace(`/?login=${entry}`);
  }, [entry, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">正在返回首页...</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary"></div>
        </div>
      }
    >
      <LoginRedirectInner />
    </Suspense>
  );
}
