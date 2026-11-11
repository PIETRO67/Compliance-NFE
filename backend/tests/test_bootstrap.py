from uuid import uuid4
import pytest
from sqlalchemy import select, text
from app import cli, models as m
from app.database import Base
from app.security import hasher


def test_bootstrap_creates_one_real_administrator_without_overwriting_users(world, monkeypatch):
    base = world["base"]
    schema = "bootstrap_" + uuid4().hex
    with base.begin() as db:
        db.execute(text(f'CREATE SCHEMA "{schema}"'))
    scoped = base.execution_options(schema_translate_map={None: schema})
    Base.metadata.create_all(scoped)
    monkeypatch.setattr(cli, "engine", lambda: scoped)
    monkeypatch.setattr(cli.getpass, "getpass", lambda _prompt: world["password"])
    try:
        cli.bootstrap("owner@tests.example.com", "Administrador teste")
        with cli.Session(scoped) as db:
            user = db.scalar(select(m.User))
            assert hasher.verify(world["password"], user.password_hash)
            assert user.password_hash != world["password"]
            assert db.scalar(select(m.Membership.role)) == "SUPERADMIN_ESCRITORIO"
        with pytest.raises(SystemExit):
            cli.bootstrap("other@tests.example.com", "Não deve ser criado")
        with cli.Session(scoped) as db:
            assert len(db.scalars(select(m.User)).all()) == 1
    finally:
        with base.begin() as db:
            db.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
