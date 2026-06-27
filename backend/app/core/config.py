import json
import os
from typing import List

from dotenv import load_dotenv
from pydantic import BaseSettings, validator

load_dotenv()


class Settings(BaseSettings):
    ENV: str = "dev"
    API: str = "/api"
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "road-map-api"

    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5500",
        "http://localhost:8080",
    ]

    DB_USER: str = "mapuser"
    DB_PASSWORD: str = "mappassword"
    DB_HOST: str = "localhost"
    DB_PORT: str = "5432"
    DB_NAME: str = "forestmap"

    MARTIN_PUBLIC_URL: str = "http://localhost:3000"
    MINIO_EXTERNAL_URL: str = "http://localhost:9000"
    MINIO_BUCKET_NAME: str = "maps-bucket"

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def parse_cors_origins(cls, value: object) -> List[str]:
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                pass
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value  # type: ignore[return-value]

    @property
    def database_uri(self) -> str:
        return (
            f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    class Config:
        case_sensitive = True


settings = Settings()
