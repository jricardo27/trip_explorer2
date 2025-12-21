#!/bin/bash

# Trip Explorer Bare-Metal Deployment Script
# This script builds and restarts the app without Docker.

set -e

echo "=== Trip Explorer Deployment (Bare-Metal) ==="

# Check for required tools
if ! command -v pm2 &> /dev/null; then
    echo "Error: pm2 is not installed. Install with 'npm install -g pm2'"
    exit 1
fi

# Check for flags
SKIP_BUILD=true
if [[ "$1" == "--build" ]]; then
    SKIP_BUILD=false
fi

PROJECT_ROOT=$(pwd)

# 1. Backend Deployment
cd "$PROJECT_ROOT/backend"
echo "--- Backend: Installing Dependencies (Clean Install) ---"
npm ci
npx prisma generate

if [ "$SKIP_BUILD" = false ]; then
    echo "--- Backend: Building ---"
    npm run build
fi

echo "--- Backend: Running Migrations ---"
npm run migrate

echo "--- Backend: Restarting with PM2 ---"
if pm2 show trip-explorer-backend > /dev/null 2>&1; then
    pm2 restart trip-explorer-backend --node-args="--max-old-space-size=512"
else
    pm2 start dist/index.js --name trip-explorer-backend --node-args="--max-old-space-size=512"
fi

# 2. Frontend Deployment
if [ "$SKIP_BUILD" = false ]; then
    echo "--- Frontend: Installing & Building ---"
    cd "$PROJECT_ROOT/frontend"
    npm install
    npm run build
else
    echo "--- Frontend: Skipping Build ---"
fi

echo "--- Deployment Complete ---"
if [ "$SKIP_BUILD" = false ]; then
    echo "Frontend build is in: $PROJECT_ROOT/frontend/dist"
fi
echo "Backend is running on port 3001 via PM2."
