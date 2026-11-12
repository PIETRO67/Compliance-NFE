from pathlib import Path
from uuid import uuid4
from alembic import command
from alembic.config import Config
import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import ProgrammingError
from app.config import get_settings


def test_alembic_upgrade_and_downgrade_on_real_postgres(world):
    schema = "migration_" + uuid4().hex
    base = world["base"]
    with base.begin() as c:
        c.execute(text(f'CREATE SCHEMA "{schema}"'))
    try:
        config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
        with base.connect() as c:
            c = c.execution_options(schema_translate_map={None: schema})
            c.info["migration_schema"] = schema
            config.attributes["connection"] = c
            command.upgrade(config, "head")
            c.commit()
            assert inspect(c).has_table("users", schema=schema)
            assert inspect(c).has_table("company_authorizations", schema=schema)
            c.commit()
            command.downgrade(config, "base")
            c.commit()
            assert not inspect(c).has_table("users", schema=schema)
    finally:
        with base.begin() as c:
            c.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))


def test_runtime_role_is_not_owner_or_superuser_and_cannot_mutate_audit(world):
    runtime = create_engine(get_settings().database_url)
    with runtime.connect() as c:
        assert (
            c.scalar(text("SELECT rolsuper OR rolcreaterole OR rolcreatedb FROM pg_roles WHERE rolname=current_user"))
            is False
        )
        assert (
            c.scalar(
                text("SELECT pg_get_userbyid(datdba)=current_user FROM pg_database WHERE datname=current_database()")
            )
            is False
        )
        with pytest.raises(ProgrammingError):
            c.execute(text("DELETE FROM audit_logs WHERE false"))
    runtime.dispose()


def test_m2_upgrade_and_downgrade_preserve_existing_m1_data(world):
    schema = "m2migration_" + uuid4().hex
    base = world["base"]
    with base.begin() as c:
        c.execute(text(f'CREATE SCHEMA "{schema}"'))
    try:
        config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
        with base.connect() as c:
            c = c.execution_options(schema_translate_map={None: schema})
            c.info["migration_schema"] = schema
            config.attributes["connection"] = c
            command.upgrade(config, "8a8bf44471d0")
            from app.models import Organization

            c.execute(
                Organization.__table__.insert().values(id=str(uuid4()), name="M1 preserved", kind="OFFICE", active=True)
            )
            c.execute(
                text(f'INSERT INTO "{schema}".audit_logs (id,action,at) VALUES (:id,:action,now())'),
                {"id": str(uuid4()), "action": "m1.preserved"},
            )
            c.commit()
            command.upgrade(config, "head")
            c.commit()
            assert inspect(c).has_table("billing_subscriptions", schema=schema)
            assert (
                c.scalar(
                    text(f'SELECT details FROM "{schema}".audit_logs WHERE action=:action'), {"action": "m1.preserved"}
                )
                == {}
            )
            command.downgrade(config, "8a8bf44471d0")
            c.commit()
            assert not inspect(c).has_table("billing_subscriptions", schema=schema)
            assert c.scalar(Organization.__table__.select().with_only_columns(Organization.name)) == "M1 preserved"
            assert (
                c.scalar(
                    text(f'SELECT count(*) FROM "{schema}".audit_logs WHERE action=:action'), {"action": "m1.preserved"}
                )
                == 1
            )
    finally:
        with base.begin() as c:
            c.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
