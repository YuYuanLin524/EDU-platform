from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
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

app = FastAPI(
    title="Socratic Coding Platform",
    description="苏格拉底式中学编程辅助平台 API",
    version="0.1.0",
)

# CORS 配置（开发环境允许所有来源，生产环境需收紧）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
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
