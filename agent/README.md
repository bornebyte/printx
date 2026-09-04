# PrintX Agent

The PrintX Agent is a platform-independent background worker for a computer connected to a physical printer. It is implemented with Node.js 20+ and has no runtime dependencies, so the worker core runs on Windows, macOS, and Linux. The startup scripts register that same process with the host operating system.

## What it does

- Polls the PrintX backend over an authenticated outbound connection.
- Receives jobs for exactly one owner-paired printer.
- Persists local queue and status history in `agent/data/agent.json`.
- Recovers jobs left in `processing` if the computer restarts.
- Provides an offline dashboard at `http://127.0.0.1:47821`.
- Supports pause, resume, cancel, retry, and status inspection locally.
- Uses a safe mock adapter by default and isolates OS spooler commands in `printer-adapter.mjs`.
- Downloads the authenticated document payload only while processing, then removes the local temporary file.

The agent does not open a public inbound port. The backend sends no unsolicited connection to the computer; the agent always initiates the secure request. Use HTTPS for `PRINTX_BACKEND_URL` outside localhost development.

## Pair a printer

1. Start the unified PrintX web service from the repository root with `pnpm dev`.
2. Sign in as a printer shopkeeper and register a printer.
3. Select that printer in “Connect a background agent” and create an agent key.
4. Copy the displayed values into `agent/.env`:

```dotenv
PRINTX_BACKEND_URL=https://printx.example.com
PRINTX_AGENT_ID=the-issued-agent-id
PRINTX_AGENT_TOKEN=the-issued-token
PRINTX_AGENT_PRINTER_MODE=mock
```

5. Start the agent:

```bash
pnpm --dir agent start
```

The token is shown only once. Generate a new key to disconnect the previous agent for that printer. Keep `agent/.env` and `agent/data/` private.

## Automatic startup

Run the installer from the repository checkout on the printer computer:

```bash
bash agent/scripts/install-linux.sh
bash agent/scripts/install-macos.sh
```

On Windows, run `agent/scripts/install-windows.ps1` from PowerShell. These create a systemd user service, macOS LaunchAgent, or Windows logon task respectively, and restart the agent after a failure.

## Printer modes

`mock` is the default and exercises the complete queue lifecycle without printing. `system` delegates to the host spooler (`lp` on Linux/macOS and the Windows Print verb). The current MVP transfers documents through an authenticated backend endpoint up to 25 MB; production should replace this with encrypted object storage and short-lived signed URLs before global rollout.

## Commands

```bash
pnpm --dir agent dev
pnpm --dir agent start
pnpm --dir agent lint
pnpm --dir agent test
```
