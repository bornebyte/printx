# PrintX Platform

PrintX is a distributed printing platform that connects people and businesses with local printers. This repository is organized as a small monorepo so the web experience and the local print service can evolve independently while sharing clear contracts.

## Repository layout

```text
printx/
├── frontend/       # Next.js web application
├── worker/         # Cross-platform local print worker
├── docs/           # Architecture and operational documentation
├── AGENTS.md       # Repository-wide development rules
├── LICENSE
└── package.json    # Workspace commands
```

## Getting started

Requirements: Node.js 20 or newer and pnpm 10 or newer.

```bash
pnpm install
pnpm dev
```

The web application runs at `http://localhost:3000`. The worker starts in local demo mode when no event-stream endpoint is configured and exposes health checks at `http://localhost:8787/healthz`.

Run either package independently:

```bash
pnpm dev:frontend
pnpm dev:worker
```

## Applications

### Frontend

The public product site is at `/`. Authentication is at `/auth`, with Firebase email/password and Google sign-in support. The two workspace experiences are available at `/dashboard/personal` and `/dashboard/business`.

Copy `frontend/.env.example` to `frontend/.env.local` and add the Firebase Web App values to enable authentication.

### Worker

The worker is a long-running, local service. Its core runtime depends on portable ports for event transport, document storage, job reporting, and printer access. OS-specific printing should be implemented only behind the printer adapter boundary. See [worker/README.md](worker/README.md) and [docs/architecture.md](docs/architecture.md).

### Supabase data

Dashboard data is loaded through authenticated server routes backed by Supabase. Apply the SQL migration in [supabase/migrations](supabase/migrations) and follow [supabase/README.md](supabase/README.md) for the required server-only keys. Firebase remains the sign-in provider; the server verifies Firebase ID tokens before reading or changing database records.

### Error tracking

API failures return a stable `errorCode` and `requestId`. Browser errors, server route failures, and render failures are written to `error_events` when Supabase is available and also logged as structured JSON. The UI shows the same code and request ID in retryable error states.

## Commands

```bash
pnpm build       # build frontend and worker
pnpm lint        # lint the frontend
pnpm typecheck   # type-check every package
pnpm clean       # remove generated package output
```

## License

PrintX is released under the MIT License. See [LICENSE](LICENSE).
