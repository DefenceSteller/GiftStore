"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signin, type AuthState } from "../actions";
import GoogleSigninButton from "@/components/auth/GoogleSigninButton";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="btn-primary mt-6 w-full"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

const initialState: AuthState = {};

export default function SignInPage() {
  // useSearchParams requires a Suspense boundary when the route is prerendered.
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const [state, formAction] = useActionState(signin, initialState);
  // Where the visitor came from (the sign-in popout passes the current page),
  // so signing in drops them back exactly where they were.
  const next = useSearchParams().get("next") ?? "/";

  return (
    <form
      action={formAction}
      className="animate-pop rounded-[28px] border-2 border-ink bg-white p-7 shadow-sticker"
    >
      <input type="hidden" name="next" value={next} />

      <span className="sticker -rotate-3 bg-acid text-ink">✦ Welcome back</span>

      <div className="mt-5 grid h-16 w-16 place-items-center rounded-2xl border-2 border-ink bg-iris text-3xl shadow-sticker-sm">
        🔐
      </div>

      <h1 className="mt-5 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
        Welcome back to the <span className="text-gradient">party</span>
      </h1>
      <p className="mt-2 text-sm font-medium leading-relaxed text-ink/60">
        Your bag, your orders, your world — sign in to pick up right where you
        left off.
      </p>

      {state.error && (
        <div
          role="alert"
          className="mt-5 rounded-2xl border-2 border-coral bg-coral/10 px-4 py-3 text-sm font-bold text-coral"
        >
          {state.error}
        </div>
      )}

      <div className="mt-6 grid gap-4">
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="input placeholder:font-medium placeholder:text-ink/35"
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className="label">
              Password
            </label>
            <Link
              href="/auth/reset-password"
              className="text-[13px] font-extrabold text-iris underline-iris transition hover:text-ink"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            name="password"
            required
            autoComplete="current-password"
            placeholder="Enter your password"
            className="input placeholder:font-medium placeholder:text-ink/35"
          />
        </div>
      </div>

      <SubmitButton />

      {/* Divider */}
      <div className="mt-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-ink/10" />
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-ink/35">
          or
        </span>
        <span className="h-px flex-1 bg-ink/10" />
      </div>

      <div className="mt-5">
        <GoogleSigninButton next={next} label="Continue with Google" />
      </div>

      <p className="mt-6 text-center text-sm font-bold text-ink/50">
        New to Confetti Club?{" "}
        <Link
          href="/auth/signup"
          className="text-iris underline transition hover:text-ink"
        >
          Create account
        </Link>
      </p>
    </form>
  );
}
