from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import Column
from sqlmodel import Field

from app.model.base_model import BaseModel


class Map(BaseModel, table=True):
    name: str = Field(index=True)
    pmtiles_url: str = Field()
    description: str = Field(default=None, nullable=True)


class Node(BaseModel, table=True):
    map_id: int = Field(foreign_key="map.id", index=True)
    geom: Any = Field(sa_column=Column(Geometry("POINT", srid=4326)))
    is_walkable: bool = Field(default=True)
    terrain_type: str = Field(default="dirt_trail")


class Edge(BaseModel, table=True):
    map_id: int = Field(foreign_key="map.id", index=True)
    source_id: int = Field(foreign_key="node.id", index=True)
    target_id: int = Field(foreign_key="node.id", index=True)
    weight: float = Field()
