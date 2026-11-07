"use client";

/**
 * "Continue with Google" button.
 *
 * Uses Supabase's signInWithOAuth to redirect to Google's consent screen,
 * then back to /auth/callback, which exchanges the code for a session and
 * ensures the profile + customer rows exist (same as a regular signup).
 *
 * The `next` path is stashed in a short-lived cookie so the callback route
 * can return the user to exactly where they started.
 */
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const GOOGLE_LOGO = (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.6 14.6 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12s4.1 9.2 9.2 9.2c5.3 0 8.8-3.5 8.8-8.5 0-.7-.1-1.2-.2-1.5H12z"
    />
  </svg>
);

export default function GoogleSigninButton({
  next = "/",
  label = "Continue with Google",
}: {
  next?: string;
  label?: string;
}) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function handleGoogle() {
    if (!origin) return;
    // Stash the return path in a cookie the callback route can read.
    document.cookie = `cc_next=${encodeURIComponent(
      next
    )}; path=/; max-age=600; SameSite=Lax`;

    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
  }

  return (
    <button
      type="button"
      onClick={handleGoogle}
      disabled={!origin}
      className="btn-outline w-full disabled:cursor-not-allowed"
    >
      {GOOGLE_LOGO}
      {label}
    </button>
  );
}