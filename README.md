# Trip Explorer v2

Complete rewrite of Trip Explorer with clean architecture.

## Project Structure

```bash
trip_explorer/
├── backend/          # Node.js + Express + Prisma backend
├── frontend/         # React + TypeScript frontend
├── shared/           # Shared types and utilities
├── scripts/          # Deployment scripts (deploy-bare.sh, build-and-push.sh)
├── _archive_old/     # Archived old codebase
└── docs/             # Documentation
```

## Old Code

The previous codebase has been archived to `_archive_old/` for reference.

## Local Development

The easiest way to run the app locally is using Docker Compose.

```bash
docker compose up
```

- **Frontend**: <http://localhost:3000>
- **Backend**: <http://localhost:3001>
- **Database**: Port 5432 (Postgis)

For manual development without Docker, see `backend/README.md` and `frontend/README.md`.

## Deployment to Ubuntu VM (Bare-Metal)

For micro-instances (e.g. 2 vCPUs), it is recommended to run the app bare-metal using **PM2** and **Nginx**. This avoids the overhead of Docker on small systems.

### Prerequisites

- Ubuntu VM with Node.js 18+, PM2, and Nginx.
- Postgis database installed on the VM or accessible remotely.
- DNS configured for `trip-explorer.mooo.com`.

### Recommended Workflow: Build Locally & Push

This method avoids taxing your VM's resources by building on your local machine and pushing only the essentials.

1. **Configure Environment**: Ensure `backend/.env` is set up on your local machine with production values (or create it on the VM).
2. **Run the Build & Push script** (from your local machine):

   ```bash
   ./scripts/build-and-push.sh ubuntu@123.123.123.123 /var/www/trip_explorer
   ```

   This script builds the app locally, packages it, and uses standard `scp` and `ssh` to transfer and extract the files on the VM.

3. **Finalize on the VM**:
   SSH into your VM, navigate to the deployment directory, and run:

   ```bash
   ./scripts/deploy-bare.sh
   ```

   This script installs production dependencies using `npm ci` and restarts the backend via PM2 (capped at 512MB heap).

---

### Alternative: Build on VM

If you cannot build locally, you can clone the repo and run `./scripts/deploy-bare.sh --build` on the VM. Note that this requires at least 2GB of RAM to be successful during the build process.

### Nginx Configuration

Use the provided template:

```bash
sudo cp nginx.bare.conf /etc/nginx/sites-available/trip-explorer
sudo ln -s /etc/nginx/sites-available/trip-explorer /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

### SSL (HTTPS)

```bash
sudo certbot --nginx -d trip-explorer.mooo.com
```
