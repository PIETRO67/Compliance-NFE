"""Adiciona papel restrito ao banco local de desenvolvimento existente, sem exibir credenciais."""

from pathlib import Path
import secrets
from dotenv import dotenv_values
import psycopg
from psycopg import sql

root = Path(__file__).resolve().parents[1]
path = root / ".env"
values = dotenv_values(path)
if values.get("APP_ENV") != "development":
    raise SystemExit("Auxiliar permitido somente em desenvolvimento.")
password = values.get("APP_DB_PASSWORD") or secrets.token_urlsafe(32)
role = values.get("APP_DB_USER") or "compliance_app"
with psycopg.connect(
    host="127.0.0.1",
    port=55432,
    user=values["POSTGRES_USER"],
    password=values["POSTGRES_PASSWORD"],
    dbname="postgres",
    autocommit=True,
) as db:
    if not db.execute("SELECT 1 FROM pg_roles WHERE rolname=%s", (role,)).fetchone():
        db.execute(
            sql.SQL(
                "CREATE ROLE {} LOGIN PASSWORD {} NOSUPERUSER NOCREATEDB NOCREATEROLE"
            ).format(sql.Identifier(role), sql.Literal(password))
        )
if not values.get("APP_DB_USER"):
    content = path.read_text(encoding="utf8")
    original = values["DATABASE_URL"]
    runtime = f"postgresql+psycopg://{role}:{password}@127.0.0.1:55432/compliance"
    content = content.replace("DATABASE_URL=" + original, "DATABASE_URL=" + runtime)
    content += (
        "\n"
        + f"MIGRATION_DATABASE_URL={original}\nAPP_DB_USER={role}\nAPP_DB_PASSWORD={password}\n"
    )
    path.write_text(content, encoding="utf8")
    path.chmod(0o600)
print("Papel local restrito preparado. Segredos preservados em .env, sem exibição.")
