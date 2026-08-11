import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Config runs in Node; declare `process` locally so svelte-check needn't pull in @types/node.
declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
	// Honour a PORT env var so preview/CI can pin the dev port; falls back to Vite's default.
	server: process.env.PORT ? { port: Number(process.env.PORT) } : undefined,
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Pure SPA (ssr = false in the root layout): static output with an
			// index.html fallback so deep links resolve client-side. Served by
			// nginx in the Coolify deploy (see Dockerfile).
			adapter: adapter({ fallback: 'index.html' })
		})
	]
});
