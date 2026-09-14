import { AppError, errorPayload, requestId } from "./errors";
import { getSupabaseAdmin } from "./supabase";

export async function handleApiError(error: unknown, request: Request, route: string): Promise<Response> {
  const id = requestId();
  const payload = errorPayload(error, id);
  const details = error instanceof AppError ? error.details : undefined;
  console.error(JSON.stringify({ source: "server", route, ...payload, details, stack: error instanceof Error ? error.stack : String(error) }));
  await persistError({ request, route, payload, stack: error instanceof Error ? error.stack : String(error), details });
  return Response.json(payload, { status: error instanceof AppError ? error.status : 500 });
}

export async function persistError(input: { request: Request; route: string; payload: ReturnType<typeof errorPayload>; stack?: string; details?: Record<string, unknown> }): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("error_events").insert({ request_id: input.payload.requestId, error_code: input.payload.errorCode, message: input.payload.message, stack: input.stack, route: input.route, user_agent: input.request.headers.get("user-agent"), metadata: input.details ?? {} });
  } catch (persistFailure) {
    console.error(JSON.stringify({ source: "server", errorCode: "OBSERVABILITY_UNAVAILABLE", requestId: input.payload.requestId, error: persistFailure instanceof Error ? persistFailure.message : String(persistFailure) }));
  }
}
