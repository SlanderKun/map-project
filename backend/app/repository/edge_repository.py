from typing import List

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.model.map_graph import Edge, Node


class EdgeRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_edges(self, map_id: int) -> List[Edge]:
        return (
            self.session.query(Edge)
            .filter(Edge.map_id == map_id)
            .order_by(Edge.id.asc())
            .all()
        )

    def get_edge(self, edge_id: int) -> Edge:
        edge_obj = self.session.query(Edge).filter(Edge.id == edge_id).first()
        if not edge_obj:
            raise NotFoundError(detail=f"edge not found id : {edge_id}")
        return edge_obj

    def create_edge(
        self,
        map_id: int,
        source_id: int,
        target_id: int,
        weight: float,
    ) -> Edge:
        self._ensure_nodes_exist(map_id, source_id, target_id)
        edge_obj = Edge(
            map_id=map_id,
            source_id=source_id,
            target_id=target_id,
            weight=weight,
        )
        self.session.add(edge_obj)
        self.session.commit()
        self.session.refresh(edge_obj)
        return edge_obj

    def update_edge(
        self,
        edge_id: int,
        source_id: int | None = None,
        target_id: int | None = None,
        weight: float | None = None,
    ) -> Edge:
        edge_obj = self.session.query(Edge).filter(Edge.id == edge_id).first()
        if not edge_obj:
            raise NotFoundError(detail=f"edge not found id : {edge_id}")
        if source_id is not None:
            self._ensure_node_exists(edge_obj.map_id, source_id)
            edge_obj.source_id = source_id
        if target_id is not None:
            self._ensure_node_exists(edge_obj.map_id, target_id)
            edge_obj.target_id = target_id
        if weight is not None:
            edge_obj.weight = weight
        self.session.commit()
        self.session.refresh(edge_obj)
        return edge_obj

    def delete_edge(self, edge_id: int) -> None:
        edge_obj = self.session.query(Edge).filter(Edge.id == edge_id).first()
        if not edge_obj:
            raise NotFoundError(detail=f"edge not found id : {edge_id}")
        self.session.delete(edge_obj)
        self.session.commit()

    def _ensure_node_exists(self, map_id: int, node_id: int) -> None:
        node_obj = (
            self.session.query(Node)
            .filter(Node.id == node_id, Node.map_id == map_id)
            .first()
        )
        if not node_obj:
            raise NotFoundError(detail=f"node not found id : {node_id} for map : {map_id}")

    def _ensure_nodes_exist(self, map_id: int, source_id: int, target_id: int) -> None:
        self._ensure_node_exists(map_id, source_id)
        self._ensure_node_exists(map_id, target_id)
