#!/usr/bin/env sh
# Run seed_local_datasets.py inside the backend container.
# Usage: ./scripts/seed_docker.sh
# Requires: docker compose up -d (stack already running)
set -e

CONTAINER=$(docker compose ps -q backend 2>/dev/null || docker ps -qf "name=backend")

if [ -z "$CONTAINER" ]; then
  echo "ERROR: backend container not found. Run 'docker compose up -d' first."
  exit 1
fi

echo "Seeding via container: $CONTAINER"
docker exec "$CONTAINER" python /app/../scripts/seed_local_datasets.py
