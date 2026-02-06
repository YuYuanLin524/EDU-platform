from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_admin
from app.config import get_settings
from app.db.base import get_db
from app.llm.runtime_settings import update_llm_runtime_settings
from app.models import AuditLog, SystemConfig, User
from app.schemas.admin import (
    LLMConfigResponse,
    LLMConfigUpdateRequest,
    LLMConfigUpdateResponse,
    LLMTestRequest,
    LLMTestResponse,
)

router = APIRouter()


# 定义 LLM 配置的键名（统一使用 dotted keys）
LLM_CONFIG_KEYS = {
    "provider_name": "llm.provider",
    "base_url": "llm.base_url",
    "api_key": "llm.api_key",
    "model_name": "llm.model_name",
}

# 兼容旧的 underscore keys
LEGACY_LLM_CONFIG_KEYS = {
    "provider_name": "llm_provider_name",
    "base_url": "llm_base_url",
    "api_key": "llm_api_key",
    "model_name": "llm_model_name",
}


async def migrate_llm_config_keys(db: AsyncSession) -> None:
    """将旧的 underscore keys 迁移到新的 dotted keys（若新键不存在）。"""
    changed = False
    for field, dotted_key in LLM_CONFIG_KEYS.items():
        existing = await db.execute(select(SystemConfig).where(SystemConfig.key == dotted_key))
        if existing.scalar_one_or_none():
            continue

        legacy_key = LEGACY_LLM_CONFIG_KEYS[field]
        legacy_result = await db.execute(select(SystemConfig).where(SystemConfig.key == legacy_key))
        legacy_config = legacy_result.scalar_one_or_none()
        if legacy_config and legacy_config.value:
            db.add(SystemConfig(key=dotted_key, value=legacy_config.value))
            changed = True

    if changed:
        await db.commit()


def mask_api_key(api_key: str) -> str:
    """遮蔽 API Key，只显示前4位和后4位"""
    if not api_key:
        return ""
    if len(api_key) <= 8:
        return "*" * len(api_key)
    return api_key[:4] + "*" * (len(api_key) - 8) + api_key[-4:]


async def load_llm_config_values(db: AsyncSession) -> dict[str, str]:
    config_values: dict[str, str] = {}
    for field, key in LLM_CONFIG_KEYS.items():
        result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
        config = result.scalar_one_or_none()
        if config:
            config_values[field] = config.value
            continue

        legacy_key = LEGACY_LLM_CONFIG_KEYS[field]
        legacy_result = await db.execute(select(SystemConfig).where(SystemConfig.key == legacy_key))
        legacy_config = legacy_result.scalar_one_or_none()
        config_values[field] = legacy_config.value if legacy_config else ""

    return config_values


@router.get("/settings/llm", response_model=LLMConfigResponse)
async def get_llm_config(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """获取 LLM API 配置"""
    await migrate_llm_config_keys(db)
    config_values = await load_llm_config_values(db)
    api_key = config_values.get("api_key", "")

    return LLMConfigResponse(
        provider_name=config_values.get("provider_name", ""),
        base_url=config_values.get("base_url", ""),
        api_key_masked=mask_api_key(api_key),
        model_name=config_values.get("model_name", ""),
        has_api_key=bool(api_key),
    )


@router.put("/settings/llm", response_model=LLMConfigUpdateResponse)
async def update_llm_config(
    request: LLMConfigUpdateRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """更新 LLM API 配置"""
    await migrate_llm_config_keys(db)

    updates = {}
    if request.provider_name is not None:
        updates["provider_name"] = request.provider_name
    if request.base_url is not None:
        updates["base_url"] = request.base_url
    if request.api_key is not None and request.api_key.strip():
        updates["api_key"] = request.api_key.strip()
    if request.model_name is not None:
        updates["model_name"] = request.model_name

    for field, value in updates.items():
        key = LLM_CONFIG_KEYS[field]
        result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
        config = result.scalar_one_or_none()
        if config:
            config.value = value
        else:
            db.add(SystemConfig(key=key, value=value))

        legacy_key = LEGACY_LLM_CONFIG_KEYS[field]
        legacy_result = await db.execute(select(SystemConfig).where(SystemConfig.key == legacy_key))
        legacy_config = legacy_result.scalar_one_or_none()
        if legacy_config:
            legacy_config.value = value

    db.add(
        AuditLog(
            actor_id=admin.id,
            action="update_llm_config",
            target_type="system_config",
            meta={"updated_fields": list(updates.keys())},
            created_at=datetime.utcnow(),
        )
    )

    await db.commit()

    config_values = await load_llm_config_values(db)
    update_llm_runtime_settings(
        provider=config_values.get("provider_name") or None,
        base_url=config_values.get("base_url") or None,
        model_name=config_values.get("model_name") or None,
        api_key=config_values.get("api_key") or None,
    )

    api_key = config_values.get("api_key", "")
    return LLMConfigUpdateResponse(
        success=True,
        message="配置已更新",
        config=LLMConfigResponse(
            provider_name=config_values.get("provider_name", ""),
            base_url=config_values.get("base_url", ""),
            api_key_masked=mask_api_key(api_key),
            model_name=config_values.get("model_name", ""),
            has_api_key=bool(api_key),
        ),
    )


@router.post("/settings/llm/test", response_model=LLMTestResponse)
async def test_llm_connection(
    request: LLMTestRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """测试 LLM API 连接"""
    import time

    import httpx

    settings = get_settings()

    config_values = {}
    for field, key in LLM_CONFIG_KEYS.items():
        result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
        config = result.scalar_one_or_none()
        config_values[field] = config.value if config else ""

    base_url = request.base_url or config_values.get("base_url") or settings.openai_base_url
    api_key = request.api_key or config_values.get("api_key") or settings.openai_api_key
    model_name = request.model_name or config_values.get("model_name") or settings.model_name

    if not base_url:
        return LLMTestResponse(success=False, message="未配置 API 接口地址")
    if not api_key:
        return LLMTestResponse(success=False, message="未配置 API Key")
    if not model_name:
        return LLMTestResponse(success=False, message="未配置模型名称")

    try:
        start_time = time.time()

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{base_url.rstrip('/')}/chat/completions",
                json={
                    "model": model_name,
                    "messages": [{"role": "user", "content": "Hi"}],
                    "max_tokens": 5,
                },
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            )

        latency_ms = int((time.time() - start_time) * 1000)

        if response.status_code == 200:
            return LLMTestResponse(
                success=True,
                message="连接成功",
                latency_ms=latency_ms,
                model=model_name,
            )

        error_detail = ""
        try:
            error_data = response.json()
            error_detail = error_data.get("error", {}).get("message", "") or str(error_data)
        except Exception:
            error_detail = response.text[:200] if response.text else ""

        return LLMTestResponse(
            success=False,
            message=f"API 返回错误 ({response.status_code}): {error_detail}",
            latency_ms=latency_ms,
        )

    except httpx.TimeoutException:
        return LLMTestResponse(success=False, message="连接超时，请检查网络或 API 地址")
    except httpx.ConnectError as e:
        return LLMTestResponse(success=False, message=f"连接失败: {str(e)}")
    except Exception as e:
        return LLMTestResponse(success=False, message=f"测试失败: {str(e)}")
