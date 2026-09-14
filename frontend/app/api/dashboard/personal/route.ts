import { NextResponse } from "next/server";
import { requireFirebaseUser } from "../../../lib/firebase-admin";
import { AppError } from "../../../lib/errors";
import { handleApiError } from "../../../lib/server-observability";
import { getProfile } from "../../../lib/server-data";
import { getSupabaseAdmin } from "../../../lib/supabase";

export async function GET(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const supabase = getSupabaseAdmin();
    const profile = await getProfile(supabase, user);
    const [jobsResult, locationsResult] = await Promise.all([
      supabase.from("print_jobs").select("id, tracking_token, document_name, status, created_at, businesses(name)").eq("customer_profile_id", profile.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("saved_locations").select("id, name, address, business_code, is_open").eq("profile_id", profile.id).order("created_at", { ascending: false }).limit(10),
    ]);
    if (jobsResult.error) throw new AppError("SUPABASE_QUERY_FAILED", jobsResult.error.message, 500, { table: "print_jobs" });
    if (locationsResult.error) throw new AppError("SUPABASE_QUERY_FAILED", locationsResult.error.message, 500, { table: "saved_locations" });
    const jobs = (jobsResult.data ?? []).map((job) => {
      const business = Array.isArray(job.businesses) ? job.businesses[0] : job.businesses;
      return { id: job.id, token: job.tracking_token, document: job.document_name, location: business?.name ?? "PrintX location", date: new Date(job.created_at).toLocaleString(), status: job.status === "completed" ? "Completed" : job.status === "failed" ? "Failed" : job.status === "printing" ? "Printing" : "Queued", statusClass: job.status === "completed" ? "completed" : job.status === "failed" ? "failed" : "ready" };
    });
    const activeJobs = jobs.filter((job) => ["Queued", "Printing"].includes(job.status)).length;
    const completedJobs = jobs.filter((job) => job.status === "Completed").length;
    return NextResponse.json({ profile: { displayName: profile.display_name ?? user.name ?? "PrintX member", email: profile.email }, metrics: { activeJobs, completedJobs, savedLocations: locationsResult.data?.length ?? 0 }, jobs, locations: (locationsResult.data ?? []).map((location) => ({ id: location.id, name: location.name, address: location.address, code: location.business_code, isOpen: location.is_open })) });
  } catch (error) {
    return handleApiError(error, request, "/api/dashboard/personal");
  }
}
