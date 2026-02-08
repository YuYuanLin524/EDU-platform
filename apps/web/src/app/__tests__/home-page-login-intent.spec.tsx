import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as nextNavigation from "next/navigation";

import HomePage from "../page";

const authState = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: false,
  user: null as {
    role: "admin" | "teacher" | "student";
    display_name?: string | null;
    username?: string | null;
  } | null,
  pendingUser: null as {
    role: "admin" | "teacher" | "student";
    display_name?: string | null;
    username?: string | null;
  } | null,
  mustChangePassword: false,
  checkAuth: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

vi.mock("@/components/auth/auth-form", () => ({
  AuthForm: ({ onSuccess }: { onSuccess?: () => void }) => (
    <button type="button" onClick={() => onSuccess?.()}>
      mock-auth-success
    </button>
  ),
}));

vi.mock("@/components/effects/LazyParticleBackground", () => ({
  LazyParticleBackground: () => null,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) =>
    open ? (
      <div>
        <button type="button" onClick={() => onOpenChange?.(false)}>
          mock-dialog-close
        </button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("HomePage student login intent", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    authState.isAuthenticated = false;
    authState.isLoading = false;
    authState.user = null;
    authState.pendingUser = null;
    authState.mustChangePassword = false;
    authState.checkAuth.mockReset();
    authState.logout.mockReset();
  });

  it("redirects to chat after successful login from 探索之旅", async () => {
    const push = vi.fn();

    vi.spyOn(nextNavigation, "useRouter").mockReturnValue({
      push,
      replace: vi.fn(),
    } as unknown as ReturnType<typeof nextNavigation.useRouter>);
    vi.spyOn(nextNavigation, "useSearchParams").mockReturnValue(new URLSearchParams(""));

    render(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: "开启探索之旅" }));
    fireEvent.click(screen.getByRole("button", { name: "mock-auth-success" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/student/chat");
    });
  });

  it("stays on home after successful login from top-right 学生登录", async () => {
    const push = vi.fn();

    vi.spyOn(nextNavigation, "useRouter").mockReturnValue({
      push,
      replace: vi.fn(),
    } as unknown as ReturnType<typeof nextNavigation.useRouter>);
    vi.spyOn(nextNavigation, "useSearchParams").mockReturnValue(new URLSearchParams(""));

    render(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: "学生登录" }));
    fireEvent.click(screen.getByRole("button", { name: "mock-auth-success" }));

    await waitFor(() => {
      expect(authState.checkAuth).toHaveBeenCalled();
    });
    expect(push).not.toHaveBeenCalledWith("/student/chat");
  });

  it("closes dialog and logs out when closing during password-change-required state", async () => {
    const push = vi.fn();
    const replace = vi.fn();

    vi.spyOn(nextNavigation, "useRouter").mockReturnValue({
      push,
      replace,
    } as unknown as ReturnType<typeof nextNavigation.useRouter>);
    vi.spyOn(nextNavigation, "useSearchParams").mockReturnValue(new URLSearchParams(""));

    const { rerender } = render(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: "学生登录" }));
    expect(screen.getByRole("button", { name: "mock-dialog-close" })).toBeInTheDocument();

    authState.isAuthenticated = false;
    authState.mustChangePassword = true;
    authState.pendingUser = {
      role: "student",
      username: "A00001",
      display_name: "郭小帅",
    };

    rerender(<HomePage />);

    expect(screen.queryByText("学生已登录")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "mock-dialog-close" }));

    await waitFor(() => {
      expect(authState.logout).toHaveBeenCalledTimes(1);
    });
  });
});
