import type { WorkerConfig } from "./config.js";
import type { PrintJob, PrinterDescriptor, PrintJobStatus } from "./domain/types.js";
import type { DocumentStore, DownloadedDocument } from "./ports/document-store.js";
import type { JobReporter } from "./ports/job-reporter.js";
import type { JobSource } from "./ports/job-source.js";
import type { JobStateStore } from "./ports/job-state-store.js";
import type { PrinterAdapter } from "./ports/printer-adapter.js";
import type { Logger } from "./logger.js";

interface RuntimeDependencies {
  config: WorkerConfig;
  source: JobSource;
  documents: DocumentStore;
  printers: PrinterAdapter;
  reporter: JobReporter;
  state: JobStateStore;
  logger: Logger;
}

export class WorkerRuntime {
  private readonly controller = new AbortController();
  private readonly dependencies: RuntimeDependencies;
  private printerList: PrinterDescriptor[] = [];
  private loopPromise?: Promise<void>;
  private running = false;
  private jobsProcessed = 0;
  private jobsFailed = 0;
  private inFlight = 0;

  constructor(dependencies: RuntimeDependencies) {
    this.dependencies = dependencies;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.printerList = await this.dependencies.printers.discover();
    if (this.printerList.length === 0) throw new Error("No printers were discovered");
    await this.dependencies.source.connect(this.controller.signal);
    this.running = true;
    this.loopPromise = this.consumeJobs();
    this.dependencies.logger.info("Worker runtime started", { workerId: this.dependencies.config.workerId, printers: this.printerList.length, mode: this.dependencies.config.mode });
  }

  async stop(): Promise<void> {
    this.controller.abort();
    await this.loopPromise;
    this.running = false;
    this.dependencies.logger.info("Worker runtime stopped", { workerId: this.dependencies.config.workerId });
  }

  snapshot(): { ready: boolean; running: boolean; workerId: string; printers: number; inFlight: number; jobsProcessed: number; jobsFailed: number } {
    return { ready: this.running && this.printerList.length > 0, running: this.running, workerId: this.dependencies.config.workerId, printers: this.printerList.length, inFlight: this.inFlight, jobsProcessed: this.jobsProcessed, jobsFailed: this.jobsFailed };
  }

  private async consumeJobs(): Promise<void> {
    const tasks = new Set<Promise<void>>();
    while (!this.controller.signal.aborted) {
      if (tasks.size >= this.dependencies.config.maxConcurrency) {
        await Promise.race(tasks);
        continue;
      }

      const job = await this.dependencies.source.next(this.controller.signal);
      if (!job) break;
      const task = this.processJob(job).catch((error: unknown) => {
        this.dependencies.logger.error("Unexpected job processing error", { jobId: job.id, error: errorMessage(error) });
      });
      tasks.add(task);
      void task.then(() => tasks.delete(task), () => tasks.delete(task));
    }
    await Promise.allSettled(tasks);
  }

  private async processJob(job: PrintJob): Promise<void> {
    const existing = await this.dependencies.state.get(job.idempotencyKey);
    if (existing?.status === "completed") {
      await this.dependencies.source.acknowledge(job);
      this.dependencies.logger.info("Skipped already completed job", { jobId: job.id, trackingToken: job.trackingToken });
      return;
    }

    this.inFlight += 1;
    let document: DownloadedDocument | undefined;
    try {
      await this.update(job, "queued");
      document = await this.dependencies.documents.download(job, this.controller.signal);
      for (let attempt = 1; attempt <= this.dependencies.config.maxRetries + 1; attempt += 1) {
        const printer = await this.waitForPrinter(job);
        try {
          await this.update(job, "assigned", printer.id, attempt);
          await this.update(job, "printing", printer.id, attempt);
          await this.dependencies.printers.print(job, document.path, printer, this.controller.signal);
          await this.dependencies.state.save({ idempotencyKey: job.idempotencyKey, jobId: job.id, status: "completed", completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
          await this.update(job, "completed", printer.id, attempt);
          await this.dependencies.source.acknowledge(job);
          this.jobsProcessed += 1;
          return;
        } catch (error) {
          const retryable = attempt <= this.dependencies.config.maxRetries && !this.controller.signal.aborted;
          await this.update(job, retryable ? "retrying" : "failed", printer.id, attempt, errorMessage(error));
          if (!retryable) throw error;
          await delay(this.dependencies.config.retryBaseMs * 2 ** (attempt - 1), this.controller.signal);
        }
      }
    } catch (error) {
      this.jobsFailed += 1;
      await this.update(job, "failed", undefined, undefined, errorMessage(error));
      await this.dependencies.source.reject(job, errorMessage(error), false);
      this.dependencies.logger.error("Job failed permanently", { jobId: job.id, trackingToken: job.trackingToken, error: errorMessage(error) });
    } finally {
      this.inFlight -= 1;
      await document?.cleanup();
    }
  }

  private async waitForPrinter(job: PrintJob): Promise<PrinterDescriptor> {
    while (!this.controller.signal.aborted) {
      const candidates = job.requestedPrinterId ? this.printerList.filter((printer) => printer.id === job.requestedPrinterId) : this.printerList;
      if (candidates.length === 0) throw new Error(`Requested printer is not configured: ${job.requestedPrinterId}`);
      for (const printer of candidates) {
        const status = await this.dependencies.printers.status(printer);
        if (status.availability === "online") return printer;
      }
      await delay(250, this.controller.signal);
    }
    throw new Error("Worker is shutting down");
  }

  private async update(job: PrintJob, status: PrintJobStatus, printerId?: string, attempt?: number, message?: string): Promise<void> {
    await this.dependencies.state.save({ idempotencyKey: job.idempotencyKey, jobId: job.id, status, updatedAt: new Date().toISOString() });
    await this.dependencies.reporter.report({ jobId: job.id, trackingToken: job.trackingToken, status, workerId: this.dependencies.config.workerId, printerId, message, attempt, occurredAt: new Date().toISOString() });
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, milliseconds);
    signal.addEventListener("abort", () => { clearTimeout(timeout); resolve(); }, { once: true });
  });
}
