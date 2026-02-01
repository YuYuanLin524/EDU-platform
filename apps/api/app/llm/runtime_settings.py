from __future__ import annotations

from dataclasses import dataclass
from threading import RLock
from typing import Optional


@dataclass(frozen=True)
class LLMRuntimeSettings:
    provider: Optional[str] = None
    base_url: Optional[str] = None
    model_name: Optional[str] = None
    api_key: Optional[str] = None


_lock = RLock()
_settings = LLMRuntimeSettings()


def update_llm_runtime_settings(
    *,
    provider: Optional[str] = None,
    base_url: Optional[str] = None,
    model_name: Optional[str] = None,
    api_key: Optional[str] = None,
) -> None:
    """Update runtime LLM settings (e.g. loaded from DB on startup).

    Only non-None values override the current runtime settings.
    """

    global _settings
    with _lock:
        current = _settings
        _settings = LLMRuntimeSettings(
            provider=provider if provider is not None else current.provider,
            base_url=base_url if base_url is not None else current.base_url,
            model_name=model_name if model_name is not None else current.model_name,
            api_key=api_key if api_key is not None else current.api_key,
        )


def get_llm_runtime_settings() -> LLMRuntimeSettings:
    with _lock:
        return _settings
