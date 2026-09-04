# PrintX

PrintX is a global printer-sharing network. People and businesses can register physical printers, share them with a unique printer code, and let others securely send print jobs from anywhere.

> PrintX is currently an early web MVP. The user flow and interface are functional, while the printer registry, file storage, payments, and printer-agent network are still being built.

## Current MVP

- Public product home screen at `/`
- Printer-code workspace at `/dashboard`
- Empty saved-printer list for new users
- Add a printer shop using a unique `PX-` code
- Display printer owner, location, availability, capabilities, pricing, rating, and turnaround
- Upload a document and configure copies/layout in the demo print flow
- Firebase email/password and Google sign-in
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
│   ├── app/dashboard/        # Printer-code workspace route
│   ├── app/api/email/        # Server-only Gmail SMTP route
│   ├── components/ui/        # shadcn-style UI primitives
│   └── lib/                  # Firebase Auth and browser notification helpers
├── backend/                  # Reserved for server-side platform services
├── .github/                  # CI, issue templates, and pull request template
└── AGENTS.md                 # Project instructions for coding agents
```

## Quick start

Requirements: Node.js 20+ and pnpm 10.33.2.

```bash
cd frontend
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Run checks before opening a pull request:

```bash
cd frontend
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

## Configuration

Copy [frontend/.env.example](frontend/.env.example) to `frontend/.env.local`.

### Firebase Authentication

1. Create a Firebase project and add a web app.
2. Enable Email/Password and Google under Firebase Authentication → Sign-in method.
3. Set `NEXT_PUBLIC_FIREBASE_API_KEY` from the Firebase web configuration.
4. Create a Google OAuth web client and set `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
5. Add `http://localhost:3000` and your production domain to the authorized origins.

The current frontend uses Firebase Identity Toolkit REST calls and Google Identity Services. Firebase client configuration is safe to expose as `NEXT_PUBLIC_*`; user tokens should still be handled carefully in production.

### Gmail notifications

Gmail delivery is optional. Create a Google app password for the sending account and set:

```dotenv
GMAIL_USER=you@example.com
GMAIL_APP_PASSWORD=your-16-character-app-password
MAIL_FROM=you@example.com
```

These values are server-only. Never use `NEXT_PUBLIC_` for Gmail settings and never commit `.env.local` or credentials. The mail route intentionally uses Node's built-in `node:tls` module instead of a third-party email SDK.

## Development status

The next production milestones are:

1. Replace the mock printer directory with an authenticated printer-code registry.
2. Persist user-linked printers in Firestore with ownership and access rules.
3. Add Firebase Storage upload, document encryption, retention, and malware scanning.
4. Build the desktop/mobile printer agent and secure job delivery protocol.
5. Add print-job state transitions, payments, owner controls, and audit logs.

See [CONTRIBUTING.md](CONTRIBUTING.md) before making changes. Security concerns belong in a private GitHub Security Advisory; do not open a public issue for a vulnerability.

## License

PrintX is released under the [MIT License](LICENSE).
