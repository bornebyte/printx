# PrintX Worker

The worker is the local service installed on a computer or small device near the printers. It keeps a secure connection to the platform, downloads documents, selects an available printer, sends the document to a printer adapter, and reports each lifecycle transition.

## Development

```bash
cp .env.example .env
pnpm install
pnpm --filter ./worker dev
```

With the default `WORKER_MODE=demo`, the worker processes one in-memory sample job and writes a portable job manifest to `spool/<printer-id>/<job-id>/`. This is intentionally a development adapter; it does not send paper to a physical device.

Build and run the compiled service:

```bash
pnpm --filter ./worker build
pnpm --filter ./worker start
```

Health endpoints:

- `GET /healthz` — process is alive
- `GET /readyz` — printers were discovered and the runtime is ready
- `GET /metrics` — small JSON snapshot for local monitoring

## Connected mode

Set `WORKER_EVENT_STREAM_URL`, `WORKER_API_BASE_URL`, and `WORKER_API_TOKEN`. The built-in transport consumes server-sent events and posts acknowledgements, rejections, and job updates over authenticated HTTP. The API contract is isolated in `src/ports/` and can later be backed by WebSockets, Redis Streams, or another transport.

## Printer integrations

`SpoolPrinterAdapter` is the safe cross-platform default. A production printer integration should implement `PrinterAdapter` and remain isolated in `src/adapters/` or a platform-specific package. Keep operating-system process calls, printer discovery, and device APIs out of `runtime.ts`.

## Reliability behavior

- Maximum concurrent jobs is configured by `WORKER_MAX_CONCURRENCY`.
- Recoverable print errors use exponential backoff.
- `WORKER_MAX_RETRIES` bounds retries.
- `runtime/job-state.json` stores idempotency state across restarts.
- A job is acknowledged only after the printer adapter reports success.
- SIGINT and SIGTERM stop intake and allow active work to settle.
