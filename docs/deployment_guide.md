# GCP Deployment Guide

This guide details the steps to deploy the Trip Explorer application to Google Cloud Platform (GCP).

## Architecture

- **Frontend**: React Single Page Application (SPA)
  - Hosted on **Cloud Storage** (static files)
  - Served via **Cloud CDN** (global edge caching, SSL)
- **Backend**: Node.js/Express API
  - Hosted on **Cloud Run** (serverless container)
  - Scales to zero (cost-effective)
- **Database**: PostgreSQL + PostGIS
  - Hosted on **Cloud SQL** (managed database)
  - Connected via Cloud SQL Auth Proxy or private IP

## Prerequisites

- Google Cloud Project created
- Billing enabled (required for Cloud Build/Cloud Run, even if using free tier)
- `gcloud` CLI installed and authenticated

## Step 1: Database Setup (Cloud SQL)

1. Create a PostgreSQL instance:

   ```bash
   gcloud sql instances create trip-explorer-db \
       --database-version=POSTGRES_15 \
       --tier=db-f1-micro \
       --region=us-central1
   ```

2. Set the password for the `postgres` user:

   ```bash
   gcloud sql users set-password postgres \
       --instance=trip-explorer-db \
       --password=YOUR_SECURE_PASSWORD
   ```

3. Create the database:

   ```bash
   gcloud sql databases create trip_explorer --instance=trip-explorer-db
   ```

4. Enable PostGIS extension (connect via Cloud Shell or proxy):

   ```sql
   CREATE EXTENSION postgis;
   ```

## Step 2: Backend Deployment (Cloud Run)

1. **Dockerfile**: Use `backend/Dockerfile.prod` (to be created).
2. **Build & Push**:

   ```bash
   gcloud builds submit --tag gcr.io/PROJECT_ID/trip-explorer-backend backend/
   ```

3. **Deploy**:

   ```bash
   gcloud run deploy trip-explorer-backend \
       --image gcr.io/PROJECT_ID/trip-explorer-backend \
       --platform managed \
       --region us-central1 \
       --allow-unauthenticated \
       --set-env-vars DB_HOST=/cloudsql/PROJECT_ID:us-central1:trip-explorer-db,DB_USER=postgres,DB_PASS=YOUR_PASSWORD,DB_NAME=trip_explorer
   ```

## Step 3: Frontend Deployment (Cloud Storage + CDN)

1. **Build**:

   ```bash
   npm run build
   ```

2. **Create Bucket**:

   ```bash
   gsutil mb -l us-central1 gs://trip-explorer-frontend
   ```

3. **Upload**:

   ```bash
   gsutil -m rsync -r dist gs://trip-explorer-frontend
   ```

4. **Make Public**:

   ```bash
   gsutil iam ch allUsers:objectViewer gs://trip-explorer-frontend
   ```

5. **Configure Backend URL**:
   - Update `VITE_API_URL` in frontend `.env.production` to point to the Cloud Run URL.

## Step 4: Environment Variables

Create a `.env.production` file for the frontend build:

```bash
VITE_API_URL=https://trip-explorer-backend-xyz-uc.a.run.app
```

## Step 5: Automation

A `deploy.sh` script will be provided to automate these steps.
