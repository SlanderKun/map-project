from fastapi import APIRouter

from app.api.v1.endpoints.edge import router as edge_router
from app.api.v1.endpoints.map import router as map_router
from app.api.v1.endpoints.node import router as node_router

routers = APIRouter()
router_list = [map_router, node_router, edge_router]

for router in router_list:
    routers.include_router(router)
