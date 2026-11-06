import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Google OAuth callback.
 *
 * Supabase redirects here after Google consents. We exchange the code for a
 * session, then make sure the profile + customer rows exist for this user —
 * exactly like a regular email/password signup — so their info shows up in
 * the admin Customers panel and on their profile page.
 *
 * The return path is stashed in a short-lived cookie by the Google button.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/auth/signin?error=google_denied", url.origin));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/auth/signin?error=missing_code", url.origin));
  }

  const supabase = await createClient();
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.user) {
    return NextResponse.redirect(
      new URL("/auth/signin?error=exchange_failed", url.origin)
    );
  }

  const user = data.user;
  const service = createServiceClient();

  // 1. Ensure the profile row exists (the auth trigger usually creates it,
  //    but be defensive — OAuth signups can race the trigger).
  const email = user.email ?? "";
  const role = email.toLowerCase() === "admin@confetticlub.shop" ? "admin" : "customer";

  const { data: existingProfile } = await service
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    await service.from("profiles").insert({ id: user.id, email, role });
  } else if (existingProfile.role !== role && role === "admin") {
    // Only escalate to admin for the known admin email.
    await service.from("profiles").update({ role }).eq("id", user.id);
  }

  // 2. Ensure the customer row exists (name from Google metadata).
  const fullName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    email.split("@")[0] ||
    "";

  const { data: existingCustomer } = await service
    .from("customers")
    .select("id")
    .eq("profiles_id", user.id)
    .maybeSingle();

  if (!existingCustomer) {
    await service.from("customers").insert({
      profiles_id: user.id,
      email,
      name: fullName,
    });
  }

  // 3. Return to where the user started (cookie set by the Google button).
  const nextRaw = req.cookies.get("cc_next")?.value;
  const next = nextRaw ? decodeURIComponent(nextRaw) : "/";
  const destination = next.startsWith("/") ? next : "/";

  const res = NextResponse.redirect(new URL(destination, url.origin));
  // Clear the cookie.
  res.cookies.set("cc_next", "", { path: "/", maxAge: 0 });
  return res;
}