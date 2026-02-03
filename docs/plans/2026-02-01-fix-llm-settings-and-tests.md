# LLM Settings Consistency + Test Stability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make admin-configured LLM settings actually drive runtime behavior consistently, and keep the web test suite green after the login page started using `useSearchParams()` and a canvas background.

**Architecture:**
- Standardize SystemConfig keys to the dotted form used by runtime startup (`llm.provider`, `llm.base_url`, `llm.model_name`, `llm.api_key`).
- Provide backward-compatible reads from legacy underscore keys (if present) with a one-time migration.
- Keep web tests stable by maintaining a complete `next/navigation` mock and stubbing canvas APIs under jsdom.

**Tech Stack:** FastAPI, SQLAlchemy async, Pydantic; Next.js App Router, Vitest, Testing Library.

---

### Task 1: Stabilize Web Unit Tests for Next.js App Router

**Files:**
- Modify: `apps/web/vitest.setup.ts`
- Test: `apps/web/src/app/login/__tests__/login-page.spec.tsx`

**Step 1: Write/adjust failing test (if needed)**

Ensure the existing test renders `/login` without throwing.

**Step 2: Run test to verify it fails**

Run:
```bash
cd /home/lin/projects/MyProject/apps/web && npm run test:run
```
Expected: failure mentioning missing `useSearchParams` mock OR canvas `getContext` not implemented.

**Step 3: Minimal implementation**

- In `apps/web/vitest.setup.ts`, mock `next/navigation` with `importOriginal`, and provide:
  - `useRouter()` returning `{ push: vi.fn() }`
  - `useSearchParams()` returning `new URLSearchParams("")`
- Stub `HTMLCanvasElement.prototype.getContext` to avoid jsdom canvas errors.

**Step 4: Re-run tests**

Run:
```bash
cd /home/lin/projects/MyProject/apps/web && npm run test:run
```
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/vitest.setup.ts
git commit -m "test(web): mock next navigation and canvas for login page"
```

---

### Task 2: Diagnose LLM Settings Key Mismatch (Root Cause)

**Files:**
- Read: `apps/api/app/main.py`
- Read: `apps/api/app/admin/routes.py`
- Read: `apps/api/app/llm/provider.py`

**Step 1: Confirm current key usage**

- Startup loader reads: `llm.provider`, `llm.base_url`, `llm.model_name`, `llm.api_key` (dotted)
- Admin endpoints store: `llm_provider_name`, `llm_base_url`, `llm_model_name`, `llm_api_key` (underscore)

**Step 2: Capture expected behavior**

Expected: updating admin LLM config should affect `get_llm_provider()` runtime settings immediately and also persist across restarts.

---

### Task 3: Add API Test Proving Admin Update Drives Runtime Provider

**Files:**
- Modify: `apps/api/tests/test_admin.py`
- Test runner setup: `apps/api/tests/conftest.py`

**Step 1: Write the failing test**

Add a new test case:

```python
@pytest.mark.asyncio
async def test_update_llm_config_updates_runtime_settings(client, admin_token):
    # Update via admin endpoint
    r = await client.put(
        "/admin/settings/llm",
        json={
            "provider_name": "test-provider",
            "base_url": "https://example.com/v1",
            "api_key": "sk-test",
            "model_name": "test-model",
        },
        headers=auth_header(admin_token),
    )
    assert r.status_code == 200

    # Runtime should reflect immediately
    from app.llm.runtime_settings import get_llm_runtime_settings

    runtime = get_llm_runtime_settings()
    assert runtime.provider == "test-provider"
    assert runtime.base_url == "https://example.com/v1"
    assert runtime.model_name == "test-model"
    assert runtime.api_key == "sk-test"
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /home/lin/projects/MyProject/apps/api && python3 -m pytest -q
```
Expected: FAIL until the keys are unified and runtime update path is correct.

Notes (current env):
- `python3 -m pytest -q` failed: `/usr/bin/python3: No module named pytest`
- `python3 -m ensurepip --upgrade` failed: ensurepip disabled for system python
- `python3 -m pip install pytest` failed: `/usr/bin/python3: No module named pip`

---

### Task 4: Unify SystemConfig Keys (Dotted Keys) + Backward Compatibility

**Files:**
- Modify: `apps/api/app/admin/routes.py`
- Modify (optional): `apps/api/app/main.py`

**Step 1: Minimal production change**

In `apps/api/app/admin/routes.py`:

- Change `LLM_CONFIG_KEYS` mapping to:
  - `provider_name` -> `llm.provider`
  - `base_url` -> `llm.base_url`
  - `api_key` -> `llm.api_key`
  - `model_name` -> `llm.model_name`

- Add fallback reads: if dotted key missing, read underscore key.
- On update, write dotted keys, and (optional) also update underscore keys for one release OR delete them.

**Step 2: Data migration (safe, one-time)**

On `GET /admin/settings/llm` or inside `PUT /admin/settings/llm`, if underscore keys exist and dotted keys are empty, copy values over to dotted keys (don’t overwrite existing dotted values). Commit transaction.

**Step 3: Verify test passes**

Run:
```bash
cd /home/lin/projects/MyProject/apps/api && python3 -m pytest -q
```
Expected: PASS.

---

### Task 5: Verify Behavior End-to-End (Manual)

**Step 1: Start stack**

Run:
```bash
cd /home/lin/projects/MyProject && ./dev.sh up
```

**Step 2: Update settings in UI**

- Visit `http://127.0.0.1:3000` or `http://127.0.0.1:3001` (whatever `./dev.sh status` reports)
- Go to Admin -> Settings -> LLM, set base_url/api_key/model
- Click “测试连接”

Expected: success toast, and subsequent chat calls should use the updated model/base_url.

---

### Task 6: Commits

Prefer two commits:

1) Web test harness fix (Task 1)
2) API LLM key unification + tests (Tasks 3-4)

```bash
git status
git add apps/api/app/admin/routes.py apps/api/tests/test_admin.py
git commit -m "fix(api): unify LLM config keys and update runtime settings"
```
