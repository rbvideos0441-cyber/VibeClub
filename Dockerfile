# Use Node.js 22 as it supports TypeScript type stripping
FROM node:22-slim AS base

# Install dependencies and build
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# Production runner
FROM base AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/firebase-applet-config.json ./

# Install only production dependencies
RUN npm install --omit=dev

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Run with type stripping enabled (built-in in Node 22+)
CMD ["node", "--experimental-strip-types", "server.ts"]
