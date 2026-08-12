# Build: SvelteKit SPA (adapter-static) → static files in /app/build
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
# --ignore-scripts: skips better-sqlite3's native build (pocketbase-typegen dep,
# only used for local typegen — never in the image). vite build runs its own sync.
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
# PUBLIC_* are baked into the bundle at build time ($env/static/public).
# In Coolify: set them as build-time variables (PocketBase URL + PostHog key).
ARG PUBLIC_PB_URL
ARG PUBLIC_POSTHOG_KEY
ENV PUBLIC_PB_URL=$PUBLIC_PB_URL
ENV PUBLIC_POSTHOG_KEY=$PUBLIC_POSTHOG_KEY
RUN bun run build

# Serve: nginx with SPA fallback
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
