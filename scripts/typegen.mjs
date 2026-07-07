// Generate TypeScript types from the running PocketBase instance.
// Reads admin credentials from .env (auto-loaded by Bun): POCKETBASE_URL,
// POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD. Run: `bun run typegen`.
// Uses an args array (no shell) so special characters in the password are safe.
import { spawnSync } from 'node:child_process'

const url = (process.env.POCKETBASE_URL ?? 'http://127.0.0.1:8090').replace('0.0.0.0', '127.0.0.1')
const email = process.env.POCKETBASE_ADMIN_EMAIL
const password = process.env.POCKETBASE_ADMIN_PASSWORD

if (!email || !password) {
	console.error('Mangler POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD i .env')
	process.exit(1)
}

const out = 'src/lib/pocketbase-types.ts'
const result = spawnSync(
	'bunx',
	['pocketbase-typegen', '--url', url, '--email', email, '--password', password, '--out', out],
	{ stdio: 'inherit' },
)
if (result.status === 0) console.log(`\nWrote ${out} from ${url}`)
process.exit(result.status ?? 1)
