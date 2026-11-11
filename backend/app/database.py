from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from .config import get_settings


class Base(DeclarativeBase):
    pass


def make_engine(url: str):
    return create_engine(
        url, pool_pre_ping=True, **({"connect_args": {"check_same_thread": False}} if url.startswith("sqlite") else {})
    )


def get_db():
    factory = sessionmaker(bind=engine(), expire_on_commit=False)
    with factory() as session:
        yield session


_engine = None


def engine():
    global _engine
    if _engine is None:
        _engine = make_engine(get_settings().database_url)
    return _engine
