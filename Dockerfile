# syntax=docker/dockerfile:1

# --- build stage: compile the SvelteKit SPA with Bun ---
FROM oven/bun:1-alpine AS build
WORKDIR /app

# Public env vars are inlined by Vite at build time ($env/static/public), so they
# must be present during `bun run build`. Coolify passes these as --build-arg;
# the defaults just keep the build from failing when one is unset (the PostHog
# placeholder leaves analytics inert). Set real values in Coolify's env config.
ARG PUBLIC_PB_URL=http://127.0.0.1:8090
ARG PUBLIC_POSTHOG_KEY=phc_REPLACE_ME
ENV PUBLIC_PB_URL=$PUBLIC_PB_URL
ENV PUBLIC_POSTHOG_KEY=$PUBLIC_POSTHOG_KEY

COPY package.json bun.lock ./
# --ignore-scripts: skip native postinstall builds. The only one is
# better-sqlite3 (transitive via the pocketbase-typegen dev tool) — a Node
# addon needing Python/gcc that this alpine image lacks and the frontend build
# never imports. vite build re-runs `svelte-kit sync` itself, so skipping the
# `prepare` script is fine too.
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
RUN bun run build

# --- runtime stage: serve the static build with nginx ---
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
