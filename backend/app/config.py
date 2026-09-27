from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./pillpal.db"
    supabase_url: str = "https://edigxaukkpxvgrykxanf.supabase.co"
    supabase_service_role_key: str | None = None  # only used by the seed script
    cors_origins: list[str] = ["http://localhost:4321"]
    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"


@lru_cache
def get_settings() -> Settings:
    return Settings()
