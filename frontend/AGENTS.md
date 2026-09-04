<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## PrintX-specific rules

- `/` is the public marketing home screen; `/dashboard` is the working printer-code workspace.
- Users start with an empty list and add printer shops using a unique printer code. Do not reintroduce a generic nearby-printer discovery flow without an explicit product decision.
- The current demo codes are `PX-4812`, `PX-7390`, and `PX-1055`.
- The send flow must display the selected printer code and its additional details before submission.
- Reuse the shadcn-style components in `components/ui/`, especially `Button` and `Card`.
- Firebase Authentication is currently called through the Firebase Identity Toolkit REST API in `lib/firebase-auth.ts`; Google sign-in uses Google Identity Services and exchanges the token with Firebase. Keep credentials/configuration handling consistent with that module.
- `app/api/email/route.ts` sends Gmail SMTP mail with Node's built-in TLS support. Never expose Gmail app-password variables to client code and do not add a third-party email module for this requirement.
- Browser notifications are implemented in `lib/browser-notifications.ts` and must remain optional.
- Prefer pnpm (`pnpm@10.33.2`) for installs and scripts. Run `pnpm lint` and `pnpm build` from this directory after meaningful changes.
