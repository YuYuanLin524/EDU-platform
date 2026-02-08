"""
Health and readiness endpoint tests.
"""

import pytest

from app.main import healthz, readyz


class _DummySessionOK:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def execute(self, _statement):
        return None


class _DummySessionFail:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def execute(self, _statement):
        raise RuntimeError("db down")


@pytest.mark.asyncio
async def test_healthz_returns_ok():
    response = await healthz()
    assert response == {"ok": True}


@pytest.mark.asyncio
async def test_readyz_reports_database_ok(monkeypatch):
    from app import main

    monkeypatch.setattr(main.settings, "readiness_check_redis", False)
    monkeypatch.setattr(main, "async_session_maker", lambda: _DummySessionOK())

    response = await readyz()

    assert response["ok"] is True
    assert response["checks"]["database"] is True
    assert response["checks"]["redis"] is True


@pytest.mark.asyncio
async def test_readyz_reports_database_failure(monkeypatch):
    from app import main

    monkeypatch.setattr(main.settings, "readiness_check_redis", False)
    monkeypatch.setattr(main, "async_session_maker", lambda: _DummySessionFail())

    response = await readyz()

    assert response["ok"] is False
    assert response["checks"]["database"] is False
    assert response["checks"]["redis"] is True
