import { createAdminClient } from "@/lib/supabase/admin";

/** True when `profileId` is a real Supabase Auth user (not a guest profile UUID). */
export async function profileHasAuthUser(profileId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(profileId);
  return !error && !!data?.user;
}
