FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
# Bust Metal builder cache when source changes are not picked up.
ARG CACHE_BUST=portal-gateways-20260815
RUN echo "cache_bust=${CACHE_BUST}"
COPY prisma prisma
RUN npm ci
COPY apps apps
COPY scripts scripts
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npx prisma generate --schema prisma/schema.prisma \
  && npm --workspace apps/api run build \
  && npm --workspace apps/web run build \
  && test -d prisma/migrations/20260815060000_portal_auth \
  && grep -R "portalGrid\|zaad\|Digital membership" apps/web/dist >/dev/null \
  && grep -R "listGateways\|portalEnabled" apps/api/dist >/dev/null

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
ARG CACHE_BUST=portal-gateways-20260815
RUN echo "cache_bust=${CACHE_BUST}"
COPY prisma prisma
COPY scripts scripts
RUN npm ci --include=dev \
  && npx prisma generate --schema prisma/schema.prisma \
  && npm prune --omit=dev \
  && npm install tsx@4.19.2 --no-save \
  && test -d prisma/migrations/20260815060000_portal_auth
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/web/dist ./web-dist
COPY apps/api/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENV WEB_DIST_PATH=/app/web-dist
ENV PORT=4000
EXPOSE 4000
ENTRYPOINT ["/docker-entrypoint.sh"]
