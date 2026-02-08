# Socratic Coding Platform

中学编程苏格拉底式辅助平台：通过提示词强制 AI 采用苏格拉底式提问方式帮助学生学习编程。

## 功能特性

- **学生端**：与 AI 对话学习编程，AI 通过提问引导而非直接给出答案
- **教师端**：管理班级、配置提示词、查看学生对话、导出学情数据
- **超管端**：批量发放账号、管理班级

## 技术栈

- **后端**：FastAPI + SQLAlchemy 2 + PostgreSQL + Redis + RQ
- **前端**：Next.js + TypeScript
- **部署**：Docker Compose

## 快速开始

## 上线前检查（Vercel + 独立 API）

- 前端生产构建（本地/CI）：

```bash
cd apps/web
npm run build
```

- 后端健康检查：

```bash
curl http://127.0.0.1:8000/healthz
curl http://127.0.0.1:8000/readyz
```

- 生产环境变量最低要求：
  - `JWT_SECRET` 必须替换为强随机值
  - `CORS_ORIGINS` 必须包含 Vercel 生产域名（可逗号分隔）
  - `NEXT_PUBLIC_API_URL` 指向生产 API 域名

- 如需在测试环境跳过启动时 DB 配置同步（避免挂起）：
  - 设置 `SKIP_STARTUP_LLM_SYNC=true`

### 一键启动（推荐）

```bash
chmod +x ./dev.sh
./dev.sh up
```

脚本会自动选择可用端口并在控制台打印访问地址。

默认超管账号（本地开发）：

- 学号/工号：A00001
- 密码：admin123

停止服务：

```bash
./dev.sh down
```

```清理可能存在的残留进程
pkill -f "next dev"
```

### 1. 启动数据库和 Redis
        
```bash
cd deploy
docker compose up -d
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置你的 API Key 等
```

### 3. 启动 API 服务

```bash
cd apps/api
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload
```

### 4. 启动前端

```bash
cd apps/web
npm ci
npm run dev
```

## 项目结构

```
├── apps/
│   ├── api/          # FastAPI 后端
│   ├── web/          # Next.js 前端
│   └── worker/       # RQ 异步任务
├── deploy/
│   └── docker-compose.yml
└── .env.example
```
