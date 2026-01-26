"""
Test fixtures for API integration tests.

Uses SQLite in-memory database for fast test execution.
"""

import asyncio
from typing import AsyncGenerator
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import event
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base, get_db
from app.main import app
from app.models import User, UserRole, UserStatus, Class, ClassStudent, ClassTeacher
from app.auth.security import hash_password, create_access_token


# Test database URL (SQLite in-memory)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def test_engine():
    """Create a test database engine for each test."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )

    @event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture(scope="function")
async def test_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    async_session_maker = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session_maker() as session:
        yield session


@pytest.fixture(scope="function")
async def client(test_engine) -> AsyncGenerator[AsyncClient, None]:
    """Create a test HTTP client with database dependency override."""
    async_session_maker = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )

    async def override_get_db():
        async with async_session_maker() as session:
            try:
                yield session
            finally:
                await session.close()

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# ============================================================================
# User Fixtures
# ============================================================================


@pytest.fixture
async def admin_user(test_session: AsyncSession) -> User:
    """Create an admin user."""
    user = User(
        username="admin",
        display_name="Admin User",
        role=UserRole.ADMIN,
        password_hash=hash_password("admin123"),
        must_change_password=False,
        status=UserStatus.ACTIVE,
    )
    test_session.add(user)
    await test_session.commit()
    await test_session.refresh(user)
    return user


@pytest.fixture
async def teacher_user(test_session: AsyncSession) -> User:
    """Create a teacher user."""
    user = User(
        username="teacher1",
        display_name="Teacher One",
        role=UserRole.TEACHER,
        password_hash=hash_password("teacher123"),
        must_change_password=False,
        status=UserStatus.ACTIVE,
    )
    test_session.add(user)
    await test_session.commit()
    await test_session.refresh(user)
    return user


@pytest.fixture
async def student_user(test_session: AsyncSession) -> User:
    """Create a student user."""
    user = User(
        username="student1",
        display_name="Student One",
        role=UserRole.STUDENT,
        password_hash=hash_password("student123"),
        must_change_password=False,
        status=UserStatus.ACTIVE,
    )
    test_session.add(user)
    await test_session.commit()
    await test_session.refresh(user)
    return user


@pytest.fixture
async def new_student_user(test_session: AsyncSession) -> User:
    """Create a student user that must change password (first login)."""
    user = User(
        username="newstudent",
        display_name="New Student",
        role=UserRole.STUDENT,
        password_hash=hash_password("initial123"),
        must_change_password=True,
        status=UserStatus.ACTIVE,
    )
    test_session.add(user)
    await test_session.commit()
    await test_session.refresh(user)
    return user


@pytest.fixture
async def disabled_user(test_session: AsyncSession) -> User:
    """Create a disabled user."""
    user = User(
        username="disabled",
        display_name="Disabled User",
        role=UserRole.STUDENT,
        password_hash=hash_password("disabled123"),
        must_change_password=False,
        status=UserStatus.DISABLED,
    )
    test_session.add(user)
    await test_session.commit()
    await test_session.refresh(user)
    return user


# ============================================================================
# Token Fixtures
# ============================================================================


@pytest.fixture
def admin_token(admin_user: User) -> str:
    """Get auth token for admin user."""
    return create_access_token(admin_user.id, admin_user.role.value)


@pytest.fixture
def teacher_token(teacher_user: User) -> str:
    """Get auth token for teacher user."""
    return create_access_token(teacher_user.id, teacher_user.role.value)


@pytest.fixture
def student_token(student_user: User) -> str:
    """Get auth token for student user."""
    return create_access_token(student_user.id, student_user.role.value)


@pytest.fixture
def new_student_token(new_student_user: User) -> str:
    """Get auth token for new student user (must change password)."""
    return create_access_token(new_student_user.id, new_student_user.role.value)


# ============================================================================
# Class Fixtures
# ============================================================================


@pytest.fixture
async def test_class(test_session: AsyncSession) -> Class:
    """Create a test class."""
    cls = Class(
        name="七年级一班",
        grade="七年级",
    )
    test_session.add(cls)
    await test_session.commit()
    await test_session.refresh(cls)
    return cls


@pytest.fixture
async def class_with_teacher(
    test_session: AsyncSession, test_class: Class, teacher_user: User
) -> Class:
    """Create a class with a teacher assigned."""
    class_teacher = ClassTeacher(
        class_id=test_class.id,
        teacher_id=teacher_user.id,
    )
    test_session.add(class_teacher)
    await test_session.commit()
    return test_class


@pytest.fixture
async def class_with_student(
    test_session: AsyncSession, test_class: Class, student_user: User
) -> Class:
    """Create a class with a student enrolled."""
    class_student = ClassStudent(
        class_id=test_class.id,
        student_id=student_user.id,
    )
    test_session.add(class_student)
    await test_session.commit()
    return test_class


@pytest.fixture
async def fully_setup_class(
    test_session: AsyncSession,
    test_class: Class,
    teacher_user: User,
    student_user: User,
) -> Class:
    """Create a class with both teacher and student."""
    class_teacher = ClassTeacher(
        class_id=test_class.id,
        teacher_id=teacher_user.id,
    )
    class_student = ClassStudent(
        class_id=test_class.id,
        student_id=student_user.id,
    )
    test_session.add(class_teacher)
    test_session.add(class_student)
    await test_session.commit()
    return test_class


# ============================================================================
# Helper Functions
# ============================================================================


def auth_header(token: str) -> dict:
    """Create authorization header from token."""
    return {"Authorization": f"Bearer {token}"}
