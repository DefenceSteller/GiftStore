"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { signin, type AuthState } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        width: "100%",
        padding: "0.75rem",
        borderRadius: "0.5rem",
        border: "none",
        background: "#7C5CFF",
        color: "#fff",
        fontSize: "1rem",
        fontWeight: 600,
        cursor: pending ? "wait" : "pointer",
        opacity: pending ? 0.7 : 1,
      }}
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

const initialState: AuthState = {};

export default function SignInPage() {
  const [state, formAction] = useFormState(signin, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.25rem", color: "#1a1a2e" }}>
        Welcome back
      </h1>

      {state.error && (
        <p
          style={{
            margin: 0,
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            background: "#ffe3e3",
            color: "#c92a2a",
            fontSize: "0.875rem",
          }}
        >
          {state.error}
        </p>
      )}

      <label style={{ display: "grid", gap: "0.25rem", fontSize: "0.875rem", color: "#495057" }}>
        Email
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          style={{
            padding: "0.625rem",
            borderRadius: "0.5rem",
            border: "1px solid #dee2e6",
            fontSize: "1rem",
          }}
        />
      </label>

      <label style={{ display: "grid", gap: "0.25rem", fontSize: "0.875rem", color: "#495057" }}>
        Password
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          style={{
            padding: "0.625rem",
            borderRadius: "0.5rem",
            border: "1px solid #dee2e6",
            fontSize: "1rem",
          }}
        />
      </label>

      <SubmitButton />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.875rem",
        }}
      >
        <Link href="/auth/signup" style={{ color: "#7C5CFF" }}>
          Create account
        </Link>
        <Link href="/auth/reset-password" style={{ color: "#7C5CFF" }}>
          Forgot password?
        </Link>
      </div>
    </form>
  );
}
