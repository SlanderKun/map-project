"""reseed khabarovsk and krasnoyarsk graphs

Revision ID: 20260627_1500_004
Revises: 20260627_1410_003
"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

from app.seed.demo_data import MAP_CONFIGS, build_map_graph
import random

revision: str = "20260627_1500_004"
down_revision: Union[str, None] = "20260627_1410_003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _seed_map(conn, map_record: dict, nodes: list, edges: list) -> None:
    map_id = conn.execute(
        text(
            """
            INSERT INTO map (name, pmtiles_url, description)
            VALUES (:name, :pmtiles_url, :description)
            RETURNING id
            """
        ),
        map_record,
    ).scalar_one()

    node_ids: list[int] = []
    for node in nodes:
        node_id = conn.execute(
            text(
                """
                INSERT INTO node (map_id, geom, is_walkable, terrain_type)
                VALUES (
                    :map_id,
                    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
                    :is_walkable,
                    :terrain_type
                )
                RETURNING id
                """
            ),
            {
                "map_id": map_id,
                "lon": node["lon"],
                "lat": node["lat"],
                "is_walkable": node["is_walkable"],
                "terrain_type": node["terrain_type"],
            },
        ).scalar_one()
        node_ids.append(node_id)

    for edge in edges:
        conn.execute(
            text(
                """
                INSERT INTO edge (map_id, source_id, target_id, weight)
                VALUES (:map_id, :source_id, :target_id, :weight)
                """
            ),
            {
                "map_id": map_id,
                "source_id": node_ids[edge["source_idx"]],
                "target_id": node_ids[edge["target_idx"]],
                "weight": edge["weight"],
            },
        )


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        text(
            """
            DELETE FROM edge
            WHERE map_id IN (SELECT id FROM map WHERE pmtiles_url IN ('khabarovsk', 'krasnoyarsk'))
            """
        )
    )
    conn.execute(
        text(
            """
            DELETE FROM node
            WHERE map_id IN (SELECT id FROM map WHERE pmtiles_url IN ('khabarovsk', 'krasnoyarsk'))
            """
        )
    )
    conn.execute(
        text("DELETE FROM map WHERE pmtiles_url IN ('khabarovsk', 'krasnoyarsk')")
    )

    for index, config in enumerate(MAP_CONFIGS):
        map_record, nodes, edges = build_map_graph(config, random.Random(42 + index))
        _seed_map(conn, map_record, nodes, edges)


def downgrade() -> None:
    pass
