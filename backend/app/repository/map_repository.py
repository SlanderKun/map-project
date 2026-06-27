from typing import Dict, List

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import NotFoundError
from app.model.map_graph import Edge, Map, Node


class MapRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_maps(self) -> List[Map]:
        return self.session.query(Map).order_by(Map.id.asc()).all()

    def get_map(self, map_id: int) -> Map:
        map_obj = self.session.query(Map).filter(Map.id == map_id).first()
        if not map_obj:
            raise NotFoundError(detail=f"map not found id : {map_id}")
        return map_obj

    def create_map(self, name: str, pmtiles_url: str, description: str | None = None) -> Map:
        map_obj = Map(name=name, pmtiles_url=pmtiles_url, description=description)
        self.session.add(map_obj)
        self.session.commit()
        self.session.refresh(map_obj)
        return map_obj

    def get_nodes_in_bbox(
        self, map_id: int, min_lon: float, min_lat: float, max_lon: float, max_lat: float
    ) -> List[dict]:
        bbox = func.ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
        query = self.session.query(
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
        if not node_ids:
            return []
        return (
            self.session.query(Edge)
            .filter(
                Edge.map_id == map_id,
                or_(Edge.source_id.in_(node_ids), Edge.target_id.in_(node_ids)),
            )
            .all()
        )

    def get_all_nodes(self, map_id: int) -> List[dict]:
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

    def get_all_edges(self, map_id: int) -> List[Edge]:
        return self.session.query(Edge).filter(Edge.map_id == map_id).all()

    def replace_graph(
        self, map_id: int, nodes: List[dict], edges: List[dict]
    ) -> Dict[str, int]:
        self.session.query(Edge).filter(Edge.map_id == map_id).delete()
        self.session.query(Node).filter(Node.map_id == map_id).delete()
        self.session.flush()

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
            self.session.add(node_obj)
            self.session.flush()
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
            self.session.add(edge_obj)
            edges_created += 1

        self.session.commit()
        return {"nodes_created": nodes_created, "edges_created": edges_created}
