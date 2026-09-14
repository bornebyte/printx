<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Guidelines

## UI and UX

- Use shadcn/ui components throughout the application wherever a suitable component exists.
- Prefer shadcn/ui primitives and patterns for forms and controls, including date pickers, time pickers, select boxes, dropdown menus, calendars, dialogs, popovers, tooltips, tables, and command menus.
- Keep UI behavior, accessibility, keyboard interaction, and visual styling consistent with shadcn/ui and the existing project design system.
- Add or configure the required shadcn/ui component instead of creating a custom replacement when the component already fits the use case.

## Data Access

- Use Prisma as the ORM for database access.
- Keep database models, migrations, and generated Prisma client usage consistent with the repository's Prisma setup.
- Do not introduce a second ORM or bypass Prisma for routine application data access without documenting the reason.

## Cross-Platform Worker

- Build the worker around portable interfaces and avoid operating-system-specific assumptions in core logic.
- Support Windows, Linux, and macOS, with portability considered for Raspberry Pi and Android deployments as well.
- Isolate platform-specific integrations, filesystem behavior, process management, printing, and device communication behind replaceable adapters.
- Prefer cross-platform runtimes and libraries; document unavoidable platform requirements and provide platform-specific implementations only at the integration boundary.
- Keep worker setup, configuration, logging, and error handling consistent across supported platforms.

## Keeping These Guidelines Current

- Update this file whenever project conventions, supported platforms, UI component standards, or data-access patterns change.
