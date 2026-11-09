"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type AuthState = {
  error?: string;
  message?: string;
};

/** Sign up a new customer and create a matching profile row. */
export async function signup(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const service = createServiceClient();
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

  // Create the user UNCONFIRMED. A fake / typo'd address never receives the
  // confirmation link, so it can never become a usable account — the user is
  // stuck in a pending state until they verify a real mailbox.
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { name },
  });

  const alreadyExists =
    !!createError &&
    (createError.code === "user_already_exists" ||
      /already (registered|exists|confirmed)/i.test(createError.message));

  if (createError && !alreadyExists) {
    return { error: createError.message };
  }

  // Send (or re-send) the confirmation email. Its link lands on /auth/confirm.
  const { error: resendError } = await service.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${siteUrl}/auth/confirm` },
  });

  if (resendError) {
    return { error: friendlyAuthError(resendError) };
  }

  return {
    message: alreadyExists
      ? "We re-sent your confirmation link — check your inbox (or sign in if you've already confirmed)."
      : "One more step — check your inbox and click the confirmation link to activate your account.",
  };
}

function friendlyAuthError(err: { message?: string; code?: string }): string {
  const m = (err.message || "").toLowerCase();
  if (err.code === "over_email_send_rate_limit" || m.includes("rate limit")) {
    return "We just sent an email — please wait a few minutes and try again.";
  }
  if (m.includes("invalid") || m.includes("not a valid")) {
    return "That email address doesn't look valid. Check for typos and try again.";
  }
  if (m.includes("already confirmed") || m.includes("already confirmed")) {
    return "That email is already confirmed — sign in to continue.";
  }
  return err.message || "We couldn't send the confirmation email.";
}

/** Sign in with email + password. */
export async function signin(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();

  const { data: signedIn, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !signedIn.user) {
    const code = (error as any)?.code;
    if (code === "email_not_confirmed" || /not confirmed/i.test(error?.message || "")) {
      return {
        error: "That email isn't confirmed yet. Check your inbox (and spam) for the confirmation link.",
      };
    }
    return { error: error?.message ?? "Sign-in failed." };
  }

  // With no explicit destination, send admins to the admin panel. Read the role
  // with the service client: the anon/RLS read can come back empty on this
  // freshly-minted request and would misclassify the admin as a customer.
  let destination = next.startsWith("/") ? next : "/";
  if (destination === "/") {
    const service = createServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("role")
      .eq("id", signedIn.user.id)
      .maybeSingle();
    if (profile?.role === "admin") {
      destination = "/admin";
    }
  }

  revalidatePath("/", "layout");
  redirect(destination);
}

/** Sign out the current user. */
export async function signout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth/signin");
}

/** Send a password-reset email. */
export async function resetPassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Email is required." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.SITE_URL ?? "http://localhost:3000"}/auth/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { message: "Check your email for a password reset link." };
}
