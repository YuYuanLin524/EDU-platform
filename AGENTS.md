# 苏格拉底式编程平台 - Agent 使用指南

## 项目概述

苏格拉底式编程平台：基于 AI 的编程教育平台，使用苏格拉底式提问法，通过引导式对话而非直接给出答案来教授高中生编程。

**技术栈：**
- **前端：** Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui + Zustand
- **后端：** FastAPI + SQLAlchemy 2 (异步) + PostgreSQL + Redis + RQ
- **测试：** Vitest (前端), pytest (后端)
- **部署：** Docker Compose

## 构建/检查/测试命令

### 前端 (apps/web)

```bash
cd apps/web

# 开发
npm run dev              # 启动 Next.js 开发服务器
npm ci                   # 安装依赖

# 构建
npm run build            # 生产构建

# 代码质量
npm run lint             # ESLint 检查
npm run format           # Prettier 格式化所有文件
npm run format:check     # Prettier 检查（不写入）

# 测试
npm run test             # 以监视模式运行 Vitest（交互式）
npm run test:run         # 单次运行 Vitest（CI 模式）
npm run test:coverage    # 运行测试并生成覆盖率报告

# 运行单个测试文件
npm run test:run -- src/components/auth/__tests__/auth-form.spec.tsx

# 运行单个测试（按名称匹配）
npm run test:run -- --reporter=verbose -t "应该渲染登录表单"
```

### 后端 (apps/api)

```bash
cd apps/api

# 环境设置（需要 Python >= 3.11）
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# 数据库
alembic upgrade head     # 运行数据库迁移

# 启动服务器
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# 测试
python3 -m pytest        # 运行所有测试
python3 -m pytest -q     # 安静模式运行测试
python3 -m pytest -v     # 详细模式运行测试

# 运行单个测试文件
python3 -m pytest tests/test_auth.py

# 运行单个测试类
python3 -m pytest tests/test_auth.py::TestLogin

# 运行单个测试方法
python3 -m pytest tests/test_auth.py::TestLogin::test_login_success

# 覆盖率
python3 -m pytest --cov=app --cov-report=term-missing
```

### Worker (apps/worker)

```bash
cd apps/worker
pip install -e "."
rq worker --url redis://localhost:6379/0
```

### 开发编排（根目录）

```bash
# 推荐：使用 dev.sh 进行全栈开发
./dev.sh up              # 启动 postgres/redis + API + Web
./dev.sh stop            # 停止 API + Web（保留数据库）
./dev.sh down            # 停止所有服务包括数据库
./dev.sh status          # 查看服务状态
./dev.sh logs [api|web|all]  # 查看日志
```

## 代码风格指南

### TypeScript / React (前端)

#### 导入规范
- 使用 `@/` 别名从 `src/` 目录导入
- 分组导入：React/Next、第三方库、内部模块、类型
- 使用绝对路径导入组件：`@/components/ui/button`
- 工具函数使用具名导出

```typescript
// 良好示例
import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
import type { UserInfo } from "@/lib/api/types";
```

#### 格式化
- **Prettier 配置：** 使用分号、双引号、2空格缩进、es5 尾随逗号、100字符行宽
- 保存时自动使用 Prettier 格式化

#### 类型规范
- 始终使用 TypeScript 严格模式
- 函数优先使用显式返回类型
- 简单结构使用 `type`，可扩展对象使用 `interface`
- 组件属性类型使用 `React.ComponentProps<"element">`
- 不确定时使用 `unknown` 而非 `any`

```typescript
// 良好示例
interface AuthState {
  user: UserInfo | null;
  isLoading: boolean;
}

function formatDate(dateString: string): string {
  // 显式返回类型
}

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: "default" | "outline";
};
```

#### 命名规范
- **组件：** PascalCase（例如：`LoginPage`、`AuthForm`）
- **函数/变量：** camelCase（例如：`handleSubmit`、`isLoading`）
- **常量：** UPPER_SNAKE_CASE（真正的常量）
- **文件：**
  - 组件：PascalCase（例如：`AuthForm.tsx`）
  - 工具函数/钩子：camelCase（例如：`use-mobile.ts`）
  - 测试：`*.spec.tsx` 或 `*.test.ts`
