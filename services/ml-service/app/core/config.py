from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = Field(default="local", alias="APP_ENV")
    app_version: str = Field(default="1.0.0", alias="APP_VERSION")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    max_audio_size_mb: int = Field(default=25, alias="MAX_AUDIO_SIZE_MB")
    enable_real_models: bool = Field(default=False, alias="ENABLE_REAL_MODELS")
    test_mode: bool = Field(default=True, alias="TEST_MODE")
    whisper_model_path: str = Field(default="/models/whisper-large-v3", alias="WHISPER_MODEL_PATH")
    ner_model_path: str = Field(default="/models/rubert-tiny-ner", alias="NER_MODEL_PATH")
    category_model_path: str = Field(default="/models/category-ensemble", alias="CATEGORY_MODEL_PATH")
    redis_url: str = Field(default="redis://redis:6379/0", alias="REDIS_URL")
    database_url: str = Field(default="postgresql://finapp:finapp@postgres:5432/finapp", alias="DATABASE_URL")
    cors_origins: list[str] = Field(default=["*"], alias="CORS_ORIGINS")

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    @property
    def max_audio_size_bytes(self) -> int:
        return self.max_audio_size_mb * 1024 * 1024

    @property
    def log_level_name(self) -> Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]:
        level = self.log_level.upper()
        return level if level in {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"} else "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()

