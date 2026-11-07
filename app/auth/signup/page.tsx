"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signup, type AuthState } from "../actions";
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
      {pending ? "Creating account…" : "Create account"}
    </button>
  );
}

const initialState: AuthState = {};

export default function SignUpPage() {
  const [state, formAction] = useActionState(signup, initialState);

  return (
    <form
      action={formAction}
      className="animate-pop rounded-[28px] border-2 border-ink bg-white p-7 shadow-sticker"
    >
      <span className="sticker -rotate-3 bg-coral text-white">
        ✦ Join the club
      </span>

      <div className="mt-5 grid h-16 w-16 place-items-center rounded-2xl border-2 border-ink bg-acid text-3xl shadow-sticker-sm">
        🎉
      </div>

      <h1 className="mt-5 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
        Join the <span className="text-gradient">Confetti Club</span>
      </h1>
      <p className="mt-2 text-sm font-medium leading-relaxed text-ink/60">
        Orders, tracking, and a private bag that&apos;s yours from day one. Free
        to join, always.
      </p>

      {state.error && (
        <div
          role="alert"
          className="mt-5 rounded-2xl border-2 border-coral bg-coral/10 px-4 py-3 text-sm font-bold text-coral"
        >
          {state.error}
        </div>
      )}
      {state.message && (
        <div
          role="status"
          className="mt-5 rounded-2xl border-2 border-ink bg-acid px-4 py-3 text-sm font-bold text-ink"
        >
          {state.message}
        </div>
      )}

      <div className="mt-6 grid gap-4">
        <div>
          <label htmlFor="name" className="label">
            Full name
          </label>
          <input
            id="name"
            type="text"
            name="name"
            required
            autoComplete="name"
            placeholder="Jamie Sparkles"
            className="input placeholder:font-medium placeholder:text-ink/35"
          />
        </div>

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
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Create a password"
            className="input placeholder:font-medium placeholder:text-ink/35"
          />
          <p className="mt-1.5 text-[13px] font-bold text-ink/45">
            Must be at least 8 characters.
          </p>
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
        <GoogleSigninButton next="/" label="Continue with Google" />
      </div>

      <p className="mt-6 text-center text-sm font-bold text-ink/50">
        Already have an account?{" "}
        <Link
          href="/auth/signin"
          className="text-iris underline transition hover:text-ink"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