- **自定义钩子：** 以 `use` 开头（例如：`useChatState`）
- **Zustand 状态：** 以 `Store` 结尾（例如：`useAuthStore`）

#### 组件结构
- 简单情况使用箭头函数的函数组件
- 导出组件使用 `function` 声明
- 保持组件在 100 行以内（ESLint 在 100 行时警告）
- 客户端组件使用 `"use client"` 指令
- `useSearchParams()` 必须包裹在 Suspense 边界内

```typescript
// 良好组件模式
"use client";

import * as React from "react";
import { Suspense } from "react";

function ComponentInner() {
  // 组件逻辑
}

export default function Component() {
  return (
    <Suspense fallback={<Loading />}>
      <ComponentInner />
    </Suspense>
  );
}
```

#### 错误处理
- 异步操作使用 try/catch
- API 客户端处理 401 错误（自动跳转到登录页）
- 向用户显示中文错误消息
- 使用 `sonner` 进行 Toast 通知

#### CSS / Tailwind
- 使用 shadcn/ui 语义化令牌：`bg-primary`、`text-muted-foreground`
- 条件类优先使用 `cn()` 工具函数（来自 `@/lib/utils`）
- 不要使用硬编码的 Tailwind 颜色（例如 `bg-blue-500`），使用语义化令牌
- CSS 变量使用 `hsl()` 格式

### Python (后端)

#### 导入规范
- 分组：标准库、第三方库、本地应用模块
- 应用内使用绝对导入

```python
# 良好示例
from datetime import datetime
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.db.base import get_db
from app.models import User
from app.schemas.auth import LoginRequest
```

#### 格式化
- 遵循 PEP 8
- 字符串使用双引号
- 最大行宽：100 字符
- 多行结构使用尾随逗号

#### 类型规范
- 处处使用类型注解
- 异步操作使用 `async/await`
- 请求/响应模式使用 Pydantic v2 模型
- 优先使用 `dict` 而非 `Dict`，`list` 而非 `List`（Python 3.9+）

#### 命名规范
- **模块：** snake_case（例如：`routes.py`、`models.py`）
- **类：** PascalCase（例如：`User`、`Conversation`）
- **函数/变量：** snake_case（例如：`get_db`、`user_id`）
- **常量：** UPPER_SNAKE_CASE
- **私有方法：** 以 `_` 开头（例如：`_validate_input`）
- **枚举类：** PascalCase，成员使用 UPPER_SNAKE_CASE

#### 数据库模型 (SQLAlchemy)
- 使用显式 `Column()` 并添加类型注解
- 为频繁查询的字段添加索引
- `__tablename__` 使用小写复数
- 关系定义使用 back_populates

```python
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    
    conversations = relationship("Conversation", back_populates="student")
```

#### 错误处理
- API 错误使用 FastAPI `HTTPException`
- 使用适当的状态码
- 面向用户的错误返回中文消息
- 适当记录服务器端错误

```python
# 良好示例
if user is None:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="用户名或密码错误",
    )
```

#### 测试规范
- 使用 pytest 并支持异步
- 使用描述性的测试类和方法名
- 使用 `conftest.py` 中的共享 fixtures
- 测试方法格式：`test_<操作>_<预期结果>`

```python
class TestLogin:
    async def test_login_success(self, client: AsyncClient, admin_user: User):
        """测试成功登录返回令牌和用户信息。"""
        response = await client.post("/auth/login", json={...})
        assert response.status_code == 200
```

### 测试指南

#### 前端测试
- 测试与源文件同位置：`__tests__/component.spec.tsx`
- 使用 `@testing-library/react` 进行组件测试
- 使用 Vitest 的 mock 功能模拟 API 调用
- 测试用户交互和组件状态

