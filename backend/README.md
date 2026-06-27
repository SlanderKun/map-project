# Backend

FastAPI + PostgreSQL/PostGIS + MinIO + Martin tile server.

## Требования

| Инструмент | Версия |
|---|---|
| Python | 3.10+ |
| PostgreSQL + PostGIS | 15 / 3.3 |
| Docker + Docker Compose | 24+ |

---

## Вариант 1 — Docker Compose (рекомендуется)

Запускает всё окружение: PostgreSQL, MinIO, Martin, FastAPI-бэкенд, pgAdmin.

### Запуск

```bash
# Из корня репозитория (там где docker-compose.yml)
docker compose up -d --build
```

При первом запуске Docker скачает образы и соберёт бэкенд. Последующие запуски используют кэш.

### Создание MinIO бакета (один раз)

После первого `up` нужно создать бакет для хранения PMTiles:

```bash
docker exec map_storage mc alias set myminio http://localhost:9000 admin supersecretpassword
docker exec map_storage mc mb --ignore-existing myminio/maps-bucket
```

### Остановка

```bash
docker compose down          # остановить контейнеры, сохранить данные
docker compose down -v       # остановить и удалить все тома (сбросить БД и MinIO)
```

### Адреса сервисов

| Сервис | URL |
|---|---|
| FastAPI | http://localhost:8000 |
| Swagger UI | http://localhost:8000/api/openapi.json |
| Martin (тайлы) | http://localhost:3000 |
| MinIO API (S3) | http://localhost:9000 |
| MinIO Console | http://localhost:9001 |
| pgAdmin | http://localhost:5050 |

Логин pgAdmin: `admin@admin.com` / `admin`
Логин MinIO: `admin` / `supersecretpassword`

### Переменные окружения (docker-compose)

Все переменные заданы прямо в `docker-compose.yml`. Для изменения отредактируй секцию `environment` сервиса `backend`:

| Переменная | По умолчанию | Описание |
|---|---|---|
| `DB_HOST` | `postgres` | Хост PostgreSQL |
| `DB_PORT` | `5432` | Порт PostgreSQL |
| `DB_USER` | `mapuser` | Пользователь БД |
| `DB_PASSWORD` | `mappassword` | Пароль БД |
| `DB_NAME` | `forestmap` | Имя базы данных |
| `MINIO_ENDPOINT` | `minio:9000` | Адрес MinIO (внутри Docker) |
| `MINIO_BUCKET_NAME` | `maps-bucket` | Бакет для PMTiles |
| `MINIO_EXTERNAL_URL` | `http://localhost:9000` | Публичный URL MinIO (для браузера) |
| `BACKEND_CORS_ORIGINS` | `["http://localhost:5173"]` | JSON-массив разрешённых CORS-источников |

---

## Вариант 2 — локальный запуск

### 1. Инфраструктура

Бэкенду нужны PostgreSQL/PostGIS и MinIO. Проще всего поднять только их через Compose, без самого бэкенда:

```bash
docker compose up -d postgres minio martin
```

Или установить PostgreSQL с PostGIS вручную — в этом случае убедись, что расширение `postgis` включено в целевой базе.

### 2. Виртуальное окружение

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Переменные окружения

Создай файл `backend/.env` (он не коммитится):

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_USER=mapuser
DB_PASSWORD=mappassword
DB_NAME=forestmap

MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=supersecretpassword
MINIO_BUCKET_NAME=maps-bucket
MINIO_SECURE=False
MINIO_EXTERNAL_URL=http://localhost:9000

BACKEND_CORS_ORIGINS=["http://localhost:5173"]
```

### 4. Миграции

```bash
cd backend
alembic upgrade head
```

Alembic читает `DATABASE_URI` из `app/core/config.py`, который собирает строку подключения из переменных окружения выше.

> **Если получаешь `DuplicateTable`**: таблицы уже были созданы Docker-бэкендом через `SQLModel.create_all()`.
> Проставь метку вручную — без повторного создания:
> ```bash
> alembic stamp head
> ```

### 5. Запуск

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Флаг `--reload` перезапускает сервер при изменении файлов (удобно для разработки).

---

## Миграции (общее)

```bash
# Применить все миграции
alembic upgrade head

# Откатить последнюю миграцию
alembic downgrade -1

# Создать новую миграцию (после изменения моделей)
alembic revision --autogenerate -m "описание изменения"
```

> В Docker Compose миграции применяются автоматически при старте — `app/main.py` вызывает `create_database()` который синхронизирует схему через SQLModel.

---

## Структура

```
backend/
├── app/
│   ├── api/v1/endpoints/   # Роутеры: map, node, edge
│   ├── core/               # Конфиг, DI-контейнер, подключение к БД
│   ├── model/              # SQLModel-модели (Map, Node, Edge)
│   ├── repository/         # Слой доступа к данным
│   ├── schema/             # Pydantic-схемы запросов/ответов
│   ├── services/           # Бизнес-логика
│   └── main.py             # Точка входа FastAPI
└── alembic/                # Миграции БД
```
