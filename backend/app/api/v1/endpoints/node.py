from typing import List

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, Query

from app.core.container import Container
from app.schema.map_schema import CreateNode, NodeResponse, UpdateNode
from app.services.node_service import NodeService

router = APIRouter(
    prefix="/nodes",
    tags=["nodes"],
)


@router.get("", response_model=List[NodeResponse])
@inject
def list_nodes(
    map_id: int = Query(...),
    service: NodeService = Depends(Provide[Container.node_service]),
):
    return service.list_nodes(map_id)


@router.post("", response_model=NodeResponse)
@inject
def create_node(
    payload: CreateNode,
    service: NodeService = Depends(Provide[Container.node_service]),
):
    return service.create_node(payload)


@router.get("/{node_id}", response_model=NodeResponse)
@inject
def get_node(
    node_id: int,
    service: NodeService = Depends(Provide[Container.node_service]),
):
    return service.get_node(node_id)


@router.patch("/{node_id}", response_model=NodeResponse)
@inject
def update_node(
    node_id: int,
    payload: UpdateNode,
    service: NodeService = Depends(Provide[Container.node_service]),
):
    return service.update_node(node_id, payload)


@router.delete("/{node_id}")
@inject
def delete_node(
    node_id: int,
    service: NodeService = Depends(Provide[Container.node_service]),
):
    service.delete_node(node_id)
    return {"deleted": True}