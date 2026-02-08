import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AuthForm } from "../auth-form";

const authState = vi.hoisted(() => ({
  login: vi.fn<
    (username: string, password: string) => Promise<boolean>
  >(),
  isAuthenticated: false,
  mustChangePassword: false,
  user: { display_name: "郭小帅", username: "A00001" },
  pendingUser: null as { display_name?: string | null; username?: string | null } | null,
  changePassword: vi.fn<
    (oldPassword: string, newPassword: string) => Promise<void>
  >(),
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

describe("AuthForm", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    authState.login.mockReset();
    authState.changePassword.mockReset();
    authState.isAuthenticated = false;
    authState.mustChangePassword = false;
    authState.user = { display_name: "郭小帅", username: "A00001" };
    authState.pendingUser = null;
  });

  it("switches label/placeholder between student and teacher", () => {
    render(<AuthForm initialEntry="student" />);

    expect(screen.getByText("学号")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("请输入学号")).toBeInTheDocument();
  });

  it("toggles login password visibility", () => {
    render(<AuthForm initialEntry="student" />);

    const passwordInput = screen.getByLabelText("密码") as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "显示密码" }));
    expect(passwordInput.type).toBe("text");

    fireEvent.click(screen.getByRole("button", { name: "隐藏密码" }));
    expect(passwordInput.type).toBe("password");
  });

  it("toggles all password fields in change-password form", async () => {
    authState.isAuthenticated = false;
    authState.mustChangePassword = true;
    authState.pendingUser = { display_name: "郭小帅", username: "A00001" };

    render(<AuthForm initialEntry="student" />);

    await waitFor(() => {
      expect(screen.getByText("首次登录请修改密码")).toBeInTheDocument();
    });

    const oldPasswordInput = screen.getByLabelText("原密码") as HTMLInputElement;
    const newPasswordInput = screen.getByLabelText("新密码") as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText("确认新密码") as HTMLInputElement;

    expect(oldPasswordInput.type).toBe("password");
    expect(newPasswordInput.type).toBe("password");
    expect(confirmPasswordInput.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "显示原密码" }));
    fireEvent.click(screen.getByRole("button", { name: "显示新密码" }));
    fireEvent.click(screen.getByRole("button", { name: "显示确认新密码" }));

    expect(oldPasswordInput.type).toBe("text");
    expect(newPasswordInput.type).toBe("text");
    expect(confirmPasswordInput.type).toBe("text");
  });

  it("shows backend detail when change password fails", async () => {
    authState.isAuthenticated = false;
    authState.mustChangePassword = true;
    authState.pendingUser = { display_name: "郭小帅", username: "A00001" };
    authState.changePassword.mockRejectedValueOnce(new Error("新密码不能与原密码相同"));

    render(<AuthForm initialEntry="student" />);

    await waitFor(() => {
      expect(screen.getByText("首次登录请修改密码")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("原密码"), {
      target: { value: "initial123" },
    });
    fireEvent.change(screen.getByLabelText("新密码"), {
      target: { value: "initial123" },
    });
    fireEvent.change(screen.getByLabelText("确认新密码"), {
      target: { value: "initial123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "确认修改" }));

    await waitFor(() => {
      expect(screen.getByText("新密码不能与原密码相同")).toBeInTheDocument();
    });
  });
});
