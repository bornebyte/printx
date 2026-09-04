# PrintX repository guidance

PrintX is a global printer-sharing and remote-printing platform. The repository is currently an early web MVP with a Next.js frontend and a small backend workspace.

## Repository layout

- `frontend/app/page.tsx` — public PrintX home screen plus the exported workspace dashboard component.
- `frontend/app/dashboard/page.tsx` — printer-code workspace route.
- `frontend/components/ui/` — shadcn-style UI primitives. Reuse these primitives for new surfaces and keep the existing base-nova visual language.
- `frontend/lib/` — browser-safe helpers, including Firebase Authentication REST integration and browser notification helpers.
- `frontend/app/api/email/route.ts` — server-only Gmail SMTP notification endpoint using Node's built-in TLS API.
- `backend/` — server-side Firebase-authenticated printer, job, and agent APIs.
- `agent/` — dependency-free, platform-independent Node.js background worker, local offline dashboard, printer adapter, and OS auto-start installers.

## Product behavior currently implemented

- A new user starts with an empty saved-printer list.
- Authentication separates regular print users from printer shopkeepers; each role gets its own workspace.
- Printer shops are added by their unique `PX-` code, not by generic map search.
- Shopkeepers can register a physical printer and receive a generated unique code.
- Shopkeepers can issue a one-time hashed agent token for each registered printer.
- The agent polls outbound over its configured backend URL, so no public inbound port is required.
- The agent keeps a local queue/dashboard and supports pause, cancel, retry, recovery, and OS startup installation.
- Adding a valid code reveals the shop name, owner, address, availability, printer type, capabilities, rating, pricing, and turnaround estimate.
- The send flow only allows selecting printers already added to the user's list.
- Document selection is currently local UI state; no file is uploaded to storage yet.
- A successful demo submission triggers a browser notification and attempts a confirmation email for signed-in users.
- Demo codes are `PX-4812`, `PX-7390`, and `PX-1055`.

## Important implementation rules

- Preserve the empty-list behavior unless the product requirements explicitly change it.
- Do not expose `GMAIL_APP_PASSWORD`, `GMAIL_USER`, or other server secrets to client code. Use `GMAIL_USER`, `GMAIL_APP_PASSWORD`, optional `MAIL_FROM`, `GMAIL_SMTP_HOST`, and `GMAIL_SMTP_PORT` only on the server.
- Firebase web configuration values are public client configuration. Use the same project's `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, and `NEXT_PUBLIC_FIREBASE_APP_ID` for Firebase email/password and Google Authentication; never put a Gmail credential in `NEXT_PUBLIC_*` variables.
- Gmail email delivery intentionally uses Node built-ins only. Do not add Nodemailer, SendGrid, Resend, or another mail dependency unless the product owner changes this requirement.
- Browser notifications must be requested from a user gesture and must remain optional when the browser does not support the Notification API.
- Keep UI components accessible: use real buttons, labels, focusable controls, useful `aria-label`s, and visible disabled/error states.
- Use the existing shadcn-style primitives before creating one-off controls. Prefer `Button` and `Card` from `frontend/components/ui/` and add narrowly scoped primitives only when they are reused.
- Treat the current printer directory as mock data. A production implementation must replace it with an authenticated API backed by the printer-code registry.
- Backend endpoints must enforce the account role: users can save printers and create jobs; shopkeepers can register and manage their own printers.
- Agent endpoints must authenticate the hashed one-time token and verify that every job belongs to the paired printer.
- Keep `agent/` platform-independent. Do not move OS-specific spooler commands into the worker core; isolate them in `agent/printer-adapter.mjs`.
- Production agent backends must use HTTPS. The local agent dashboard must bind to loopback and require its local key for API actions.
- Never commit `.env.local`, Gmail app passwords, Firebase service-account JSON, tokens, or uploaded document contents.

## Verification

Use pnpm as the preferred package manager. From `/home/shubham/dev/printx`, use:

```bash
pnpm install
pnpm dev       # frontend + backend together
pnpm dev:all   # frontend + backend + unpaired agent for local development
pnpm agent:dev # agent only
pnpm lint      # both packages
pnpm typecheck # both packages
pnpm build     # both packages
pnpm test      # backend + agent tests
pnpm check     # lint + typecheck + build
```

Read `frontend/AGENTS.md` before changing Next.js code; it contains framework-specific generated guidance.
