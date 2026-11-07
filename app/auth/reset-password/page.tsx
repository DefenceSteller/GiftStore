"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { resetPassword, type AuthState } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="btn-primary mt-6 w-full"
    >
      {pending ? "Sending…" : "Send reset link"}
    </button>
  );
}

const initialState: AuthState = {};

export default function ResetPasswordPage() {
  const [state, formAction] = useActionState(resetPassword, initialState);

  return (
    <form
      action={formAction}
      className="animate-pop rounded-[28px] border-2 border-ink bg-white p-7 shadow-sticker"
    >
      <span className="sticker -rotate-3 bg-iris text-white">
        ✦ Password rescue
      </span>

      <div className="mt-5 grid h-16 w-16 place-items-center rounded-2xl border-2 border-ink bg-butter text-3xl shadow-sticker-sm">
        💌
      </div>

      <h1 className="mt-5 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
        Reset your <span className="text-gradient">password</span>
      </h1>
      <p className="mt-2 text-sm font-medium leading-relaxed text-ink/60">
        Pop in your email and we&apos;ll send you a link to set a new one.
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

      <div className="mt-6">
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

      <SubmitButton />

      <p className="mt-6 text-center text-sm font-bold text-ink/50">
        <Link
          href="/auth/signin"
          className="text-iris underline transition hover:text-ink"
        >
          ← Back to sign in
        </Link>
      </p>
    </form>
  );
}
