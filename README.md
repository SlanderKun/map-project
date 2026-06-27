# map-project

Веб-приложение для построения маршрутов по пересечённой местности. Карта рендерится в браузере через MapLibre, граф дорог/троп хранится в PostGIS, маршрут считается на клиенте алгоритмом A* с учётом типа рельефа.

Стек заточен под сценарий «аэролодки»: вода, болото, лёд, снег и грунт имеют разный «вес», а густой лес и горы считаются непроходимыми.

## Что умеет

**Клиент (`frontend/`)**

- Интерактивная карта: ставите точки A и B, маршрут рисуется поверх тайлов.
- Два профиля маршрутизации — `safe` и `fast` — с разными коэффициентами по типам местности.
- Офлайн-базовая карта: векторные тайлы скачиваются в IndexedDB, дальше карта работает без сети.
- Синхронизация графа с бэкендом: узлы и рёбра кэшируются локально (Dexie), маршрут строится даже при пропаже API.

**Сервер (`backend/`)**

- REST API для карт, узлов и рёбер (`/api/v1/...`).
- Хранение геометрии в PostGIS (точки узлов, связи между ними).
- Импорт и экспорт графа в GeoJSON.
- Выгрузка фрагмента карты по bounding box (узлы + рёбра внутри области).
- TileJSON-эндпоинт для векторных тайлов из MinIO.

**Админка (`frontend_admin/`)**

- Простая HTML-страница для просмотра списка карт, узлов и рёбер через API. Без сборки, открывается как статика.

## Архитектура

```
┌─────────────┐     REST      ┌──────────────┐     PostGIS    ┌──────────┐
│   React     │ ────────────► │   FastAPI    │ ◄────────────► │ Postgres │
│  MapLibre   │               │              │                └──────────┘
│  IndexedDB  │               └──────┬───────┘
└─────────────┘                      │
                                     ▼
                              ┌──────────────┐     PMTiles    ┌────────┐
                              │    Martin    │ ◄────────────► │  MinIO │
                              └──────────────┘                └────────┘
```

| Компонент | Назначение |
|-----------|------------|
| PostgreSQL + PostGIS | Граф маршрутов, геометрия |
| MinIO | S3-хранилище для PMTiles и векторных тайлов |
| Martin | Тайловый сервер, отдаёт PMTiles из MinIO |
| FastAPI | Бизнес-логика и API |
| React + MapLibre | UI, офлайн-кэш, маршрутизация |

## Быстрый старт

Нужны Docker и Docker Compose. Node.js — только если запускаете фронт отдельно.

### 1. Поднять инфраструктуру и бэкенд

Из корня репозитория:

```bash
docker compose up -d --build
```

При первом запуске сервис `minio-init` автоматически:

- создаёт бакет `maps-bucket`;
- загружает PMTiles из `data/pmtiles/` (файлы `khabarovsk.pmtiles`, `krasnoyarsk.pmtiles`).

Если PMTiles лежат на рабочем столе, скопируйте их один раз:

```powershell
Copy-Item "$env:USERPROFILE\Desktop\maps\*.pmtiles" "data\pmtiles\"
```

Затем перезапустите инициализацию:

```bash
docker compose run --rm minio-init
docker compose restart martin
```

Миграции Alembic выполняются при старте backend. Вторая миграция заполняет БД двумя картами (Хабаровск, Красноярск) с сеткой из ~100 вершин и рёбер на каждую.

### 2. Открыть приложение

После `docker compose up -d --build` фронт доступен на http://localhost:5173 (через nginx в контейнере).

Либо для разработки:

```bash
cd frontend
npm install
npm run dev
```

При первом заходе нажмите **«Загрузить карту»** — без этого базовые тайлы не попадут в IndexedDB.

### 3. Админка (опционально)

Откройте `frontend_admin/index.html` в браузере или поднимите любой статический сервер в папке `frontend_admin/`. По умолчанию API — `http://localhost:8000`.

## Адреса сервисов

