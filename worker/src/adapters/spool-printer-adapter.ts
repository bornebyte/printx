import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { WorkerConfig } from "../config.js";
import type { PrintJob, PrintResult, PrinterDescriptor, PrinterStatus } from "../domain/types.js";
import type { PrinterAdapter } from "../ports/printer-adapter.js";

export class SpoolPrinterAdapter implements PrinterAdapter {
  private readonly active = new Set<string>();

  constructor(private readonly config: WorkerConfig) {}

  async discover(): Promise<PrinterDescriptor[]> {
    return this.config.configuredPrinters;
  }

  async status(printer: PrinterDescriptor): Promise<PrinterStatus> {
    return { printer, availability: this.active.has(printer.id) ? "busy" : "online" };
  }

  async print(job: PrintJob, documentPath: string, printer: PrinterDescriptor, signal: AbortSignal): Promise<PrintResult> {
    if (signal.aborted) throw new Error("Print cancelled before submission");
    this.active.add(printer.id);
    try {
      const jobDirectory = join(this.config.spoolDir, printer.id, job.id);
      await mkdir(jobDirectory, { recursive: true });
      await copyFile(documentPath, join(jobDirectory, safeName(job.documentName)));
      await writeFile(join(jobDirectory, "job.json"), JSON.stringify({ job, printer, submittedAt: new Date().toISOString() }, null, 2));
      return { providerJobId: `${printer.id}:${job.id}` };
    } finally {
      this.active.delete(printer.id);
    }
  }
}

function safeName(name: string): string {
  return basename(name).replace(/[^a-z0-9._-]/gi, "-") || "document.bin";
}
