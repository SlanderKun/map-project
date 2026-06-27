from typing import List

from app.model.map_graph import Edge
from app.repository.edge_repository import EdgeRepository
from app.schema.map_schema import CreateEdge, EdgeResponse, UpdateEdge


def edge_to_dict(edge: Edge) -> dict:
    return {
        "id": edge.id,
        "map_id": edge.map_id,
        "source_id": edge.source_id,
        "target_id": edge.target_id,
        "weight": edge.weight,
        "created_at": edge.created_at,
        "updated_at": edge.updated_at,
    }


class EdgeService:
    def __init__(self, edge_repository: EdgeRepository) -> None:
        self.edge_repository = edge_repository

    def list_edges(self, map_id: int) -> List[EdgeResponse]:
        edges = self.edge_repository.list_edges(map_id)
        return [EdgeResponse(**edge_to_dict(edge)) for edge in edges]

    def get_edge(self, edge_id: int) -> EdgeResponse:
        return EdgeResponse(**edge_to_dict(self.edge_repository.get_edge(edge_id)))

    def create_edge(self, payload: CreateEdge) -> EdgeResponse:
        edge = self.edge_repository.create_edge(
            map_id=payload.map_id,
            source_id=payload.source_id,
            target_id=payload.target_id,
            weight=payload.weight,
        )
        return EdgeResponse(**edge_to_dict(edge))

    def update_edge(self, edge_id: int, payload: UpdateEdge) -> EdgeResponse:
        edge = self.edge_repository.update_edge(
            edge_id=edge_id,
            source_id=payload.source_id,
            target_id=payload.target_id,
            weight=payload.weight,
        )
        return EdgeResponse(**edge_to_dict(edge))

    def delete_edge(self, edge_id: int) -> None:
        self.edge_repository.delete_edge(edge_id)
