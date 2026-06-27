import random

from app.seed.demo_data import (
    MAP_CONFIGS,
    build_all_demo_graphs,
    build_map_graph,
    generate_grid_edges,
    generate_grid_nodes,
    haversine_km,
)


def test_haversine_same_point_is_zero():
    assert haversine_km(48.48, 135.07, 48.48, 135.07) == 0.0


def test_haversine_positive_distance():
    distance = haversine_km(48.48, 135.07, 48.49, 135.08)
    assert 1.0 < distance < 2.0


def test_generate_grid_nodes_count_and_fields():
    config = MAP_CONFIGS[0]
    rng = random.Random(1)
    nodes = generate_grid_nodes(config, rng)

    assert len(nodes) == config.grid_size * config.grid_size
    for node in nodes:
        assert "lat" in node and "lon" in node
        assert isinstance(node["is_walkable"], bool)
        assert node["terrain_type"]


def test_generate_grid_edges_connectivity():
    config = MAP_CONFIGS[0]
    rng = random.Random(2)
    nodes = generate_grid_nodes(config, rng)
    edges = generate_grid_edges(nodes, config.grid_size, rng)

    assert len(edges) > config.grid_size
    for edge in edges:
        assert edge["weight"] > 0
        assert 0 <= edge["source_idx"] < len(nodes)
        assert 0 <= edge["target_idx"] < len(nodes)
        assert edge["source_idx"] != edge["target_idx"]


def test_build_map_graph_structure():
    map_record, nodes, edges = build_map_graph(MAP_CONFIGS[1], random.Random(3))

    assert map_record["pmtiles_url"] == "krasnoyarsk"
    assert len(nodes) == 100
    assert len(edges) >= 99


def test_build_all_demo_graphs_yields_two_maps():
    graphs = list(build_all_demo_graphs(seed=42))
    assert len(graphs) == 2
    names = {item[0]["name"] for item in graphs}
    assert names == {"Хабаровск", "Красноярск"}
