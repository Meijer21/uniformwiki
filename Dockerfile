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

RUN apk add --no-cache libstdc++ sqlite-libs \
  && addgroup -S uw \
  && adduser -S -G uw uw \
  && mkdir -p /data \
  && chown -R uw:uw /data

COPY --from=builder --chown=uw:uw /app/node_modules ./node_modules
COPY --from=builder --chown=uw:uw /app/dist ./dist
COPY --from=builder --chown=uw:uw /app/package.json ./

ENV NODE_ENV=production
ENV SQLITE_PATH=/data/wiki.db
ENV PORT=43121
ENV HOST=0.0.0.0

USER uw
EXPOSE 43121

CMD ["node", "dist/index.js"]
