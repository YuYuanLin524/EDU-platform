from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth import auth_router
from app.admin import admin_router
from app.classes import classes_router
from app.prompts import prompts_router
from app.chat import chat_router
from app.teacher import teacher_router

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


@app.get("/healthz")
async def healthz():
    return {"ok": True}
