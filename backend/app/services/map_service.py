from typing import List

from app.core.exceptions import NotFoundError, ValidationError
from app.repository.map_repository import MapRepository
from app.schema.geojson_schema import Feature, FeatureCollection
from app.schema.map_schema import BoundingBox, CreateMap, ImportResult, MapAreaResponse
from app.services.base_service import BaseService


class MapService(BaseService):
    def __init__(self, map_repository: MapRepository):
        self.map_repository = map_repository
        super().__init__(map_repository)

    def list_maps(self):
        return self.map_repository.list_maps()

    def get_map(self, map_id: int):
        return self.map_repository.get_map(map_id)

    def create_map(self, payload: CreateMap):
        return self.map_repository.create_map(
            name=payload.name,
            pmtiles_url=payload.pmtiles_url,
            description=payload.description,
        )

    def download_area(self, map_id: int, bbox: BoundingBox) -> MapAreaResponse:
        map_info = self.map_repository.get_map(map_id)

        nodes_data = self.map_repository.get_nodes_in_bbox(
            map_id, bbox.min_lon, bbox.min_lat, bbox.max_lon, bbox.max_lat
        )

        node_ids = [node["id"] for node in nodes_data]
        edges_data = []
        if node_ids:
            edges_data = self.map_repository.get_edges_by_node_ids(map_id, node_ids)

        return MapAreaResponse(
            map_id=map_info.id,
            pmtiles_url=map_info.pmtiles_url,
            nodes=nodes_data,
            edges=edges_data,
        )

    def export_geojson(self, map_id: int) -> FeatureCollection:
        self.map_repository.get_map(map_id)
        nodes = self.map_repository.get_all_nodes(map_id)
        edges = self.map_repository.get_all_edges(map_id)

        node_coords = {node["id"]: (node["lon"], node["lat"]) for node in nodes}
        features: List[Feature] = []

        for node in nodes:
            features.append(
                Feature(
                    id=node["id"],
                    geometry={"type": "Point", "coordinates": (node["lon"], node["lat"])},
                    properties={
                        "kind": "node",
                        "is_walkable": node["is_walkable"],
                        "terrain_type": node["terrain_type"],
                    },
                )
            )

        for edge in edges:
            source = node_coords.get(edge.source_id)
            target = node_coords.get(edge.target_id)
            if source is None or target is None:
                continue
            features.append(
                Feature(
                    id=edge.id,
                    geometry={"type": "LineString", "coordinates": [source, target]},
                    properties={
                        "kind": "edge",
                        "source_id": edge.source_id,
                        "target_id": edge.target_id,
                        "weight": edge.weight,
                    },
                )
            )

        return FeatureCollection(features=features)

    def import_geojson(self, map_id: int, collection: FeatureCollection) -> ImportResult:
        self.map_repository.get_map(map_id)

        nodes = []
        edges = []
        for feature in collection.features:
            geom = feature.geometry
            props = feature.properties or {}
            if geom.type == "Point":
                lon, lat = geom.coordinates
                nodes.append(
                    {
                        "external_id": feature.id,
                        "lon": lon,
                        "lat": lat,
                        "is_walkable": props.get("is_walkable", True),
                        "terrain_type": props.get("terrain_type", "dirt_trail"),
                    }
                )
            elif geom.type == "LineString":
                if "source_id" not in props or "target_id" not in props:
                    raise ValidationError(
                        detail="LineString feature requires source_id and target_id in properties"
                    )
                edges.append(
                    {
                        "source_id": props["source_id"],
                        "target_id": props["target_id"],
                        "weight": props.get("weight", 1.0),
                    }
                )

        result = self.map_repository.replace_graph(map_id, nodes, edges)
        return ImportResult(
            map_id=map_id,
            nodes_created=result["nodes_created"],
            edges_created=result["edges_created"],
        )
