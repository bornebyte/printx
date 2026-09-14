import { mkdir } from "node:fs/promises";
import { loadConfig } from "./config.js";
import { FileJobStateStore } from "./adapters/file-job-state-store.js";
import { InMemoryJobSource } from "./adapters/in-memory-job-source.js";
import { LocalDocumentStore } from "./adapters/local-document-store.js";
import { HttpJobReporter } from "./adapters/job-reporters.js";
import { SpoolPrinterAdapter } from "./adapters/spool-printer-adapter.js";
import { SseJobSource } from "./adapters/sse-job-source.js";
import { createLogger } from "./logger.js";
import { HealthServer } from "./health-server.js";
import { WorkerRuntime } from "./runtime.js";

const config = loadConfig();
const logger = createLogger();
const source = config.eventStreamUrl ? new SseJobSource(config) : new InMemoryJobSource();
const printers = new SpoolPrinterAdapter(config);
const runtime = new WorkerRuntime({ config, source, printers, documents: new LocalDocumentStore(config), reporter: new HttpJobReporter(config), state: new FileJobStateStore(config.runtimeDir), logger });
const health = new HealthServer(config.healthHost, config.healthPort, () => runtime.snapshot());
let shuttingDown = false;

async function start(): Promise<void> {
  await mkdir(config.runtimeDir, { recursive: true });
  await mkdir(config.spoolDir, { recursive: true });
  await runtime.start();
  await health.start();
  logger.info("Worker health server listening", { host: config.healthHost, port: config.healthPort });
}

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("Shutdown requested", { signal });
  await runtime.stop();
  await source.close();
  await health.close();
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

start().catch((error: unknown) => {
  logger.error("Worker failed to start", { error: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
});
