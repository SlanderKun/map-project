"""Demo graph generator for Khabarovsk and Krasnoyarsk maps."""
from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import Iterable

TERRAIN_TYPES = (
    "shallow_water",
    "deep_water",
    "ice",
    "snow",
    "swamp",
    "grass",
    "dirt",
    "dense_forest",
    "mountains",
)

TERRAIN_WEIGHTS = {
    "shallow_water": 18,
    "deep_water": 12,
    "ice": 5,
    "snow": 8,
    "swamp": 10,
    "grass": 22,
    "dirt": 15,
    "dense_forest": 7,
    "mountains": 3,
}


@dataclass(frozen=True)
class MapSeedConfig:
    name: str
    pmtiles_url: str
    description: str
    center_lat: float
    center_lon: float
    lat_span: float
    lon_span: float
    grid_size: int = 10


MAP_CONFIGS: tuple[MapSeedConfig, ...] = (
    MapSeedConfig(
        name="Хабаровск",
        pmtiles_url="khabarovsk",
        description="Демо-карта: река Амур и окрестности Хабаровска",
        center_lat=48.646,
        center_lon=135.395,
        lat_span=0.55,
        lon_span=0.75,
        grid_size=12,
    ),
    MapSeedConfig(
        name="Красноярск",
        pmtiles_url="krasnoyarsk",
        description="Демо-карта: Енисей и окрестности Красноярска",
        center_lat=56.01,
        center_lon=92.87,
        lat_span=0.45,
        lon_span=0.55,
        grid_size=12,
    ),
)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * radius_km * math.asin(math.sqrt(a))


def _pick_terrain(rng: random.Random) -> str:
    population = list(TERRAIN_WEIGHTS.keys())
    weights = [TERRAIN_WEIGHTS[key] for key in population]
    return rng.choices(population, weights=weights, k=1)[0]


def _is_walkable(terrain: str) -> bool:
    return terrain not in {"dense_forest", "mountains"}


def generate_grid_nodes(
    config: MapSeedConfig,
    rng: random.Random,
) -> list[dict]:
    nodes: list[dict] = []
    half_lat = config.lat_span / 2
    half_lon = config.lon_span / 2
    lat_step = config.lat_span / (config.grid_size - 1)
    lon_step = config.lon_span / (config.grid_size - 1)

    for row in range(config.grid_size):
        for col in range(config.grid_size):
            lat = config.center_lat - half_lat + row * lat_step
            lon = config.center_lon - half_lon + col * lon_step
            lat += rng.uniform(-lat_step * 0.15, lat_step * 0.15)
            lon += rng.uniform(-lon_step * 0.15, lon_step * 0.15)
            terrain = _pick_terrain(rng)
            nodes.append(
                {
                    "grid_row": row,
                    "grid_col": col,
                    "lat": round(lat, 6),
                    "lon": round(lon, 6),
                    "is_walkable": _is_walkable(terrain),
                    "terrain_type": terrain,
                }
            )
    return nodes


def _grid_index(row: int, col: int, grid_size: int) -> int:
    return row * grid_size + col


def generate_grid_edges(
    nodes: list[dict],
    grid_size: int,
    rng: random.Random,
) -> list[dict]:
    edges: list[dict] = []
    seen: set[tuple[int, int]] = set()

    def add_edge(source_idx: int, target_idx: int) -> None:
        pair = (min(source_idx, target_idx), max(source_idx, target_idx))
        if pair in seen:
            return
        seen.add(pair)
        source = nodes[source_idx]
        target = nodes[target_idx]
        weight = round(
            haversine_km(source["lat"], source["lon"], target["lat"], target["lon"]),
            3,
        )
        if weight <= 0:
            weight = 0.001
        edges.append(
            {
                "source_idx": source_idx,
                "target_idx": target_idx,
                "weight": weight,
            }
        )

    for row in range(grid_size):
        for col in range(grid_size):
            idx = _grid_index(row, col, grid_size)
            if col + 1 < grid_size:
                add_edge(idx, _grid_index(row, col + 1, grid_size))
            if row + 1 < grid_size:
                add_edge(idx, _grid_index(row + 1, col, grid_size))
            if row + 1 < grid_size and col + 1 < grid_size and rng.random() < 0.35:
                add_edge(idx, _grid_index(row + 1, col + 1, grid_size))
            if row + 1 < grid_size and col > 0 and rng.random() < 0.25:
                add_edge(idx, _grid_index(row + 1, col - 1, grid_size))

    return edges


def build_map_graph(
    config: MapSeedConfig,
    rng: random.Random | None = None,
) -> tuple[dict, list[dict], list[dict]]:
    rng = rng or random.Random(42)
    nodes = generate_grid_nodes(config, rng)
    edges = generate_grid_edges(nodes, config.grid_size, rng)
    map_record = {
        "name": config.name,
        "pmtiles_url": config.pmtiles_url,
        "description": config.description,
    }
    return map_record, nodes, edges


def build_all_demo_graphs(
    seed: int = 42,
) -> Iterable[tuple[dict, list[dict], list[dict]]]:
    for index, config in enumerate(MAP_CONFIGS):
        yield build_map_graph(config, random.Random(seed + index))
