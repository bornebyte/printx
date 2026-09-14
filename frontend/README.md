# PrintX frontend

This package contains the PrintX Next.js web application.

## Routes

- `/` — public product home page
- `/auth` — Firebase email/password and Google authentication
- `/dashboard/personal` — personal workspace
- `/dashboard/business` — business workspace

## Local development

From the repository root:

```bash
pnpm install
pnpm dev:frontend
```

Copy `.env.example` to `.env.local` and add the Firebase Web App configuration. Enable Email/Password and Google providers in Firebase Authentication.
