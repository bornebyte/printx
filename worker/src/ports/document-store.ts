import type { PrintJob } from "../domain/types.js";

export interface DownloadedDocument {
  path: string;
  cleanup: () => Promise<void>;
}

export interface DocumentStore {
  download(job: PrintJob, signal: AbortSignal): Promise<DownloadedDocument>;
}
