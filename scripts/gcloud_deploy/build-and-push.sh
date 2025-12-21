#!/bin/bash

# Trip Explorer Local Build & Push Script
# Usage: ./scripts/build-and-push.sh [INSTANCE_NAME] [REMOTE_PATH] [ZONE]

set -e

INSTANCE_NAME=$1
REMOTE_PATH=$2
ZONE=$3

if [ -z "$INSTANCE_NAME" ] || [ -z "$REMOTE_PATH" ]; then
    echo "Usage: ./scripts/build-and-push.sh [INSTANCE_NAME] [REMOTE_PATH] [ZONE]"
    echo "Example: ./scripts/build-and-push.sh my-instance /var/www/trip_explorer us-west1-a"
    exit 1
fi

PROJECT_ROOT=$(pwd)
STAGING_DIR="$PROJECT_ROOT/.deploy_staging"
ARCHIVE_NAME="deploy_package.tar.gz"

echo "=== Local Build & Push (gcloud + tar) ==="

# 1. Build Frontend
echo "--- Frontend: Building Locally ---"
cd "$PROJECT_ROOT/frontend"
npm install
npm run build

# 2. Build Backend
echo "--- Backend: Building Locally ---"
cd "$PROJECT_ROOT/backend"
npm install
npm run build

# 3. Prepare Staging Directory
echo "--- Preparing Staging Directory ---"
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR/backend"
mkdir -p "$STAGING_DIR/frontend"
mkdir -p "$STAGING_DIR/scripts"

# Backend Files
cp "$PROJECT_ROOT/backend/package.json" "$STAGING_DIR/backend/"
cp "$PROJECT_ROOT/backend/package-lock.json" "$STAGING_DIR/backend/"
cp -r "$PROJECT_ROOT/backend/dist" "$STAGING_DIR/backend/"
cp -r "$PROJECT_ROOT/backend/prisma" "$STAGING_DIR/backend/"

# Frontend Files
cp -r "$PROJECT_ROOT/frontend/dist" "$STAGING_DIR/frontend/"

# Root Scripts
cp -r "$PROJECT_ROOT/scripts/"* "$STAGING_DIR/scripts/"

# Root Config
cp "$PROJECT_ROOT/nginx.bare.conf" "$STAGING_DIR/"

# 4. Compress
echo "--- Compressing Files ---"
# Use COPYFILE_DISABLE=1 and --no-xattrs to avoid macOS specific extended attributes errors on Linux
COPYFILE_DISABLE=1 tar -czf "$ARCHIVE_NAME" --no-xattrs -C "$STAGING_DIR" .

# 5. Push and Extract
echo "--- Pushing and Extracting on VM ---"

ZONE_ARG=""
if [ ! -z "$ZONE" ]; then
    ZONE_ARG="--zone=$ZONE"
fi

echo "Creating $REMOTE_PATH"
gcloud compute ssh trip-app-vm $ZONE_ARG --command="sudo mkdir -p $REMOTE_PATH && sudo chown \$(whoami):\$(whoami) $REMOTE_PATH"

echo "Uploading $ARCHIVE_NAME to $INSTANCE_NAME:/tmp/..."
gcloud compute scp $ZONE_ARG "$ARCHIVE_NAME" "$INSTANCE_NAME:/tmp/$ARCHIVE_NAME"

echo "Extracting on remote..."
# We use a single ssh command to ensure atomicity of the extraction step and cleanup
gcloud compute ssh $ZONE_ARG "$INSTANCE_NAME" --command "mkdir -p $REMOTE_PATH && tar -xzf /tmp/$ARCHIVE_NAME -C $REMOTE_PATH && rm /tmp/$ARCHIVE_NAME"

# Cleanup
rm -rf "$STAGING_DIR"
rm "$ARCHIVE_NAME"

echo "--- Build & Push Complete ---"
echo "Now run './scripts/deploy-bare.sh' on your VM to install dependencies and restart."
