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


def test_edge_crud(client, sample_map):
    map_id = sample_map.id
    node_a = _create_node(client, map_id, 48.48, 135.07)
    node_b = _create_node(client, map_id, 48.49, 135.08)

    created = client.post(
        "/api/v1/edges",
        json={
            "map_id": map_id,
            "source_id": node_a["id"],
            "target_id": node_b["id"],
            "weight": 1.5,
        },
    )
    assert created.status_code == 200
    edge = created.json()
    assert edge["weight"] == 1.5

    listed = client.get(f"/api/v1/edges?map_id={map_id}")
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    updated = client.patch(
        f"/api/v1/edges/{edge['id']}",
        json={"weight": 2.0},
    )
    assert updated.status_code == 200
    assert updated.json()["weight"] == 2.0

    deleted = client.delete(f"/api/v1/edges/{edge['id']}")
    assert deleted.status_code == 200
    assert deleted.json() == {"deleted": True}


def test_create_edge_missing_node(client, sample_map):
    response = client.post(
        "/api/v1/edges",
        json={
            "map_id": sample_map.id,
            "source_id": 1,
            "target_id": 2,
            "weight": 1.0,
        },
    )
    assert response.status_code == 404
