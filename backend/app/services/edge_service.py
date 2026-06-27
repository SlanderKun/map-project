from typing import List

from app.repository.edge_repository import EdgeRepository
from app.schema.map_schema import CreateEdge, EdgeResponse, UpdateEdge
from app.services.base_service import BaseService


class EdgeService(BaseService):
    def __init__(self, edge_repository: EdgeRepository):
        self.edge_repository = edge_repository
        super().__init__(edge_repository)

    def list_edges(self, map_id: int) -> List[EdgeResponse]:
        edges = self.edge_repository.list_edges(map_id)
        return [EdgeResponse(**self._edge_to_dict(edge)) for edge in edges]

    def get_edge(self, edge_id: int) -> EdgeResponse:
        edge = self.edge_repository.get_edge(edge_id)
        return EdgeResponse(**self._edge_to_dict(edge))

    def create_edge(self, payload: CreateEdge) -> EdgeResponse:
        edge = self.edge_repository.create_edge(
            map_id=payload.map_id,
            source_id=payload.source_id,
            target_id=payload.target_id,
            weight=payload.weight,
        )
        return EdgeResponse(**self._edge_to_dict(edge))

    def update_edge(self, edge_id: int, payload: UpdateEdge) -> EdgeResponse:
        edge = self.edge_repository.update_edge(
            edge_id=edge_id,
            source_id=payload.source_id,
            target_id=payload.target_id,
            weight=payload.weight,
        )
        return EdgeResponse(**self._edge_to_dict(edge))

    def delete_edge(self, edge_id: int) -> None:
        self.edge_repository.delete_edge(edge_id)

    @staticmethod
    def _edge_to_dict(edge) -> dict:
        return {
            "id": edge.id,
            "map_id": edge.map_id,
            "source_id": edge.source_id,
            "target_id": edge.target_id,
            "weight": edge.weight,
            "created_at": edge.created_at,
            "updated_at": edge.updated_at,
        }