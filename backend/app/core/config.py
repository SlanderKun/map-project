import json
import os
from typing import List

from dotenv import load_dotenv
from pydantic import BaseSettings, validator

load_dotenv()


class Configs(BaseSettings):
    ENV: str = os.getenv("ENV", "dev")
    API: str = "/api"
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "road-map-api"

    PROJECT_ROOT: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    DATETIME_FORMAT: str = "%Y-%m-%dT%H:%M:%S"
    DATE_FORMAT: str = "%Y-%m-%d"

    # Comma-separated list of allowed origins, e.g. "http://localhost:5173,https://app.example.com"
    # Use "*" to allow all origins.
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def parse_cors_origins(cls, v: object) -> List[str]:
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v  # type: ignore[return-value]

    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "postgres")
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "5432")
    DB_NAME: str = os.getenv("DB_NAME", "roadmap")

    MARTIN_PUBLIC_URL: str = os.getenv("MARTIN_PUBLIC_URL", "http://localhost:3000")




    DATABASE_URI: str = "postgresql://{user}:{password}@{host}:{port}/{database}".format(
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
    )

    PAGE = 1
    PAGE_SIZE = 20
    ORDERING = "-id"

    class Config:
        case_sensitive = True


configs = Configs()
