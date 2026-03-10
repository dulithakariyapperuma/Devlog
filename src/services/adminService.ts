/**
 * adminService.ts
 * Admin-only: delete a user's profile (cascades to remove their data).
 * Admins are identified by is_admin = true in the profiles table.
 */
import { supabase } from "@/lib/supabase";

/**
 * Delete a member's profile row.
 * Because profiles.id has ON DELETE CASCADE from auth.users,
 * we delete the profile which removes all their data.
 * The auth entry remains dormant (they can't log in without a profile).
 */
export async function removeMember(userId: string): Promise<{ error: string | null }> {
    const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

    if (error) return { error: error.message };
    return { error: null };
}
