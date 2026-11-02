import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

/**
 * Server-side auth guard for all /admin routes.
 * proxy.ts already blocks unauthenticated + non-admin at the edge; this is
 * defense-in-depth so admin data is never rendered without a verified session.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) redirect("/auth/signin?next=/admin");
  if (user.role !== "admin") redirect("/");

  return <>{children}</>;
}
