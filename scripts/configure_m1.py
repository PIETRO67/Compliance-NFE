"""Gera configuração local, sem exibir segredos e sem tocar credenciais existentes."""

from pathlib import Path
import base64
import os
import secrets

ROOT = Path(__file__).resolve().parents[1]


def main():
    target = ROOT / ".env"
    if target.exists():
        print("Configuração .env existente preservada.")
        return
    password = secrets.token_urlsafe(32)
    runtime_password = secrets.token_urlsafe(32)
    content = "\n".join(
        [
            "APP_ENV=development",
            "ENABLE_DEV_TOOLS=true",
            "POSTGRES_DB=compliance",
            "POSTGRES_USER=compliance",
            f"POSTGRES_PASSWORD={password}",
            "APP_DB_USER=compliance_app",
            f"APP_DB_PASSWORD={runtime_password}",
            f"DATABASE_URL=postgresql+psycopg://compliance_app:{runtime_password}@127.0.0.1:55432/compliance",
            f"MIGRATION_DATABASE_URL=postgresql+psycopg://compliance:{password}@127.0.0.1:55432/compliance",
            f"SECRET_KEY={secrets.token_urlsafe(48)}",
            f"MFA_ENCRYPTION_KEY={base64.urlsafe_b64encode(os.urandom(32)).decode()}",
            "ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001",
            "REDIS_URL=redis://127.0.0.1:6379/0",
            "SESSION_HOURS=8",
            "IDLE_MINUTES=30",
            "",
        ]
    )
    target.write_text(content, encoding="utf8")
    target.chmod(0o600)
    print(
        "Configuração local criada em .env (ignorada pelo Git). Nenhum segredo foi exibido."
    )


if __name__ == "__main__":
    main()
