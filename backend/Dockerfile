# syntax=docker/dockerfile:1

FROM node:20-slim AS builder
WORKDIR /app

# Install dependencies for build (includes dev for TypeScript)
COPY package*.json ./
RUN npm install

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Remove dev dependencies for slimmer runtime
RUN npm prune --omit=dev

FROM node:20-slim AS runner
WORKDIR /app

# Install system dependencies for node-canvas
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Bring only what runtime needs
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/server.js"]
