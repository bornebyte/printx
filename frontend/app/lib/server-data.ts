import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "./errors";
import type { requireFirebaseUser } from "./firebase-admin";

type FirebaseUser = Awaited<ReturnType<typeof requireFirebaseUser>>;

export async function getProfile(supabase: SupabaseClient, user: FirebaseUser) {
  const result = await supabase.from("profiles").select("id, firebase_uid, email, display_name").eq("firebase_uid", user.uid).maybeSingle();
  if (result.error) throw new AppError("SUPABASE_QUERY_FAILED", result.error.message, 500, { table: "profiles" });
  if (!result.data) throw new AppError("PROFILE_NOT_FOUND", "Your profile is not ready yet. Sign out and sign in again to finish setup.", 404);
  return result.data;
}

export async function getBusinessForProfile(supabase: SupabaseClient, profileId: string) {
  const membership = await supabase.from("business_members").select("business_id, role, status").eq("profile_id", profileId).eq("status", "active").limit(1).maybeSingle();
  if (membership.error) throw new AppError("SUPABASE_QUERY_FAILED", membership.error.message, 500, { table: "business_members" });
  if (!membership.data) throw new AppError("BUSINESS_ACCESS_REQUIRED", "This account is not connected to a business workspace yet.", 403);
  const business = await supabase.from("businesses").select("id, name, code, address, queue_paused").eq("id", membership.data.business_id).single();
  if (business.error || !business.data) throw new AppError("SUPABASE_QUERY_FAILED", business.error?.message ?? "Business record not found.", 500, { table: "businesses" });
  return { ...business.data, role: membership.data.role };
}
