# KeyCat

KeyCat is a typing-practice project. This repository contains the fullstack
foundation, DB-01/02 schema, six seeded lessons (DB-03), and the AUTH-01…04
registration, session and password flows. Practice and catalog APIs remain future tasks.

## Requirements

- Windows 11 with PowerShell and Node.js 22.18+ (tested against Node 22.20.0)
- Docker Desktop for the local PostgreSQL container, or an existing PostgreSQL
  server
- pnpm 12.18.0 through Corepack or npm

The workspace uses `apps/web`, `apps/api`, and `packages/typing-core` as described
in `docs/architecture.md`. The earlier empty `frontend/` and `backend/` folders
are not used.

## Start locally

Run the commands from the repository root in PowerShell.

1. Choose one database environment. For local Docker, copy `.env.local.example`
   to `.env.local` and replace the sample password in **both** `POSTGRES_PASSWORD`
   and `DATABASE_URL`. Set `KEYCAT_ENV_FILE` in each PowerShell terminal used for
   API or Prisma commands:

   ```powershell
   if (-not (Test-Path .env.local)) { Copy-Item .env.local.example .env.local }
   $env:KEYCAT_ENV_FILE = '.env.local'
   ```

   For managed PostgreSQL, copy `.env.example` to `.env` only if `.env` is
   missing; otherwise add `DATABASE_URL` to the existing private file. Leave
   `KEYCAT_ENV_FILE` unset. Process environment variables override file values.

2. Install dependencies and generate the Prisma Client. Corepack will use
   the pnpm version pinned in `package.json`:

   ```powershell
   corepack pnpm install
   corepack pnpm --dir apps/api prisma:generate
   ```

   If Corepack cannot download pnpm, use
   `npm exec --yes --package=pnpm@12.18.0 -- pnpm install` and the same prefix
   for the remaining pnpm commands. pnpm may ask to approve build scripts for
   `@prisma/engines`, `prisma`, and `esbuild`; do not approve unrelated package
   scripts or agent skills by default.

3. For local PostgreSQL, start the container with the local env file. When using
   managed Supabase PostgreSQL, skip this command:

   ```powershell
   docker compose --env-file .env.local up -d postgres
   ```

   Schema migrations are versioned in `apps/api/prisma/migrations`. Run
   `corepack pnpm --dir apps/api prisma:migrate:deploy` only against the database
   you intend to change. Use a separate local test database for migration and
   constraint tests; never run test fixtures against managed Supabase.

   For the six approved sample lessons and the approved Speed Test presets, run
   `corepack pnpm --dir apps/api seed:local` only against a local PostgreSQL
   database. The command rejects remote hosts.

4. Open two terminals and start API and web:

   ```powershell
   corepack pnpm dev:api
   corepack pnpm dev:web
   ```

   The API dev command compiles TypeScript before starting NestJS so decorator
   metadata is available for request validation. Restart it after API source edits.

Open <http://127.0.0.1:5173>. The page calls `/api/v1/health` through Vite's
local proxy. The API listens on <http://127.0.0.1:3100/v1/health> by default.
`API_PORT` in `.env` changes the API port and the Vite proxy target together.

The public shell has `/`, `/register`, `/login`, `/verify-email`,
`/resend-verification`, `/forgot-password` and `/reset-password`. Member
`/dashboard`, `/lessons` and `/settings/password`, and admin `/admin`, require a
session. Registration, verification, login, refresh, logout and password flows
call the API. Dashboard, lessons and admin content are still placeholders.
Set a unique `AUTH_JWT_SECRET` of at least 32 characters and `WEB_ORIGIN` for
the browser origin. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASSWORD` and `EMAIL_FROM` in the private env file to deliver verification
and reset links. Without working SMTP, register cannot complete email delivery.

The health endpoint returns HTTP 200 only when PostgreSQL responds to a simple
query. If the database is down, it returns HTTP 503; the web page shows
“Chưa sẵn sàng”. Missing or invalid `DATABASE_URL` prevents API startup.

## Checks

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm format:check
Invoke-RestMethod http://127.0.0.1:3100/v1/health
```

The API smoke test requires a reachable PostgreSQL database. DB constraint
tests run only when `TEST_DATABASE_URL` points to a local database whose name
contains `_test`, `_ci` or `_db01_`; otherwise they are skipped. CI provisions
an isolated PostgreSQL 17 service, applies migrations and runs install, Prisma
generation, lint, typecheck, tests, build and formatting checks on pushes and
pull requests. The workflow is in `.github/workflows/ci.yml`.

### Managed Supabase PostgreSQL

For Supabase, replace `DATABASE_URL` in `.env` with a URL copied from the
project's **Connect** dialog. The direct URL has the form
`postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres`
and requires IPv6 or the Supabase IPv4 add-on. On an IPv4-only network, choose
**Session pooler** instead; its host and username differ from the direct URL.
Percent-encode reserved characters in the database password. The Supabase
project URL and publishable key cannot replace a PostgreSQL connection string.
The API connects through Prisma's PostgreSQL adapter. Keep the database URL out
of `apps/web` and every `VITE_` variable.
The currently declared `@supabase/ssr` and `@supabase/supabase-js` packages are
retained for later tasks but are not used by the foundation. No Supabase Auth
or client-side database access is configured. See the
[Supabase connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres).

The Prisma schema and migrations cover identity, curriculum and practice data.
The practice API and typing engine have not been implemented.
Never commit `.env`; only `.env.example` belongs in version control. The
canonical workspace lockfile is `pnpm-lock.yaml`.

Product and architecture documents remain in `docs/`. Their pending decisions
must be approved before implementing the related business tasks.
