# PrintX architecture

## Deployment boundaries

```text
Browser ──HTTPS──> Frontend / API
                       │
                       ├── Database
                       ├── Object storage
                       ├── Payment provider
                       └── Event stream / job API ◄──secure connection── Worker
                                                                    │
                                                                    └── Printer adapters
```

The `frontend` package owns the customer and business web experiences. The `worker` package is installed inside a business environment and is responsible for local device discovery, document delivery, printer routing, printing, retries, and status reporting.

## Worker boundaries

The worker is intentionally split into a portable runtime and replaceable adapters:

- `domain/` contains job and printer contracts.
- `ports/` defines the interfaces used by the runtime.
- `adapters/` contains transport, storage, reporting, and local spool implementations.
- `runtime.ts` owns lifecycle, routing, retries, idempotency, and state transitions.
- `health-server.ts` exposes local liveness, readiness, and metrics endpoints.

The default `SpoolPrinterAdapter` writes a portable print manifest to a local spool directory. Production installations should provide an OS/device adapter behind the same `PrinterAdapter` port for Windows, Linux, macOS, Raspberry Pi, or Android integrations.

## Job lifecycle

```text
created → queued → assigned → printing → completed
                         └──────────────→ failed / retrying
```

The runtime acknowledges a job only after the printer adapter reports success. A durable local state file prevents a reconnect from processing the same idempotency key twice. Recoverable failures use bounded exponential backoff; permanent failures are reported and acknowledged so they do not block the queue.

## Event transport

When `WORKER_EVENT_STREAM_URL` is configured, the worker uses a server-sent event stream and authenticated HTTP acknowledgements. The transport is isolated behind `JobSource`, so a WebSocket, Redis Streams, or another event adapter can be added without changing print processing logic. Without an endpoint, the worker uses the in-memory source for local development.

## Security expectations

- Use short-lived worker credentials or a rotated device token.
- Send all event, document, and status traffic over TLS.
- Use signed, short-lived document URLs.
- Do not log document contents or credentials.
- Keep runtime state and spool directories outside the source tree in production.
- Apply least-privilege access per business and per worker.
