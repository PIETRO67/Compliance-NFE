from alembic import context
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlalchemy import create_engine, pool
from app.config import get_settings
from app.database import Base
from app import models  # noqa: F401
from app import billing_models  # noqa: F401

config = context.config
url = get_settings().migration_database_url or get_settings().database_url
if context.is_offline_mode():
    context.configure(url=url, target_metadata=Base.metadata, literal_binds=True, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    supplied = config.attributes.get("connection")
    if supplied is not None:
        context.configure(
            connection=supplied,
            target_metadata=Base.metadata,
            compare_type=True,
            version_table_schema=supplied.info.get("migration_schema"),
        )
        with context.begin_transaction():
            context.run_migrations()
    else:
        connectable = create_engine(url, poolclass=pool.NullPool)
        with connectable.connect() as connection:
            context.configure(connection=connection, target_metadata=Base.metadata, compare_type=True)
            with context.begin_transaction():
                context.run_migrations()
