from typing import List

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import NotFoundError
from app.model.map_graph import Map, Node


class NodeRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_nodes(self, map_id: int) -> List[dict]:
        query = self.session.query(
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
        row = (
            self.session.query(
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
        if not row:
            raise NotFoundError(detail=f"node not found id : {node_id}")
        return row._asdict()

    def create_node(
        self,
        map_id: int,
        lat: float,
        lon: float,
        is_walkable: bool,
        terrain_type: str,
    ) -> dict:
        map_obj = self.session.query(Map).filter(Map.id == map_id).first()
        if not map_obj:
            raise NotFoundError(detail=f"map not found id : {map_id}")

        geom = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
        node_obj = Node(
            map_id=map_id,
            geom=geom,
            is_walkable=is_walkable,
            terrain_type=terrain_type,
        )
        self.session.add(node_obj)
        self.session.commit()
        self.session.refresh(node_obj)
        return self.get_node(node_obj.id)

    def update_node(
        self,
        node_id: int,
        lat: float | None = None,
        lon: float | None = None,
        is_walkable: bool | None = None,
        terrain_type: str | None = None,
    ) -> dict:
        node_obj = self.session.query(Node).filter(Node.id == node_id).first()
        if not node_obj:
            raise NotFoundError(detail=f"node not found id : {node_id}")
        if lat is not None and lon is not None:
            node_obj.geom = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
        if is_walkable is not None:
            node_obj.is_walkable = is_walkable
        if terrain_type is not None:
            node_obj.terrain_type = terrain_type
        self.session.commit()
        return self.get_node(node_id)

    def delete_node(self, node_id: int) -> None:
        node_obj = self.session.query(Node).filter(Node.id == node_id).first()
        if not node_obj:
            raise NotFoundError(detail=f"node not found id : {node_id}")
        self.session.delete(node_obj)
        self.session.commit()
