# ---------- Stage 1: Build frontend ----------
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: Backend + serve frontend ----------
FROM node:20-alpine

# Install OpenSSL (required by Prisma on Alpine)
RUN apk add --no-cache openssl

WORKDIR /app

# Copy backend package files and prisma schema first
COPY backend/package*.json ./
COPY backend/prisma ./prisma

# Install backend dependencies (this triggers `prisma generate` via postinstall)
RUN npm install --omit=dev

# Copy rest of backend source code
COPY backend/ ./

# Copy built frontend into backend's public folder
COPY --from=frontend-build /app/frontend/dist ./public

EXPOSE 5000

CMD ["node", "src/server.js"]