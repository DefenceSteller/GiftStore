import { createClient } from "@/lib/supabase/server";

export async function getSessionUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();

  if (!data.session?.user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.session.user.id)
    .maybeSingle();

  return {
    id: data.session.user.id,
    email: data.session.user.email ?? "",
    role: (profile?.role === "admin" ? "admin" : "customer") as "customer" | "admin",
  };
}