#!/bin/bash

# Trip Explorer Deployment Script
# Usage: ./deploy.sh [backend|frontend|all]

# --- CONFIGURATION ---
# Update these variables before running!
PROJECT_ID="your-project-id"
REGION="us-central1"
DB_INSTANCE="trip-explorer-db"
DB_NAME="trip_explorer"
DB_USER="postgres"
DB_PASS="your-db-password" # Consider using Secret Manager in production
BACKEND_SERVICE="trip-explorer-backend"
FRONTEND_BUCKET="gs://trip-explorer-frontend"
# ---------------------

set -e

function check_deps {
    if ! command -v gcloud &> /dev/null; then
        echo "Error: gcloud CLI is not installed."
        exit 1
    fi
    if ! command -v npm &> /dev/null; then
        echo "Error: npm is not installed."
        exit 1
    fi
}

function deploy_backend {
    echo "=== Deploying Backend ==="
    
    echo "Building and pushing Docker image..."
    # Build from root context using backend/Dockerfile.prod
    gcloud builds submit --tag gcr.io/$PROJECT_ID/$BACKEND_SERVICE --file backend/Dockerfile.prod .
    
    echo "Deploying to Cloud Run..."
    gcloud run deploy $BACKEND_SERVICE \
        --image gcr.io/$PROJECT_ID/$BACKEND_SERVICE \
        --platform managed \
        --region $REGION \
        --allow-unauthenticated \
        --set-env-vars POSTGRES_HOST=/cloudsql/$PROJECT_ID:$REGION:$DB_INSTANCE,POSTGRES_USER=$DB_USER,POSTGRES_PASSWORD=$DB_PASS,POSTGRES_DB=$DB_NAME
        
    echo "Backend deployed successfully!"
}

function deploy_frontend {
    echo "=== Deploying Frontend ==="
    
    echo "Building React app..."
    # Ensure dependencies are installed
    npm install
    # Build
    npm run build
    
    echo "Creating bucket if not exists..."
    if ! gsutil ls -b $FRONTEND_BUCKET > /dev/null 2>&1; then
        gsutil mb -l $REGION $FRONTEND_BUCKET
    fi
    
    echo "Uploading to Cloud Storage..."
    gsutil -m rsync -R -d dist $FRONTEND_BUCKET
    
    echo "Setting public access..."
    gsutil iam ch allUsers:objectViewer $FRONTEND_BUCKET
    
    echo "Configuring SPA routing (index.html fallback)..."
    gsutil web set -m index.html -e index.html $FRONTEND_BUCKET
    
    echo "Frontend deployed successfully!"
    echo "URL: https://storage.googleapis.com/${FRONTEND_BUCKET#gs://}/index.html"
}

check_deps

if [ "$1" == "backend" ]; then
    deploy_backend
elif [ "$1" == "frontend" ]; then
    deploy_frontend
elif [ "$1" == "all" ]; then
    deploy_backend
    deploy_frontend
else
    echo "Usage: ./deploy.sh [backend|frontend|all]"
    echo "Please update the configuration variables in the script before running."
fi
