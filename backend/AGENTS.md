# Backend guidance

The backend workspace is reserved for PrintX server-side services, Firebase integration, printer agents, job orchestration, and secure notifications.

Use pnpm for backend installs and scripts (`pnpm@10.33.2`). The production web deployment imports this service through `frontend/app/api/[[...path]]/route.ts`; the standalone listener remains available through `pnpm backend:dev`. From the repository root, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test` cover all workspaces. Keep the backend lockfile authoritative.

## Security

- Keep Gmail credentials server-side only. The required variables are `GMAIL_USER` and `GMAIL_APP_PASSWORD`; optional values are `MAIL_FROM`, `GMAIL_SMTP_HOST`, and `GMAIL_SMTP_PORT`.
- Gmail delivery is implemented in the Next.js server route with Node's built-in `node:tls` module. Do not add a third-party email SDK for this requirement.
- Firebase client configuration may be exposed to the browser, but Firebase Admin credentials and user tokens must never be sent to the client.
- Validate authenticated user identity and printer ownership before production reads/writes.
- Agent tokens are stored as SHA-256 hashes in the backend store and must never be returned after initial issuance.
- Agent job actions must verify both the paired printer ID and the agent ID that claimed the job.

## Persistence and current state

The backend defaults to Firebase Firestore (`PRINTX_STORAGE=firestore`). It uses the server-only service-account credential from `FIREBASE_SERVICE_ACCOUNT_FILE`, `FIREBASE_SERVICE_ACCOUNT_JSON`, or `FIREBASE_SERVICE_ACCOUNT_BASE64`; never send these values to the browser. The first Firestore adapter stores the structured MVP state in the `printx/state` document and migrates an existing `PRINTX_DATA_FILE` once when that document is empty. `PRINTX_STORAGE=local` is an explicit local-only fallback for development.

The frontend currently uses Firebase Identity Toolkit REST endpoints for email/password sign-in and sign-up so the initial app does not need an additional browser SDK dependency. Job metadata, profiles, linked printers, shop registrations, ownership records, and agent credentials are persisted in Firestore. Uploaded document bytes remain a short-lived local backend handoff; production must move them to Firebase Storage or another encrypted object-storage layer because Firestore documents have strict size limits.

The current state-document adapter is an MVP boundary, not the final billion-user data model. Before global scale, split data into Firestore collections with per-entity documents, transactions, indexes, retention policies, and a dedicated job/event model.

## Future service boundaries

- Printer-code registry: code, owner, shop metadata, capabilities, pricing, and availability.
- User-linked printers: authenticated user ID to printer-code relationship.
- Print jobs: encrypted document reference, selected printer, settings, status timeline, and audit events.
- Notifications: browser notification plus Gmail confirmation, with retries and delivery status.
- Printer agents: one-time owner-issued token, outbound polling, claim/complete/fail/retry/cancel lifecycle, and restart recovery.
