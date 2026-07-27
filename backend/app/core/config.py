from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    mongodb_url: str = ""
    mongodb_db_name: str = "resume_builder"
    jwt_secret_key: str = "resume-builder-jwt-secret-key-2026"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-70b-versatile"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    allow_origin_regex: str = r"https?://(localhost|127\.0\.0\.1):517\d+"
    upload_dir: str = "uploads/resumes"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
