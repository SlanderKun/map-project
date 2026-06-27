import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from sqlmodel import SQLModel

from app.core.database import get_db
from app.main import app
from app.model.map_graph import Edge, Map, Node  # noqa: F401 — register models

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://mapuser:mappassword@localhost:5432/forestmap_test",
)


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    with eng.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
    SQLModel.metadata.drop_all(eng)
    SQLModel.metadata.create_all(eng)
    yield eng
    SQLModel.metadata.drop_all(eng)


@pytest.fixture
def db_session(engine) -> Session:
    connection = engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection)()
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session: Session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_map(db_session: Session) -> Map:
    map_obj = Map(
        name="Test map",
        pmtiles_url="khabarovsk",
        description="For tests",
    )
    db_session.add(map_obj)
    db_session.commit()
    db_session.refresh(map_obj)
    return map_obj
