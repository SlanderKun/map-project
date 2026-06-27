"""initial schema: map, node, edge

Revision ID: 20260627_1300_001
Revises:
Create Date: 2026-06-27 13:00:00.000000
"""
from typing import Sequence, Union

import geoalchemy2
import sqlalchemy as sa
from alembic import op

revision: str = "20260627_1300_001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ensure PostGIS is available for the geometry column
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

    op.create_table(
        "map",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("pmtiles_url", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_map_name", "map", ["name"])

    op.create_table(
        "node",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("map_id", sa.Integer(), nullable=False),
        sa.Column("geom", geoalchemy2.types.Geometry(geometry_type="POINT", srid=4326), nullable=True),
        sa.Column("is_walkable", sa.Boolean(), nullable=False),
        sa.Column("terrain_type", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["map_id"], ["map.id"], name="fk_node_map_id_map"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_node_map_id", "node", ["map_id"])

    op.create_table(
        "edge",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("map_id", sa.Integer(), nullable=False),
        sa.Column("source_id", sa.Integer(), nullable=False),
        sa.Column("target_id", sa.Integer(), nullable=False),
        sa.Column("weight", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["map_id"], ["map.id"], name="fk_edge_map_id_map"),
        sa.ForeignKeyConstraint(["source_id"], ["node.id"], name="fk_edge_source_id_node"),
        sa.ForeignKeyConstraint(["target_id"], ["node.id"], name="fk_edge_target_id_node"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_edge_map_id", "edge", ["map_id"])
    op.create_index("ix_edge_source_id", "edge", ["source_id"])
    op.create_index("ix_edge_target_id", "edge", ["target_id"])


def downgrade() -> None:
    op.drop_index("ix_edge_target_id", table_name="edge")
    op.drop_index("ix_edge_source_id", table_name="edge")
    op.drop_index("ix_edge_map_id", table_name="edge")
    op.drop_table("edge")

    op.drop_index("ix_node_map_id", table_name="node")
    op.drop_table("node")

    op.drop_index("ix_map_name", table_name="map")
    op.drop_table("map")
