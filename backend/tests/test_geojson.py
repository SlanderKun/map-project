def _create_node(client, map_id: int, lat: float, lon: float, terrain: str = "grass") -> dict:
    response = client.post(
        "/api/v1/nodes",
        json={
            "map_id": map_id,
            "lat": lat,
            "lon": lon,
            "is_walkable": True,
            "terrain_type": terrain,
        },
    )
    assert response.status_code == 200
    return response.json()


def test_export_geojson_empty(client, sample_map):
    response = client.get(f"/api/v1/maps/{sample_map.id}/geojson")
    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "FeatureCollection"
    assert body["features"] == []


def test_import_and_export_geojson(client, sample_map):
    map_id = sample_map.id

    collection = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "id": 101,
                "geometry": {"type": "Point", "coordinates": [135.07, 48.48]},
                "properties": {
                    "is_walkable": True,
                    "terrain_type": "shallow_water",
                },
            },
            {
                "type": "Feature",
                "id": 102,
                "geometry": {"type": "Point", "coordinates": [135.08, 48.49]},
                "properties": {
                    "is_walkable": True,
                    "terrain_type": "grass",
                },
            },
            {
                "type": "Feature",
                "id": 201,
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[135.07, 48.48], [135.08, 48.49]],
                },
                "properties": {
                    "source_id": 101,
                    "target_id": 102,
                    "weight": 1.25,
                },
            },
        ],
    }

    imported = client.post(f"/api/v1/maps/{map_id}/geojson", json=collection)
    assert imported.status_code == 200
    result = imported.json()
    assert result["nodes_created"] == 2
    assert result["edges_created"] == 1

    exported = client.get(f"/api/v1/maps/{map_id}/geojson")
    assert exported.status_code == 200
    features = exported.json()["features"]
    assert len(features) == 3

    node_features = [f for f in features if f["geometry"]["type"] == "Point"]
    edge_features = [f for f in features if f["geometry"]["type"] == "LineString"]
    assert len(node_features) == 2
    assert len(edge_features) == 1
    assert edge_features[0]["properties"]["weight"] == 1.25


def test_import_geojson_missing_edge_refs(client, sample_map):
    collection = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[135.07, 48.48], [135.08, 48.49]],
                },
                "properties": {"weight": 1.0},
            }
        ],
    }
    response = client.post(f"/api/v1/maps/{sample_map.id}/geojson", json=collection)
    assert response.status_code == 422


def test_import_geojson_replaces_existing_graph(client, sample_map):
    map_id = sample_map.id
    _create_node(client, map_id, 48.48, 135.07)

    collection = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "id": 1,
                "geometry": {"type": "Point", "coordinates": [92.87, 56.01]},
                "properties": {"terrain_type": "snow"},
            }
        ],
    }
    client.post(f"/api/v1/maps/{map_id}/geojson", json=collection)

    nodes = client.get(f"/api/v1/nodes?map_id={map_id}").json()
    assert len(nodes) == 1
    assert nodes[0]["terrain_type"] == "snow"
