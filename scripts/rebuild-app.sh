#!/bin/bash

# Script to rebuild frontend and backend containers and images
# while keeping the database container running.

# Exit on error
set -e

echo "=== Rebuilding App (Frontend & Backend) ==="

# 0. Identify Images (before stopping, so we can find them via compose)
echo "--- Identifying current images ---"
FRONTEND_IMAGE=$(docker-compose images -q frontend)
BACKEND_IMAGE=$(docker-compose images -q backend)

# 1. Stop specific services
echo "--- Stopping containers ---"
docker-compose stop frontend backend

# 2. Remove specific containers
echo "--- Removing containers ---"
docker-compose rm -f frontend backend

# 3. Remove images
echo "--- Removing images ---"
if [ -n "$FRONTEND_IMAGE" ]; then
    echo "Removing frontend image: $FRONTEND_IMAGE"
    docker rmi -f "$FRONTEND_IMAGE" || echo "Warning: Could not remove frontend image (might be used by other containers or already gone)"
else
    echo "No frontend image found."
fi

if [ -n "$BACKEND_IMAGE" ]; then
    echo "Removing backend image: $BACKEND_IMAGE"
    docker rmi -f "$BACKEND_IMAGE" || echo "Warning: Could not remove backend image"
else
    echo "No backend image found."
fi

# 4. Remove node_modules volumes
echo "--- Removing node_modules volumes ---"
# We assume the project name is 'trip_explorer' based on the directory name.
# If the project name is different, these volume names might need adjustment.
docker volume rm trip_explorer_node-modules-trip-explorer trip_explorer_node-modules-backend 2>/dev/null || echo "Warning: Could not remove volumes (they might not exist or have different names)"

# 5. Rebuild and Start
echo "--- Building and Starting ---"
# --build: Build images before starting containers.
# --force-recreate: Recreate containers.
# --no-deps: Don't restart dependent services (postgres).
# --renew-anon-volumes: Recreate anonymous volumes instead of retrieving data from the previous containers.
docker-compose up -d --build --force-recreate --no-deps --renew-anon-volumes frontend backend

echo "=== Done! ==="
docker-compose ps
