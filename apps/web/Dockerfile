FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm install
COPY apps/web apps/web
ARG VITE_API_URL=https://api-production-6ef1.up.railway.app/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm --workspace apps/web run build

FROM nginx:alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
