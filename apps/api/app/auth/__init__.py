from app.auth.routes import router as auth_router
from app.auth.deps import (
    get_current_user,
    get_current_active_user,
    require_roles,
    require_admin,
    require_teacher,
    require_student,
)

__all__ = [
    "auth_router",
    "get_current_user",
    "get_current_active_user",
    "require_roles",
    "require_admin",
    "require_teacher",
    "require_student",
]
