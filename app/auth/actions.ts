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

  // Create the user via the admin API. The client-keyed `auth.signUp` has been
  // failing at the DB step ("Database error saving new user"); the admin API
  // uses the same underlying DB write but is the path we've verified works.
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (createError) {
    return { error: createError.message };
  }

  const userId = created?.user?.id;
  if (userId) {
    const { error: profileError } = await service.from("profiles").insert({
      id: userId,
      email,
      role: "customer",
    });
    if (profileError && profileError.code !== "23505") {
      return { error: `Account created, but profile setup failed: ${profileError.message}` };
    }
  }

  revalidatePath("/", "layout");
  return {
    message: "Your account is ready — sign in and your bag is waiting.",
  };
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

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/");
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
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { message: "Check your email for a password reset link." };
}
