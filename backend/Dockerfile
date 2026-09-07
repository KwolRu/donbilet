# syntax=docker/dockerfile:1.7
# Multi-stage сборка для NestJS-монорепы.

# Stage 1: deps — полный набор зависимостей для сборки

FROM node:20-alpine AS deps

WORKDIR /app/backend
RUN apk add --no-cache libc6-compat
COPY backend/package.json backend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# Stage 2: build — генерация Prisma client + компиляция TS

FROM node:20-alpine AS build
WORKDIR /app/backend
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/backend/node_modules ./node_modules

# Генерация Prisma зависит только от schema-parts + scripts + prisma.config.ts.
# Делаем её ДО копирования src.
COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma
COPY backend/scripts ./scripts
COPY backend/prisma.config.ts ./
RUN npm run db:generate

# Компилируем все микросервисы в dist/.
COPY backend/tsconfig.json backend/tsconfig.build.json ./
COPY backend/microservices ./microservices
RUN npm run build:all

# tsc не копирует non-TS ассеты. gRPC-протоколы грузятся в рантайме по __dirname-относительным
# путям из shared/src/proto/, поэтому вручную раскладываем их рядом со скомпилированным JS.
RUN mkdir -p dist/microservices/shared/src \
    && cp -r microservices/shared/src/proto dist/microservices/shared/src/proto

# Stage 3: prod-deps — зависимости только для рантайма (компактный node_modules)

FROM node:20-alpine AS prod-deps
WORKDIR /app/backend
RUN apk add --no-cache libc6-compat
COPY backend/package.json backend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --no-audit --no-fund

# Stage 4: runner — финальный минимальный образ

FROM node:20-alpine AS runner
WORKDIR /app/backend

RUN apk add --no-cache libc6-compat tini

ENV NODE_ENV=production
ENV SERVICE_NAME=gateway

# Рантайм-зависимости
COPY --from=prod-deps /app/backend/node_modules ./node_modules
# Накладываем сгенерированный Prisma-клиент (.prisma + @prisma/client), полученный на этапе build
COPY --from=build /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/backend/node_modules/@prisma ./node_modules/@prisma

# Скомпилированный JS + Prisma-схема (нужна в рантайме для migrate deploy) + scripts (db:schema:build).
# prisma.config.ts ОБЯЗАТЕЛЕН: схема не содержит datasource.url — Prisma 7 берёт url из этого конфига.
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/prisma ./prisma
COPY --from=build /app/backend/scripts ./scripts
COPY backend/prisma.config.ts ./
COPY backend/package.json ./

# tini как PID 1 для корректной передачи сигналов через обёртку npm-run.
ENTRYPOINT ["/sbin/tini", "--"]

# Один образ на все сервисы: какой именно поднимется — решает SERVICE_NAME.
# Допустимые значения = суффиксы npm-скриптов start:prod:*
# gateway | auth | example | notification | billing | analytics
CMD ["sh", "-c", "npm run --silent start:prod:${SERVICE_NAME}"]
