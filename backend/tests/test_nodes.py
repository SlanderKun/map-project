def test_node_crud(client, sample_map):
    map_id = sample_map.id

    created = client.post(
        "/api/v1/nodes",
        json={
            "map_id": map_id,
            "lat": 48.48,
            "lon": 135.07,
            "is_walkable": True,
            "terrain_type": "grass",
        },
    )
    assert created.status_code == 200
    node = created.json()
    assert node["lat"] == 48.48
    assert node["lon"] == 135.07

    listed = client.get(f"/api/v1/nodes?map_id={map_id}")
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    updated = client.patch(
        f"/api/v1/nodes/{node['id']}",
        json={"terrain_type": "snow"},
    )
    assert updated.status_code == 200
    assert updated.json()["terrain_type"] == "snow"

    deleted = client.delete(f"/api/v1/nodes/{node['id']}")
    assert deleted.status_code == 200
    assert deleted.json() == {"deleted": True}

    listed_after = client.get(f"/api/v1/nodes?map_id={map_id}")
    assert listed_after.json() == []


def test_create_node_map_not_found(client):
    response = client.post(
        "/api/v1/nodes",
        json={
            "map_id": 9999,
            "lat": 1.0,
            "lon": 2.0,
        },
    )
    assert response.status_code == 404
