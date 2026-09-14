import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { requireFirebaseUser } from "../../../lib/firebase-admin";
import { AppError } from "../../../lib/errors";
import { handleApiError } from "../../../lib/server-observability";
import { getSupabaseAdmin, supabaseTableError } from "../../../lib/supabase";

export async function POST(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const body = await request.json().catch(() => ({})) as { accountType?: "personal" | "business"; name?: string };
    const supabase = getSupabaseAdmin();
    const profileResult = await supabase.from("profiles").upsert({ firebase_uid: user.uid, email: user.email ?? null, display_name: body.name?.trim() || user.name || user.email?.split("@")[0] || "PrintX member" }, { onConflict: "firebase_uid" }).select("id, display_name, email").single();
    if (profileResult.error || !profileResult.data) throw supabaseTableError(profileResult.error, "profiles", "write", "Profile could not be saved.");

    if (body.accountType === "business") {
      const existing = await supabase.from("business_members").select("business_id").eq("profile_id", profileResult.data.id).limit(1).maybeSingle();
      if (existing.error) throw supabaseTableError(existing.error, "business_members", "read", "Business membership could not be loaded.");
      if (!existing.data) {
        let business: { id: string } | null = null;
        for (let attempt = 0; attempt < 5 && !business; attempt += 1) {
          const code = createBusinessCode();
          const inserted = await supabase.from("businesses").insert({ code, name: `${profileResult.data.display_name} Business`, address: "Add your business address", created_by: profileResult.data.id }).select("id").single();
          if (!inserted.error && inserted.data) business = inserted.data;
          else if (inserted.error?.code !== "23505") throw supabaseTableError(inserted.error, "businesses", "write", "Business could not be created.");
        }
        if (!business) throw new AppError("SUPABASE_WRITE_FAILED", "A unique business code could not be generated. Please try again.", 500);
        const membership = await supabase.from("business_members").insert({ business_id: business.id, profile_id: profileResult.data.id, role: "administrator", status: "active" });
        if (membership.error) throw supabaseTableError(membership.error, "business_members", "write", "Business membership could not be created.");
      }
    }
    return NextResponse.json({ profile: profileResult.data });
  } catch (error) {
    return handleApiError(error, request, "/api/profile/sync");
  }
}

function createBusinessCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[randomInt(0, alphabet.length)]).join("");
}
