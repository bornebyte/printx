Read `AGENTS.md` before changing this app. It contains generated Next.js guidance and applies to all App Router work here.

Project-specific behavior is documented in the repository-level `../AGENTS.md`. The current product flow is deliberately code-first: users start with an empty printer list, add shops by unique `PX-` code, and select from saved printers during upload/send.

Use the existing shadcn-style components under `components/ui/`. Keep Gmail credentials server-only and keep browser notification permission optional.
