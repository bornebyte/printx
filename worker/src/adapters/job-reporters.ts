import type { WorkerConfig } from "../config.js";
import type { JobUpdate } from "../domain/types.js";
import type { JobReporter } from "../ports/job-reporter.js";

export class ConsoleJobReporter implements JobReporter {
  async report(update: JobUpdate): Promise<void> {
    console.info(JSON.stringify({ event: "job.updated", ...update }));
  }
}

export class HttpJobReporter implements JobReporter {
  private readonly fallback = new ConsoleJobReporter();

  constructor(private readonly config: WorkerConfig) {}

  async report(update: JobUpdate): Promise<void> {
    if (!this.config.apiBaseUrl) return this.fallback.report(update);
    const response = await fetch(new URL("/v1/workers/job-updates", this.config.apiBaseUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(this.config.apiToken ? { Authorization: `Bearer ${this.config.apiToken}` } : {}) },
      body: JSON.stringify(update),
    });
    if (!response.ok) throw new Error(`Job update returned HTTP ${response.status}`);
  }
}
