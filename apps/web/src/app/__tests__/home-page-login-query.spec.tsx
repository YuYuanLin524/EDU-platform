import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
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
  AuthForm: () => <div data-testid="auth-form-mock" />,
}));

vi.mock("@/components/effects/LazyParticleBackground", () => ({
  LazyParticleBackground: () => null,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
describe("HomePage login query behavior", () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    authState.isLoading = false;
    authState.user = null;
    authState.pendingUser = null;
    authState.mustChangePassword = false;
    authState.checkAuth.mockReset();
    authState.logout.mockReset();
  });

  it("consumes login query for unauthenticated users", async () => {
    const replace = vi.fn();

    vi.spyOn(nextNavigation, "useRouter").mockReturnValue({
      push: vi.fn(),
      replace,
    } as unknown as ReturnType<typeof nextNavigation.useRouter>);
    vi.spyOn(nextNavigation, "useSearchParams").mockReturnValue(
      new URLSearchParams("login=student")
    );

    render(<HomePage />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/", { scroll: false });
    });
    expect(authState.checkAuth).toHaveBeenCalled();
  });

  it("does not consume query when login param is missing", async () => {
    const replace = vi.fn();

    vi.spyOn(nextNavigation, "useRouter").mockReturnValue({
      push: vi.fn(),
      replace,
    } as unknown as ReturnType<typeof nextNavigation.useRouter>);
    vi.spyOn(nextNavigation, "useSearchParams").mockReturnValue(new URLSearchParams(""));

    render(<HomePage />);

    await waitFor(() => {
      expect(authState.checkAuth).toHaveBeenCalled();
    });
    expect(replace).not.toHaveBeenCalled();
  });
});
