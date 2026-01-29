from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional, AsyncGenerator
import httpx
from app.config import get_settings
from app.llm.runtime_settings import get_llm_runtime_settings

settings = get_settings()


@dataclass
class ChatMessage:
    role: str  # system, user, assistant
    content: str


@dataclass
class ChatResponse:
    content: str
    token_in: int
    token_out: int
    model: str
    provider: str
    latency_ms: int


class LLMProvider(ABC):
    """LLM Provider 抽象基类"""

    @abstractmethod
    async def chat(
        self,
        messages: List[ChatMessage],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> ChatResponse:
        pass

    @abstractmethod
    def chat_stream(
        self,
        messages: List[ChatMessage],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncGenerator[str, None]:
        pass


class OpenAICompatibleProvider(LLMProvider):
    """OpenAI API 兼容的 Provider（支持 OpenAI、通义、智谱等）"""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.openai.com/v1",
        model: str = "gpt-4o-mini",
        provider_name: str = "openai",
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.provider_name = provider_name
        self.client = httpx.AsyncClient(timeout=120.0)

    async def chat(
        self,
        messages: List[ChatMessage],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> ChatResponse:
        import time

        start_time = time.time()

        payload = {
            "model": self.model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        response = await self.client.post(
            f"{self.base_url}/chat/completions",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()
        data = response.json()

        latency_ms = int((time.time() - start_time) * 1000)

        return ChatResponse(
            content=data["choices"][0]["message"]["content"],
            token_in=data.get("usage", {}).get("prompt_tokens", 0),
            token_out=data.get("usage", {}).get("completion_tokens", 0),
            model=self.model,
            provider=self.provider_name,
            latency_ms=latency_ms,
        )

    def chat_stream(
        self,
        messages: List[ChatMessage],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncGenerator[str, None]:
        async def _generator() -> AsyncGenerator[str, None]:
            payload = {
                "model": self.model,
                "messages": [{"role": m.role, "content": m.content} for m in messages],
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": True,
            }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            async with self.client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                json=payload,
                headers=headers,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        import json

                        chunk = json.loads(data)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        if "content" in delta:
                            yield delta["content"]

        return _generator()


def get_llm_provider() -> LLMProvider:
    """获取配置的 LLM Provider"""
    runtime = get_llm_runtime_settings()
    return OpenAICompatibleProvider(
        api_key=runtime.api_key or settings.openai_api_key,
        base_url=runtime.base_url or settings.openai_base_url,
        model=runtime.model_name or settings.model_name,
        provider_name=runtime.provider or settings.model_provider,
    )
