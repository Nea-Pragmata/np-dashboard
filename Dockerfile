# Build: SvelteKit SPA (adapter-static) → static files in /app/build
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
# --ignore-scripts: skips better-sqlite3's native build (pocketbase-typegen dep,
# only used for local typegen — never in the image). vite build runs its own sync.
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
# PUBLIC_PB_URL is baked into the bundle at build time ($env/static/public).
# In Coolify: set it as a build-time variable pointing at the public PocketBase URL.
ARG PUBLIC_PB_URL
ENV PUBLIC_PB_URL=$PUBLIC_PB_URL
RUN bun run build

# Serve: nginx with SPA fallback
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
