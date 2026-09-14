import type { PrintJob, PrintResult, PrinterDescriptor, PrinterStatus } from "../domain/types.js";

export interface PrinterAdapter {
  discover(): Promise<PrinterDescriptor[]>;
  status(printer: PrinterDescriptor): Promise<PrinterStatus>;
  print(job: PrintJob, documentPath: string, printer: PrinterDescriptor, signal: AbortSignal): Promise<PrintResult>;
}
