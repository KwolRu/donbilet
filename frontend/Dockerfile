# syntax=docker/dockerfile:1.7
# Multi-stage сборка для Next.js (output: 'standalone' → минимальный рантайм-образ).

# Stage 1: deps

FROM node:20-alpine AS deps
WORKDIR /app/frontend
RUN apk add --no-cache libc6-compat
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps --no-audit --no-fund

# Stage 2: build — next build с output: 'standalone'

FROM node:20-alpine AS build
WORKDIR /app/frontend
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/frontend/node_modules ./node_modules
COPY frontend ./
# Фронт использует общие типы и protos из backend-монорепы.
COPY backend/microservices/shared /app/backend/microservices/shared

# NEXT_PUBLIC_* вшиваются в клиентский бандл на этапе сборки — менять их
# переменными окружения контейнера уже поздно, только пересборкой образа.
ARG NEXT_PUBLIC_API_URL=
ARG NEXT_PUBLIC_MAIN_DOMAIN=donbilet.ru
ARG NEXT_PUBLIC_APP_NAME=DonBilet

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_MAIN_DOMAIN=${NEXT_PUBLIC_MAIN_DOMAIN}
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# Stage 3: runner — минимальный образ с .next/standalone

FROM node:20-alpine AS runner
WORKDIR /app/frontend

RUN apk add --no-cache tini

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone-бандл содержит собственный server.js + минимальные node_modules.
# .next/static и public/ в standalone НЕ включаются — копируем их отдельно.
COPY --from=build /app/frontend/.next/standalone ./
COPY --from=build /app/frontend/.next/static ./.next/static
COPY --from=build /app/frontend/public ./public

EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
