"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { signup, type AuthState } from "../actions";

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
      {pending ? "Creating account…" : "Create account"}
    </button>
  );
}

const initialState: AuthState = {};

export default function SignUpPage() {
  const [state, formAction] = useFormState(signup, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.25rem", color: "#1a1a2e" }}>
        Join Confetti Club
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

      {state.message && (
        <p
          style={{
            margin: 0,
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            background: "#d3f9d8",
            color: "#2b8a3e",
            fontSize: "0.875rem",
          }}
        >
          {state.message}
        </p>
      )}

      <label style={{ display: "grid", gap: "0.25rem", fontSize: "0.875rem", color: "#495057" }}>
        Name
        <input
          type="text"
          name="name"
          required
          autoComplete="name"
          style={{
            padding: "0.625rem",
            borderRadius: "0.5rem",
            border: "1px solid #dee2e6",
            fontSize: "1rem",
          }}
        />
      </label>

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
          minLength={8}
          autoComplete="new-password"
          style={{
            padding: "0.625rem",
            borderRadius: "0.5rem",
            border: "1px solid #dee2e6",
            fontSize: "1rem",
          }}
        />
      </label>

      <SubmitButton />

      <p style={{ margin: 0, fontSize: "0.875rem", textAlign: "center", color: "#495057" }}>
        Already have an account?{" "}
        <Link href="/auth/signin" style={{ color: "#7C5CFF" }}>
          Sign in
        </Link>
      </p>
    </form>
  );
}
