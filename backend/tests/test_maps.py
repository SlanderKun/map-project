def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_list_maps_empty(client):
    response = client.get("/api/v1/maps")
    assert response.status_code == 200
    assert response.json() == []


def test_create_and_get_map(client):
    payload = {
        "name": "Khabarovsk",
        "pmtiles_url": "khabarovsk",
        "description": "Forest map",
    }
    created = client.post("/api/v1/maps", json=payload)
    assert created.status_code == 200
    body = created.json()
    assert body["name"] == payload["name"]
    assert body["pmtiles_url"] == "http://localhost:3000/khabarovsk"

    fetched = client.get(f"/api/v1/maps/{body['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == body["id"]


def test_get_map_not_found(client):
    response = client.get("/api/v1/maps/9999")
    assert response.status_code == 404


def test_tilejson(client):
    response = client.get("/api/v1/maps/tilejson")
    assert response.status_code == 200
    body = response.json()
    assert body["tilejson"] == "2.0.0"
    assert body["tiles"]
