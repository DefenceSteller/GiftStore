"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type AdminAuthState = {
  error?: string;
};

/**
 * Admin-only sign-in. Verifies the account has role=admin before letting
 * them through — regular customer accounts are rejected here so the admin
 * login page stays exclusive.
 */
export async function adminSignin(
  _prev: AdminAuthState,
  formData: FormData
): Promise<AdminAuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();

  const { data: signedIn, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !signedIn.user) {
    return { error: error?.message ?? "Sign-in failed." };
  }

  // Verify the account is actually an admin. The proxy does the same check
  // on the /admin request, but we check here too so non-admins see an error
  // instead of being bounced back to the login page.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", signedIn.user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    // Not an admin — sign them back out and reject.
    await supabase.auth.signOut();
    return { error: "This account does not have admin access." };
  }

  redirect("/admin");
}
