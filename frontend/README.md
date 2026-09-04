This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# PrintX frontend

This is the initial PrintX web application: users start with an empty saved-printer list, add printer shops by their unique `PX-` code, review shop details, upload a document, and send a print job to a selected saved printer.

The public home screen is available at `/`; `/dashboard` is auth-gated and routes regular print users to saved-printer printing and printer shopkeepers to printer registration.

Printer shopkeepers choose a supported currency and price per page when registering a printer. That currency is stored with the generated printer code and shown to users in the saved-printer and print-job flow.

## Local setup

Copy `.env.example` to `.env.local`. Set the Firebase web config values (`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, and `NEXT_PUBLIC_FIREBASE_APP_ID`) from one Firebase project, then enable Email/Password and Google under Firebase Authentication. Gmail notifications are optional; add `GMAIL_USER` and a Google app password to enable them.

The Gmail credentials are consumed only by `app/api/email/route.ts`, which uses Node's built-in TLS client to talk to Gmail SMTP. They must never use `NEXT_PUBLIC_*` variables.

```bash
cd ..
pnpm install
cp frontend/.env.example frontend/.env.local
pnpm dev
```

Demo printer codes:

- `PX-4812` — Northstar Studio
- `PX-7390` — Paper Lane
- `PX-1055` — Brooklyn Library

The printer directory, file upload, and job submission are currently demo state. Replace them with authenticated APIs and Firebase Storage/Firestore for the production workflow.

## Verification

```bash
pnpm lint
pnpm build
```
