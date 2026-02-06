from app.admin.llm_routes import router as llm_settings_router
from app.admin.routes import router as admin_router

admin_router.include_router(llm_settings_router)

__all__ = ["admin_router"]