| Сервис | URL | Учётные данные |
|--------|-----|----------------|
| Фронт (Docker) | http://localhost:5173 | — |
| Фронт (dev) | http://localhost:5174 (vite) | — |
| Админка | http://localhost:8080 | — |
| API | http://localhost:8000 | — |
| Swagger / OpenAPI | http://localhost:8000/api/openapi.json | — |
| Martin (тайлы) | http://localhost:3000 | — |
| MinIO Console | http://localhost:9001 | `admin` / `supersecretpassword` |
| pgAdmin | http://localhost:5050 | `admin@admin.com` / `admin` |

Остановка:

```bash
docker compose down        # контейнеры остановлены, данные в томах сохранены
docker compose down -v     # то же + удаление томов (сброс БД и MinIO)
```

## Локальная разработка без Docker-бэкенда

Можно поднять только инфраструктуру и крутить API вручную:

```bash
docker compose up -d postgres minio martin
```

Дальше — в `backend/`:

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

Создайте `backend/.env` (файл в `.gitignore`):

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

Миграции и запуск:

```bash
cd backend
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Если таблицы уже созданы Docker-контейнером и `alembic upgrade` падает с `DuplicateTable`:

```bash
alembic stamp head
```

Подробнее про бэкенд — в [backend/README.md](backend/README.md).

## API (кратко)

Префикс всех эндпоинтов: `/api/v1`.

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/maps` | Список карт |
| `POST` | `/maps` | Создать карту |
| `GET` | `/maps/{id}` | Карта по id |
| `POST` | `/maps/{id}/download` | Узлы и рёбра в bbox |
| `GET/POST` | `/maps/{id}/geojson` | Экспорт / импорт графа |
| `GET` | `/maps/tilejson` | TileJSON для векторных тайлов |
| `GET/POST/PATCH/DELETE` | `/nodes`, `/nodes/{id}` | CRUD узлов (`map_id` в query/body) |
| `GET/POST/PATCH/DELETE` | `/edges`, `/edges/{id}` | CRUD рёбер |

Фронт по умолчанию работает с `map_id = 1`. Перед маршрутизацией данные подтягиваются с сервера в IndexedDB.

## Структура репозитория

```
map-project/
├── backend/           # FastAPI, модели, миграции Alembic
├── frontend/          # React + MapLibre, маршрутизация, офлайн-кэш
├── frontend_admin/    # Статическая админка
├── docker-compose.yml
└── martin-config.yaml # Конфиг тайлового сервера Martin
```

## Чеклист демонстрации (Кубок Енисея)

Перед показом выполните:

```bash
docker compose up -d --build
docker compose run --rm minio-init   # если PMTiles обновлялись
```

| # | Проверка | Ожидание |
|---|----------|----------|
| 1 | http://localhost:8000/ | `{"status":"ok"}` |
| 2 | http://localhost:8000/api/v1/maps | 2 карты: Хабаровск, Красноярск |
| 3 | http://localhost:3000/catalog | источники `khabarovsk`, `krasnoyarsk` |
| 4 | http://localhost:9001 (MinIO) | бакет `maps-bucket`, 2 файла `.pmtiles` |
| 5 | http://localhost:5173 | UI открывается, в списке 2 карты |
| 6 | «Загрузить карту» | прогресс тайлов, карта отображается |
| 7 | Точки A и B на карте | маркеры ставятся кликом |
| 8 | «Построить маршрут» | линия маршрута, статус «Маршрут: N точек» |
| 9 | Переключение safe / fast | маршрут или вес меняется |
| 10 | http://localhost:8080 | админка: карты, узлы, рёбра |

Тесты бэкенда:

```bash
docker exec map_db psql -U mapuser -d postgres -c "CREATE DATABASE forestmap_test"
cd backend && pytest
```

## Тесты

```bash
cd backend
pytest
```

## Требования

| Инструмент | Версия |
|------------|--------|
| Python | 3.10+ |
| Node.js | 18+ |
| Docker + Compose | 24+ |
| PostgreSQL + PostGIS | 15 / 3.3 (в Docker-образе) |
