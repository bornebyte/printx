# PrintX agent instructions

Read [AGENTS.md](./AGENTS.md) first. Frontend work must also follow [frontend/AGENTS.md](./frontend/AGENTS.md), backend work must follow [backend/AGENTS.md](./backend/AGENTS.md), and agent work must follow [agent/AGENTS.md](./agent/AGENTS.md).

Keep the initial product flow code-based: users add printer shops by unique printer code, begin with an empty list, and can only submit to saved printers whose details are shown in the send flow.

Prefer pnpm (`pnpm@10.33.2`) for package installation and scripts.

Keep the printer agent core platform-independent and dependency-free. Use secure outbound HTTPS polling with one-time hashed tokens; keep the local dashboard loopback-only and never expose agent tokens in its API.
