FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build \
  && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache libstdc++ sqlite-libs su-exec \
  && addgroup -S uw \
  && adduser -S -G uw uw \
  && mkdir -p /data \
  && chown -R uw:uw /data /app

COPY --from=builder --chown=uw:uw /app/node_modules ./node_modules
COPY --from=builder --chown=uw:uw /app/dist ./dist
COPY --from=builder --chown=uw:uw /app/package.json ./
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod 755 /app/docker-entrypoint.sh

ENV NODE_ENV=production
ENV SQLITE_PATH=/data/wiki.db
ENV PORT=43121
ENV HOST=0.0.0.0

EXPOSE 43121

ENTRYPOINT ["/app/docker-entrypoint.sh"]
