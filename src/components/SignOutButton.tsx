import { signout } from "../../app/auth/actions";

export default function SignOutButton() {
  return (
    <form action={signout} style={{ display: "inline" }}>
      <button
        type="submit"
        style={{
          padding: "0.5rem 1rem",
          borderRadius: "0.5rem",
          border: "1px solid #dee2e6",
          background: "#fff",
          color: "#495057",
          fontSize: "0.875rem",
          cursor: "pointer",
        }}
      >
        Sign out
      </button>
    </form>
  );
}
