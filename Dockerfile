# Multi-stage Dockerfile for UNO App on Render

FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/client/package.json ./packages/client/
COPY packages/server/package.json ./packages/server/

# Install all workspace dependencies
RUN npm ci

# Copy full monorepo source
COPY packages ./packages

# Build client production bundle
RUN npm run build --workspace @uno/client

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=2567

# Copy built application and dependencies
COPY --from=builder /app /app

EXPOSE 2567

CMD ["npm", "run", "start", "--workspace", "@uno/server"]
