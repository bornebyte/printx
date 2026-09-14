import type { JobSource } from "../ports/job-source.js";
import type { PrintJob } from "../domain/types.js";
import { AsyncQueue } from "./async-queue.js";

export class InMemoryJobSource implements JobSource {
  private readonly queue = new AsyncQueue<PrintJob>();
  private seeded = false;

  async connect(): Promise<void> {
    if (this.seeded) return;
    this.seeded = true;
    this.queue.push({
      id: "demo-job-001",
      idempotencyKey: "demo-job-001-v1",
      businessId: "business-local",
      trackingToken: "A7K2",
      documentName: "demo-document.txt",
      settings: { colorMode: "black-and-white", copies: 1, sides: "single-sided", paperSize: "A4" },
      createdAt: new Date().toISOString(),
    });
  }

  next(signal: AbortSignal): Promise<PrintJob | null> {
    return this.queue.next(signal);
  }

  async acknowledge(job: PrintJob): Promise<void> {
    console.info(`[job ${job.trackingToken}] acknowledged by local source`);
  }

  async reject(job: PrintJob, reason: string, retryable: boolean): Promise<void> {
    console.warn(`[job ${job.trackingToken}] ${retryable ? "scheduled for retry" : "rejected"}: ${reason}`);
  }

  async close(): Promise<void> {
    this.queue.close();
  }
}
