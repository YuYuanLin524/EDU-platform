from pydantic_settings import BaseSettings
from functools import lru_cache


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

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
