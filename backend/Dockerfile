FROM node:18-alpine

# Install netcat for postgres health check
RUN apk add --no-cache netcat-openbsd

WORKDIR /app

COPY backend/package*.json ./

RUN npm install

COPY backend/ .

# Copy marker files from parent directory
COPY public/markers ./public/markers

# Copy and set permissions for entrypoint script
COPY backend/docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3001

CMD ["/app/docker-entrypoint.sh"]
