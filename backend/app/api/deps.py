from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repository.edge_repository import EdgeRepository
from app.repository.map_repository import MapRepository
from app.repository.node_repository import NodeRepository
from app.services.edge_service import EdgeService
from app.services.map_service import MapService
from app.services.node_service import NodeService


def get_map_service(db: Session = Depends(get_db)) -> MapService:
    return MapService(MapRepository(db))


def get_node_service(db: Session = Depends(get_db)) -> NodeService:
    return NodeService(NodeRepository(db))


def get_edge_service(db: Session = Depends(get_db)) -> EdgeService:
    return EdgeService(EdgeRepository(db))
