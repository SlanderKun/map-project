from contextlib import AbstractContextManager
from typing import Callable, List

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.model.map_graph import Node
from app.repository.base_repository import BaseRepository


class NodeRepository(BaseRepository):
    def __init__(self, session_factory: Callable[..., AbstractContextManager[Session]]):
        self.session_factory = session_factory
        super().__init__(session_factory, Node)

    def list_nodes(self, map_id: int) -> List[dict]:
        with self.session_factory() as session:
            query = session.query(
                Node.id,
                Node.map_id,
                Node.is_walkable,
                Node.terrain_type,
                Node.created_at,
                Node.updated_at,
                func.ST_Y(Node.geom).label("lat"),
                func.ST_X(Node.geom).label("lon"),
            ).filter(Node.map_id == map_id)
            return [row._asdict() for row in query.all()]

    def get_node(self, node_id: int) -> dict:
        with self.session_factory() as session:
            query = (
                session.query(
                    Node.id,
                    Node.map_id,
                    Node.is_walkable,
                    Node.terrain_type,
                    Node.created_at,
                    Node.updated_at,
                    func.ST_Y(Node.geom).label("lat"),
                    func.ST_X(Node.geom).label("lon"),
                )
                .filter(Node.id == node_id)
                .first()
            )
            if not query:
                raise NotFoundError(detail=f"node not found id : {node_id}")
            return query._asdict()

    def create_node(
        self,
        map_id: int,
        lat: float,
        lon: float,
        is_walkable: bool,
        terrain_type: str,
    ) -> dict:
        with self.session_factory() as session:
            geom = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
            node_obj = Node(
                map_id=map_id,
                geom=geom,
                is_walkable=is_walkable,
                terrain_type=terrain_type,
            )
            session.add(node_obj)
            session.commit()
            session.refresh(node_obj)
            return self.get_node(node_obj.id)

    def update_node(
        self,
        node_id: int,
        lat: float = None,
        lon: float = None,
        is_walkable: bool = None,
        terrain_type: str = None,
    ) -> dict:
        with self.session_factory() as session:
            node_obj = session.query(Node).filter(Node.id == node_id).first()
            if not node_obj:
                raise NotFoundError(detail=f"node not found id : {node_id}")
            if lat is not None and lon is not None:
                node_obj.geom = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
            if is_walkable is not None:
                node_obj.is_walkable = is_walkable
            if terrain_type is not None:
                node_obj.terrain_type = terrain_type
            session.commit()
            session.refresh(node_obj)
            return self.get_node(node_obj.id)

    def delete_node(self, node_id: int) -> None:
        with self.session_factory() as session:
            node_obj = session.query(Node).filter(Node.id == node_id).first()
            if not node_obj:
                raise NotFoundError(detail=f"node not found id : {node_id}")
            session.delete(node_obj)
            session.commit()