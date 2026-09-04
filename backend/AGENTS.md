# Backend guidance

The backend workspace is reserved for PrintX server-side services, Firebase integration, printer agents, job orchestration, and secure notifications.

Use pnpm for backend installs and scripts (`pnpm@10.33.2`). From the repository root, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test` cover both workspaces. Keep the backend lockfile authoritative.

## Security

- Keep Gmail credentials server-side only. The required variables are `GMAIL_USER` and `GMAIL_APP_PASSWORD`; optional values are `MAIL_FROM`, `GMAIL_SMTP_HOST`, and `GMAIL_SMTP_PORT`.
- Gmail delivery is implemented in the Next.js server route with Node's built-in `node:tls` module. Do not add a third-party email SDK for this requirement.
- Firebase client configuration may be exposed to the browser, but Firebase Admin credentials and user tokens must never be sent to the client.
- Validate authenticated user identity and printer ownership before production reads/writes.

## Current state

`firebase.ts` is an early placeholder and is not yet the production server boundary. The frontend currently uses Firebase Identity Toolkit REST endpoints for email/password sign-in and sign-up so the initial app does not need an additional browser SDK dependency.

## Future service boundaries

- Printer-code registry: code, owner, shop metadata, capabilities, pricing, and availability.
- User-linked printers: authenticated user ID to printer-code relationship.
- Print jobs: encrypted document reference, selected printer, settings, status timeline, and audit events.
- Notifications: browser notification plus Gmail confirmation, with retries and delivery status.
