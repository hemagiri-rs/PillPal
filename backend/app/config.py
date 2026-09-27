from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./pillpal.db"
    supabase_url: str = "https://vxgbzjjdkiuzczafyvad.supabase.co"
    supabase_service_role_key: str | None = None  # only used by the seed script
    cors_origins: list[str] = ["http://localhost:4321"]
    groq_api_key: str | None = None
    groq_model: str = "openai/gpt-oss-120b"

    @field_validator("database_url")
    @classmethod
    def use_psycopg3(cls, v: str) -> str:
        # Supabase shows "postgresql://..."; SQLAlchemy would pick psycopg2, which isn't installed.
        return v.replace("postgresql://", "postgresql+psycopg://", 1)


@lru_cache
def get_settings() -> Settings:
    return Settings()
