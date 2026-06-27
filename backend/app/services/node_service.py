from typing import List

from app.repository.node_repository import NodeRepository
from app.schema.map_schema import CreateNode, NodeResponse, UpdateNode


class NodeService:
    def __init__(self, node_repository: NodeRepository) -> None:
        self.node_repository = node_repository

    def list_nodes(self, map_id: int) -> List[NodeResponse]:
        nodes = self.node_repository.list_nodes(map_id)
        return [NodeResponse(**node) for node in nodes]

    def get_node(self, node_id: int) -> NodeResponse:
        return NodeResponse(**self.node_repository.get_node(node_id))

    def create_node(self, payload: CreateNode) -> NodeResponse:
        node = self.node_repository.create_node(
            map_id=payload.map_id,
            lat=payload.lat,
            lon=payload.lon,
            is_walkable=payload.is_walkable,
            terrain_type=payload.terrain_type,
        )
        return NodeResponse(**node)

    def update_node(self, node_id: int, payload: UpdateNode) -> NodeResponse:
        node = self.node_repository.update_node(
            node_id=node_id,
            lat=payload.lat,
            lon=payload.lon,
            is_walkable=payload.is_walkable,
            terrain_type=payload.terrain_type,
        )
        return NodeResponse(**node)

    def delete_node(self, node_id: int) -> None:
        self.node_repository.delete_node(node_id)
