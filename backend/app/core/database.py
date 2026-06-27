from contextlib import AbstractContextManager, contextmanager
from typing import Any, Generator

from sqlalchemy import create_engine, orm
from sqlalchemy.orm import Session
from sqlmodel import SQLModel, text

class Database:
    def __init__(self, db_url: str) -> None:
        self._engine = create_engine(db_url, echo=True, pool_pre_ping=True)
        self._session_factory = orm.scoped_session(
            orm.sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self._engine,
            ),
        )

    def create_database(self) -> None:
        from sqlmodel import SQLModel, text
        from app.model.map_graph import Map, Node, Edge  # <--- Обязательно импортировать все модели

        with self._engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))

        SQLModel.metadata.create_all(self._engine)
        print("База данных и таблицы успешно созданы.")

    @contextmanager
    def session(self) -> Generator[Any, Any, AbstractContextManager[Session]]:
        session: Session = self._session_factory()
        try:
            yield session
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()