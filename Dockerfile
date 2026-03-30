# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Runtime
FROM node:18-alpine
WORKDIR /app

# Copy backend dependencies and install (including devDeps for prisma CLI)
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy backend source (includes prisma/schema.prisma)
COPY backend/ ./backend/

# Generate Prisma Client from schema
RUN cd backend && npx prisma generate

# Copy frontend build from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

WORKDIR /app/backend

# Startup: Try migrations (with retry), then always start the server
# The game works without DB (Redis fallback), so we never block startup on migration failures
CMD ["sh", "-c", "\
  echo '🔄 Aguardando banco de dados...' && \
  for i in $(seq 1 10); do \
    npx prisma migrate deploy 2>&1 && echo '✅ Migrações aplicadas!' && break || \
    echo \"⏳ Tentativa $i/10 falhou. Aguardando 5s...\" && sleep 5; \
  done; \
  echo '🚀 Iniciando servidor...' && \
  node server.js \
"]
