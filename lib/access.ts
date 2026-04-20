import { supabase } from "@/lib/supabase";

export type UserRole = "admin" | "user";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getUserRoleByEmail(
  email: string,
): Promise<UserRole | null> {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const { data: admin, error: adminError } = await supabase
    .from("admins")
    .select("email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (adminError) {
    console.error("Unable to check admin access", adminError);
    return null;
  }

  if (admin) {
    return "admin";
  }

  const { data: approvedUser, error: approvedUserError } = await supabase
    .from("approved_users")
    .select("email, status")
    .eq("email", normalizedEmail)
    // Only active members can log in. Rows with status "blocked" are
    // treated as deactivated access and intentionally return no user role.
    .eq("status", "approved")
    .maybeSingle();

  if (approvedUserError) {
    console.error("Unable to check approved user access", approvedUserError);
    return null;
  }

  if (approvedUser) {
    return "user";
  }

  return null;
}
