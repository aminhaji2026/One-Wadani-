FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY prisma prisma
RUN npm install
COPY apps/api apps/api
RUN npx prisma generate --schema prisma/schema.prisma && npm --workspace apps/api run build
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 4000
CMD ["node","dist/index.js"]
