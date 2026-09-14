import { createServer, type Server } from "node:http";

export interface HealthSnapshot {
  ready: boolean;
  running: boolean;
  workerId: string;
  printers: number;
  inFlight: number;
  jobsProcessed: number;
  jobsFailed: number;
}

export class HealthServer {
  private server?: Server;

  constructor(private readonly host: string, private readonly port: number, private readonly snapshot: () => HealthSnapshot) {}

  async start(): Promise<void> {
    this.server = createServer((request, response) => {
      const pathname = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`).pathname;
      const current = this.snapshot();
      if (pathname === "/healthz") return this.send(response, 200, { status: "ok", ...current });
      if (pathname === "/readyz") return this.send(response, current.ready ? 200 : 503, { status: current.ready ? "ready" : "not-ready", ...current });
      if (pathname === "/metrics") return this.send(response, 200, current);
      return this.send(response, 404, { error: "Not found" });
    });
    await new Promise<void>((resolve, reject) => {
      this.server?.once("error", reject);
      this.server?.listen(this.port, this.host, resolve);
    });
  }

  async close(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((resolve, reject) => this.server?.close((error) => error ? reject(error) : resolve()));
  }

  private send(response: import("node:http").ServerResponse, status: number, payload: unknown): void {
    response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    response.end(JSON.stringify(payload));
  }
}
