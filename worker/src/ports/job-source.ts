import type { PrintJob } from "../domain/types.js";

export interface JobSource {
  connect(signal: AbortSignal): Promise<void>;
  next(signal: AbortSignal): Promise<PrintJob | null>;
  acknowledge(job: PrintJob): Promise<void>;
  reject(job: PrintJob, reason: string, retryable: boolean): Promise<void>;
  close(): Promise<void>;
}
