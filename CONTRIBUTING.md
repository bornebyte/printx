# Contributing to PrintX

Thanks for helping build a more accessible printer network.

## Before you start

Read the repository guidance in [AGENTS.md](AGENTS.md). Frontend changes should also follow [frontend/AGENTS.md](frontend/AGENTS.md).

Use pnpm 10.33.2 for installs and scripts from the repository root:

```bash
pnpm install
```

## Development workflow

1. Open an issue or describe the change in a draft pull request when the scope is unclear.
2. Create a focused branch from the default branch.
3. Keep changes small and explain user-visible behavior in the pull request.
4. Run `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test` from the repository root.
5. Add or update documentation when behavior, environment variables, or architecture changes.

## Product-specific expectations

- New users must continue to start with an empty printer list.
- Printer shops are added by unique printer code; do not replace this with generic location search without a product decision.
- Printer details shown before sending should include the code and the information needed to make a safe choice.
- Never commit Firebase service-account credentials, Gmail app passwords, user tokens, or document contents.
- Gmail email delivery must remain server-only and must not add a third-party mail SDK without an explicit decision.
- Prefer existing shadcn-style components and accessible native controls.

## Pull requests

Pull requests should include:

- What changed and why
- How the change was tested
- Screenshots or a short recording for visual changes
- Any new environment variables or migration steps
- Known limitations or follow-up work

By contributing, you agree that your contributions are provided under the repository's [MIT License](LICENSE).
