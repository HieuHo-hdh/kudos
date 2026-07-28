# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy monorepo files
COPY pnpm-lock.yaml .
COPY package.json .
COPY pnpm-workspace.yaml .

# Copy packages
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build
WORKDIR /app/apps/api
RUN pnpm build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Copy built app and dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["node", "dist/main.js"]
