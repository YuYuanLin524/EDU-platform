"use client";

import { create } from "zustand";
import { api, UserInfo } from "@/lib/api";

interface AuthState {
  user: UserInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  mustChangePassword: boolean;

  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  setMustChangePassword: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  mustChangePassword: false,

  login: async (username: string, password: string) => {
    try {
      const response = await api.login(username, password);
      api.setToken(response.access_token);

      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(response.user));
      }

      set({
        user: response.user,
        isAuthenticated: true,
        mustChangePassword: response.must_change_password,
      });

      return response.must_change_password;
     } catch {
       set({ user: null, isAuthenticated: false });
       throw new Error("登录失败，请检查学号/工号和密码");
     }
  },

  logout: () => {
    api.clearToken();
    set({
      user: null,
      isAuthenticated: false,
      mustChangePassword: false,
    });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    api.loadToken();

    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const user = await api.getCurrentUser();
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      api.clearToken();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  changePassword: async (oldPassword: string, newPassword: string) => {
    await api.changePassword(oldPassword, newPassword);
    set({ mustChangePassword: false });
  },

  setMustChangePassword: (value: boolean) => {
    set({ mustChangePassword: value });
  },
}));