#### 后端测试
- 测试位于 `apps/api/tests/`
- 使用 `conftest.py` 中的共享 fixtures
- 测试数据库使用 SQLite 内存模式
- 使用令牌 fixtures 测试认证
- 每个端点应有成功和错误案例测试

## 项目结构

```
apps/
├── web/                    # Next.js 前端
│   ├── src/
│   │   ├── app/           # Next.js 应用路由
│   │   ├── components/
│   │   │   ├── ui/        # shadcn/ui 基础组件
│   │   │   ├── auth/      # 认证组件
│   │   │   └── layout/    # 布局组件
│   │   ├── hooks/         # 自定义 React 钩子
│   │   ├── lib/           # 工具函数和 API 客户端
│   │   └── stores/        # Zustand 状态管理
│   ├── package.json
│   └── vitest.config.mts
│
├── api/                    # FastAPI 后端
│   ├── app/
│   │   ├── auth/          # 认证路由和安全
│   │   ├── models/        # SQLAlchemy 模型
│   │   ├── schemas/       # Pydantic 模式
│   │   └── main.py        # FastAPI 应用入口
│   ├── tests/             # pytest 测试
│   └── pyproject.toml
│
└── worker/                 # RQ 异步任务
    └── pyproject.toml
```

## 性能优化最佳实践

### Zustand 状态管理
- **始终使用 Selector 模式**：只订阅需要的状态，避免整个 store 变化时重渲染

```typescript
// ❌ 避免 - 会订阅整个 store
const { user, isAuthenticated } = useAuthStore();

// ✅ 推荐 - 只订阅需要的字段
const user = useAuthStore((s) => s.user);
const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
```

### 数据获取优化
- **并行获取独立数据**：使用 `useQueries` 并行获取不依赖的数据

```typescript
// ❌ 避免 - 顺序执行
const { data: classes } = useQuery({...});
const { data: conversations } = useQuery({...}); // 等待上面完成

// ✅ 推荐 - 并行获取
const [{ data: classes }, { data: conversations }] = useQueries({
  queries: [
    { queryKey: ["classes"], queryFn: api.getClasses },
    { queryKey: ["conversations"], queryFn: api.getConversations },
  ],
});
```

### 组件懒加载
- **延迟加载重组件**：使用 `React.lazy()` + `Suspense`

```typescript
const HeavyComponent = lazy(() => import("./HeavyComponent"));

<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

### 列表渲染优化
- **使用 React.memo**：防止列表项不必要的重渲染

```typescript
export const ListItem = memo(function ListItem({ item }) {
  return <div>{item.name}</div>;
});
```

### Hook 拆分原则
- **单一职责**：每个 hook 只做一件事，避免返回过多属性
- **数据分离**：将数据获取、UI 状态、业务逻辑拆分到不同 hooks

```typescript
// ❌ 避免 - 臃肿的 hook
function useUserManagement() {
  // 100+ 行代码，返回 70+ 个属性
}

// ✅ 推荐 - 拆分为专注的 hooks
function useUserFilters() { /* 筛选逻辑 */ }
function useUserImport() { /* 导入逻辑 */ }
function useUserEditing() { /* 编辑状态 */ }
function useUserMutations() { /* 数据变更 */ }
```

### 可访问性
- **尊重用户偏好**：使用 `useReducedMotion()` 支持减少动画

```typescript
import { useReducedMotion } from "framer-motion";

const shouldReduceMotion = useReducedMotion();

<motion.div
  initial={shouldReduceMotion ? "visible" : "hidden"}
  animate="visible"
  transition={shouldReduceMotion ? {} : { duration: 0.5 }}
/>
```

## 开发提示

1. **修改后始终运行测试：** `npm run test:run`（前端）或 `pytest -q`（后端）
2. **使用 dev.sh 保持一致性：** 它处理端口选择、环境设置和服务编排
3. **默认管理员账号：** A00001 / admin123（本地开发）
4. **提交前检查：** 确保代码检查和格式化通过
5. **测试驱动开发：** 修改功能时添加或更新测试
6. **性能优先：** 新功能开发时考虑上述优化最佳实践
