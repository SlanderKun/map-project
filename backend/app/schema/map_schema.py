from typing import List, Optional

from pydantic import BaseModel

from app.schema.base_schema import ModelBaseInfo
from app.schema.geojson_schema import FeatureCollection


class BoundingBox(BaseModel):
    min_lon: float
    min_lat: float
    max_lon: float
    max_lat: float


class CreateMap(BaseModel):
    name: str
    pmtiles_url: str
    description: Optional[str] = None


class MapInfo(ModelBaseInfo):
    name: str
    pmtiles_url: str
    description: Optional[str] = None


class CreateNode(BaseModel):
    map_id: int
    lat: float
    lon: float
    is_walkable: bool = True
    terrain_type: str = "dirt_trail"


class UpdateNode(BaseModel):
    lat: Optional[float] = None
    lon: Optional[float] = None
    is_walkable: Optional[bool] = None
    terrain_type: Optional[str] = None


class NodeResponse(ModelBaseInfo):
    map_id: int
    lat: float
    lon: float
    is_walkable: bool
    terrain_type: str


class CreateEdge(BaseModel):
    map_id: int
    source_id: int
    target_id: int
    weight: float = 1.0


class UpdateEdge(BaseModel):
    source_id: Optional[int] = None
    target_id: Optional[int] = None
    weight: Optional[float] = None


class EdgeResponse(ModelBaseInfo):
    map_id: int
    source_id: int
    target_id: int
    weight: float


class MapAreaResponse(BaseModel):
    map_id: int
    pmtiles_url: str
    nodes: List[NodeResponse]
    edges: List[EdgeResponse]


class ImportResult(BaseModel):
    map_id: int
    nodes_created: int
    edges_created: int
