# Use an official node runtime as a parent image
FROM node:23-alpine

WORKDIR /app/

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --loglevel verbose

# Copy source code (node_modules will be excluded via .dockerignore)
COPY . .

EXPOSE 5173

CMD npm run dev
