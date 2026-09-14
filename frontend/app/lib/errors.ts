export type ErrorCode =
  | "AUTH_REQUIRED"
  | "AUTHENTICATION_FAILED"
  | "PASSWORD_RESET_FAILED"
  | "FIREBASE_NOT_CONFIGURED"
  | "FIREBASE_ADMIN_NOT_CONFIGURED"
  | "SUPABASE_NOT_CONFIGURED"
  | "SUPABASE_SCHEMA_NOT_READY"
  | "SUPABASE_QUERY_FAILED"
  | "SUPABASE_WRITE_FAILED"
  | "BUSINESS_ACCESS_REQUIRED"
  | "PROFILE_NOT_FOUND"
  | "API_REQUEST_FAILED"
  | "OBSERVABILITY_UNAVAILABLE"
  | "UNKNOWN_ERROR";

export interface ErrorPayload {
  errorCode: ErrorCode;
  message: string;
  requestId: string;
}

const errorCodes: ErrorCode[] = ["AUTH_REQUIRED", "AUTHENTICATION_FAILED", "PASSWORD_RESET_FAILED", "FIREBASE_NOT_CONFIGURED", "FIREBASE_ADMIN_NOT_CONFIGURED", "SUPABASE_NOT_CONFIGURED", "SUPABASE_SCHEMA_NOT_READY", "SUPABASE_QUERY_FAILED", "SUPABASE_WRITE_FAILED", "BUSINESS_ACCESS_REQUIRED", "PROFILE_NOT_FOUND", "API_REQUEST_FAILED", "OBSERVABILITY_UNAVAILABLE", "UNKNOWN_ERROR"];

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && errorCodes.includes(value as ErrorCode);
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, status = 500, details?: Record<string, unknown>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function requestId(): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 12) : Math.random().toString(36).slice(2, 14);
  return `px-${Date.now().toString(36)}-${random}`;
}

export function errorPayload(error: unknown, id = requestId()): ErrorPayload {
  if (error instanceof AppError) return { errorCode: error.code, message: error.message, requestId: id };
  return { errorCode: "UNKNOWN_ERROR", message: "Something went wrong. Please try again.", requestId: id };
}

export async function reportClientError(error: unknown, context: Record<string, unknown> = {}): Promise<void> {
  const id = typeof context.requestId === "string" ? context.requestId : requestId();
  const payload = errorPayload(error, id);
  console.error(JSON.stringify({ source: "browser", ...payload, context, error: error instanceof Error ? error.stack : String(error) }));
  try {
    await fetch("/api/errors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, context, stack: error instanceof Error ? error.stack : undefined }) });
  } catch {
    // Error reporting must never create a second user-facing failure.
  }
}
