"use client";

import React from "react";
import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { Modal } from "@/components/ui/modal";
import { AuthForm } from "@/components/auth/auth-form";

type Entry = "student" | "teacher";

export function AuthModal({
  open,
  onOpenChange,
  entry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: Entry;
}) {
  const router = useRouter();
  const { isAuthenticated, mustChangePassword, user } = useAuthStore();

  const redirectByRole = useCallback(() => {
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
  }, [router, user]);

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (isAuthenticated && !mustChangePassword) {
      close();
      redirectByRole();
    }
  }, [close, open, isAuthenticated, mustChangePassword, redirectByRole]);

  const handleClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  return (
    <Modal open={open} onOpenChange={handleClose} className="clay-card">
      <AuthForm
        initialEntry={entry}
        showEntrySwitcher={false}
        onCancel={() => handleClose(false)}
        onSuccess={() => {
          handleClose(false);
          redirectByRole();
        }}
      />
    </Modal>
  );
}
