from typing import List

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends
import os

from app.core.container import Container
from app.schema.geojson_schema import FeatureCollection
from app.schema.map_schema import (
    BoundingBox,
    CreateMap,
    ImportResult,
    MapAreaResponse,
    MapInfo,
    TileJSONResponse,
)
from app.services.map_service import MapService

router = APIRouter(
    prefix="/maps",
    tags=["maps"],
)


@router.get("", response_model=List[MapInfo])
@inject
def list_maps(service: MapService = Depends(Provide[Container.map_service])):
    return service.list_maps()


@router.post("", response_model=MapInfo)
@inject
def create_map(
    payload: CreateMap,
    service: MapService = Depends(Provide[Container.map_service]),
):
    return service.create_map(payload)

@router.get("/tilejson", response_model=TileJSONResponse)
async def get_tilejson():
    minio_url = os.getenv("MINIO_EXTERNAL_URL", "http://localhost:9000")
    bucket_name = os.getenv("MINIO_BUCKET_NAME", "maps-bucket")

    tiles_url = f"{minio_url}/{bucket_name}/tiles/{{z}}/{{x}}/{{y}}.pbf"

    return {
        "tilejson": "2.0.0",
        "name": "my-forestmap",
        "type": "baselayer",
        "scale": "1.000000",
        "bounds": [-180, -85.051129, 180, 85.051129],
        "format": "pbf",
        "maxzoom": 6,
        "minzoom": 0,
        "profile": "mercator",
        "version": "1",
        "vector_layers": [
            {
                "id": "geolines",
                "fields": {
                    "name": "String"
                },
                "maxzoom": 4,
                "minzoom": 0,
                "description": "geographic lines"
            },
            {
                "id": "centroids",
                "fields": {
                    "NAME": "String",
                    "ABBREV": "String"
                },
                "maxzoom": 6,
                "minzoom": 0,
                "description": "world countries points"
            },
            {
                "id": "countries",
                "fields": {
                    "fid": "Number",
                    "NAME": "String",
                    "ABBREV": "String",
                    "ADM0_A3": "String",
                    "CONTINENT": "String"
                },
                "maxzoom": 6,
                "minzoom": 0,
                "description": "world countries polygons"
            }
        ],
        "tiles": [tiles_url]
    }

@router.get("/{map_id}", response_model=MapInfo)
@inject
def get_map(
    map_id: int,
    service: MapService = Depends(Provide[Container.map_service]),
):
    return service.get_map(map_id)


@router.post("/{map_id}/download", response_model=MapAreaResponse)
@inject
def download_map_area(
    map_id: int,
    bbox: BoundingBox,
    service: MapService = Depends(Provide[Container.map_service]),
):
    return service.download_area(map_id, bbox)


@router.get("/{map_id}/geojson", response_model=FeatureCollection)
@inject
def export_geojson(
    map_id: int,
    service: MapService = Depends(Provide[Container.map_service]),
):
    return service.export_geojson(map_id)


@router.post("/{map_id}/geojson", response_model=ImportResult)
@inject
def import_geojson(
    map_id: int,
    collection: FeatureCollection,
    service: MapService = Depends(Provide[Container.map_service]),
):
    return service.import_geojson(map_id, collection)




