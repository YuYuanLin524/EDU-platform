import { apiClient } from "./client";
import type {
  LLMConfigResponse,
  LLMConfigUpdateRequest,
  LLMConfigUpdateResponse,
  LLMTestRequest,
  LLMTestResponse,
} from "./types";

const client = apiClient.getClient();

export const settingsApi = {
  /**
   * 获取 LLM API 配置
   */
  async getLLMConfig(): Promise<LLMConfigResponse> {
    const response = await client.get("/admin/settings/llm");
    return response.data;
  },

  /**
   * 更新 LLM API 配置
   */
  async updateLLMConfig(data: LLMConfigUpdateRequest): Promise<LLMConfigUpdateResponse> {
    const response = await client.put("/admin/settings/llm", data);
    return response.data;
  },

  /**
   * 测试 LLM API 连接
   */
  async testLLMConnection(data?: LLMTestRequest): Promise<LLMTestResponse> {
    const response = await client.post("/admin/settings/llm/test", data || {});
    return response.data;
  },
};
