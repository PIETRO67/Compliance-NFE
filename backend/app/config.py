from functools import lru_cache
from pathlib import Path
from typing import Literal
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env", extra="ignore", hide_input_in_errors=True
    )
    app_env: Literal["development", "test", "homologation", "production"] = "development"
    database_url: str = "postgresql+psycopg://compliance:configure@127.0.0.1:5432/compliance"
    migration_database_url: str | None = None
    secret_key: str = Field(min_length=32)
    mfa_encryption_key: str
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    session_hours: int = Field(default=8, ge=1, le=24)
    idle_minutes: int = Field(default=30, ge=5, le=120)
    redis_url: str = "redis://localhost:6379/0"
    enable_dev_tools: bool = False
    payment_provider: Literal["disabled", "asaas"] = "disabled"
    asaas_mode: str = "sandbox"
    asaas_base_url: str = "https://api-sandbox.asaas.com/v3"
    asaas_api_key: str = Field(default="", repr=False)
    asaas_webhook_auth_token: str = Field(default="", repr=False)
    asaas_http_user_agent: str = "IAComplianceNFSe-M2/0.2"
    enable_billing_sandbox: bool = False
    enable_billing_production: bool = False

    @property
    def origins(self) -> list[str]:
        return [s.strip().rstrip("/") for s in self.allowed_origins.split(",")]

    @property
    def secure_cookies(self) -> bool:
        return self.app_env in {"homologation", "production"}

    @model_validator(mode="after")
    def production_guards(self):
        from cryptography.fernet import Fernet

        Fernet(self.mfa_encryption_key.encode())
        if self.enable_billing_production or self.asaas_mode != "sandbox" or self.asaas_base_url != "https://api-sandbox.asaas.com/v3":
            raise ValueError("M2 aceita exclusivamente Asaas Sandbox; produção proibida.")
        if self.asaas_api_key and self.asaas_api_key == self.asaas_webhook_auth_token:
            raise ValueError("Token do webhook deve ser distinto da API key.")
        if self.secret_key.startswith(("GENERATE", "CHANGE_ME")):
            raise ValueError("Gere uma chave secreta privada antes de iniciar.")
        if self.app_env in {"homologation", "production"}:
            if self.enable_dev_tools or not self.database_url.startswith("postgresql"):
                raise ValueError("Produção exige PostgreSQL e ferramentas de desenvolvimento desligadas.")
            if any(not origin.startswith("https://") for origin in self.origins):
                raise ValueError("Produção exige origens HTTPS explícitas.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
