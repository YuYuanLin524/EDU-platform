import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import from_url as redis_from_url
from sqlalchemy import select

from app.config import get_settings
from app.auth import auth_router
from app.admin import admin_router
from app.classes import classes_router
from app.prompts import prompts_router
from app.chat import chat_router
from app.teacher import teacher_router
from app.exports import exports_router
from app.db.base import async_session_maker
from app.models import SystemConfig
from app.llm.runtime_settings import update_llm_runtime_settings

settings = get_settings()

app = FastAPI(
    title="Socratic Coding Platform",
    description="苏格拉底式中学编程辅助平台 API",
    version="0.1.0",
)

# CORS 配置（开发环境允许所有来源，生产环境需收紧）
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(classes_router)
app.include_router(prompts_router)
app.include_router(chat_router)
app.include_router(teacher_router)
app.include_router(exports_router)


@app.on_event("startup")
async def load_llm_settings_from_db() -> None:
    if settings.skip_startup_llm_sync:
        return

    try:
        async with asyncio.timeout(settings.startup_db_timeout_seconds):
            async with async_session_maker() as session:
                result = await session.execute(
                    select(SystemConfig).where(
                        SystemConfig.key.in_(
                            [
                                "llm.provider",
                                "llm.base_url",
                                "llm.model_name",
                                "llm.api_key",
                            ]
                        )
                    )
                )
                rows = result.scalars().all()
    except Exception:
        return

    config = {row.key: row.value for row in rows}
    update_llm_runtime_settings(
        provider=config.get("llm.provider"),
        base_url=config.get("llm.base_url"),
        model_name=config.get("llm.model_name"),
        api_key=config.get("llm.api_key"),
    )


@app.get("/healthz")
async def healthz():
    return {"ok": True}


@app.get("/readyz")
async def readyz():
    checks = {
        "database": False,
        "redis": not settings.readiness_check_redis,
    }

    try:
        async with asyncio.timeout(settings.startup_db_timeout_seconds):
            async with async_session_maker() as session:
                await session.execute(select(1))
                checks["database"] = True
    except Exception:
        checks["database"] = False

    if settings.readiness_check_redis:
        redis = redis_from_url(settings.redis_url, decode_responses=True)
        try:
            async with asyncio.timeout(settings.startup_db_timeout_seconds):
                pong = await redis.ping()
                checks["redis"] = bool(pong)
        except Exception:
            checks["redis"] = False
        finally:
            await redis.aclose()

    return {
        "ok": all(checks.values()),
        "checks": checks,
    }
