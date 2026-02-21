"use client";

import { create } from "zustand";
import type { AxiosError } from "axios";
import { api, UserInfo } from "@/lib/api";
import type { ApiError } from "@/lib/api";

interface AuthState {
  user: UserInfo | null;
  pendingUser: UserInfo | null;
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
  pendingUser: null,
  isLoading: true,
  isAuthenticated: false,
  mustChangePassword: false,

  login: async (username: string, password: string) => {
    try {
      const response = await api.login(username, password);
      api.setToken(response.access_token);

      if (response.must_change_password) {
        set({
          user: null,
          pendingUser: response.user,
          isAuthenticated: false,
          mustChangePassword: true,
        });
      } else {
        set({
          user: response.user,
          pendingUser: null,
          isAuthenticated: true,
          mustChangePassword: false,
        });
      }

      return response.must_change_password;
    } catch {
      set({
        user: null,
        pendingUser: null,
        isAuthenticated: false,
        mustChangePassword: false,
      });
      throw new Error("登录失败，请检查学号/工号和密码");
    }
  },

  logout: () => {
    api.clearToken();
    set({
      user: null,
      pendingUser: null,
      isAuthenticated: false,
      mustChangePassword: false,
    });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    api.loadToken();

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) {
      set({
        user: null,
        pendingUser: null,
        isLoading: false,
        isAuthenticated: false,
        mustChangePassword: false,
      });
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await api.getCurrentUser({ signal: controller.signal });

      if (response.must_change_password) {
        set({
          user: null,
          pendingUser: response.user,
          isAuthenticated: false,
          mustChangePassword: true,
          isLoading: false,
        });
      } else {
        set({
          user: response.user,
          pendingUser: null,
          isAuthenticated: true,
          mustChangePassword: false,
          isLoading: false,
        });
      }
    } catch (error) {
      const status = (error as AxiosError)?.response?.status;

      if (status === 401) {
        // Token genuinely invalid/expired — clear it
        api.clearToken();
        set({
          user: null,
          pendingUser: null,
          isAuthenticated: false,
          mustChangePassword: false,
          isLoading: false,
        });
      } else {
        // Timeout / network error — keep the token, just stop loading
        set({ isLoading: false });
      }
    } finally {
      clearTimeout(timeoutId);
    }
  },

  changePassword: async (oldPassword: string, newPassword: string) => {
    try {
      await api.changePassword(oldPassword, newPassword);
      set((state) => ({
        user: state.pendingUser,
        pendingUser: null,
        isAuthenticated: true,
        mustChangePassword: false,
      }));
    } catch (error) {
      const detail = (error as AxiosError<ApiError> | undefined)?.response?.data?.detail;
      throw new Error(detail || "密码修改失败，请稍后重试");
    }
  },

  setMustChangePassword: (value: boolean) => {
    set((state) => ({
      mustChangePassword: value,
      isAuthenticated: value ? false : state.isAuthenticated,
    }));
  },
}));
