import type { WorkerConfig } from "../config.js";
import type { PrintJob } from "../domain/types.js";
import type { JobSource } from "../ports/job-source.js";
import { AsyncQueue } from "./async-queue.js";

export class SseJobSource implements JobSource {
  private readonly queue = new AsyncQueue<PrintJob>();
  private readonly controller = new AbortController();
  private readonly config: WorkerConfig;
  private streamPromise?: Promise<void>;

  constructor(config: WorkerConfig) {
    this.config = config;
  }

  async connect(signal: AbortSignal): Promise<void> {
    if (!this.config.eventStreamUrl) throw new Error("WORKER_EVENT_STREAM_URL is required for the connected source");
    signal.addEventListener("abort", () => this.controller.abort(), { once: true });
    this.streamPromise = this.consumeWithReconnect();
  }

  next(signal: AbortSignal): Promise<PrintJob | null> {
    return this.queue.next(signal);
  }

  async acknowledge(job: PrintJob): Promise<void> {
    await this.post(`/v1/workers/jobs/${encodeURIComponent(job.id)}/ack`, { trackingToken: job.trackingToken });
  }

  async reject(job: PrintJob, reason: string, retryable: boolean): Promise<void> {
    await this.post(`/v1/workers/jobs/${encodeURIComponent(job.id)}/reject`, { reason, retryable });
  }

  async close(): Promise<void> {
    this.controller.abort();
    this.queue.close();
    await this.streamPromise;
  }

  private async consumeWithReconnect(): Promise<void> {
    while (!this.controller.signal.aborted) {
      try {
        await this.consumeStream();
      } catch (error) {
        if (!this.controller.signal.aborted) console.error("Event stream disconnected", error);
      }
      if (!this.controller.signal.aborted) await delay(1000, this.controller.signal);
    }
  }

  private async consumeStream(): Promise<void> {
    const response = await fetch(this.config.eventStreamUrl as string, {
      headers: this.headers({ Accept: "text/event-stream" }),
      signal: this.controller.signal,
    });
    if (!response.ok || !response.body) throw new Error(`Event stream returned HTTP ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (!this.controller.signal.aborted) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? "";
      for (const event of events) this.handleEvent(event);
    }
  }

  private handleEvent(event: string): void {
    const data = event.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
    if (!data) return;
    try {
      const payload = JSON.parse(data) as { job?: PrintJob; data?: PrintJob };
      const job = payload.job ?? payload.data ?? payload as unknown as PrintJob;
      if (job.id && job.trackingToken) this.queue.push(job);
    } catch (error) {
      console.error("Ignoring malformed job event", error);
    }
  }

  private async post(path: string, body: unknown): Promise<void> {
    if (!this.config.apiBaseUrl) return;
    const response = await fetch(new URL(path, this.config.apiBaseUrl), { method: "POST", headers: this.headers({ "Content-Type": "application/json" }), body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Job acknowledgement returned HTTP ${response.status}`);
  }

  private headers(extra: Record<string, string>): Record<string, string> {
    return { ...extra, ...(this.config.apiToken ? { Authorization: `Bearer ${this.config.apiToken}` } : {}) };
  }
}

function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, milliseconds);
    signal.addEventListener("abort", () => { clearTimeout(timeout); resolve(); }, { once: true });
  });
}
