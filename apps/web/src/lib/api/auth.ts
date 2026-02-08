import { apiClient } from "./client";
import type { CurrentUserResponse, LoginResponse } from "./types";

const client = apiClient.getClient();

export const authApi = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await client.post<LoginResponse>("/auth/login", {
      username,
      password,
    });
    return response.data;
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await client.post("/auth/change-password", {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },

  async getCurrentUser(): Promise<CurrentUserResponse> {
    const response = await client.get<CurrentUserResponse>("/auth/me");
    return response.data;
  },
};
