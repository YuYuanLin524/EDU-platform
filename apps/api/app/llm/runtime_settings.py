from dataclasses import dataclass
from typing import Optional


@dataclass
class LLMRuntimeSettings:
    provider: Optional[str] = None
    base_url: Optional[str] = None
    model_name: Optional[str] = None
    api_key: Optional[str] = None


_runtime_settings = LLMRuntimeSettings()


def get_llm_runtime_settings() -> LLMRuntimeSettings:
    return LLMRuntimeSettings(
        provider=_runtime_settings.provider,
        base_url=_runtime_settings.base_url,
        model_name=_runtime_settings.model_name,
        api_key=_runtime_settings.api_key,
    )


def update_llm_runtime_settings(
    *,
    provider: Optional[str] = None,
    base_url: Optional[str] = None,
    model_name: Optional[str] = None,
    api_key: Optional[str] = None,
    clear_api_key: bool = False,
) -> LLMRuntimeSettings:
    if provider is not None:
        _runtime_settings.provider = provider
    if base_url is not None:
        _runtime_settings.base_url = base_url
    if model_name is not None:
        _runtime_settings.model_name = model_name
    if clear_api_key:
        _runtime_settings.api_key = None
    elif api_key is not None:
        _runtime_settings.api_key = api_key
    return get_llm_runtime_settings()

