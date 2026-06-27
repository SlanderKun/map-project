from contextlib import AbstractContextManager
from typing import Callable, List

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.model.map_graph import Edge, Node
from app.repository.base_repository import BaseRepository


class EdgeRepository(BaseRepository):
    def __init__(self, session_factory: Callable[..., AbstractContextManager[Session]]):
        self.session_factory = session_factory
        super().__init__(session_factory, Edge)

    def list_edges(self, map_id: int) -> List[Edge]:
        with self.session_factory() as session:
            return (
                session.query(Edge)
                .filter(Edge.map_id == map_id)
                .order_by(Edge.id.asc())
                .all()
            )

    def get_edge(self, edge_id: int) -> Edge:
        with self.session_factory() as session:
            edge_obj = session.query(Edge).filter(Edge.id == edge_id).first()
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
        with self.session_factory() as session:
            self._ensure_nodes_exist(session, map_id, source_id, target_id)
            edge_obj = Edge(
                map_id=map_id,
                source_id=source_id,
                target_id=target_id,
                weight=weight,
            )
            session.add(edge_obj)
            session.commit()
            session.refresh(edge_obj)
            return edge_obj

    def update_edge(
        self,
        edge_id: int,
        source_id: int = None,
        target_id: int = None,
        weight: float = None,
    ) -> Edge:
        with self.session_factory() as session:
            edge_obj = session.query(Edge).filter(Edge.id == edge_id).first()
            if not edge_obj:
                raise NotFoundError(detail=f"edge not found id : {edge_id}")
            if source_id is not None:
                self._ensure_node_exists(session, edge_obj.map_id, source_id)
                edge_obj.source_id = source_id
            if target_id is not None:
                self._ensure_node_exists(session, edge_obj.map_id, target_id)
                edge_obj.target_id = target_id
            if weight is not None:
                edge_obj.weight = weight
            session.commit()
            session.refresh(edge_obj)
            return edge_obj

    def delete_edge(self, edge_id: int) -> None:
        with self.session_factory() as session:
            edge_obj = session.query(Edge).filter(Edge.id == edge_id).first()
            if not edge_obj:
                raise NotFoundError(detail=f"edge not found id : {edge_id}")
            session.delete(edge_obj)
            session.commit()

    @staticmethod
    def _ensure_node_exists(session: Session, map_id: int, node_id: int) -> None:
        node_obj = (
            session.query(Node)
            .filter(Node.id == node_id, Node.map_id == map_id)
            .first()
        )
        if not node_obj:
            raise NotFoundError(
                detail=f"node not found id : {node_id} for map : {map_id}"
            )

    def _ensure_nodes_exist(
        self, session: Session, map_id: int, source_id: int, target_id: int
    ) -> None:
        self._ensure_node_exists(session, map_id, source_id)
        self._ensure_node_exists(session, map_id, target_id)