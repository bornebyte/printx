# PrintX agent instructions

## Purpose

`agent/` is the platform-independent background worker for a computer connected to a physical printer. It is a Node.js 20+ process with no runtime dependencies, so the same core code runs on Windows, macOS, and Linux. The OS-specific installer files only register this process for automatic startup.

## Commands

Use pnpm rather than npm:

```bash
pnpm --dir agent start
pnpm --dir agent dev
pnpm --dir agent lint
pnpm --dir agent test
```

## Security rules

- The agent makes outbound authenticated requests to `PRINTX_BACKEND_URL` with a one-time owner-issued bearer token.
- Never log or expose `PRINTX_AGENT_TOKEN` or persist it in the local browser dashboard response.
- Production backends must use HTTPS. HTTP is only for localhost development.
- The local dashboard must remain bound to `127.0.0.1` (or another explicit loopback address), and local API calls require the generated local key.
- Store the agent data file with restrictive permissions where the operating system supports them.
- Validate all job actions against the printer agent identity on the backend.

## Architecture

- `agent.mjs` owns polling, persistent state, the loopback API, and the offline dashboard.
- `printer-adapter.mjs` is the only printer-specific boundary. Keep the default `mock` adapter safe for development and isolate OS spooler commands in the `system` adapter.
- The backend owns job truth. The agent must recover abandoned processing jobs after restart and must not invent job IDs.
- The current web MVP sends a filename and print options, not document bytes. Do not claim that the agent can print arbitrary documents until secure document download/upload is implemented.
