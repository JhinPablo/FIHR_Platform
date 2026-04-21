from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "FHIR Platform Corte 2"
    environment: str = "development"
    database_url: str = "sqlite:///./dev.db"
    data_encryption_key: str = "dev-only-insecure-key"
    cors_origins: str = "*"
    rate_limit_per_minute: int = 120

    access_key_admin: str = "dev-access-admin"
    permission_key_admin: str = "dev-permission-admin"
    access_key_medico_1: str = "dev-access-medico-1"
    permission_key_medico_1: str = "dev-permission-medico-1"
    access_key_medico_2: str = "dev-access-medico-2"
    permission_key_medico_2: str = "dev-permission-medico-2"
    access_key_patient: str = "dev-access-patient"
    permission_key_patient: str = "dev-permission-patient"

    ml_service_url: str = "http://localhost:8011"
    dl_service_url: str = "http://localhost:8012"
    minio_endpoint: str = "minio:9000"
    minio_public_endpoint: str = "http://localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin123"
    minio_bucket: str = "clinical-images"

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
