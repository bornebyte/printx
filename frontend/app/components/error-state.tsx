"use client";

import type { ErrorPayload } from "../lib/errors";
import Link from "next/link";
import { Icon } from "./printx-ui";

export function ErrorState({ error, onRetry, compact = false }: { error: ErrorPayload; onRetry?: () => void; compact?: boolean }) {
  return <section className={`error-state ${compact ? "compact" : ""}`} role="alert"><span className="error-state-icon"><Icon name="x" size={18} /></span><div><span className="error-state-code">ERROR · {error.errorCode}</span><h2>{compact ? "Data could not be loaded" : "We hit a temporary problem."}</h2><p>{error.message}</p><small>Request ID: {error.requestId}</small><div className="error-actions">{onRetry && <button className="button error-retry" onClick={onRetry}>Try again <Icon name="arrow" size={15} /></button>}{error.errorCode === "AUTH_REQUIRED" && <Link className="button error-retry" href="/auth">Sign in again <Icon name="arrow" size={15} /></Link>}</div></div></section>;
}

export function LoadingState({ label = "Loading workspace data..." }: { label?: string }) {
  return <section className="loading-state" aria-live="polite"><span className="loading-spinner" /><span>{label}</span></section>;
}
