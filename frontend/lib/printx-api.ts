import type { AuthSession } from "@/lib/firebase-auth";

export type PrinterShop = {
  id: string;
  code: string;
  name: string;
  owner: string;
  address: string;
  status: "Available" | "Busy";
  eta: string;
  price: string;
  currency: string;
  rating: string;
  type: string;
  color: boolean;
  pages: string;
  initials: string;
  accent: string;
};

export type PrintJob = {
  id: string;
  printerId: string;
  printerCode: string;
  printerName: string;
  fileName: string;
  copies: number;
  doubleSided: boolean;
  status: "queued" | "processing" | "ready" | "failed" | "cancelled";
  createdAt: string;
  updatedAt: string;
};

export type OwnerPrinterInput = {
  name: string;
  address: string;
  type: string;
  color: boolean;
  price: string;
  currency: string;
};

const apiUrl = process.env.NEXT_API_URL?.trim().replace(/\/$/, "") ?? "";

async function apiRequest<T>(path: string, session: AuthSession, init: RequestInit = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.idToken}`,
      ...(init.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "PrintX API request failed.");
  return data;
}

export async function getSavedPrinters(session: AuthSession) {
  const data = await apiRequest<{ printers: PrinterShop[] }>("/api/me/printers", session);
  return data.printers;
}

export async function saveProfile(session: AuthSession) {
  await apiRequest<{ profile: { role: AuthSession["role"] } }>("/api/me/profile", session, {
    method: "PUT",
    body: JSON.stringify({ role: session.role }),
  });
}

export async function addSavedPrinter(session: AuthSession, code: string) {
  const data = await apiRequest<{ printer: PrinterShop }>("/api/me/printers", session, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  return data.printer;
}

export async function removeSavedPrinter(session: AuthSession, printerId: string) {
  await apiRequest<Record<string, never>>(`/api/me/printers/${encodeURIComponent(printerId)}`, session, { method: "DELETE" });
}

export async function createPrintJob(session: AuthSession, input: { printerId: string; fileName: string; copies: number; doubleSided: boolean; document: { base64: string; contentType: string; size: number } }) {
  const data = await apiRequest<{ job: PrintJob }>("/api/print-jobs", session, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.job;
}

export async function getPrintJobs(session: AuthSession) {
  const data = await apiRequest<{ jobs: PrintJob[] }>("/api/print-jobs", session);
  return data.jobs;
}

export async function getOwnerPrinters(session: AuthSession) {
  const data = await apiRequest<{ printers: PrinterShop[] }>("/api/owner/printers", session);
  return data.printers;
}

export async function registerOwnerPrinter(session: AuthSession, input: OwnerPrinterInput) {
  const data = await apiRequest<{ printer: PrinterShop }>("/api/owner/printers", session, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.printer;
}

export async function createOwnerAgentToken(session: AuthSession, printerId: string) {
  const data = await apiRequest<{ agent: { id: string; printerId: string }; agentToken: string; printer: { id: string; code: string; name: string } }>(`/api/owner/printers/${encodeURIComponent(printerId)}/agent-token`, session, {
    method: "POST",
  });
  return data;
}
