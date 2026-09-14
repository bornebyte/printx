"use client";

import { useEffect, useMemo } from "react";
import { ErrorState } from "./components/error-state";
import { requestId, reportClientError } from "./lib/errors";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const id = useMemo(() => requestId(), []);
  useEffect(() => { void reportClientError(error, { route: "app/error", digest: error.digest, requestId: id }); }, [error, id]);
  return <main className="error-page"><ErrorState error={{ errorCode: "UNKNOWN_ERROR", message: "The page could not be displayed. Try again or return to the home page.", requestId: id }} onRetry={reset} /></main>;
}
