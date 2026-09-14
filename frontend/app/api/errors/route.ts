import { NextResponse } from "next/server";
import { errorPayload, requestId } from "../../lib/errors";
import { persistError } from "../../lib/server-observability";

export async function POST(request: Request) {
  const id = requestId();
  try {
    const body = await request.json() as { errorCode?: string; message?: string; stack?: string; context?: Record<string, unknown> };
    await persistError({ request, route: typeof body.context?.route === "string" ? body.context.route : "browser", payload: { errorCode: (body.errorCode as ReturnType<typeof errorPayload>["errorCode"]) ?? "UNKNOWN_ERROR", message: body.message ?? "Client error", requestId: id }, stack: body.stack, details: body.context });
    return NextResponse.json({ ok: true, requestId: id });
  } catch (error) {
    console.error(JSON.stringify({ source: "server", errorCode: "OBSERVABILITY_UNAVAILABLE", requestId: id, error: error instanceof Error ? error.message : String(error) }));
    return NextResponse.json({ ok: false, errorCode: "OBSERVABILITY_UNAVAILABLE", requestId: id }, { status: 202 });
  }
}
