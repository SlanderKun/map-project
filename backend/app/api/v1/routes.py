from fastapi import APIRouter

from app.api.v1.endpoints.edge import router as edge_router
from app.api.v1.endpoints.map import router as map_router
from app.api.v1.endpoints.node import router as node_router

router = APIRouter()
router.include_router(map_router)
router.include_router(node_router)
router.include_router(edge_router)
