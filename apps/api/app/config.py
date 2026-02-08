from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    database_url: str = (
        "postgresql+asyncpg://socratic:socratic123@localhost:5432/socratic_db"
    )
    database_url_sync: str = (
        "postgresql://socratic:socratic123@localhost:5432/socratic_db"
    )

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret: str = "change-this-to-a-secure-random-string-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60

    # Model
    model_provider: str = "openai"
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    model_name: str = "gpt-4o-mini"

    # Export
    export_storage: str = "local"
    export_local_path: str = "./exports"

    # API runtime
    cors_origins: str = (
        "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"
    )
    cors_origin_regex: str = r"^https?://(localhost|127\.0\.0\.1)(:\\d+)?$"
    startup_db_timeout_seconds: float = 5.0
    db_connect_timeout_seconds: float = 5.0
    skip_startup_llm_sync: bool = False
    readiness_check_redis: bool = True

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    def get_cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
