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

# Startup: Attempt migrations and seed, then ALWAYS start the server
CMD ["sh", "-c", "npx prisma migrate deploy ; npm run db:seed ; node server.js"]
