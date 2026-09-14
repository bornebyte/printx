import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../lib/supabase";
import { handleApiError } from "../../lib/server-observability";

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("profiles").select("id").limit(1);
    if (error) throw new Error(error.message);
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch (error) {
    return handleApiError(error, request, "/api/health");
  }
}
