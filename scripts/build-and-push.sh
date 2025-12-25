#!/bin/bash

# Trip Explorer Local Build & Push Script (Generic SSH/Oracle Cloud)
# Usage: ./scripts/build-and-push.sh [USER@IP] [REMOTE_PATH] [SSH_KEY_PATH (optional)]

set -e

REMOTE_TARGET=$1
REMOTE_PATH=$2
SSH_KEY=$3

if [ -z "$REMOTE_TARGET" ] || [ -z "$REMOTE_PATH" ]; then
    echo "Usage: ./scripts/build-and-push.sh [USER@IP] [REMOTE_PATH] [SSH_KEY_PATH (optional)]"
    echo "Example: ./scripts/build-and-push.sh ubuntu@123.123.123.123 /var/www/trip_explorer"
    exit 1
fi

SSH_OPTS=""
if [ ! -z "$SSH_KEY" ]; then
    SSH_OPTS="-i $SSH_KEY"
fi

PROJECT_ROOT=$(pwd)
STAGING_DIR="$PROJECT_ROOT/.deploy_staging"
ARCHIVE_NAME="deploy_package.tar.gz"

echo "=== Local Build & Push (Generic SSH) ==="

# 1. Build Frontend
echo "--- Frontend: Building Locally ---"
cd "$PROJECT_ROOT/frontend"
rm -rf dist
npm install
npm run build

# 2. Build Backend
echo "--- Backend: Building Locally ---"
cd "$PROJECT_ROOT/backend"
rm -rf dist
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

echo "Ensuring $REMOTE_PATH exists..."
ssh $SSH_OPTS "$REMOTE_TARGET" "sudo mkdir -p $REMOTE_PATH && sudo chown \$(whoami):\$(whoami) $REMOTE_PATH"

echo "Uploading $ARCHIVE_NAME to $REMOTE_TARGET:/tmp/..."
scp $SSH_OPTS "$ARCHIVE_NAME" "$REMOTE_TARGET:/tmp/$ARCHIVE_NAME"

echo "Extracting on remote (cleaning old dist files first)..."
ssh $SSH_OPTS "$REMOTE_TARGET" "rm -rf $REMOTE_PATH/backend/dist $REMOTE_PATH/frontend/dist && tar -xzf /tmp/$ARCHIVE_NAME -C $REMOTE_PATH && rm /tmp/$ARCHIVE_NAME"

# Cleanup
rm -rf "$STAGING_DIR"
rm "$ARCHIVE_NAME"

echo "--- Executing Deploy Script on VM ---"
# We do NOT pass --build because we just pushed the pre-built artifacts.
# The deploy script will still install dependencies and run migrations.
ssh $SSH_OPTS "$REMOTE_TARGET" "cd $REMOTE_PATH && chmod +x scripts/deploy-bare.sh && ./scripts/deploy-bare.sh"

echo "--- Build & Push & Deploy Complete ---"
