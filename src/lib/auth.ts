import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function getSessionUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();

  if (!data.session?.user) {
    console.log("[getSessionUser] no session user");
    return null;
  }

  // Read the role via the service client so it is immune to RLS/request races:
  // the anon read can return no row on the request right after sign-in, which
  // made the layout's initialUser report role "customer" for admins.
  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("id", data.session.user.id)
    .maybeSingle();

  const role = profile?.role === "admin" ? "admin" : "customer";
  return {
    id: data.session.user.id,
    email: data.session.user.email ?? "",
    role: role as "admin" | "customer",
  };
}