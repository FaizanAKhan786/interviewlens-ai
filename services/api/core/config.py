import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True)
    PROJECT_NAME: str = "InterviewLens AI"
    TAGLINE: str = "Every interview makes you better."
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "interviewlens-super-secret-key-change-in-production-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'interviewlens.db'))}"
    )
    
    # Storage
    STORAGE_DIR: str = os.getenv(
        "STORAGE_DIR",
        os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'storage'))
    )
    MAX_UPLOAD_SIZE_MB: int = 250
    MAX_RECORDING_DURATION_MINUTES: int = 45
    ALLOWED_EXTENSIONS: list[str] = ["mp4", "mov", "webm", "mp3", "wav", "m4a"]
    
    # AI Providers
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "local")  # local, gemini, openai
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    
    # CORS
    CORS_ORIGINS: list[str] = ["*"]

settings = Settings()
os.makedirs(settings.STORAGE_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.STORAGE_DIR, "recordings"), exist_ok=True)
os.makedirs(os.path.join(settings.STORAGE_DIR, "exports"), exist_ok=True)
