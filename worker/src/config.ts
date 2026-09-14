import { resolve } from "node:path";

import type { PrinterDescriptor } from "./domain/types.js";

export interface WorkerConfig {
  mode: "demo" | "connected";
  workerId: string;
  businessId: string;
  apiToken?: string;
  eventStreamUrl?: string;
  apiBaseUrl?: string;
  healthHost: string;
  healthPort: number;
  maxConcurrency: number;
  maxRetries: number;
  retryBaseMs: number;
  runtimeDir: string;
  spoolDir: string;
  configuredPrinters: PrinterDescriptor[];
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePrinters(value: string | undefined): PrinterDescriptor[] {
  const entries = (value ?? "printer-01:Printer 01").split(",");
  return entries.map((entry, index) => {
    const [id, ...nameParts] = entry.split(":");
    return { id: id?.trim() || `printer-${index + 1}`, name: nameParts.join(":").trim() || id?.trim() || `Printer ${index + 1}` };
  });
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  const mode = env.WORKER_EVENT_STREAM_URL ? "connected" : env.WORKER_MODE === "connected" ? "connected" : "demo";
  return {
    mode,
    workerId: env.WORKER_ID?.trim() || "worker-local-01",
    businessId: env.BUSINESS_ID?.trim() || "business-local",
    apiToken: env.WORKER_API_TOKEN?.trim() || undefined,
    eventStreamUrl: env.WORKER_EVENT_STREAM_URL?.trim() || undefined,
    apiBaseUrl: env.WORKER_API_BASE_URL?.trim() || undefined,
    healthHost: env.WORKER_HOST?.trim() || "127.0.0.1",
    healthPort: positiveInt(env.WORKER_HEALTH_PORT, 8787),
    maxConcurrency: positiveInt(env.WORKER_MAX_CONCURRENCY, 2),
    maxRetries: positiveInt(env.WORKER_MAX_RETRIES, 3),
    retryBaseMs: positiveInt(env.WORKER_RETRY_BASE_MS, 1000),
    runtimeDir: resolve(env.WORKER_RUNTIME_DIR?.trim() || "./runtime"),
    spoolDir: resolve(env.WORKER_SPOOL_DIR?.trim() || "./spool"),
    configuredPrinters: parsePrinters(env.WORKER_PRINTERS),
  };
}
