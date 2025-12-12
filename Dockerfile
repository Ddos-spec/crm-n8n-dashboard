# =============================================
# Multi-Stage Dockerfile for Single VPS Deployment
# CRM Dashboard - Frontend + Backend
# =============================================
# This Dockerfile builds both frontend and backend in one image
# Backend serves the static frontend files from /public folder
# =============================================

# --- Stage 1: Build Frontend ---
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend (output to dist/)
RUN npm run build

# --- Stage 2: Build Backend ---
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install backend dependencies (including devDependencies for tsc)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy backend source
COPY backend/ ./

# Build TypeScript code
RUN npm run build

# --- Stage 3: Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /app

# Install OpenSSL (Required for Prisma Client on Alpine)
RUN apk add --no-cache openssl

# Set environment to production
ENV NODE_ENV=production

# Copy backend package.json
COPY backend/package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production

# Copy Prisma schema
COPY backend/prisma ./prisma/

# Copy built backend from builder stage
COPY --from=backend-builder /app/backend/dist ./dist

# Copy Prisma Client from builder
COPY --from=backend-builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder /app/backend/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy built frontend to backend's public folder
COPY --from=frontend-builder /app/frontend/dist ./public

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 4444

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:4444/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/index.js"]
