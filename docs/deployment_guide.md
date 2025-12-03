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

## Step 1: Database Setup (Choose One)

### Option A: Supabase (Recommended for Ease/Cost)

Supabase provides a generous free tier and comes with PostGIS pre-installed.

1. Create a new project at [supabase.com](https://supabase.com).
2. Go to **Database** -> **Extensions** and enable `postgis`.
3. Go to **Settings** -> **Database** and copy the **Connection String** (Node.js format).
4. You will use this connection string for the `DATABASE_URL` environment variable.

### Option B: Compute Engine VM (Self-Managed)

Cheaper than Cloud SQL but requires manual maintenance.

1. Create a VM instance (e.g., e2-micro) in GCP.
2. SSH into the VM and install Docker.
3. Run PostGIS container:

   ```bash
   docker run --name trip-db -e POSTGRES_PASSWORD=mysecretpassword -d -p 5432:5432 -v pgdata:/var/lib/postgresql/data postgis/postgis:15-3.3-alpine
   ```

4. Configure firewall rules to allow traffic on port 5432 (restrict to your backend service account if possible).

### Option C: Cloud SQL (Managed GCP)

Native GCP integration but higher cost.

1. Create a PostgreSQL instance:

   ```bash
   gcloud sql instances create trip-explorer-db --database-version=POSTGRES_15 --tier=db-f1-micro --region=us-central1
   ```

2. Create database `trip_explorer` and user `postgres`.
3. Enable PostGIS: `CREATE EXTENSION postgis;`

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
       --set-env-vars POSTGRES_HOST=YOUR_DB_HOST,POSTGRES_USER=YOUR_DB_USER,POSTGRES_PASSWORD=YOUR_DB_PASS,POSTGRES_DB=trip_explorer,POSTGRES_PORT=5432
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
