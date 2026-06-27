from typing import List

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_edge_service
from app.schema.map_schema import CreateEdge, EdgeResponse, UpdateEdge
from app.services.edge_service import EdgeService

router = APIRouter(prefix="/edges", tags=["edges"])


@router.get("", response_model=List[EdgeResponse])
def list_edges(
    map_id: int = Query(...),
    service: EdgeService = Depends(get_edge_service),
):
    return service.list_edges(map_id)


@router.post("", response_model=EdgeResponse)
def create_edge(payload: CreateEdge, service: EdgeService = Depends(get_edge_service)):
    return service.create_edge(payload)


@router.get("/{edge_id}", response_model=EdgeResponse)
def get_edge(edge_id: int, service: EdgeService = Depends(get_edge_service)):
    return service.get_edge(edge_id)


@router.patch("/{edge_id}", response_model=EdgeResponse)
def update_edge(
    edge_id: int,
    payload: UpdateEdge,
    service: EdgeService = Depends(get_edge_service),
):
    return service.update_edge(edge_id, payload)


@router.delete("/{edge_id}")
def delete_edge(edge_id: int, service: EdgeService = Depends(get_edge_service)):
    service.delete_edge(edge_id)
    return {"deleted": True}
