# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built artifacts from the build stage
COPY --from=builder /app/dist ./dist

# Expose the port the app listens on (overridable via PORT env var)
EXPOSE 5000

CMD ["node", "dist/index.js"]
