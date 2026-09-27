from collections.abc import Iterator

from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine

from app.config import get_settings


def make_engine(url: str, **kwargs):
    if url.startswith("sqlite"):
        kwargs.setdefault("connect_args", {"check_same_thread": False})
        engine = create_engine(url, **kwargs)

        @event.listens_for(engine, "connect")
        def _fk_on(dbapi_conn, _):  # SQLite ignores ON DELETE CASCADE without this
            dbapi_conn.execute("PRAGMA foreign_keys=ON")

        return engine
    # No pool_pre_ping: it costs a full DB round trip per request (~250 ms to a distant region).
    # Recycling connections before Supabase's idle timeout avoids stale ones instead.
    return create_engine(url, pool_recycle=300, **kwargs)


engine = make_engine(get_settings().database_url)


def init_db() -> None:
    import app.models  # noqa: F401  (register tables)

    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
