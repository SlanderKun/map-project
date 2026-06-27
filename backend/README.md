# Backend

FastAPI + PostgreSQL/PostGIS API for map graphs (nodes, edges, routing data).

## Stack

- FastAPI, Pydantic v1, SQLModel, GeoAlchemy2
- PostgreSQL 15 + PostGIS
- Alembic migrations
- pytest + httpx TestClient

## Quick start (Docker)

From repository root:

```bash
docker compose up -d --build
```

Backend runs migrations on start and listens on http://localhost:8000

| URL | Description |
|---|---|
| http://localhost:8000 | Health check |
| http://localhost:8000/docs | Swagger UI |
| http://localhost:8000/api/v1/maps | Maps API |

Create MinIO bucket once:

```bash
docker exec map_storage mc alias set myminio http://localhost:9000 admin supersecretpassword
docker exec map_storage mc mb --ignore-existing myminio/maps-bucket
```

## Local development

### 1. Infrastructure

```bash
docker compose up -d postgres
```

### 2. Python environment

```bash
cd backend
python -m venv .venv
```

**Windows (PowerShell):**
```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**Linux / macOS:**
```bash
source .venv/bin/activate
pip install -r requirements.txt
```

> После активации venv команды `alembic`, `uvicorn`, `pytest` доступны напрямую.
> Без активации на Windows используй полный путь: `.\.venv\Scripts\alembic.exe`

### 3. Environment

Create `backend/.env` (optional — defaults match docker-compose):

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_USER=mapuser
DB_PASSWORD=mappassword
DB_NAME=forestmap
BACKEND_CORS_ORIGINS=["http://localhost:5173"]
```

### 4. Migrations

```bash
alembic upgrade head
```

### 5. Run

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Tests

Create test database (once):

```bash
docker exec map_db psql -U mapuser -d postgres -c "CREATE DATABASE forestmap_test"
```

Run:

```bash
cd backend
pytest
```

Override test DB URL:

```bash
TEST_DATABASE_URL=postgresql://mapuser:mappassword@localhost:5432/forestmap_test pytest
```

## Project structure

```
backend/
├── app/
│   ├── api/
│   │   ├── deps.py              # FastAPI dependencies (db session, services)
│   │   └── v1/endpoints/        # Route handlers
│   ├── core/                    # config, database, exceptions
│   ├── model/                   # SQLModel tables
│   ├── repository/              # Data access
│   ├── schema/                  # Pydantic request/response models
│   ├── services/                # Business logic
│   └── main.py
├── alembic/
├── tests/
└── requirements.txt
```

## Migrations

```bash
alembic upgrade head
alembic downgrade -1
alembic revision --autogenerate -m "description"
```

Schema is managed by Alembic only. On startup the app ensures the PostGIS extension exists.
