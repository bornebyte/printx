# PrintX backend instructions

Read [AGENTS.md](./AGENTS.md) before changing backend code.

Use pnpm (`pnpm@10.33.2`) for all workspace commands. The backend defaults to Firebase Firestore for structured application persistence; server-only Firebase service-account credentials must stay out of frontend code and version control. Use `PRINTX_STORAGE=local` only for an intentional local-only development run.

Keep Firebase Authentication verification, printer ownership checks, agent-token hashing, and paired-agent job authorization on the server. Do not add a third-party mail SDK: Gmail notifications use the existing Node built-in SMTP implementation in the frontend server route.
