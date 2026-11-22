# Production frontend: build the app once, then serve the static files with nginx,
# which also forwards /api and /uploads to the backend (nginx/default.conf.template).
# For hot-reload development use the frontend-dev service in docker-compose.yml.example.
FROM node:24 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.28-alpine
# NGINX_ENTRYPOINT_LOCAL_RESOLVERS makes the image export NGINX_LOCAL_RESOLVERS (Docker's DNS)
ENV BACKEND_URL=http://waypoints_backend:3001 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/40-allowed-hosts.sh /docker-entrypoint.d/40-allowed-hosts.sh
RUN chmod 755 /docker-entrypoint.d/40-allowed-hosts.sh
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 3000
