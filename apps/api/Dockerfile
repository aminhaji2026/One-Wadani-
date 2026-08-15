FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY prisma prisma
RUN npm install
COPY apps/api apps/api
COPY scripts scripts
RUN npx prisma generate --schema prisma/schema.prisma && npm --workspace apps/api run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY prisma prisma
COPY scripts scripts
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY apps/api/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 4000
CMD ["/docker-entrypoint.sh"]
