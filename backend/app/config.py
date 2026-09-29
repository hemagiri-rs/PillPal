import json
from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    # One shared PillPal/.env for the whole repo (backend runs from backend/, so it is "../.env").
    # A backend/.env, if present, is read first and the shared file wins on conflicts.
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

    database_url: str = "sqlite:///./pillpal.db"
    supabase_url: str = "https://example.supabase.co"
    supabase_service_role_key: str | None = None  # only used by the seed script
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:4321"]
    groq_api_key: str | None = None
    groq_model: str = "qwen/qwen3.8-27b"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, v):
        # Accept JSON (["a","b"]) or a plain comma-separated list (a,b).
        if isinstance(v, str):
            v = v.strip()
            return (
                json.loads(v)
                if v.startswith("[")
                else [o.strip() for o in v.split(",") if o.strip()]
            )
        return v

    @field_validator("database_url")
    @classmethod
    def use_psycopg3(cls, v: str) -> str:
        # Supabase shows "postgresql://..."; SQLAlchemy would pick psycopg2, which isn't installed.
        return v.replace("postgresql://", "postgresql+psycopg://", 1)


@lru_cache
def get_settings() -> Settings:
    return Settings()
