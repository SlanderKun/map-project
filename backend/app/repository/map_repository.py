from contextlib import AbstractContextManager
from typing import Callable, Dict, List

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.model.map_graph import Edge, Map, Node
from app.repository.base_repository import BaseRepository


class MapRepository(BaseRepository):
    def __init__(self, session_factory: Callable[..., AbstractContextManager[Session]]):
        self.session_factory = session_factory
        super().__init__(session_factory, Map)

    def list_maps(self) -> List[Map]:
        with self.session_factory() as session:
            return session.query(Map).order_by(Map.id.asc()).all()

    def get_map(self, map_id: int) -> Map:
        with self.session_factory() as session:
            map_obj = session.query(Map).filter(Map.id == map_id).first()
            if not map_obj:
                raise NotFoundError(detail=f"map not found id : {map_id}")
            return map_obj

    def create_map(self, name: str, pmtiles_url: str, description: str = None) -> Map:
        with self.session_factory() as session:
            map_obj = Map(name=name, pmtiles_url=pmtiles_url, description=description)
            session.add(map_obj)
            session.commit()
            session.refresh(map_obj)
            return map_obj

    def get_nodes_in_bbox(
        self, map_id: int, min_lon: float, min_lat: float, max_lon: float, max_lat: float
    ) -> List[dict]:
        with self.session_factory() as session:
            bbox = func.ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
            query = session.query(
                Node.id,
                Node.map_id,
                Node.is_walkable,
                Node.terrain_type,
                Node.created_at,
                Node.updated_at,
                func.ST_Y(Node.geom).label("lat"),
                func.ST_X(Node.geom).label("lon"),
            ).filter(
                Node.map_id == map_id,
                func.ST_Intersects(Node.geom, bbox),
            )
            return [row._asdict() for row in query.all()]

    def get_edges_by_node_ids(self, map_id: int, node_ids: List[int]) -> List[Edge]:
        with self.session_factory() as session:
            return (
                session.query(Edge)
                .filter(Edge.map_id == map_id, Edge.source_id.in_(node_ids))
                .all()
            )

    def get_all_nodes(self, map_id: int) -> List[dict]:
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

    def get_all_edges(self, map_id: int) -> List[Edge]:
        with self.session_factory() as session:
            return session.query(Edge).filter(Edge.map_id == map_id).all()

    def replace_graph(
        self, map_id: int, nodes: List[dict], edges: List[dict]
    ) -> Dict[str, int]:
        with self.session_factory() as session:
            session.query(Edge).filter(Edge.map_id == map_id).delete()
            session.query(Node).filter(Node.map_id == map_id).delete()
            session.flush()

            external_to_internal: Dict = {}
            nodes_created = 0
            for node in nodes:
                geom = func.ST_SetSRID(func.ST_MakePoint(node["lon"], node["lat"]), 4326)
                node_obj = Node(
                    map_id=map_id,
                    geom=geom,
                    is_walkable=node.get("is_walkable", True),
                    terrain_type=node.get("terrain_type", "dirt_trail"),
                )
                session.add(node_obj)
                session.flush()
                if node.get("external_id") is not None:
                    external_to_internal[node["external_id"]] = node_obj.id
                nodes_created += 1

            edges_created = 0
            for edge in edges:
                source_id = external_to_internal.get(edge["source_id"], edge["source_id"])
                target_id = external_to_internal.get(edge["target_id"], edge["target_id"])
                edge_obj = Edge(
                    map_id=map_id,
                    source_id=source_id,
                    target_id=target_id,
                    weight=edge.get("weight", 1.0),
                )
                session.add(edge_obj)
                edges_created += 1

            session.commit()
            return {"nodes_created": nodes_created, "edges_created": edges_created}
