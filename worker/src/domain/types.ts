export type PrintJobStatus =
  | "queued"
  | "assigned"
  | "printing"
  | "completed"
  | "failed"
  | "retrying";

export type PrintColorMode = "color" | "black-and-white";
export type PrintSides = "single-sided" | "double-sided";

export interface PrintSettings {
  colorMode: PrintColorMode;
  copies: number;
  pageRange?: string;
  orientation?: "portrait" | "landscape";
  sides: PrintSides;
  paperSize: string;
  paperType?: string;
  scaling?: string;
  collate?: boolean;
}

export interface PrintJob {
  id: string;
  idempotencyKey: string;
  businessId: string;
  trackingToken: string;
  documentName: string;
  documentUrl?: string;
  documentPath?: string;
  requestedPrinterId?: string;
  settings: PrintSettings;
  createdAt: string;
}

export interface PrinterDescriptor {
  id: string;
  name: string;
}

export type PrinterAvailability = "online" | "busy" | "offline" | "error";

export interface PrinterStatus {
  printer: PrinterDescriptor;
  availability: PrinterAvailability;
  activeJobId?: string;
}

export interface PrintResult {
  providerJobId: string;
}

export interface JobUpdate {
  jobId: string;
  trackingToken: string;
  status: PrintJobStatus;
  workerId: string;
  printerId?: string;
  message?: string;
  attempt?: number;
  occurredAt: string;
}

export interface DurableJobState {
  idempotencyKey: string;
  jobId: string;
  status: PrintJobStatus;
  completedAt?: string;
  updatedAt: string;
}
