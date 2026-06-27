from typing import List

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_node_service
from app.schema.map_schema import CreateNode, NodeResponse, UpdateNode
from app.services.node_service import NodeService

router = APIRouter(prefix="/nodes", tags=["nodes"])


@router.get("", response_model=List[NodeResponse])
def list_nodes(
    map_id: int = Query(...),
    service: NodeService = Depends(get_node_service),
):
    return service.list_nodes(map_id)


@router.post("", response_model=NodeResponse)
def create_node(payload: CreateNode, service: NodeService = Depends(get_node_service)):
    return service.create_node(payload)


@router.get("/{node_id}", response_model=NodeResponse)
def get_node(node_id: int, service: NodeService = Depends(get_node_service)):
    return service.get_node(node_id)


@router.patch("/{node_id}", response_model=NodeResponse)
def update_node(
    node_id: int,
    payload: UpdateNode,
    service: NodeService = Depends(get_node_service),
):
    return service.update_node(node_id, payload)


@router.delete("/{node_id}")
def delete_node(node_id: int, service: NodeService = Depends(get_node_service)):
    service.delete_node(node_id)
    return {"deleted": True}
