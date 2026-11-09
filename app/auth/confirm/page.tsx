"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Status = "working" | "ok" | "error";

export default function ConfirmPage() {
  const [status, setStatus] = useState<Status>("working");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    // Supabase lands here with tokens in the URL hash (implicit flow).
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    const code = query.get("code");
    const token_hash = query.get("token_hash") || query.get("token");
    const type = (hash.get("type") || query.get("type") || "email") as
      | "email"
      | "signup"
      | "invite"
      | "magiclink"
      | "recovery";

    (async () => {
      try {
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (token_hash) {
          const { error } = await supabase.auth.verifyOtp({ type, token_hash });
          if (error) throw error;
        } else {
          throw new Error("We couldn't find a verification link in this URL.");
        }

        if (mounted) {
          setStatus("ok");
          // Hard reload so the server reads the freshly-set session cookie.
          window.location.replace("/");
        }
      } catch (e: any) {
        if (!mounted) return;
        const m = (e?.message || "").toLowerCase();
        let friendly = "That link didn't work. It may have expired or already been used.";
        if (m.includes("expired")) friendly = "That link has expired. Sign up again to get a new one.";
        else if (m.includes("already") || m.includes("used")) friendly = "That link has already been used.";
        else if (m.includes("not found") || m.includes("invalid")) friendly = "That link isn't valid.";
        setMessage(friendly);
        setStatus("error");
      }
    })();

    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-mist flex flex-col">
      <main className="flex-1 container-cc py-16 flex items-center justify-center">
        <div className="mx-auto max-w-md w-full rounded-[36px] border-2 border-ink bg-white p-8 sm:p-10 text-center shadow-sticker">
          {status === "working" && (
            <>
              <span className="inline-grid h-20 w-20 place-items-center rounded-3xl border-2 border-ink bg-iris text-4xl shadow-sticker-sm animate-bounce">
                ✉️
              </span>
              <h1 className="mt-6 font-display text-3xl font-extrabold">
                Confirming your account…
              </h1>
              <p className="mt-2 text-sm font-bold text-ink/50">
                One moment while we activate your account.
              </p>
            </>
          )}
          {status === "ok" && (
            <>
              <span className="inline-grid h-20 w-20 place-items-center rounded-3xl border-2 border-ink bg-acid text-4xl shadow-sticker-sm">
                ✅
              </span>
              <h1 className="mt-6 font-display text-3xl font-extrabold">
                Account confirmed!
              </h1>
              <p className="mt-2 text-sm font-bold text-ink/50">
                Welcome to Confetti Club — your bag is waiting.
              </p>
              <p className="mt-4 text-xs font-bold text-ink/40">
                Redirecting you home…
              </p>
            </>
          )}
          {status === "error" && (
            <>
              <span className="inline-grid h-20 w-20 place-items-center rounded-3xl border-2 border-ink bg-coral text-4xl shadow-sticker-sm">
                ⚠️
              </span>
              <h1 className="mt-6 font-display text-3xl font-extrabold">
                Link didn't work
              </h1>
              <p className="mt-2 text-sm font-bold text-ink/55">{message}</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link href="/auth/signup" className="btn-lime">
                  Sign up again
                </Link>
                <Link href="/auth/signin" className="btn-outline">
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}