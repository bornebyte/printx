"use client";

import { useEffect } from "react";
import { requestId, reportClientError } from "./lib/errors";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const id = requestId();
  useEffect(() => { void reportClientError(error, { route: "app/global-error", digest: error.digest, requestId: id }); }, [error, id]);
  return <html lang="en"><body><main className="error-page"><div className="error-state"><div><span className="error-state-code">ERROR · GLOBAL_RENDER_FAILURE</span><h2>PrintX needs a refresh.</h2><p>The application could not finish loading. Request ID: {id}</p><button className="button" onClick={() => window.location.reload()}>Reload application</button></div></div></main></body></html>;
}
