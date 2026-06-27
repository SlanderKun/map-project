from typing import Any, Dict, List, Literal, Optional, Tuple, Union

from pydantic import BaseModel

Position = Tuple[float, float]


class PointGeometry(BaseModel):
    type: Literal["Point"]
    coordinates: Position


class LineStringGeometry(BaseModel):
    type: Literal["LineString"]
    coordinates: List[Position]


Geometry = Union[PointGeometry, LineStringGeometry]


class Feature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: Geometry
    properties: Dict[str, Any] = {}
    id: Optional[Union[int, str]] = None


class FeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: List[Feature] = []
