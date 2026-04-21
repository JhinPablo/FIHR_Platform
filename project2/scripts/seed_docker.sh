#!/usr/bin/env sh
# Run the real MIMIC-IV + MIMIC-CXR-JPG seed inside the backend container.
# Usage: ./scripts/seed_docker.sh
# Requires: docker compose up -d (stack already running)
set -e

CONTAINER=$(docker compose ps -q backend 2>/dev/null || docker ps -qf "name=backend")

if [ -z "$CONTAINER" ]; then
  echo "ERROR: backend container not found. Run 'docker compose up -d' first."
  exit 1
fi

echo "Seeding via container: $CONTAINER"
docker exec "$CONTAINER" python /scripts/seed_mimic.py \
  --mimic-iv-root /datasets/mimic-iv \
  --mimic-cxr-root /datasets/mimic-cxr-jpg
