import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "1.5rem",
        fontFamily: "system-ui, sans-serif",
        background: "linear-gradient(135deg, #7C5CFF 0%, #5AC8FA 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "24rem",
          background: "#fff",
          borderRadius: "1rem",
          padding: "2rem",
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
        }}
      >
        <Link
          href="/"
          style={{
            display: "block",
            textAlign: "center",
            fontSize: "1.5rem",
            fontWeight: 700,
            marginBottom: "1.5rem",
            color: "#7C5CFF",
            textDecoration: "none",
          }}
        >
          🎉 Confetti Club
        </Link>
        {children}
      </div>
    </main>
  );
}
