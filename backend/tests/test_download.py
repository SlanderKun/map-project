def _create_node(client, map_id: int, lat: float, lon: float) -> dict:
    response = client.post(
        "/api/v1/nodes",
        json={
            "map_id": map_id,
            "lat": lat,
            "lon": lon,
            "is_walkable": True,
            "terrain_type": "grass",
        },
    )
    assert response.status_code == 200
    return response.json()


def test_download_area_returns_nodes_and_edges(client, sample_map):
    map_id = sample_map.id
    node_a = _create_node(client, map_id, 48.48, 135.07)
    node_b = _create_node(client, map_id, 48.49, 135.08)
    _create_node(client, map_id, 50.0, 140.0)

    client.post(
        "/api/v1/edges",
        json={
            "map_id": map_id,
            "source_id": node_a["id"],
            "target_id": node_b["id"],
            "weight": 1.5,
        },
    )

    response = client.post(
        f"/api/v1/maps/{map_id}/download",
        json={
            "min_lon": 135.0,
            "min_lat": 48.4,
            "max_lon": 135.2,
            "max_lat": 48.6,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["map_id"] == map_id
    assert len(body["nodes"]) == 2
    assert len(body["edges"]) == 1
    assert body["pmtiles_url"].startswith("http")


def test_download_area_empty_bbox(client, sample_map):
    response = client.post(
        f"/api/v1/maps/{sample_map.id}/download",
        json={
            "min_lon": 0.0,
            "min_lat": 0.0,
            "max_lon": 0.1,
            "max_lat": 0.1,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["nodes"] == []
    assert body["edges"] == []


def test_download_area_map_not_found(client):
    response = client.post(
        "/api/v1/maps/9999/download",
        json={
            "min_lon": 135.0,
            "min_lat": 48.4,
            "max_lon": 135.2,
            "max_lat": 48.6,
        },
    )
    assert response.status_code == 404
