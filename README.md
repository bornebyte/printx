# PrintX

PrintX is a global printer-sharing network. People and businesses can register physical printers, share them with a unique printer code, and let others securely send print jobs from anywhere.

> PrintX is currently an early web MVP. The user flow, backend queue, secure initial document handoff, and first cross-platform printer-agent foundation are functional, while production encrypted storage, payments, and printer drivers are still being built.

## Current MVP

- Public product home screen at `/`
- Printer-code workspace at `/dashboard`
- Empty saved-printer list for new users
- Add a printer shop using a unique `PX-` code
- Display printer owner, location, availability, capabilities, pricing, rating, and turnaround
- Upload a document and configure copies/layout in the demo print flow
- Firebase email/password and Google sign-in
- Separate print-user and printer-shopkeeper account flows
- Shopkeeper printer registration with generated shareable `PX-` codes
- Shopkeeper pricing with selectable local currency (USD, INR, EUR, GBP, AED, CAD, AUD, SGD, or JPY)
- Cross-platform background agent with secure outbound job polling and an offline localhost dashboard
- Linux systemd, macOS LaunchAgent, and Windows logon-task auto-start installers
- Optional browser notifications for print-job updates
- Optional Gmail SMTP confirmation email using a Google app password and Node's built-in TLS API
- Responsive shadcn-style interface for desktop and mobile browsers

Demo printer codes:

| Code | Printer shop |
| --- | --- |
| `PX-4812` | Northstar Studio |
| `PX-7390` | Paper Lane |
| `PX-1055` | Brooklyn Library |

## Repository layout

```text
printx/
├── frontend/                 # Next.js web application
│   ├── app/page.tsx          # Public home screen and workspace component
│   ├── app/dashboard/        # Auth-gated user and shopkeeper workspace route
│   ├── app/api/email/        # Server-only Gmail SMTP route
│   ├── components/ui/        # shadcn-style UI primitives
│   └── lib/                  # Firebase Auth and browser notification helpers
├── backend/                  # Authenticated printer, job, and agent APIs
├── agent/                    # Platform-independent background worker and local UI
├── .github/                  # CI, issue templates, and pull request template
└── AGENTS.md                 # Project instructions for coding agents
```

## Quick start

Requirements: Node.js 20+ and pnpm 10.33.2.

```bash
pnpm install
cp frontend/.env.example frontend/.env.local
pnpm dev
```

This starts both services from the repository root:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:4000/health](http://localhost:4000/health)

To run the agent during development as well:

```bash
cp agent/.env.example agent/.env
pnpm dev:all
```

The agent dashboard is available at [http://127.0.0.1:47821](http://127.0.0.1:47821). Pair a registered printer from the owner dashboard, copy the generated values into `agent/.env`, and restart the agent. For automatic startup, use the installer matching the computer:

```bash
bash agent/scripts/install-linux.sh       # Linux
bash agent/scripts/install-macos.sh       # macOS
```

On Windows, run `agent/scripts/install-windows.ps1` in PowerShell. All three installers launch the same platform-independent `agent/agent.mjs` process.

Run checks before opening a pull request:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

## Configuration

Copy [frontend/.env.example](frontend/.env.example) to `frontend/.env.local`.

### Firebase Authentication

1. Create a Firebase project and add a web app.
2. Enable Email/Password and Google under Firebase Authentication → Sign-in method.
3. Set `NEXT_PUBLIC_FIREBASE_API_KEY` from the Firebase web configuration.
4. Enable Google under Firebase Authentication → Sign-in method.
5. Add `http://localhost:3000` and your production domain under Authentication → Settings → Authorized domains.

The current frontend uses Firebase Identity Toolkit REST calls for email/password and Firebase Auth's own Google popup flow. Users choose either “I need to print” or “I run a printer shop” during authentication. Use the complete web config (`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, and `NEXT_PUBLIC_FIREBASE_APP_ID`) from the same Firebase project. Firebase client configuration is safe to expose as `NEXT_PUBLIC_*`; user tokens should still be handled carefully in production.

### Gmail notifications

Gmail delivery is optional. Create a Google app password for the sending account and set:

```dotenv
GMAIL_USER=you@example.com
GMAIL_APP_PASSWORD=your-16-character-app-password
MAIL_FROM=you@example.com
# Optional: use 465 (implicit TLS) or 587 (STARTTLS)
GMAIL_SMTP_PORT=465
```

These values are server-only. Never use `NEXT_PUBLIC_` for Gmail settings and never commit `.env.local` or credentials. The mail route intentionally uses Node's built-in `node:tls` module instead of a third-party email SDK.

## Development status

The next production milestones are:

1. Replace the mock printer directory with an authenticated printer-code registry.
2. Persist user-linked printers in Firestore with ownership and access rules.
3. Add Firebase Storage upload, document encryption, retention, and malware scanning.
4. Move the initial 25 MB document handoff to encrypted object storage with short-lived signed URLs and retention controls.
5. Add print-job state transitions, payments, owner controls, and audit logs.

See [CONTRIBUTING.md](CONTRIBUTING.md) before making changes. Security concerns belong in a private GitHub Security Advisory; do not open a public issue for a vulnerability.

## License

PrintX is released under the [MIT License](LICENSE).
