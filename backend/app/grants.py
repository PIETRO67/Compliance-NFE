"""Executado pelo migrador privilegiado, nunca por uma rota HTTP."""

import os
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from .config import get_settings


def main():
    settings = get_settings()
    role = os.environ.get("APP_DB_USER") or make_url(settings.database_url).username
    connection = create_engine(settings.migration_database_url or settings.database_url)
    quoted = connection.dialect.identifier_preparer.quote(role)
    with connection.begin() as db:
        db.execute(text(f"GRANT USAGE ON SCHEMA public TO {quoted}"))
        db.execute(text(f"GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {quoted}"))
        db.execute(text(f"REVOKE UPDATE, DELETE ON audit_logs FROM {quoted}"))
        db.execute(text(f"REVOKE UPDATE, DELETE ON billing_usage_events, billing_plan_versions, billing_adjustments, billing_plan_decisions FROM {quoted}"))
        db.execute(text(f"REVOKE ALL ON alembic_version FROM {quoted}"))
    print("Permissões da aplicação configuradas; auditoria sem UPDATE/DELETE para o runtime.")


if __name__ == "__main__":
    main()
