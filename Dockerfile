# ── Stage 1: Build frontend ────────────────────────────────────────────────
FROM node:20-slim AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig.json tsconfig.node.json ./
COPY src/ ./src/
COPY shared/ ./shared/
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build
# Vite outputs to server/public per vite.config.ts

# ── Stage 2: Build server ──────────────────────────────────────────────────
FROM node:20-slim AS server-build
WORKDIR /app
COPY shared/ ./shared/
COPY server/package*.json ./server/
RUN cd server && npm ci
COPY server/ ./server/
RUN cd server && npx prisma generate && npm run build

# ── Stage 3: Runtime ───────────────────────────────────────────────────────
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies (includes prisma + playwright)
COPY shared/ ./shared/
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Install Playwright's Chromium browser + system libraries into a shared path.
# This runs as root, so without an explicit path the browser lands in root's
# cache (~/.cache/ms-playwright) and the non-root appuser can't find it at
# runtime. Pin it to a world-readable location both users resolve.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN cd server && npx playwright install chromium --with-deps \
  && chmod -R a+rX /ms-playwright

# Copy generated Prisma client from build stage
COPY --from=server-build /app/server/node_modules/.prisma ./server/node_modules/.prisma

# Copy compiled server
COPY --from=server-build /app/server/dist ./server/dist

# Copy Prisma schema + migrations (needed for migrate deploy)
COPY server/prisma ./server/prisma

# Copy built frontend static files
COPY --from=frontend /app/server/public ./server/public

# Root package.json — source of the baked app version served at /version
COPY package.json ./package.json

RUN useradd -r -u 1001 -g root appuser && chown -R appuser /app
USER appuser

EXPOSE 3000
CMD ["sh", "-c", "cd server && npx prisma migrate deploy && node dist/server/src/index.js"]
