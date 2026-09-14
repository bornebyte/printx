import { NextResponse } from "next/server";
import { requireFirebaseUser } from "../../../lib/firebase-admin";
import { AppError } from "../../../lib/errors";
import { handleApiError } from "../../../lib/server-observability";
import { getBusinessForProfile, getProfile } from "../../../lib/server-data";
import { getSupabaseAdmin } from "../../../lib/supabase";

export async function GET(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const supabase = getSupabaseAdmin();
    const profile = await getProfile(supabase, user);
    const business = await getBusinessForProfile(supabase, profile.id);
    const [printersResult, jobsResult, metricsResult, membersResult] = await Promise.all([
      supabase.from("printers").select("id, name, model, status, jobs_today, toner_percent").eq("business_id", business.id).order("created_at"),
      supabase.from("print_jobs").select("id, tracking_token, document_name, page_count, color_mode, status, created_at, customer_profile_id, printers(name)").eq("business_id", business.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("business_daily_metrics").select("metric_date, jobs_count, revenue_cents, average_wait_minutes, uptime_percent").eq("business_id", business.id).order("metric_date", { ascending: true }).limit(30),
      supabase.from("business_members").select("profile_id, role, status").eq("business_id", business.id).order("created_at"),
    ]);
    if (printersResult.error) throw new AppError("SUPABASE_QUERY_FAILED", printersResult.error.message, 500, { table: "printers" });
    if (jobsResult.error) throw new AppError("SUPABASE_QUERY_FAILED", jobsResult.error.message, 500, { table: "print_jobs" });
    if (metricsResult.error) throw new AppError("SUPABASE_QUERY_FAILED", metricsResult.error.message, 500, { table: "business_daily_metrics" });
    if (membersResult.error) throw new AppError("SUPABASE_QUERY_FAILED", membersResult.error.message, 500, { table: "business_members" });

    const memberProfileIds = (membersResult.data ?? []).map((member) => member.profile_id);
    const customerProfileIds = (jobsResult.data ?? []).map((job) => job.customer_profile_id).filter((id): id is string => Boolean(id));
    const profileIds = [...new Set([...memberProfileIds, ...customerProfileIds])];
    const memberProfiles = profileIds.length ? await supabase.from("profiles").select("id, display_name").in("id", profileIds) : { data: [], error: null };
    if (memberProfiles.error) throw new AppError("SUPABASE_QUERY_FAILED", memberProfiles.error.message, 500, { table: "profiles" });
    const names = new Map((memberProfiles.data ?? []).map((member) => [member.id, member.display_name ?? "Team member"]));
    const metrics = metricsResult.data ?? [];
    const latest = metrics.at(-1);
    const revenueCents = metrics.reduce((sum, metric) => sum + (metric.revenue_cents ?? 0), 0);
    const jobsToday = latest?.jobs_count ?? 0;
    const jobs = (jobsResult.data ?? []).map((job) => {
      const printer = Array.isArray(job.printers) ? job.printers[0] : job.printers;
      const status = job.status === "completed" ? "Completed" : job.status === "printing" ? "Printing" : job.status === "failed" ? "Failed" : "Queued";
      return { id: job.id, token: job.tracking_token, document: job.document_name, pages: `${job.page_count} pages · ${job.color_mode === "black-and-white" ? "B&W" : "Color"}`, printer: printer?.name ?? "Auto routing", customer: job.customer_profile_id ? names.get(job.customer_profile_id) ?? "Print customer" : "Print customer", status, statusClass: status.toLowerCase(), time: status === "Completed" ? new Date(job.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : status === "Printing" ? "Active" : "Waiting" };
    });
    return NextResponse.json({ profile: { displayName: profile.display_name ?? user.name ?? "Business administrator", email: profile.email }, business: { id: business.id, name: business.name, code: business.code, address: business.address, queuePaused: business.queue_paused }, metrics: { jobsToday, revenueCents, averageWaitMinutes: latest?.average_wait_minutes ?? 0, uptimePercent: latest?.uptime_percent ?? 0, revenueSeries: metrics.map((metric) => ({ date: metric.metric_date, revenueCents: metric.revenue_cents ?? 0 })) }, jobs, printers: (printersResult.data ?? []).map((printer, index) => ({ id: printer.id, name: printer.name, model: printer.model, status: printer.status === "busy" ? "Printing" : printer.status === "offline" ? "Offline" : "Online", jobsToday: printer.jobs_today ?? 0, tonerPercent: printer.toner_percent ?? 0, tone: ["green", "blue", "purple"][index % 3] })), team: (membersResult.data ?? []).map((member, index) => { const name = names.get(member.profile_id) ?? "Team member"; return { id: member.profile_id, name, role: member.role, status: member.status, initials: name.split(" ").map((part: string) => part[0]).join("").slice(0, 2).toUpperCase(), tone: ["green-avatar", "gold-avatar", "purple-avatar"][index % 3] }; }) });
  } catch (error) {
    return handleApiError(error, request, "/api/dashboard/business");
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const body = await request.json() as { queuePaused?: boolean };
    if (typeof body.queuePaused !== "boolean") throw new AppError("API_REQUEST_FAILED", "queuePaused must be a boolean.", 400);
    const supabase = getSupabaseAdmin();
    const profile = await getProfile(supabase, user);
    const business = await getBusinessForProfile(supabase, profile.id);
    const result = await supabase.from("businesses").update({ queue_paused: body.queuePaused }).eq("id", business.id).select("queue_paused").single();
    if (result.error) throw new AppError("SUPABASE_WRITE_FAILED", result.error.message, 500, { table: "businesses" });
    return NextResponse.json({ queuePaused: result.data.queue_paused });
  } catch (error) {
    return handleApiError(error, request, "/api/dashboard/business");
  }
}
