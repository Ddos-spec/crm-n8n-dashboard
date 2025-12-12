# --- Stage 1: Builder ---
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies for build
# Copy package.json and package-lock.json (if available)
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for tsc)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# --- Stage 2: Runner ---
FROM node:20-alpine AS runner

# Set working directory
WORKDIR /app

# Install OpenSSL (Required for Prisma Client on Alpine)
RUN apk add --no-cache openssl

# Set environment to production
ENV NODE_ENV=production

# Copy package.json to install production dependencies
COPY package*.json ./

# Install ONLY production dependencies (cleaner & smaller)
RUN npm ci --only=production

# Copy Prisma schema (sometimes needed for runtime validation/migrations)
COPY prisma ./prisma/

# Copy built artifacts from builder stage
# We copy 'dist' folder where tsc output the JS files
COPY --from=builder /app/dist ./dist

# Copy the generated Prisma Client from builder
# This is crucial because 'npm ci --only=production' won't run 'prisma generate'
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Create a non-root user for security
# (node image comes with a user named 'node')
USER node

# Expose the port (Easypanel usually looks for this or ENV PORT)
EXPOSE 1234

# Start the application
CMD ["node", "dist/index.js"]
