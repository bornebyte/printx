import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { WorkerConfig } from "../config.js";
import type { PrintJob } from "../domain/types.js";
import type { DocumentStore, DownloadedDocument } from "../ports/document-store.js";

export class LocalDocumentStore implements DocumentStore {
  constructor(private readonly config: WorkerConfig) {}

  async download(job: PrintJob, signal: AbortSignal): Promise<DownloadedDocument> {
    await mkdir(this.config.runtimeDir, { recursive: true });
    if (job.documentPath) {
      await stat(job.documentPath);
      return { path: job.documentPath, cleanup: async () => undefined };
    }

    const destination = join(this.config.runtimeDir, `${job.id}-${safeName(job.documentName)}`);
    if (job.documentUrl) {
      const response = await fetch(job.documentUrl, { signal });
      if (!response.ok) throw new Error(`Document download returned HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      await writeFile(destination, bytes);
    } else {
      await writeFile(destination, `PrintX local demo document\n\n${job.documentName}\nTracking code: ${job.trackingToken}\n`);
    }
    return { path: destination, cleanup: async () => { await unlink(destination).catch(() => undefined); } };
  }
}

function safeName(name: string): string {
  return basename(name).replace(/[^a-z0-9._-]/gi, "-") || "document.bin";
}
