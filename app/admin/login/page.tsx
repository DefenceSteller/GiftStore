import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AdminLoginForm from "./AdminLoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  // If already signed in as admin, go straight to the dashboard.
  const user = await getSessionUser();
  if (user?.role === "admin") {
    redirect("/admin");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8f9fa",
        fontFamily:
          "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "2rem",
          background: "#fff",
          borderRadius: "1rem",
          border: "2px solid #0D0D12",
          boxShadow: "0 4px 0 #0D0D12",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <span style={{ fontSize: "2rem", fontWeight: 800, color: "#7C5CFF" }}>
            🎀
          </span>
          <p
            style={{
              margin: "0.25rem 0 0",
              fontSize: "0.8rem",
              color: "#868e96",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Confetti Club
          </p>
        </div>
        <AdminLoginForm />
      </div>
    </div>
  );
}
