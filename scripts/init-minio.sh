#!/bin/sh
set -eu

MC_ALIAS="${MC_ALIAS:-myminio}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://minio:9000}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:-admin}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-supersecretpassword}"
BUCKET="${MINIO_BUCKET_NAME:-maps-bucket}"
PMTILES_DIR="${PMTILES_DIR:-/pmtiles}"

echo "Configuring MinIO alias..."
mc alias set "$MC_ALIAS" "$MINIO_ENDPOINT" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"

echo "Creating bucket: $BUCKET"
mc mb --ignore-existing "$MC_ALIAS/$BUCKET"

if [ -d "$PMTILES_DIR" ]; then
  echo "Uploading PMTiles from $PMTILES_DIR..."
  for file in "$PMTILES_DIR"/*.pmtiles; do
    [ -f "$file" ] || continue
    name="$(basename "$file")"
    mc cp --attr "Content-Type=application/vnd.pmtiles" "$file" "$MC_ALIAS/$BUCKET/$name"
    echo "  uploaded: $name"
  done
else
  echo "PMTiles directory not found: $PMTILES_DIR (skip upload)"
fi

echo "MinIO init complete."
