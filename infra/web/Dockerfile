# The popkin-web image (ADR 0018): the reverse proxy of ADR 0013, Caddy, serving the built app
# and forwarding /api and /hubs to the API on one origin. Built with `frontend/` as the context
# and this folder as the `web` context:
#   docker build -f infra/web/Dockerfile --build-context web=infra/web frontend
FROM node:22-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npx ng build popkin

FROM caddy:2-alpine
RUN addgroup -S popkin && adduser -S -G popkin popkin \
 && mkdir -p /data /config && chown -R popkin:popkin /data /config
COPY --from=build /src/dist/popkin/browser /srv
COPY --from=web Caddyfile /etc/caddy/Caddyfile
# The API's address inside the Container Apps environment; overridden by the deployment.
ENV API_UPSTREAM=http://popkin-api
USER popkin
EXPOSE 8080
